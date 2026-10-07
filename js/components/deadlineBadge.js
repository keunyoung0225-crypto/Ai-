// 마감 D-day 배지 (표·상세 보기에서 공통 사용)
import { deadlineStatus } from '../services/date.js';

export function createDeadlineBadge(deadline, warningDays) {
  const status = deadlineStatus(deadline, warningDays);
  if (!status) return null;

  const badge = document.createElement('span');
  badge.className = `badge badge--${status.tone}`;
  badge.textContent = status.label;
  if (status.tone === 'urgent') badge.title = '마감 임박';
  return badge;
}
