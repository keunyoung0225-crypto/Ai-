// 제목부의 주요 숫자: 전체 공고, 접수 중, 마감 임박, 참여 기관
import { deadlineStatus } from '../services/date.js';

export function renderSummaryStats(container, policies, { deadlineWarningDays }) {
  const statuses = policies.map((policy) => deadlineStatus(policy.deadline, deadlineWarningDays));
  const open = statuses.filter((status) => status && status.tone !== 'closed').length;
  const urgent = statuses.filter((status) => status?.tone === 'urgent').length;
  const agencies = new Set(policies.map((policy) => policy.agency).filter(Boolean)).size;

  const items = [
    { label: '전체 공고', value: policies.length, unit: '건' },
    { label: '접수 중', value: open, unit: '건' },
    { label: `마감 임박 (${deadlineWarningDays}일 이내)`, value: urgent, unit: '건', tone: urgent ? 'urgent' : '' },
    { label: '참여 기관', value: agencies, unit: '곳' },
  ];

  container.replaceChildren(
    ...items.map(({ label, value, unit, tone }) => {
      const item = document.createElement('div');
      item.className = `summary-stats__item${tone ? ` is-${tone}` : ''}`;
      const term = document.createElement('dt');
      term.textContent = label;
      const desc = document.createElement('dd');
      const number = document.createElement('strong');
      number.textContent = value.toLocaleString('ko-KR');
      desc.append(number, unit);
      item.append(term, desc);
      return item;
    }),
  );
  container.hidden = false;
}
