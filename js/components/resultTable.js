// 결과 표: config의 COLUMNS로 머리글과 행을 자동 생성
// 모바일(좁은 화면)에서는 CSS가 각 행을 카드 형태로 바꿔 보여줍니다. (td의 data-label 사용)
import { formatValue } from '../services/format.js';
import { daysUntil, isDateString } from '../services/date.js';
import { displayHost, isSafeUrl } from '../services/links.js';
import { regionLabel } from '../services/regions.js';
import { createDeadlineBadge } from './deadlineBadge.js';
import { createFavoriteButton, setFavoriteState } from './favoriteButton.js';

const ARIA_SORT = { asc: 'ascending', desc: 'descending' };
const SORT_ARROW = { asc: '▲', desc: '▼' };

// 특수한 칸 그리기 방식 (열 정의의 render 이름으로 선택)
const cellRenderers = {
  // 관심공고 별 + 공고명(누르면 상세 보기) + 사업 요약
  titleWithSummary(policy, column, { onOpenDetail, onToggleFavorite, favorites, newBadgeDays }) {
    const fragment = document.createDocumentFragment();
    const head = document.createElement('div');
    head.className = 'policy-head';
    const title = document.createElement('button');
    title.type = 'button';
    title.className = 'policy-title';
    title.textContent = policy.title ?? '-';
    title.addEventListener('click', () => onOpenDetail(policy.id));
    head.append(
      createFavoriteButton(policy, { isFavorite: favorites.has(policy.id), onToggle: onToggleFavorite }),
      title,
    );
    // 매일 갱신에서 최근 새로 들어온 공고
    if (newBadgeDays > 0 && isDateString(policy.firstSeen) && daysUntil(policy.firstSeen) > -newBadgeDays) {
      const badge = document.createElement('span');
      badge.className = 'badge badge--new';
      badge.textContent = 'NEW';
      head.append(badge);
    }
    fragment.append(head);

    if (policy.content) {
      const summary = document.createElement('p');
      summary.className = 'policy-summary';
      summary.textContent = policy.content;
      fragment.append(summary);
    }

    // 신청 페이지 링크 (사이트 주소를 함께 표시, 새 창으로 열림)
    if (policy.applyUrl && isSafeUrl(policy.applyUrl)) {
      const link = document.createElement('a');
      link.className = 'apply-link';
      link.href = policy.applyUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.title = policy.applyUrl;
      link.setAttribute('aria-label', `${policy.title} 신청 페이지 (${displayHost(policy.applyUrl)}, 새 창)`);
      const label = document.createElement('strong');
      label.textContent = '신청하기';
      const host = document.createElement('span');
      host.className = 'apply-link__host';
      host.textContent = displayHost(policy.applyUrl);
      const mark = document.createElement('span');
      mark.setAttribute('aria-hidden', 'true');
      mark.textContent = '↗';
      link.append(label, host, mark);
      fragment.append(link);
    }
    return fragment;
  },

  // 주체기관 + 지역 표시
  agencyWithRegion(policy) {
    const fragment = document.createDocumentFragment();
    fragment.append(policy.agency ?? '-');
    const label = regionLabel(policy.region);
    if (label) {
      const tag = document.createElement('span');
      tag.className = 'region-tag';
      tag.textContent = label;
      fragment.append(tag);
    }
    return fragment;
  },

  // 마감일 + D-day 배지
  deadlineWithBadge(policy, column, { deadlineWarningDays }) {
    const fragment = document.createDocumentFragment();
    fragment.append(formatValue(policy[column.key], column.format));
    const badge = createDeadlineBadge(policy[column.key], deadlineWarningDays);
    if (badge) fragment.append(' ', badge);
    return fragment;
  },
};

function createMessage(text, isError = false) {
  const message = document.createElement('p');
  message.className = `result-empty${isError ? ' is-error' : ''}`;
  message.textContent = text;
  return message;
}

