// 화면 표시 형식 변환

// '2026-03-02' → '2026.03.02'
export function formatDate(value) {
  return value ? value.replaceAll('-', '.') : '-';
}

// { start, end } → '2026.04.01 ~ 2026.12.31'
export function formatRange(value) {
  if (!value) return '-';
  return `${formatDate(value.start)} ~ ${formatDate(value.end)}`;
}

// 원 단위 숫자 → '12억 5,000만원' / '4,800만원'
export function formatMoney(value) {
  const won = Number(value);
  if (value == null || value === '' || Number.isNaN(won)) return '-';

  const eok = Math.floor(won / 1e8);
  const man = Math.floor((won % 1e8) / 1e4);
  const parts = [];
  if (eok) parts.push(`${eok.toLocaleString('ko-KR')}억`);
  if (man) parts.push(`${man.toLocaleString('ko-KR')}만`);
  if (!parts.length) return `${won.toLocaleString('ko-KR')}원`;
  return `${parts.join(' ')}원`;
}

const formatters = {
  date: formatDate,
  range: formatRange,
  money: formatMoney,
};

// 열 정의의 format 이름으로 값을 변환 (format이 없으면 그대로 표시)
export function formatValue(value, format) {
  const formatter = formatters[format];
  if (formatter) return formatter(value);
  return value == null || value === '' ? '-' : String(value);
}
