// 관심 키워드 알림: 일치 공고 찾기와 알림 문구 만들기 (웹 화면과 매일 발송 스크립트가 함께 사용)
import { matchesKeyword } from './filter.js';
import { formatDate } from './format.js';

// 줄바꿈·쉼표로 나눈 키워드 목록 (빈 값·중복 제거)
export function parseKeywords(text) {
  const list = String(text ?? '')
    .split(/[\n,]/)
    .map((word) => word.trim().replace(/\s+/g, ' '))
    .filter(Boolean);
  return [...new Set(list)];
}

// since ≤ 공고일 < until 인 공고 중 키워드가 하나라도 맞는 공고 (최신 공고일 순)
export function findAlertMatches(policies, { keywords, categories = [], since, until }, keywordFields) {
  return policies
    .filter(
      (policy) =>
        (!since || (policy.announceDate && policy.announceDate >= since)) &&
        (!until || (policy.announceDate && policy.announceDate < until)) &&
        (!categories.length || categories.includes(policy.category)),
    )
    .map((policy) => ({
      policy,
      keywords: keywords.filter((keyword) => matchesKeyword(policy, keyword, keywordFields)),
    }))
    .filter((match) => match.keywords.length)
    .sort((a, b) => (b.policy.announceDate ?? '').localeCompare(a.policy.announceDate ?? ''));
}

// 알림 내용: { title, message, click }
export function buildDigest(matches, { maxItems = 10, siteUrl, titlePrefix = '정책한눈' } = {}) {
  const lines = matches.slice(0, maxItems).map(
    ({ policy, keywords }) =>
      `• ${policy.title}\n  ${policy.agency ?? '-'} · 마감 ${formatDate(policy.deadline)} · 키워드: ${keywords.join(', ')}`,
  );
  if (matches.length > maxItems) lines.push(`외 ${matches.length - maxItems}건`);

  // 알림을 누르면 사이트로 이동 (키워드가 하나면 그 키워드로 검색한 화면)
  const allKeywords = [...new Set(matches.flatMap((match) => match.keywords))];
  let click;
  if (siteUrl) {
    const url = new URL(siteUrl);
    if (allKeywords.length === 1) url.searchParams.set('keyword', allKeywords[0]);
    click = url.toString();
  }

  return {
    title: `${titlePrefix} 새 공고 ${matches.length}건`,
    message: lines.join('\n'),
    click,
  };
}
