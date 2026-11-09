// 나라장터(조달청) 입찰공고정보서비스에서 수의계약 공고 가져오기
// - 공공데이터포털(data.go.kr)에서 '조달청_나라장터 입찰공고정보서비스' 활용 신청 후 받은 인증키 필요
// - ⚠ 이 수집기는 실제 API로 시험하지 못했습니다. 공공데이터포털 문서에서 주소(endpoint)·
//   기능 이름(operations)·응답 필드 이름을 확인하고, 다르면 sources.json 또는 아래 변환 부분을 고치세요.
import { addDays } from '../lib/dates.js';
import { dataGoKrError, normalizeServiceKey } from '../lib/dataGoKr.js';
import { fetchWithRetry } from '../lib/http.js';

// 공공데이터포털 활용신청 상세의 End Point와 같아야 함 (주소가 다르면 '등록되지 않은 인증키' 오류)
const DEFAULT_ENDPOINT = 'https://apis.data.go.kr/1230000/ad/BidPublicInfoService02';
const PAGE_SIZE = 100;

function toList(items) {
  if (Array.isArray(items)) return items;
  if (items?.item) return [].concat(items.item);
  return [];
}

const API_NAME = '조달청_나라장터 입찰공고정보서비스';
const apiError = (status, text) => dataGoKrError('나라장터 API', API_NAME, status, text);

async function fetchPage(url, log) {
  const response = await fetchWithRetry(url, { name: '나라장터 API', log });
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

export async function collectNaraBid(source, env, { today, log }) {
  const keyEnv = source.keyEnv ?? 'DATA_GO_KR_KEY';
  const serviceKey = normalizeServiceKey(env[keyEnv]);
  if (!serviceKey) throw new Error(`인증키가 없습니다. GitHub Secrets에 ${keyEnv}를 등록하세요.`);

  const begin = `${addDays(today, -(source.days ?? 3)).replaceAll('-', '')}0000`;
  const end = `${today.replaceAll('-', '')}2359`;
  const raw = [];

  // 2026-11 '02' 개편 뒤 기능 이름이 'getBidPblancListInfoServc02'처럼 바뀐 경우가 있어,
  // 기능 이름마다 '02'를 붙인 이름 → 원래 이름 순서로 시도함. 없는 기능이면 NO_OPENAPI_SERVICE_ERROR가 옴
  const candidatesOf = (operation) => (/\d{2}$/.test(operation) ? [operation] : [`${operation}02`, operation]);

  for (const baseOperation of source.operations ?? ['getBidPblancListInfoServc']) {
    let done = false;
    const tried = [];
    for (const operation of candidatesOf(baseOperation)) {
      tried.push(operation);
      try {
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
          const { list, total } = await fetchPage(url, log);
          raw.push(...list);
          if (!list.length || page * PAGE_SIZE >= total) break;
        }
        log?.(`  나라장터 기능 이름: ${operation}`);
        done = true;
        break;
      } catch (error) {
        if (!/NO_OPENAPI_SERVICE_ERROR/.test(error.message)) throw error;
      }
    }
    if (!done) {
      throw new Error(
        `나라장터 API에 이 기능이 없습니다(NO_OPENAPI_SERVICE_ERROR). 시도한 이름: ${tried.join(', ')}. ` +
          '공공데이터포털 활용신청 상세의 상세기능 이름을 sources.json의 operations에 적어 주세요.',
      );
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
