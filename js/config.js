// 앱 설정: 카테고리·검색 조건·표 열은 모두 이 파일에서 정의합니다.
// 화면은 아래 배열을 읽어 자동으로 그려지므로, 항목 추가/순서 변경은 여기만 수정하면 됩니다.

export const APP_TITLE = '2026년 모아보는 정책한눈';
// 휴대폰 알림 제목처럼 짧게 써야 하는 곳에 쓰는 이름 (제목에서 강조 색으로도 표시)
export const APP_SHORT_TITLE = '정책한눈';
export const APP_SUBTITLE = '수의계약·위수탁지원사업 공고를 한눈에 찾아보세요';

// 데이터 출처: 'json'(로컬 샘플) | 'api'(외부 API)
export const DATA_SOURCE = 'json';
export const DATA_URL = 'data/policies.json';

// API 설정 (DATA_SOURCE가 'api'일 때 사용)
// ※ 인증키를 이 파일에 넣으면 누구나 볼 수 있습니다. 키가 필요한 공공 API는
//   자체 서버(프록시)를 거쳐 호출하고, 여기에는 그 서버 주소만 적으세요.
export const API_CONFIG = {
  endpoint: '', // 예: 'https://내-서버/api/policies'
  params: {}, // 요청마다 붙일 쿼리 파라미터
  adapter: 'standard', // 응답을 공고 데이터로 바꾸는 방식 (js/data/adapters/)
  fallbackToJson: true, // API 실패 시 샘플 JSON으로 대체
};

// 검색유형 버튼. id는 데이터의 category 값과 일치해야 합니다. ('all'은 전체)
export const CATEGORIES = [
  { id: 'all', label: '전체' },
  { id: 'contract', label: '수의계약' },
  { id: 'entrusted', label: '위수탁지원사업' },
];

// 지역(시·도). 지도에서 눌러 고르면 그 지역 공고만 보여 줍니다.
// - names: 기관 이름 등에서 지역을 알아낼 때 쓰는 이름 (긴 이름을 먼저 적음)
// - point: 지도 위에 공고 수를 표시할 위치 (지도 좌표, 가로·세로)
// - name: 지도에 지역 이름을 쓸 위치 (넓은 도 지역만. 'below'는 숫자 아래, 'right'는 숫자 오른쪽)
export const REGIONS = [
  { id: 'seoul', label: '서울', names: ['서울특별시', '서울시', '서울'], point: [152, 127] },
  { id: 'busan', label: '부산', names: ['부산광역시', '부산시', '부산'], point: [345, 400] },
  { id: 'daegu', label: '대구', names: ['대구광역시', '대구시', '대구'], point: [300, 336] },
  { id: 'incheon', label: '인천', names: ['인천광역시', '인천시', '인천'], point: [112, 142] },
  { id: 'gwangju', label: '광주', names: ['광주광역시', '광주'], point: [140, 408] },
  { id: 'daejeon', label: '대전', names: ['대전광역시', '대전시', '대전'], point: [198, 282] },
  { id: 'ulsan', label: '울산', names: ['울산광역시', '울산시', '울산'], point: [366, 364] },
  { id: 'sejong', label: '세종', names: ['세종특별자치시', '세종시', '세종'], point: [170, 240] },
  { id: 'gyeonggi', label: '경기', names: ['경기도', '경기'], point: [182, 172], name: 'below' },
  { id: 'gangwon', label: '강원', names: ['강원특별자치도', '강원도', '강원'], point: [290, 105], name: 'below' },
  { id: 'chungbuk', label: '충북', names: ['충청북도', '충북'], point: [252, 222], name: 'below' },
  { id: 'chungnam', label: '충남', names: ['충청남도', '충남'], point: [122, 258], name: 'below' },
  { id: 'jeonbuk', label: '전북', names: ['전북특별자치도', '전라북도', '전북'], point: [165, 338], name: 'below' },
  { id: 'jeonnam', label: '전남', names: ['전라남도', '전남'], point: [128, 458], name: 'below' },
  { id: 'gyeongbuk', label: '경북', names: ['경상북도', '경북'], point: [330, 258], name: 'below' },
  { id: 'gyeongnam', label: '경남', names: ['경상남도', '경남'], point: [262, 398], name: 'below' },
  { id: 'jeju', label: '제주', names: ['제주특별자치도', '제주도', '제주'], point: [112, 609], name: 'right' },
];

