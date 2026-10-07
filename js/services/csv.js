// 엑셀(CSV) 파일 만들기·내려받기

// 엑셀이 수식으로 실행하지 않도록 =,+,-,@ 로 시작하는 글자는 앞에 '를 붙임
function escapeCell(value) {
  if (value == null) return '';
  let text = String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

// fields: [{ label }], getValue(row, field): 칸 값
export function toCsv(rows, fields, getValue) {
  const lines = [fields.map((field) => escapeCell(field.label)).join(',')];
  rows.forEach((row) => {
    lines.push(fields.map((field) => escapeCell(getValue(row, field))).join(','));
  });
  return lines.join('\r\n');
}

// 한글이 깨지지 않도록 BOM을 붙여 UTF-8로 저장
export function downloadCsv(filename, text) {
  const blob = new Blob(['﻿', text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
