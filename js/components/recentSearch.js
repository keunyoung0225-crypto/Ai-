// '최근 검색 공고': 마지막으로 검색한 키워드에 맞는 공고 몇 건을 다시 보여줌
import { formatValue } from '../services/format.js';
import { createDeadlineBadge } from './deadlineBadge.js';

export function createRecentSearch(container, { deadlineWarningDays, onOpen, onApply, onClear }) {
  container.setAttribute('aria-labelledby', 'recent-search-title');

  return {
    // keyword: 기억한 키워드(없으면 숨김), items: 보여줄 공고, total: 키워드에 맞는 전체 건수
    render({ keyword, items = [], total = 0 }) {
      container.hidden = !keyword;
      if (!keyword) {
        container.replaceChildren();
        return;
      }

      const title = document.createElement('h2');
      title.className = 'recent-search__title';
      title.id = 'recent-search-title';
      title.textContent = '최근 검색 공고';

      const chip = document.createElement('span');
      chip.className = 'recent-search__keyword';
      chip.textContent = `‘${keyword}’`;

      const applyButton = document.createElement('button');
      applyButton.type = 'button';
      applyButton.className = 'chip-button';
      applyButton.textContent = `전체 결과 보기 (${total.toLocaleString('ko-KR')})`;
      applyButton.disabled = total === 0;
      applyButton.addEventListener('click', () => onApply(keyword));

      const clearButton = document.createElement('button');
      clearButton.type = 'button';
      clearButton.className = 'recent-search__clear';
      clearButton.textContent = '지우기';
      clearButton.setAttribute('aria-label', '최근 검색 키워드 지우기');
      clearButton.addEventListener('click', onClear);

      const head = document.createElement('div');
      head.className = 'recent-search__head';
      const heading = document.createElement('div');
      heading.className = 'recent-search__heading';
      heading.append(title, chip);
      const actions = document.createElement('div');
      actions.className = 'recent-search__actions';
      actions.append(applyButton, clearButton);
      head.append(heading, actions);

      let body;
      if (!items.length) {
        body = document.createElement('p');
        body.className = 'recent-search__empty';
        body.textContent = '이 키워드에 맞는 공고가 아직 없습니다. 새 공고가 들어오면 여기에 표시됩니다.';
      } else {
        body = document.createElement('ul');
        body.className = 'recent-search__list';
        items.forEach((policy) => {
          const item = document.createElement('li');
          item.className = 'recent-search__item';

          const link = document.createElement('button');
          link.type = 'button';
          link.className = 'recent-search__link';
          link.textContent = policy.title;
          link.addEventListener('click', () => onOpen(policy.id));

          const meta = document.createElement('p');
          meta.className = 'recent-search__meta';
          meta.append(`${policy.agency ?? '-'} · 마감 ${formatValue(policy.deadline, 'date')}`);
          const badge = createDeadlineBadge(policy.deadline, deadlineWarningDays);
          if (badge) meta.append(' ', badge);

          item.append(link, meta);
          body.append(item);
        });
      }

      container.replaceChildren(head, body);
    },
  };
}
