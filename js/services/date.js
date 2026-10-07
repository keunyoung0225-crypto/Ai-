// 날짜 계산 (모든 날짜는 'YYYY-MM-DD' 문자열)

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isDateString(value) {
  return typeof value === 'string' && DATE_PATTERN.test(value);
}

// 사용자 기기 기준 오늘 날짜
export function todayString(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function toUtcDay(value) {
  const [y, m, d] = value.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

// today로부터 date까지 남은 일수 (지났으면 음수)
export function daysUntil(date, today = todayString()) {
  return Math.round((toUtcDay(date) - toUtcDay(today)) / 86400000);
}

// 마감 상태: { label, tone } — tone: 'closed'(마감) | 'urgent'(임박) | 'open'(진행)
export function deadlineStatus(deadline, warningDays, today = todayString()) {
  if (!isDateString(deadline)) return null;
  const days = daysUntil(deadline, today);
  if (days < 0) return { label: '마감', tone: 'closed' };
  return {
    label: days === 0 ? 'D-Day' : `D-${days}`,
    tone: days <= warningDays ? 'urgent' : 'open',
  };
}
