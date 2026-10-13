// 나라장터(조달청) 입찰공고정보서비스에서 수의계약 공고 가져오기
// - 공공데이터포털(data.go.kr)에서 '조달청_나라장터 입찰공고정보서비스' 활용 신청 후 받은 인증키 필요
// - ⚠ 이 수집기는 실제 API로 시험하지 못했습니다. 공공데이터포털 문서에서 주소(endpoint)·
//   기능 이름(operations)·응답 필드 이름을 확인하고, 다르면 sources.json 또는 아래 변환 부분을 고치세요.
import { addDays } from '../lib/dates.js';

const DEFAULT_ENDPOINT = 'https://apis.data.go.kr/1230000/ad/BidPublicInfoService';
const PAGE_SIZE = 100;

function toList(items) {
  if (Array.isArray(items)) return items;
  if (items?.item) return [].concat(items.item);
  return [];
}

// 공공데이터포털 공통 오류 코드 → 한국어 안내
const ERROR_HELP = {
  SERVICE_KEY_IS_NOT_REGISTERED_ERROR:
    '등록되지 않은 인증키입니다. 공공데이터포털 마이페이지 → 활용신청 현황에서 "조달청_나라장터 입찰공고정보서비스"가 ' +
    '승인되었는지 확인하세요. 승인 직후에는 1~2시간 뒤부터 쓸 수 있습니다.',
  SERVICE_ACCESS_DENIED_ERROR: '이 API를 쓸 권한이 없습니다. 활용신청을 했는지 확인하세요.',
  LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR: '하루 호출 횟수를 넘었습니다. 내일 다시 시도됩니다.',
  DEADLINE_HAS_EXPIRED_ERROR: '활용 기간이 끝났습니다. 공공데이터포털에서 활용 기간을 연장하세요.',
  UNREGISTERED_IP_ERROR: '등록되지 않은 IP입니다. 활용신청 정보에서 IP 제한을 없애 주세요.',
};

// 오류 응답(JSON 또는 XML)에서 오류 코드 찾기 (예: SERVICE_KEY_IS_NOT_REGISTERED_ERROR)
function errorCodeOf(text) {
  const codes = String(text).match(/[A-Z]+(?:_[A-Z]+)*_ERROR/g) ?? [];
  return codes.find((code) => code in ERROR_HELP) ?? codes.find((code) => code !== 'SERVICE_ERROR');
}

function apiError(status, text) {
  const code = errorCodeOf(text);
  if (code) return new Error(`나라장터 API 오류(${code}): ${ERROR_HELP[code] ?? '공공데이터포털 안내를 확인하세요.'}`);
  return new Error(`나라장터 API 오류 (${status}) ${String(text).replace(/\s+/g, ' ').slice(0, 120)}`);
}

async function fetchPage(url) {
  const response = await fetch(url);
  const text = await response.text();
  if (!response.ok) throw apiError(response.status, text);
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    // 인증키 오류 등은 XML로 응답하는 경우가 많음
    throw apiError(response.status, text);
  }
  const header = json?.response?.header;
  if (header?.resultCode && header.resultCode !== '00') {
    throw new Error(`나라장터 API 오류: ${header.resultMsg ?? header.resultCode}`);
  }
  if (json?.OpenAPI_ServiceResponse) throw apiError(response.status, text);
  const body = json?.response?.body ?? {};
  return { list: toList(body.items), total: Number(body.totalCount ?? 0) };
}

// 공공데이터포털 화면의 인증키는 두 가지(Encoding/Decoding)입니다. 어느 쪽을 넣어도 되도록
// '%'가 들어 있는 Encoding 키는 원래 값으로 되돌린 뒤 주소에 넣습니다. (두 번 인코딩되면 '등록되지 않은 키' 오류)
export function normalizeServiceKey(key) {
  const trimmed = String(key ?? '').trim();
  if (!trimmed.includes('%')) return trimmed;
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

export async function collectNaraBid(source, env, { today }) {
  const keyEnv = source.keyEnv ?? 'DATA_GO_KR_KEY';
  const serviceKey = normalizeServiceKey(env[keyEnv]);
  if (!serviceKey) throw new Error(`인증키가 없습니다. GitHub Secrets에 ${keyEnv}를 등록하세요.`);

  const begin = `${addDays(today, -(source.days ?? 3)).replaceAll('-', '')}0000`;
  const end = `${today.replaceAll('-', '')}2359`;
  const raw = [];

  for (const operation of source.operations ?? ['getBidPblancListInfoServc']) {
    for (let page = 1; page <= (source.maxPages ?? 10); page += 1) {
      const url = new URL(`${source.endpoint ?? DEFAULT_ENDPOINT}/${operation}`);
      url.search = new URLSearchParams({
        serviceKey,
        pageNo: String(page),
        numOfRows: String(PAGE_SIZE),
        inqryDiv: '1',
        inqryBgnDt: begin,
        inqryEndDt: end,
        type: 'json',
      }).toString();
      const { list, total } = await fetchPage(url);
      raw.push(...list);
      if (!list.length || page * PAGE_SIZE >= total) break;
    }
  }

  const methodKeyword = source.contractMethodIncludes ?? '수의';
  return raw
    .filter((item) => String(item.cntrctCnclsMthdNm ?? '').includes(methodKeyword))
    .map((item) => ({
      id: `nara-${item.bidNtceNo}-${item.bidNtceOrd ?? '000'}`,
      category: source.category ?? 'contract',
      title: item.bidNtceNm,
      announceDate: item.bidNtceDt ?? item.rgstDt,
      agency: item.ntceInsttNm ?? item.dminsttNm,
      // 사업 지역은 수요기관(실제 사업을 하는 기관) 이름에서 찾음
      region: item.dminsttNm ?? item.ntceInsttNm,
      period: null,
      content: [item.ntceKindNm, item.cntrctCnclsMthdNm, item.dminsttNm && `수요기관 ${item.dminsttNm}`]
        .filter(Boolean)
        .join(' · '),
      target: item.prtcptLmtRgnNm ? `참가 제한 지역: ${item.prtcptLmtRgnNm}` : undefined,
      budget: item.asignBdgtAmt || item.presmptPrce || null,
      deadline: item.bidClseDt,
      url: item.bidNtceDtlUrl ?? item.bidNtceUrl,
      // 나라장터 공고는 상세 페이지에서 견적·입찰에 참여
      applyUrl: item.bidNtceDtlUrl ?? item.bidNtceUrl,
    }));
}
