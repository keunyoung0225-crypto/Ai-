// 앱 시작점: 설정·데이터·상태·화면 부품을 연결합니다.
import {
  API_CONFIG,
  AD_SLOTS,
  APP_TITLE,
  APP_SHORT_TITLE,
  APP_SUBTITLE,
  CATEGORIES,
  COLUMNS,
  DATA_SOURCE,
  DATA_URL,
  DEADLINE_WARNING_DAYS,
  DEFAULT_SORT,
  DETAIL_FIELDS,
  EXPORT_FIELDS,
  HIDE_CLOSED,
  PAGE_SIZE,
  RECENT_SEARCH_LIMIT,
  RECOMMENDER,
  SEARCH_FIELDS,
  NEW_BADGE_DAYS,
  REGIONS,
  NOTIFY_CONFIG,
  SIMILAR_LIMIT,
  STORAGE_KEYS,
} from './config.js';
import { createStore, createEmptyFilters } from './state.js';
import { createRepository } from './data/repository.js';
import { STATUS_LABELS, filterPolicies, matchesKeyword, sortPolicies, uniqueValues } from './services/filter.js';
import { readValue, writeValue } from './services/storage.js';
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
import { renderSummaryStats } from './components/summaryStats.js';
import { createRecentSearch } from './components/recentSearch.js';
import { createRegionExplorer } from './components/regionExplorer.js';
import { renderAdSlot } from './components/adSlot.js';
import { KOREA_MAP_PATHS, KOREA_MAP_VIEWBOX } from './data/koreaMap.js';
import { regionLabel } from './services/regions.js';
import { registerServiceWorker } from './services/webPush.js';

