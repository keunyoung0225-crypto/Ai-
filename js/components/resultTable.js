// 결과 표: config의 COLUMNS로 머리글과 행을 자동 생성
import { formatValue } from '../services/format.js';

function isSafeUrl(url) {
  try {
    return ['http:', 'https:'].includes(new URL(url, window.location.href).protocol);
  } catch {
    return false;
  }
}

// 특수한 칸 그리기 방식 (열 정의의 render 이름으로 선택)
const cellRenderers = {
  // 공고명(굵게) + 사업 요약
  titleWithSummary(policy) {
    const fragment = document.createDocumentFragment();
    const title = document.createElement(policy.url && isSafeUrl(policy.url) ? 'a' : 'span');
    title.className = 'policy-title';
    title.textContent = policy.title ?? '-';
    if (title.tagName === 'A') {
      title.href = policy.url;
      title.target = '_blank';
      title.rel = 'noopener noreferrer';
    }
    fragment.append(title);

    if (policy.content) {
      const summary = document.createElement('p');
      summary.className = 'policy-summary';
      summary.textContent = policy.content;
      fragment.append(summary);
    }
    return fragment;
  },
};

function createMessage(text, isError = false) {
  const message = document.createElement('p');
  message.className = `result-empty${isError ? ' is-error' : ''}`;
  message.textContent = text;
  return message;
}

export function createResultTable(container, columns) {
  const summary = document.createElement('p');
  summary.className = 'result-summary';
  summary.setAttribute('aria-live', 'polite');

  const table = document.createElement('table');
  table.className = 'result-table';
  const caption = document.createElement('caption');
  caption.className = 'visually-hidden';
  caption.textContent = '정책 공고 검색 결과';
  const headRow = document.createElement('tr');
  columns.forEach((column) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = column.label;
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
  container.replaceChildren(summary, body);

  function renderRow(policy) {
    const row = document.createElement('tr');
    columns.forEach((column) => {
      const td = document.createElement('td');
      if (column.nowrap) td.classList.add('is-nowrap');
      if (column.align === 'number') td.classList.add('is-number');

      const renderer = cellRenderers[column.render];
      if (renderer) {
        td.append(renderer(policy));
      } else {
        td.textContent = formatValue(policy[column.key], column.format);
      }
      row.append(td);
    });
    return row;
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

    render(policies) {
      summary.replaceChildren('검색결과 ');
      const count = document.createElement('strong');
      count.textContent = policies.length.toLocaleString('ko-KR');
      summary.append(count, '건');

      if (!policies.length) {
        body.replaceChildren(createMessage('조건에 맞는 공고가 없습니다. 검색 조건을 바꿔 보세요.'));
        return;
      }
      tbody.replaceChildren(...policies.map(renderRow));
      body.replaceChildren(tableWrap);
    },
  };
}