// 검색 조건. type: 'keyword' | 'text' | 'select' | 'dateRange'
// - keyword는 fields에 적은 여러 항목을 한꺼번에 검색합니다. (띄어쓰기로 여러 단어 → 모두 포함된 공고)
// - wide: true면 검색 폼에서 한 줄 전체를 차지합니다.
// - select의 선택지는 데이터에서 자동으로 추출합니다.
// - dateRange는 날짜(문자열)이면 해당 날짜가, 기간({start, end})이면 기간이 검색 범위와 겹치는지 검사합니다.
export const SEARCH_FIELDS = [
  {
    key: 'keyword',
    label: '키워드',
    type: 'keyword',
    fields: ['title', 'content', 'target', 'agency'],
    placeholder: '공고명·사업내용·지원대상·기관에서 찾기 (예: 청년 창업)',
    wide: true,
  },
  { key: 'title', label: '공고명', type: 'text', placeholder: '공고명을 입력하세요' },
  { key: 'announceDate', label: '공고일', type: 'dateRange' },
  { key: 'agency', label: '주체기관', type: 'select', placeholder: '전체 기관' },
  { key: 'period', label: '사업기간', type: 'dateRange' },
];

// 결과 표 열(첫 줄 제목).
// - format: 'date' | 'range' | 'money'
// - render: 'titleWithSummary'(공고명+요약, 누르면 상세 보기) | 'deadlineWithBadge'(마감일+D-day 배지)
// - sort: 머리글 클릭 정렬 설정. defaultDir은 처음 눌렀을 때의 방향, labels는 모바일 정렬 메뉴 문구,
//         pastLast: true면 오늘 이전 날짜(이미 마감된 공고)를 방향과 관계없이 맨 뒤로
export const COLUMNS = [
  {
    key: 'announceDate',
    label: '공고일',
    format: 'date',
    nowrap: true,
    sort: { defaultDir: 'desc', labels: { desc: '최신순', asc: '오래된순' } },
  },
  { key: 'agency', label: '주체기관', render: 'agencyWithRegion', nowrap: true },
  { key: 'period', label: '사업기간', format: 'range', nowrap: true },
  { key: 'content', label: '정책사업내용', render: 'titleWithSummary' },
  {
    key: 'budget',
    label: '예산',
    format: 'money',
    nowrap: true,
    align: 'number',
    sort: { defaultDir: 'desc', labels: { desc: '많은순', asc: '적은순' } },
  },
  {
    key: 'deadline',
    label: '지원마감일',
    format: 'date',
    render: 'deadlineWithBadge',
    nowrap: true,
    sort: { defaultDir: 'asc', pastLast: true, labels: { asc: '임박순', desc: '늦은순' } },
  },
];

// 상세 보기 창에 표시할 항목 (format: 'category'는 검색유형 이름으로 표시)
export const DETAIL_FIELDS = [
  { key: 'category', label: '검색유형', format: 'category' },
  { key: 'region', label: '지역', format: 'region' },
  { key: 'agency', label: '주체기관' },
  { key: 'announceDate', label: '공고일', format: 'date' },
  { key: 'period', label: '사업기간', format: 'range' },
  { key: 'budget', label: '예산', format: 'money' },
  { key: 'deadline', label: '지원마감일', format: 'date' },
  { key: 'target', label: '지원대상' },
  { key: 'content', label: '정책사업내용' },
  // format: 'link'는 주소를 그대로 보여주고 누르면 새 창으로 열림. empty는 주소가 없을 때 안내 문구
  { key: 'applyUrl', label: '신청 페이지', format: 'link', empty: '주체기관 누리집의 공고문에서 신청 방법을 확인하세요.' },
  { key: 'url', label: '공고 원문', format: 'link' },
];

// 기본 정렬: 최신 공고가 위로
export const DEFAULT_SORT = { key: 'announceDate', dir: 'desc' };

