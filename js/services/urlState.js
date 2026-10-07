// 검색 상태 ↔ URL 주소 변환 (검색 결과·상세 보기 링크 공유용)
// 예: ?cat=contract&title=용역&announceDateFrom=2026-09-01&sort=budget:desc&id=2026-C-001
// 파라미터 이름은 config의 SEARCH_FIELDS key에서 만들어집니다. (기간은 key + From/To)
import { createEmptyFilters } from '../state.js';
import { isDateString } from './date.js';

const SORT_DIRS = ['asc', 'desc'];

export function readUrlState(search, { categories, fields, columns, defaults }) {
  const params = new URLSearchParams(search);

  const category = params.get('cat');
  const filters = createEmptyFilters(fields);
  fields.forEach(({ key, type }) => {
    if (type === 'dateRange') {
      const from = params.get(`${key}From`);
      const to = params.get(`${key}To`);
      filters[key] = { from: isDateString(from) ? from : '', to: isDateString(to) ? to : '' };
    } else {
      filters[key] = params.get(key) ?? '';
    }
  });

  const [sortKey, sortDir] = (params.get('sort') ?? '').split(':');
  const sortable = columns.some((column) => column.key === sortKey && column.sort);

  return {
    category: categories.some((c) => c.id === category) ? category : defaults.category,
    filters,
    sort: sortable && SORT_DIRS.includes(sortDir) ? { key: sortKey, dir: sortDir } : defaults.sort,
    detailId: params.get('id') || null,
  };
}

export function buildUrlSearch(state, { fields, defaults }) {
  const params = new URLSearchParams();

  if (state.category !== defaults.category) params.set('cat', state.category);
  fields.forEach(({ key, type }) => {
    const value = state.filters[key];
    if (type === 'dateRange') {
      if (value?.from) params.set(`${key}From`, value.from);
      if (value?.to) params.set(`${key}To`, value.to);
    } else if (value?.trim()) {
      params.set(key, value.trim());
    }
  });
  if (state.sort.key !== defaults.sort.key || state.sort.dir !== defaults.sort.dir) {
    params.set('sort', `${state.sort.key}:${state.sort.dir}`);
  }
  if (state.detailId) params.set('id', state.detailId);

  const query = params.toString();
  return query ? `?${query}` : '';
}

// 주소창만 바꾸고 페이지는 다시 불러오지 않음 (뒤로가기 기록도 늘리지 않음)
export function writeUrlState(state, options) {
  const search = buildUrlSearch(state, options);
  if (search === window.location.search) return;
  try {
    window.history.replaceState(null, '', `${window.location.pathname}${search}${window.location.hash}`);
  } catch {
    // 주소를 바꿀 수 없는 환경(미리보기 창 등)에서는 공유 링크 기능만 생략
  }
}
