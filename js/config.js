// 앱 설정: 카테고리·검색 조건·표 열은 모두 이 파일에서 정의합니다.
// 화면은 아래 배열을 읽어 자동으로 그려지므로, 항목 추가/순서 변경은 여기만 수정하면 됩니다.

export const APP_TITLE = '2026년 정책모아';
export const APP_SUBTITLE = '수의계약·위수탁지원사업 공고를 한눈에 찾아보세요';

// 데이터 출처: 'json'(로컬 샘플) | 'api'(공공데이터 API, 추후 구현)
export const DATA_SOURCE = 'json';
export const DATA_URL = 'data/policies.json';

// 검색유형 버튼. id는 데이터의 category 값과 일치해야 합니다. ('all'은 전체)
export const CATEGORIES = [
  { id: 'all', label: '전체' },
  { id: 'contract', label: '수의계약' },
  { id: 'entrusted', label: '위수탁지원사업' },
];

// 검색 조건. type: 'text' | 'select' | 'dateRange'
// - select의 선택지는 데이터에서 자동으로 추출합니다.
// - dateRange는 날짜(문자열)이면 해당 날짜가, 기간({start, end})이면 기간이 검색 범위와 겹치는지 검사합니다.
export const SEARCH_FIELDS = [
  { key: 'title', label: '공고명', type: 'text', placeholder: '공고명을 입력하세요' },
  { key: 'announceDate', label: '공고일', type: 'dateRange' },
  { key: 'agency', label: '주체기관', type: 'select', placeholder: '전체 기관' },
  { key: 'period', label: '사업기간', type: 'dateRange' },
];

// 결과 표 열(첫 줄 제목). format: 'date' | 'range' | 'money', render: 'titleWithSummary'
export const COLUMNS = [
  { key: 'announceDate', label: '공고일', format: 'date', nowrap: true },
  { key: 'agency', label: '주체기관', nowrap: true },
  { key: 'period', label: '사업기간', format: 'range', nowrap: true },
  { key: 'content', label: '정책사업내용', render: 'titleWithSummary' },
  { key: 'budget', label: '예산', format: 'money', nowrap: true, align: 'number' },
  { key: 'deadline', label: '지원마감일', format: 'date', nowrap: true },
];

// 기본 정렬: 최신 공고가 위로
export const DEFAULT_SORT = { key: 'announceDate', dir: 'desc' };
