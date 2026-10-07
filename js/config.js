// 앱 설정: 카테고리·검색 조건·표 열은 모두 이 파일에서 정의합니다.
// 화면은 아래 배열을 읽어 자동으로 그려지므로, 항목 추가/순서 변경은 여기만 수정하면 됩니다.

export const APP_TITLE = '2026년 정책모아';
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
  { key: 'agency', label: '주체기관', nowrap: true },
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
  { key: 'agency', label: '주체기관' },
  { key: 'announceDate', label: '공고일', format: 'date' },
  { key: 'period', label: '사업기간', format: 'range' },
  { key: 'budget', label: '예산', format: 'money' },
  { key: 'deadline', label: '지원마감일', format: 'date' },
  { key: 'target', label: '지원대상' },
  { key: 'content', label: '정책사업내용' },
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
};

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
  { key: 'agency', label: '주체기관' },
  { key: 'period', label: '사업기간', format: 'range' },
  { key: 'content', label: '정책사업내용' },
  { key: 'target', label: '지원대상' },
  { key: 'budget', label: '예산(원)' },
  { key: 'deadline', label: '지원마감일' },
];

// 상세 보기의 '비슷한 공고' 추천: 'rule'(규칙 기반) | 'ai'(AI 서버 연결 후 사용)
export const RECOMMENDER = 'rule';
export const SIMILAR_LIMIT = 3;
