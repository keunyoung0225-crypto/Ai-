// 앱 시작점: 설정·데이터·상태·화면 부품을 연결합니다.
import {
  APP_TITLE,
  APP_SUBTITLE,
  CATEGORIES,
  COLUMNS,
  DATA_SOURCE,
  DATA_URL,
  DEADLINE_WARNING_DAYS,
  DEFAULT_SORT,
  DETAIL_FIELDS,
  PAGE_SIZE,
  SEARCH_FIELDS,
} from './config.js';
import { createStore, createEmptyFilters } from './state.js';
import { createRepository } from './data/repository.js';
import { filterPolicies, sortPolicies, uniqueValues } from './services/filter.js';
import { readUrlState, writeUrlState } from './services/urlState.js';
import { isDateString, todayString } from './services/date.js';
import { renderHeader } from './components/header.js';
import { createCategoryTabs } from './components/categoryTabs.js';
import { createSearchForm } from './components/searchForm.js';
import { createResultTable } from './components/resultTable.js';
import { createSortSelect } from './components/sortSelect.js';
import { createLoadMore } from './components/loadMore.js';
import { createDetailModal } from './components/detailModal.js';

const URL_OPTIONS = {
  categories: CATEGORIES,
  fields: SEARCH_FIELDS,
  columns: COLUMNS,
  defaults: { category: CATEGORIES[0].id, sort: DEFAULT_SORT },
};

// 정렬 열을 누르면: 같은 열이면 방향 전환, 다른 열이면 그 열의 기본 방향
function nextSort(current, key) {
  if (current.key === key) return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
  const column = COLUMNS.find((c) => c.key === key);
  return { key, dir: column.sort.defaultDir };
}

// 정렬 열에 pastLast가 있으면 오늘 이전 날짜(마감된 공고)를 맨 뒤로
function sortOptions(sort) {
  const column = COLUMNS.find((c) => c.key === sort.key);
  if (!column?.sort?.pastLast) return {};
  const today = todayString();
  return { isLast: (policy) => isDateString(policy[sort.key]) && policy[sort.key] < today };
}

async function init() {
  renderHeader(document.getElementById('app-header'), { title: APP_TITLE, subtitle: APP_SUBTITLE });

  const table = createResultTable(document.getElementById('result-table'), COLUMNS, {
    summary: document.getElementById('result-summary'),
    deadlineWarningDays: DEADLINE_WARNING_DAYS,
    onSort: (key) => store.set({ sort: nextSort(store.get().sort, key), visibleCount: PAGE_SIZE }),
    onOpenDetail: (id) => store.set({ detailId: id }),
  });
  table.setLoading();

  let policies;
  try {
    policies = await createRepository(DATA_SOURCE, { url: DATA_URL }).getPolicies();
  } catch (error) {
    console.error(error);
    table.setError('공고 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    return;
  }
  const policiesById = new Map(policies.map((policy) => [policy.id, policy]));

  // select 검색 필드의 선택지는 데이터에서 자동 추출
  const selectOptions = Object.fromEntries(
    SEARCH_FIELDS.filter((field) => field.type === 'select').map((field) => [
      field.key,
      uniqueValues(policies, field.key),
    ]),
  );

  // 주소(URL)에 담긴 검색 상태로 시작. 데이터에 없는 값은 무시
  const initial = readUrlState(window.location.search, URL_OPTIONS);
  Object.entries(selectOptions).forEach(([key, options]) => {
    if (!options.includes(initial.filters[key])) initial.filters[key] = '';
  });
  if (!policiesById.has(initial.detailId)) initial.detailId = null;

  const store = createStore({ ...initial, visibleCount: PAGE_SIZE });

  const tabs = createCategoryTabs(document.getElementById('category-tabs'), CATEGORIES, {
    onChange: (category) => store.set({ category, visibleCount: PAGE_SIZE }),
  });

  const searchForm = createSearchForm(document.getElementById('search-form'), SEARCH_FIELDS, {
    options: selectOptions,
    onSearch: (filters) => store.set({ filters, visibleCount: PAGE_SIZE }),
    onReset: () => store.set({ filters: createEmptyFilters(SEARCH_FIELDS), visibleCount: PAGE_SIZE }),
  });
  searchForm.setValues(initial.filters);

  const sortSelect = createSortSelect(document.getElementById('sort-select'), COLUMNS, {
    onChange: (sort) => store.set({ sort, visibleCount: PAGE_SIZE }),
  });

  const loadMore = createLoadMore(document.getElementById('load-more'), {
    onClick: () => {
      const shown = store.get().visibleCount;
      store.set({ visibleCount: shown + PAGE_SIZE });
      table.focusRow(shown);
    },
  });

  const modal = createDetailModal(DETAIL_FIELDS, {
    categoryLabels: Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label])),
    deadlineWarningDays: DEADLINE_WARNING_DAYS,
    onClose: () => {
      if (store.get().detailId) store.set({ detailId: null });
    },
  });

  let prev = null;
  const update = (state) => {
    // 목록에 영향을 주는 값이 바뀐 경우에만 다시 그림 (상세 보기 열고 닫을 때 초점 유지)
    const listChanged =
      !prev ||
      prev.category !== state.category ||
      prev.filters !== state.filters ||
      prev.sort !== state.sort ||
      prev.visibleCount !== state.visibleCount;
    prev = state;

    if (listChanged) {
      tabs.setActive(state.category);
      sortSelect.setValue(state.sort);
      const results = sortPolicies(
        filterPolicies(policies, state, SEARCH_FIELDS),
        state.sort,
        sortOptions(state.sort),
      );
      const visible = results.slice(0, state.visibleCount);
      table.render(visible, { total: results.length, sort: state.sort });
      loadMore.render(visible.length, results.length);
    }

    const detail = state.detailId && policiesById.get(state.detailId);
    if (detail) modal.open(detail);
    else modal.close();

    writeUrlState(state, URL_OPTIONS);
  };
  store.subscribe(update);
  update(store.get());
}

init();
