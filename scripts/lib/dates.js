// 스크립트 공용 날짜 도구 (한국 시각 기준)
const TIME_ZONE = 'Asia/Seoul';

// 한국 시각 기준 날짜 'YYYY-MM-DD'
export function koreaDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(date);
}

export function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