// 한 번에 보여줄 공고 수 ('더보기'를 누르면 이만큼 더 표시)
export const PAGE_SIZE = 10;

// 마감 임박으로 강조할 기준(일)
export const DEADLINE_WARNING_DAYS = 7;

// 매일 갱신에서 새로 들어온 공고에 'NEW' 표시를 붙이는 기간(일). 0이면 표시 안 함
export const NEW_BADGE_DAYS = 2;

// 브라우저 저장 키 (관심공고·화면 모드는 이 기기에만 저장됩니다)
// theme 키는 index.html의 화면 깜빡임 방지 스크립트에도 같은 값이 있습니다.
export const STORAGE_KEYS = {
  favorites: 'policyMoa.favorites',
  theme: 'policyMoa.theme',
  notify: 'policyMoa.notify',
  recentKeyword: 'policyMoa.recentKeyword',
  adSideHeight: 'policyMoa.adSideHeight',
};

// '최근 검색 공고'에 보여줄 공고 수 (마지막으로 검색한 키워드 기준)
export const RECENT_SEARCH_LIMIT = 3;

// 휴대폰 알림 (무료 앱 ntfy 사용). 매일 아침 GitHub Actions가 scripts/notify.mjs를 실행해 발송합니다.
// - sendTime: 알림이 도착할 한국 시각. 작업은 그보다 먼저 실행되고 ntfy 예약 발송으로 이 시각에 도착합니다.
// - subscriptionsFile: 관심 키워드 목록 파일 (저장소에 저장)
export const NOTIFY_CONFIG = {
  server: 'https://ntfy.sh',
  topicPrefix: 'policymoa-',
  sendTime: '09:00',
  maxItems: 10,
  subscriptionsFile: 'alerts/subscriptions.json',
};

// 엑셀(CSV) 다운로드 항목. 날짜는 엑셀이 인식하도록 YYYY-MM-DD, 예산은 원 단위 숫자로 저장
export const EXPORT_FIELDS = [
  { key: 'title', label: '공고명' },
  { key: 'category', label: '검색유형', format: 'category' },
  { key: 'announceDate', label: '공고일' },
  { key: 'region', label: '지역', format: 'region' },
  { key: 'agency', label: '주체기관' },
  { key: 'period', label: '사업기간', format: 'range' },
  { key: 'content', label: '정책사업내용' },
  { key: 'target', label: '지원대상' },
  { key: 'budget', label: '예산(원)' },
  { key: 'deadline', label: '지원마감일' },
  { key: 'applyUrl', label: '신청URL' },
  { key: 'url', label: '공고URL' },
];

// 광고 영역. 넓은 화면(1100px 이상)은 왼쪽(side), 좁은 화면은 맨 아래(bottom)에 표시합니다.
// (화면 너비 기준은 css/components.css의 '광고 영역' 부분과 같아야 합니다)
// - imageUrl(광고 이미지 주소)과 linkUrl(누르면 갈 주소)을 채우면 그 광고가 나오고, 비워 두면 빈 광고 틀이 보입니다.
// - enabled를 false로 하면 그 광고 영역을 숨깁니다.
// - resizable: true면 광고 틀 아래 손잡이를 끌어(또는 키보드 ↑↓) 세로 높이를 minHeight~maxHeight 사이에서 조절할 수 있습니다.
//   조절한 높이는 이 브라우저에 기억되고(storageKey), 손잡이를 두 번 누르면 height(기본 높이)로 돌아갑니다.
export const AD_SLOTS = {
  side: {
    enabled: true,
    width: 160,
    height: 600,
    minHeight: 250,
    maxHeight: 900,
    resizable: true,
    storageKey: STORAGE_KEYS.adSideHeight,
    imageUrl: '',
    linkUrl: '',
    alt: '',
  },
  bottom: { enabled: true, width: 320, height: 50, imageUrl: '', linkUrl: '', alt: '', closable: true },
};

// 상세 보기의 '비슷한 공고' 추천: 'rule'(규칙 기반) | 'ai'(AI 서버 연결 후 사용)
export const RECOMMENDER = 'rule';
export const SIMILAR_LIMIT = 3;
