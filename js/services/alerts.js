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
      `• ${policy.title}\n  ${policy.agency ?? '-'} · 마감 ${formatDate(policy.deadline)} · 키워드: ${keywords.join(', ')}` +
      (policy.applyUrl ? `\n  신청: ${policy.applyUrl}` : ''),
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
    title: `${titlePrefix} 새 공고 ${matches.length}건 (${keywordLabel(allKeywords)})`,
    message: lines.join('\n'),
    click,
  };
}

// 제목에 넣을 키워드 표시: 3개까지 보여 주고 나머지는 '외 n개'
function keywordLabel(keywords, max = 3) {
  const shown = keywords.slice(0, max).join('·');
  return keywords.length > max ? `${shown} 외 ${keywords.length - max}개` : shown;
}

// 마감일 짧게: '2026-10-20' → '10.20'
function shortDate(value) {
  return value ? value.slice(5).replace('-', '.') : '';
}

// 앱 알림(PWA)용: 키워드마다 알림 한 건씩 만들어, 어떤 키워드의 공고인지 제목에서 바로 보이게 함
// 알림 제목: '[돌봄] 새 공고 2건' / 본문: 공고명(마감일)을 한 줄에 하나씩
// 반환: [{ title, body, url, tag }] — url은 그 키워드로 검색한 사이트 화면
export function buildKeywordAlerts(
  matches,
  keywords,
  { siteUrl, maxItems = 4, maxAlerts = 5, titleSuffix = '', titleLimit = 40 } = {},
) {
  const groups = keywords
    .map((keyword) => ({ keyword, items: matches.filter((match) => match.keywords.includes(keyword)) }))
    .filter((group) => group.items.length);

  const alerts = groups.slice(0, maxAlerts).map(({ keyword, items }) => {
    const lines = items.slice(0, maxItems).map(({ policy }) => {
      const title = policy.title.length > titleLimit ? `${policy.title.slice(0, titleLimit)}…` : policy.title;
      const deadline = shortDate(policy.deadline);
      return deadline ? `${title} (마감 ${deadline})` : title;
    });
    if (items.length > maxItems) lines.push(`외 ${items.length - maxItems}건`);

    // 사이트 주소가 없으면 알림을 보낸 사이트 기준 상대 주소(서비스 워커가 사이트 주소로 바꿈)
    const url = new URL(siteUrl || 'https://site.invalid/');
    url.searchParams.set('keyword', keyword);
    return {
      title: `[${keyword}] 새 공고 ${items.length}건${titleSuffix}`,
      body: lines.join('\n'),
      url: siteUrl ? url.toString() : `./${url.search}`,
      tag: `policy-${keyword}`,
    };
  });

  // 알림이 너무 많아지지 않도록 나머지 키워드는 마지막 알림에 덧붙임
  const rest = groups.slice(maxAlerts);
  if (rest.length && alerts.length) {
    const last = alerts[alerts.length - 1];
    last.body += `\n그 밖의 키워드: ${rest.map((group) => `${group.keyword} ${group.items.length}건`).join(', ')}`;
  }
  return alerts;
}
