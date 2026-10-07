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

async function fetchPage(url) {
  const response = await fetch(url);
  const text = await response.text();
  if (!response.ok) throw new Error(`나라장터 API 오류 (${response.status}) ${text.slice(0, 120)}`);
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    // 인증키 오류 등은 XML로 응답하는 경우가 많음
    throw new Error(`나라장터 API가 JSON이 아닌 응답을 보냈습니다. 인증키를 확인하세요: ${text.slice(0, 160)}`);
  }
  const header = json?.response?.header;
  if (header?.resultCode && header.resultCode !== '00') {
    throw new Error(`나라장터 API 오류: ${header.resultMsg ?? header.resultCode}`);
  }
  const body = json?.response?.body ?? {};
  return { list: toList(body.items), total: Number(body.totalCount ?? 0) };
}

export async function collectNaraBid(source, env, { today }) {
  const keyEnv = source.keyEnv ?? 'DATA_GO_KR_KEY';
  const serviceKey = env[keyEnv];
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