const URL_OPTIONS = {
  categories: CATEGORIES,
  fields: SEARCH_FIELDS,
  columns: COLUMNS,
  regions: REGIONS,
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
  if (field.format === 'region') return regionLabel(value);
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
  // 앱 설치(홈 화면에 추가)·휴대폰 알림을 위한 서비스 워커 (실패해도 화면은 그대로)
  registerServiceWorker();
  // 광고 영역 (데이터를 불러오지 못해도 표시)
  renderAdSlot(document.getElementById('ad-side'), AD_SLOTS.side);
  document.body.classList.toggle('has-bottom-ad', Boolean(AD_SLOTS.bottom?.enabled));
  renderAdSlot(document.getElementById('ad-bottom'), AD_SLOTS.bottom, {
    onClose: () => document.body.classList.remove('has-bottom-ad'),
  });

  renderHeader(document.getElementById('app-header'), {
    title: APP_TITLE,
    subtitle: APP_SUBTITLE,
    emphasis: APP_SHORT_TITLE,
  });
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
  // 마감 지난 공고는 빼고 지원 가능한 공고만 (데이터 갱신 뒤 날짜가 바뀐 경우까지 화면에서 한 번 더 거름)
  const today = todayString();
  const policies = HIDE_CLOSED
    ? loaded.policies.filter((policy) => !isDateString(policy.deadline) || policy.deadline >= today)
    : loaded.policies;
  document.getElementById('data-notice').textContent = dataNotice(loaded);
  // 위쪽 숫자(전체 공고·접수 중·마감 임박)를 누르면 다른 조건을 모두 풀고 그 공고만 목록에 보여 줌
  const summaryStats = renderSummaryStats(document.getElementById('summary-stats'), policies, {
    deadlineWarningDays: DEADLINE_WARNING_DAYS,
    onSelect: (status) => showStatus(status),
  });
  const policiesById = new Map(policies.map((policy) => [policy.id, policy]));
  const filterOptions = { warningDays: DEADLINE_WARNING_DAYS };

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
    appName: APP_SHORT_TITLE,
  });

  const alert = createDeadlineAlert(document.getElementById('deadline-alert'), {
    onOpen: (id) => store.set({ detailId: id }),
  });

  // 최근 검색 공고: 마지막으로 검색한 키워드를 기억했다가, 키워드칸이 비어 있을 때 맞는 공고를 보여줌
  // 접수 중인 공고를 먼저, 그다음 최신 공고일 순
  let recentKeyword = readValue(STORAGE_KEYS.recentKeyword) ?? '';
  const recentMatches = (keyword) =>
    policies
      .filter((policy) => matchesKeyword(policy, keyword, keywordField.fields))
      .sort(
        (a, b) =>
          Number((a.deadline ?? '9999') < today) - Number((b.deadline ?? '9999') < today) ||
          (b.announceDate ?? '').localeCompare(a.announceDate ?? ''),
      );

  const recentSearch = createRecentSearch(document.getElementById('recent-search'), {
    deadlineWarningDays: DEADLINE_WARNING_DAYS,
    onOpen: (id) => store.set({ detailId: id }),
    onApply: (keyword) => {
      const filters = { ...createEmptyFilters(SEARCH_FIELDS), [keywordField.key]: keyword };
      searchForm.setValues(filters);
      store.set({ filters, visibleCount: PAGE_SIZE });
      document.getElementById('results').focus();
    },
    onClear: () => {
      recentKeyword = '';
      writeValue(STORAGE_KEYS.recentKeyword, null);
      renderRecent(store.get());
    },
  });

  function renderRecent(state) {
    const current = keywordField ? state.filters[keywordField.key]?.trim() : '';
    if (!keywordField || !recentKeyword || current) {
      recentSearch.render({ keyword: '' });
      return;
    }
    const matches = recentMatches(recentKeyword);
    recentSearch.render({
      keyword: recentKeyword,
      items: matches.slice(0, RECENT_SEARCH_LIMIT),
      total: matches.length,
    });
  }

  // 지역별 공고 지도
  const showResults = () => {
    const results = document.getElementById('results');
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    results.focus({ preventScroll: true });
  };
  const regionExplorer = createRegionExplorer(document.getElementById('region-explorer'), {
    regions: REGIONS,
    paths: KOREA_MAP_PATHS,
    viewBox: KOREA_MAP_VIEWBOX,
    deadlineWarningDays: DEADLINE_WARNING_DAYS,
    onSelect: (region) => store.set({ region, visibleCount: PAGE_SIZE }),
    onOpenDetail: (id) => store.set({ detailId: id }),
    onShowResults: showResults,
    // 지역 패널의 숫자: 지역은 그대로 두고 접수 상태만 바꿈
    onStatus: (status) => {
      store.set({ status, visibleCount: PAGE_SIZE });
      showResults();
    },
  });

  // 결과 위쪽의 조건 표시: '지역: 서울 ×', '접수 중만 ×' (누르면 그 조건 해제)
  const activeChips = document.getElementById('active-region');
  function chipButton(text, label, onClick) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip-button active-region__chip';
    chip.setAttribute('aria-label', label);
    chip.textContent = text;
    chip.addEventListener('click', onClick);
    return chip;
  }
  function renderActiveChips({ region, status }) {
    const chips = [];
    if (region) {
      chips.push(
        chipButton(`지역: ${regionLabel(region)} ×`, `지역 조건 ${regionLabel(region)} 해제`, () =>
          store.set({ region: '', visibleCount: PAGE_SIZE }),
        ),
      );
    }
    if (status) {
      chips.push(
        chipButton(`${STATUS_LABELS[status]}만 ×`, `${STATUS_LABELS[status]} 조건 해제`, () =>
          store.set({ status: '', visibleCount: PAGE_SIZE }),
        ),
      );
    }
    activeChips.replaceChildren(...chips);
  }

  // 검색유형·지역·검색 조건·관심공고만 보기가 하나도 없는 상태인지 (위쪽 '전체 공고' 표시용)
  const emptyFilters = createEmptyFilters(SEARCH_FIELDS);
  function isUnfiltered(state) {
    return (
      state.category === URL_OPTIONS.defaults.category &&
      !state.region &&
      !state.favoritesOnly &&
      JSON.stringify(state.filters) === JSON.stringify(emptyFilters)
    );
  }

  // 위쪽 숫자를 눌렀을 때: 다른 조건을 풀어 숫자와 같은 건수가 나오게 하고, 접수 중·마감 임박은 마감이 가까운 순으로
  function showStatus(status) {
    const filters = createEmptyFilters(SEARCH_FIELDS);
    searchForm.setValues(filters);
    store.set({
      category: URL_OPTIONS.defaults.category,
      region: '',
      filters,
      favoritesOnly: false,
      status,
      sort: status ? { key: 'deadline', dir: 'asc' } : DEFAULT_SORT,
      visibleCount: PAGE_SIZE,
    });
    showResults();
  }

  let prev = null;
  let prevFilters = null;
  const update = (state) => {
    const favorites = new Set(state.favorites);
    const favoritesChanged = !prev || prev.favorites !== state.favorites;

    // 목록에 영향을 주는 값이 바뀐 경우에만 다시 그림 (상세 보기·별 버튼의 초점 유지)
    const listChanged =
      !prev ||
      prev.category !== state.category ||
      prev.region !== state.region ||
      prev.status !== state.status ||
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
      // 버튼마다 '지금 검색 조건에서 그 유형을 고르면 나올 공고 수'를 표시
      tabs.setCounts(
        Object.fromEntries(
          CATEGORIES.map((c) => [c.id, filterPolicies(base, { ...state, category: c.id }, SEARCH_FIELDS, filterOptions).length]),
        ),
      );
      currentResults = sortPolicies(
        filterPolicies(base, state, SEARCH_FIELDS, filterOptions),
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

      // 지도: 지역 조건을 뺀 현재 검색 결과를 지역별로 셈
      const withoutRegion = filterPolicies(base, { ...state, region: '' }, SEARCH_FIELDS, filterOptions);
      const regionCounts = {};
      withoutRegion.forEach((policy) => {
        if (policy.region) regionCounts[policy.region] = (regionCounts[policy.region] ?? 0) + 1;
      });
      regionExplorer.render({
        selected: state.region,
        counts: regionCounts,
        items: currentResults,
        total: withoutRegion.length,
        statsItems: state.status
          ? filterPolicies(base, { ...state, status: '' }, SEARCH_FIELDS, filterOptions)
          : currentResults,
        status: state.status,
      });
      renderActiveChips(state);
      summaryStats.setActive(state.status, { unfiltered: isUnfiltered(state) });
    } else if (favoritesChanged) {
      table.setFavorites(favorites);
    }

    actions.render({
      favoritesOnly: state.favoritesOnly,
      favoriteCount: favorites.size,
      resultCount: currentResults.length,
    });

    // 키워드로 검색하면 그 키워드를 기억
    if (prevFilters !== state.filters) {
      const keyword = keywordField ? state.filters[keywordField.key]?.trim() : '';
      if (keyword && keyword !== recentKeyword) {
        recentKeyword = keyword;
        writeValue(STORAGE_KEYS.recentKeyword, keyword);
      }
      prevFilters = state.filters;
      renderRecent(state);
    }

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
