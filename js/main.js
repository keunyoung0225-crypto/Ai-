// 앱 시작점: 설정·데이터·상태·화면 부품을 연결합니다.
import {
  APP_TITLE,
  APP_SUBTITLE,
  CATEGORIES,
  COLUMNS,
  DATA_SOURCE,
  DATA_URL,
  DEFAULT_SORT,
  SEARCH_FIELDS,
} from './config.js';
import { createStore, createEmptyFilters } from './state.js';
import { createRepository } from './data/repository.js';
import { filterPolicies, sortPolicies, uniqueValues } from './services/filter.js';
import { renderHeader } from './components/header.js';
import { createCategoryTabs } from './components/categoryTabs.js';
import { createSearchForm } from './components/searchForm.js';
import { createResultTable } from './components/resultTable.js';

async function init() {
  renderHeader(document.getElementById('app-header'), { title: APP_TITLE, subtitle: APP_SUBTITLE });

  const store = createStore({
    category: CATEGORIES[0].id,
    filters: createEmptyFilters(SEARCH_FIELDS),
    sort: DEFAULT_SORT,
  });

  const table = createResultTable(document.getElementById('result-table'), COLUMNS);
  table.setLoading();

  let policies;
  try {
    policies = await createRepository(DATA_SOURCE, { url: DATA_URL }).getPolicies();
  } catch (error) {
    console.error(error);
    table.setError('공고 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    return;
  }

  const tabs = createCategoryTabs(document.getElementById('category-tabs'), CATEGORIES, {
    onChange: (category) => store.set({ category }),
  });

  // select 검색 필드의 선택지는 데이터에서 자동 추출
  const selectOptions = Object.fromEntries(
    SEARCH_FIELDS.filter((field) => field.type === 'select').map((field) => [
      field.key,
      uniqueValues(policies, field.key),
    ]),
  );

  createSearchForm(document.getElementById('search-form'), SEARCH_FIELDS, {
    options: selectOptions,
    onSearch: (filters) => store.set({ filters }),
    onReset: () => store.set({ filters: createEmptyFilters(SEARCH_FIELDS) }),
  });

  const update = (state) => {
    tabs.setActive(state.category);
    table.render(sortPolicies(filterPolicies(policies, state, SEARCH_FIELDS), state.sort));
  };
  store.subscribe(update);
  update(store.get());
}

init();
