// 창업진흥원 K-Startup 사업공고 가져오기
// - 공공데이터포털(data.go.kr)에서 '창업진흥원_K-Startup(사업소개,사업공고,콘텐츠 등) 조회서비스' 활용 신청 후 받은 인증키 필요
//   (나라장터와 같은 공공데이터포털 인증키라 DATA_GO_KR_KEY를 함께 씁니다)
// - 응답: { totalCount, currentCount, page, perPage, data: [ { pbanc_sn, pbanc_rcpt_bgng_dt, pbanc_rcpt_end_dt, … } ] }
// - ⚠ 이 수집기는 실제 API로 시험하지 못했습니다. 공고명·기관명 필드 이름은 문서로 확인하지 못해 후보 이름을 차례로 찾습니다.
//   처음 연결한 뒤 Actions 실행 결과에 '공고명을 찾지 못함' 경고가 나오면 아래 TITLE_FIELDS를 실제 이름에 맞춰 주세요.
import { toDateString } from '../../js/services/date.js';
import { dataGoKrError, normalizeServiceKey } from '../lib/dataGoKr.js';
import { fetchWithRetry } from '../lib/http.js';

const DEFAULT_ENDPOINT = 'https://apis.data.go.kr/B552735/kisedKstartupService01/getAnnouncementInformation01';
const API_NAME = '창업진흥원_K-Startup(사업소개,사업공고,콘텐츠 등) 조회서비스';
const PAGE_SIZE = 100;
const CONTENT_LIMIT = 200;

// 필드 이름 후보 (먼저 찾은 값을 씀)
const TITLE_FIELDS = ['biz_pbanc_nm', 'intg_pbanc_biz_nm', 'pbanc_nm', 'biz_nm'];
const AGENCY_FIELDS = ['pbanc_ntrp_nm', 'sprv_inst_nm', 'biz_prch_dprt_nm'];
const CONTENT_FIELDS = ['pbanc_ctnt', 'biz_pbanc_ctnt', 'supt_biz_clsfc'];

const apiError = (status, text) => dataGoKrError('K-Startup API', API_NAME, status, text);

function pick(item, fields) {
  for (const field of fields) {
    const value = item?.[field];
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return undefined;
}

const ENTITIES = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'" };

// 공고 내용은 HTML로 올 수 있어 태그·특수 표기를 지우고 앞부분만
function shorten(text) {
  const plain = String(text ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > CONTENT_LIMIT ? `${plain.slice(0, CONTENT_LIMIT)}…` : plain;
}

// 'www.k-startup.go.kr/…'처럼 프로토콜이 빠진 주소도 있음
function toUrl(value) {
  const text = String(value ?? '').trim();
  if (!text) return undefined;
  if (/^https?:\/\//i.test(text)) return text;
  if (/^(www\.|[a-z0-9-]+\.[a-z]{2,})/i.test(text)) return `https://${text}`;
  return undefined;
}

async function fetchPage(url, log) {
  const response = await fetchWithRetry(url, { name: 'K-Startup API', log });
  const text = await response.text();
  if (!response.ok) throw apiError(response.status, text);
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw apiError(response.status, text); // 인증키 오류 등은 XML로 옴
  }
  if (!Array.isArray(json?.data)) {
    const code = json?.response?.header?.resultCode ?? json?.resultCode;
    if (code && code !== '00') throw apiError(response.status, text);
    throw new Error(`K-Startup API 응답 형식이 예상과 다릅니다: ${text.slice(0, 160)}`);
  }
  return { list: json.data, total: Number(json.totalCount ?? json.matchCount ?? 0) };
}

export async function collectKstartup(source, env, { log = console.log } = {}) {
  const keyEnv = source.keyEnv ?? 'DATA_GO_KR_KEY';
  const serviceKey = normalizeServiceKey(env[keyEnv]);
  if (!serviceKey) throw new Error(`인증키가 없습니다. GitHub Secrets에 ${keyEnv}를 등록하세요.`);

  const raw = [];
  for (let page = 1; page <= (source.maxPages ?? 10); page += 1) {
    const url = new URL(source.endpoint ?? DEFAULT_ENDPOINT);
    url.search = new URLSearchParams({
      serviceKey,
      page: String(page),
      perPage: String(PAGE_SIZE),
      returnType: 'json',
    }).toString();
    const { list, total } = await fetchPage(url, log);
    raw.push(...list);
    if (list.length < PAGE_SIZE || page * PAGE_SIZE >= total) break;
  }

  // 모집 중인 공고만 (onlyRecruiting: false면 전부)
  const recruiting = source.onlyRecruiting === false ? raw : raw.filter((item) => item.rcrt_prgs_yn !== 'N');

  const missingTitle = recruiting.filter((item) => !pick(item, TITLE_FIELDS)).length;
  if (recruiting.length && missingTitle === recruiting.length) {
    log(
      `::warning title=K-Startup 공고명을 찾지 못함::응답 항목 이름: ${Object.keys(recruiting[0]).join(', ')} — ` +
        'scripts/collectors/kstartup.js의 TITLE_FIELDS를 이 중 공고명 항목으로 바꿔 주세요.',
    );
  }

  // 공고 번호가 없으면 상세 주소의 pbancSn= 값으로, 그것도 없으면 제외
  const idOf = (item) => item.pbanc_sn ?? String(item.detl_pg_url ?? '').match(/pbancSn=(\d+)/)?.[1];

  return recruiting.filter(idOf).map((item) => {
    const pageUrl = toUrl(item.detl_pg_url);
    const target = [item.aply_trgt, item.biz_enyy && `업력: ${item.biz_enyy}`, item.biz_trgt_age]
      .filter(Boolean)
      .join(' · ');
    return {
      id: `kstartup-${idOf(item)}`,
      category: source.category ?? 'entrusted',
      title: pick(item, TITLE_FIELDS),
      // 등록일 항목이 없어 접수 시작일을 공고일로 씀
      announceDate: toDateString(item.pbanc_rcpt_bgng_dt),
      agency: pick(item, AGENCY_FIELDS) ?? '창업진흥원',
      // '전국'은 지역 없음, '경기'·'전남광주' 등은 지도에 표시
      region: item.supt_regin && item.supt_regin !== '전국' ? item.supt_regin : undefined,
      period: null,
      content: [shorten(pick(item, CONTENT_FIELDS)), item.sprv_inst && `주관 ${item.sprv_inst}`]
        .filter(Boolean)
        .join(' · '),
      target: target || undefined,
      budget: null,
      deadline: toDateString(item.pbanc_rcpt_end_dt),
      url: pageUrl,
      applyUrl: toUrl(item.aply_mthd_onli_rcpt_istc) ?? toUrl(item.biz_aply_url) ?? pageUrl,
    };
  });
}