// summary: '검색결과 N건'을 표시할 요소
export function createResultTable(
  container,
  columns,
  { summary, onSort, onOpenDetail, onToggleFavorite, deadlineWarningDays, newBadgeDays = 0 },
) {
  const context = { onOpenDetail, onToggleFavorite, deadlineWarningDays, newBadgeDays, favorites: new Set() };

  const table = document.createElement('table');
  table.className = 'result-table';
  const caption = document.createElement('caption');
  caption.className = 'visually-hidden';
  caption.textContent = '정책 공고 검색 결과';

  const headRow = document.createElement('tr');
  const sortHeaders = [];
  columns.forEach((column) => {
    const th = document.createElement('th');
    th.scope = 'col';
    if (column.sort) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'sort-button';
      const arrow = document.createElement('span');
      arrow.className = 'sort-button__arrow';
      arrow.setAttribute('aria-hidden', 'true');
      button.append(column.label, arrow);
      button.addEventListener('click', () => onSort(column.key));
      th.append(button);
      sortHeaders.push({ key: column.key, th, arrow });
    } else {
      th.textContent = column.label;
    }
    headRow.append(th);
  });
  const thead = document.createElement('thead');
  thead.append(headRow);
  const tbody = document.createElement('tbody');
  table.append(caption, thead, tbody);

  const tableWrap = document.createElement('div');
  tableWrap.className = 'table-wrap';
  tableWrap.append(table);

  const body = document.createElement('div');
  container.replaceChildren(body);

  function renderRow(policy) {
    const row = document.createElement('tr');
    columns.forEach((column) => {
      const td = document.createElement('td');
      td.dataset.label = column.label;
      td.dataset.key = column.key;
      if (column.nowrap) td.classList.add('is-nowrap');
      if (column.align === 'number') td.classList.add('is-number');

      // 칸 내용을 하나의 요소로 감싸 모바일 카드(2열 그리드)에서도 한 덩어리로 배치
      const cell = document.createElement('div');
      const renderer = cellRenderers[column.render];
      if (renderer) {
        cell.append(renderer(policy, column, context));
      } else {
        cell.textContent = formatValue(policy[column.key], column.format);
      }
      td.append(cell);
      row.append(td);
    });
    return row;
  }

  function renderSortState(sort) {
    sortHeaders.forEach(({ key, th, arrow }) => {
      const active = key === sort.key;
      th.setAttribute('aria-sort', active ? ARIA_SORT[sort.dir] : 'none');
      th.classList.toggle('is-sorted', active);
      arrow.textContent = active ? SORT_ARROW[sort.dir] : '↕';
    });
  }

  return {
    setLoading() {
      summary.textContent = '';
      body.replaceChildren(createMessage('공고를 불러오는 중입니다…'));
    },

    setError(text) {
      summary.textContent = '';
      body.replaceChildren(createMessage(text, true));
    },

    // policies: 화면에 보여줄 공고, total: 검색된 전체 건수
    render(policies, { total, sort, favorites, emptyText }) {
      context.favorites = favorites;
      summary.replaceChildren('검색결과 ');
      const count = document.createElement('strong');
      count.textContent = total.toLocaleString('ko-KR');
      summary.append(count, '건');

      if (!total) {
        body.replaceChildren(createMessage(emptyText ?? '조건에 맞는 공고가 없습니다. 검색 조건을 바꿔 보세요.'));
        return;
      }
      renderSortState(sort);
      tbody.replaceChildren(...policies.map(renderRow));
      body.replaceChildren(tableWrap);
    },

    // 표를 다시 그리지 않고 별 표시만 갱신 (누른 버튼의 초점 유지)
    setFavorites(favorites) {
      context.favorites = favorites;
      tbody.querySelectorAll('[data-favorite-id]').forEach((button) => {
        setFavoriteState(button, favorites.has(button.dataset.favoriteId));
      });
    },

    // '더보기' 후 새로 나타난 첫 공고로 키보드 초점 이동
    focusRow(index) {
      tbody.rows[index]?.querySelector('.policy-title')?.focus();
    },
  };
}
