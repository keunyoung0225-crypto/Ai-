// 기업마당(bizinfo.go.kr) 지원사업 공고에서 중소벤처기업부 등 원하는 부처의 공고 가져오기
// - 기업마당 누리집의 '정책정보 개방 → API 목록 → 지원사업정보 API'에서 사용 신청 후 받은 인증키 필요
// - 기업마당에는 여러 부처·지자체 공고가 모여 있으므로, 소관 부처(jrsdInsttNm) 이름으로 골라냅니다. (sources.json의 agencyIncludes)
// - ⚠ 이 수집기는 실제 API로 시험하지 못했습니다. 처음 연결한 뒤 Actions 실행 결과를 확인하고,
//   오류가 나면 기업마당 API 안내의 요청 변수·응답 필드 이름에 맞춰 아래 변환 부분을 고치세요.
import { toDateString } from '../../js/services/date.js';

const DEFAULT_ENDPOINT = 'https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do';
const SITE = 'https://www.bizinfo.go.kr';
const CONTENT_LIMIT = 200; // 사업 요약은 앞부분만 (전체 내용은 공고 원문에서)

const ENTITIES = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'" };

// 사업 요약은 HTML로 오므로 태그를 지우고 글자만 남김
function toPlainText(html) {
  const text = String(html ?? '')
    .replace(/<br\s*\/?>|<\/p>|<\/li>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z]+;|&#\d+;/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > CONTENT_LIMIT ? `${text.slice(0, CONTENT_LIMIT)}…` : text;
}

// 공고 주소가 '/web/...'처럼 사이트 안 경로로 오면 전체 주소로
function toFullUrl(value) {
  const text = String(value ?? '').trim();
  if (!text) return undefined;
  if (text.startsWith('/')) return `${SITE}${text}`;
  return text;
}

// 신청기간 '20260302 ~ 20260331' → 마감일. '상시', '예산 소진 시까지' 등은 마감일 없음
function deadlineOf(period) {
  const parts = String(period ?? '').split('~');
  return parts.length > 1 ? toDateString(parts[1]) : null;
}

// 응답이 { jsonArray: [...] } 또는 { jsonArray: { item: [...] } } 형태로 옴
function toList(json) {
  const root = json?.jsonArray ?? json;
  if (Array.isArray(root)) return root;
  if (root?.item) return [].concat(root.item);
  return [];
}

export async function collectBizinfo(source, env) {
  const keyEnv = source.keyEnv ?? 'BIZINFO_API_KEY';
  const key = env[keyEnv];
  if (!key) throw new Error(`인증키가 없습니다. GitHub Secrets에 ${keyEnv}를 등록하세요.`);

  const count = String(source.count ?? 500);
  const url = new URL(source.endpoint ?? DEFAULT_ENDPOINT);
  url.search = new URLSearchParams({
    crtfcKey: key,
    dataType: 'json',
    searchCnt: count,
    pageUnit: count,
    pageIndex: '1',
    ...(source.hashtags ? { hashtags: source.hashtags } : {}),
  }).toString();

  const response = await fetch(url);
  const text = await response.text();
  if (!response.ok) throw new Error(`기업마당 API 오류 (${response.status}) ${text.slice(0, 120)}`);
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`기업마당 API가 JSON이 아닌 응답을 보냈습니다. 인증키를 확인하세요: ${text.slice(0, 160)}`);
  }

  const agencyNames = [].concat(source.agencyIncludes ?? []);
  const wanted = (item) =>
    !agencyNames.length || agencyNames.some((name) => String(item.jrsdInsttNm ?? '').includes(name));

  return toList(json)
    .filter(wanted)
    .map((item) => {
      const pageUrl = toFullUrl(item.pblancUrl);
      return {
        id: `bizinfo-${item.pblancId}`,
        category: source.category ?? 'entrusted',
        title: item.pblancNm,
        announceDate: item.creatPnttm,
        agency: item.jrsdInsttNm,
        // 지역은 실제로 사업을 하는 수행기관 이름에서 찾음 (예: 경기테크노파크 → 경기). 전국 사업은 지역 없음
        region: item.excInsttNm,
        // 기업마당은 사업기간 대신 신청기간을 주므로 사업기간은 비워 둠
        period: null,
        content: [toPlainText(item.bsnsSumryCn), item.excInsttNm && `수행기관 ${item.excInsttNm}`]
          .filter(Boolean)
          .join(' · '),
        target: item.trgetNm || undefined,
        budget: null,
        deadline: deadlineOf(item.reqstBeginEndDe),
        url: pageUrl,
        // 신청은 기업마당 공고 페이지의 '신청 바로가기'에서 (접수 누리집 주소가 따로 있으면 그곳으로)
        applyUrl: toFullUrl(item.rceptEngnHmpgUrl) ?? pageUrl,
      };
    });
}
