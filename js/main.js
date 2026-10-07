// 앱 시작점: 설정·데이터·상태·화면 부품을 연결합니다.
import {
  API_CONFIG,
  APP_TITLE,
  APP_SUBTITLE,
  CATEGORIES,
  COLUMNS,
  DATA_SOURCE,
  DATA_URL,
  DEADLINE_WARNING_DAYS,
  DEFAULT_SORT,
  DETAIL_FIELDS,
  EXPORT_FIELDS,
  PAGE_SIZE,
  RECOMMENDER,
  SEARCH_FIELDS,
  NEW_BADGE_DAYS,
  NOTIFY_CONFIG,
  SIMILAR_LIMIT,
  STORAGE_KEYS,
} from './config.js';
import { createStore, createEmptyFilters } from './state.js';
import { createRepository } from './data/repository.js';
import { filterPolicies, sortPolicies, uniqueValues } from './services/filter.js';
import { readUrlState, writeUrlState } from './services/urlState.js';
import { deadlineStatus, isDateString, todayString } from './services/date.js';
import { formatDate } from './services/format.js';
import { loadFavorites, saveFavorites, toggleFavorite } from './services/favorites.js';
import { downloadCsv, toCsv } from './services/csv.js';
import { recommendSimilar } from './services/recommend.js';
import { renderHeader } from './components/header.js';
import { createThemeToggle } from './components/themeToggle.js';
import { createCategoryTabs } from './components/categoryTabs.js';
import { createSearchForm } from './components/searchForm.js';
import { createResultTable } from './components/resultTable.js';
import { createResultActions } from './components/resultActions.js';
import { createSortSelect } from './components/sortSelect.js';
import { createLoadMore } from './components/loadMore.js';
import { createDetailModal } from './components/detailModal.js';
import { createDeadlineAlert } from './components/deadlineAlert.js';
import { createNotifySettings } from './components/notifySettings.js';

const URL_OPTIONS = {
  categories: CATEGORIES,
  fields: SEARCH_FIELDS,
  columns: COLUMNS,
  defaults: { category: CATEGORIES[0].id, sort: DEFAULT_SORT },
};

const CATEGORY_LABELS = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));

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

function exportValue(policy, field) {
  const value = policy[field.key];
  if (field.format === 'category') return CATEGORY_LABELS[value] ?? value;
  if (field.format === 'range') return value ? `${value.start ?? ''} ~ ${value.end ?? ''}` : '';
  return value;
}

function dataNotice({ source, error, policies }) {
  if (error) return '※ 실시간 공고를 불러오지 못해 시연용 가상 데이터를 표시합니다.';
  if (source === 'api') return '※ 공고 정보는 외부 API에서 불러왔습니다. 정확한 내용은 공고 원문을 확인하세요.';
  // 매일 갱신(scripts/update-data.mjs)으로 모은 공고에는 수집 출처(source)가 기록됨
  if (!policies.length || policies.some((p) => !p.source || p.source === 'sample')) {
    return '※ 화면에 표시된 공고는 시연용 가상 데이터입니다.';
  }
  const lastUpdate = policies.reduce((latest, p) => (p.firstSeen > latest ? p.firstSeen : latest), '');
  return `※ 공고는 매일 아침 자동으로 갱신됩니다.${lastUpdate ? ` (최근 새 공고: ${formatDate(lastUpdate)})` : ''} 정확한 내용은 공고 원문을 확인하세요.`;
}

function createDataRepository() {
  const fallback =
    DATA_SOURCE === 'api' && API_CONFIG.fallbackToJson ? { type: 'json', url: DATA_URL } : null;
  const options = DATA_SOURCE === 'api' ? { ...API_CONFIG, fallback } : { url: DATA_URL };
  return createRepository(DATA_SOURCE, options);
}

