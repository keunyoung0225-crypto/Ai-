// 제목부의 주요 숫자: 전체 공고, 접수 중, 마감 임박, 참여 기관
// 전체 공고·접수 중·마감 임박은 누르면 그 공고만 목록에 보여 줌 (onSelect(status): '' | 'open' | 'closing')
import { deadlineStatus } from '../services/date.js';

export function renderSummaryStats(container, policies, { deadlineWarningDays, onSelect }) {
  const statuses = policies.map((policy) => deadlineStatus(policy.deadline, deadlineWarningDays));
  const open = statuses.filter((status) => status && status.tone !== 'closed').length;
  const urgent = statuses.filter((status) => status?.tone === 'urgent').length;
  const agencies = new Set(policies.map((policy) => policy.agency).filter(Boolean)).size;

  const items = [
    { label: '전체 공고', value: policies.length, unit: '건', status: '' },
    { label: '접수 중', value: open, unit: '건', status: 'open' },
    {
      label: `마감 임박 (${deadlineWarningDays}일 이내)`,
      value: urgent,
      unit: '건',
      status: 'closing',
      tone: urgent ? 'urgent' : '',
    },
    { label: '참여 기관', value: agencies, unit: '곳' },
  ];

  const buttons = new Map();
  container.replaceChildren(
    ...items.map(({ label, value, unit, tone, status }) => {
      const item = document.createElement('div');
      item.className = `summary-stats__item${tone ? ` is-${tone}` : ''}`;
      const term = document.createElement('dt');
      const desc = document.createElement('dd');
      const number = document.createElement('strong');
      number.textContent = value.toLocaleString('ko-KR');

      if (status === undefined || !onSelect) {
        term.textContent = label;
        desc.append(number, unit);
      } else {
        // 숫자를 누르면 목록이 그 공고만 보여 주도록 버튼으로 만듦
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'summary-stats__button';
        button.setAttribute('aria-label', `${label} ${value}건 목록 보기`);
        button.setAttribute('aria-pressed', 'false');
        const more = document.createElement('span');
        more.className = 'summary-stats__more';
        more.textContent = '목록 보기 →';
        more.setAttribute('aria-hidden', 'true');
        button.append(number, unit, more);
        button.addEventListener('click', () => onSelect(status));
        buttons.set(status, button);
        term.textContent = label;
        desc.append(button);
        item.classList.add('is-clickable');
      }
      item.append(term, desc);
      return item;
    }),
  );
  container.hidden = false;

  return {
    // 지금 적용된 접수 상태 조건을 표시 (전체 공고는 다른 조건이 하나도 없을 때만)
    setActive(status, { unfiltered = false } = {}) {
      buttons.forEach((button, key) => {
        const active = key ? key === status : !status && unfiltered;
        button.setAttribute('aria-pressed', String(active));
        button.closest('.summary-stats__item').classList.toggle('is-active', active);
      });
    },
  };
}
