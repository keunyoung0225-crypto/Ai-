// 어떤 출처의 데이터든 화면이 기대하는 공고 형태로 맞춥니다.
// id·공고명이 없는 항목은 버리고, 날짜·예산 형식을 정리합니다.
import { toDateString } from '../services/date.js';
import { isSafeUrl } from '../services/links.js';

// 공고 원문·신청 페이지 주소: http(s) 주소만 남김
function toLink(value) {
  const text = String(value ?? '').trim();
  return isSafeUrl(text) ? text : undefined;
}

function toAmount(value) {
  if (value == null || value === '') return null;
  const amount = Number(String(value).replaceAll(',', ''));
  return Number.isFinite(amount) ? amount : null;
}

export function normalizePolicy(raw) {
  if (!raw || raw.id == null || !raw.title) return null;
  return {
    ...raw,
    id: String(raw.id),
    title: String(raw.title),
    announceDate: toDateString(raw.announceDate),
    deadline: toDateString(raw.deadline),
    period: raw.period
      ? { start: toDateString(raw.period.start), end: toDateString(raw.period.end) }
      : null,
    budget: toAmount(raw.budget),
    url: toLink(raw.url),
    applyUrl: toLink(raw.applyUrl),
  };
}

export function normalizePolicies(list) {
  return list.map(normalizePolicy).filter(Boolean);
}