async function init() {
  renderHeader(document.getElementById('app-header'), { title: APP_TITLE, subtitle: APP_SUBTITLE });
  createThemeToggle(document.getElementById('theme-toggle'), { storageKey: STORAGE_KEYS.theme });

  // store는 데이터를 불러온 뒤 만들어지며, 아래 콜백들은 그 이후에만 호출됩니다.
  let store;
  const toggleFavoriteById = (id) =>
    store.set({ favorites: toggleFavorite(store.get().favorites, id) });

  const table = createResultTable(document.getElementById('result-table'), COLUMNS, {
    summary: document.getElementById('result-summary'),
    deadlineWarningDays: DEADLINE_WARNING_DAYS,
    newBadgeDays: NEW_BADGE_DAYS,
    onSort: (key) => store.set({ sort: nextSort(store.get().sort, key), visibleCount: PAGE_SIZE }),
    onOpenDetail: (id) => store.set({ detailId: id }),
    onToggleFavorite: toggleFavoriteById,
  });
  table.setLoading();

  let loaded;
  try {
    loaded = await createDataRepository().load();
  } catch (error) {
    console.error(error);
    table.setError('공고 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    return;
  }
  const { policies } = loaded;
  document.getElementById('data-notice').textContent = dataNotice(loaded);
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

  store = createStore({
    ...initial,
    visibleCount: PAGE_SIZE,
    favorites: loadFavorites(STORAGE_KEYS.favorites),
    favoritesOnly: false,
  });

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

  // 현재 검색·정렬 결과 전체 (더보기로 펼치지 않은 공고 포함)
  let currentResults = [];

  const actions = createResultActions(document.getElementById('result-actions'), {
    onToggleFavoritesOnly: () =>
      store.set({ favoritesOnly: !store.get().favoritesOnly, visibleCount: PAGE_SIZE }),
    onDownload: () => {
      const csv = toCsv(currentResults, EXPORT_FIELDS, exportValue);
      downloadCsv(`policymoa_${todayString().replaceAll('-', '')}.csv`, csv);
    },
  });

  const loadMore = createLoadMore(document.getElementById('load-more'), {
    onClick: () => {
      const shown = store.get().visibleCount;
      store.set({ visibleCount: shown + PAGE_SIZE });
      table.focusRow(shown);
    },
  });

  const modal = createDetailModal(DETAIL_FIELDS, {
    categoryLabels: CATEGORY_LABELS,
    deadlineWarningDays: DEADLINE_WARNING_DAYS,
    onClose: () => {
      if (store.get().detailId) store.set({ detailId: null });
    },
    onToggleFavorite: toggleFavoriteById,
    onOpenDetail: (id) => store.set({ detailId: id }),
    getSimilar: (policy) =>
      recommendSimilar(policy, policies, { provider: RECOMMENDER, limit: SIMILAR_LIMIT }),
  });

  const keywordField = SEARCH_FIELDS.find((field) => field.type === 'keyword');
  createNotifySettings(document.getElementById('notify-settings'), {
    policies,
    keywordFields: keywordField?.fields ?? ['title', 'content'],
    getCurrentKeyword: () => (keywordField ? store.get().filters[keywordField.key]?.trim() : ''),
    storageKey: STORAGE_KEYS.notify,
    config: NOTIFY_CONFIG,
  });

  const alert = createDeadlineAlert(document.getElementById('deadline-alert'), {
    onOpen: (id) => store.set({ detailId: id }),
  });

  let prev = null;
  const update = (state) => {
    const favorites = new Set(state.favorites);
    const favoritesChanged = !prev || prev.favorites !== state.favorites;

    // 목록에 영향을 주는 값이 바뀐 경우에만 다시 그림 (상세 보기·별 버튼의 초점 유지)
    const listChanged =
      !prev ||
      prev.category !== state.category ||
      prev.filters !== state.filters ||
      prev.sort !== state.sort ||
      prev.visibleCount !== state.visibleCount ||
      prev.favoritesOnly !== state.favoritesOnly ||
      (state.favoritesOnly && favoritesChanged);
    prev = state;

    if (listChanged) {
      tabs.setActive(state.category);
      sortSelect.setValue(state.sort);
      const base = state.favoritesOnly ? policies.filter((p) => favorites.has(p.id)) : policies;
      currentResults = sortPolicies(
        filterPolicies(base, state, SEARCH_FIELDS),
        state.sort,
        sortOptions(state.sort),
      );
      const visible = currentResults.slice(0, state.visibleCount);
      table.render(visible, {
        total: currentResults.length,
        sort: state.sort,
        favorites,
        emptyText:
          state.favoritesOnly && !favorites.size
            ? '관심공고가 없습니다. 공고명 옆 ☆을 눌러 추가해 보세요.'
            : undefined,
      });
      loadMore.render(visible.length, currentResults.length);
    } else if (favoritesChanged) {
      table.setFavorites(favorites);
    }

    actions.render({
      favoritesOnly: state.favoritesOnly,
      favoriteCount: favorites.size,
      resultCount: currentResults.length,
    });

    if (favoritesChanged) {
      saveFavorites(STORAGE_KEYS.favorites, state.favorites);
      alert.render(
        state.favorites
          .map((id) => policiesById.get(id))
          .filter(Boolean)
          .map((policy) => ({ policy, status: deadlineStatus(policy.deadline, DEADLINE_WARNING_DAYS) }))
          .filter(({ status }) => status?.tone === 'urgent')
          .sort((a, b) => a.policy.deadline.localeCompare(b.policy.deadline)),
      );
    }

    const detail = state.detailId && policiesById.get(state.detailId);
    if (detail) modal.open(detail, { isFavorite: favorites.has(detail.id) });
    else modal.close();

    writeUrlState(state, URL_OPTIONS);
  };
  store.subscribe(update);
  update(store.get());
}

init();
