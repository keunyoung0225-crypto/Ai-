// 검색·정렬 로직 (화면과 무관한 순수 함수).

// 키워드 검색: fields 항목들에 띄어쓰기로 나눈 단어가 모두 들어 있으면 일치 (검색 화면·알림 공용)
export function matchesKeyword(policy, query, fields) {
  const words = (query ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = fields
    .map((key) => policy[key] ?? '')
    .join(' ')
    .toLowerCase();
  return words.every((word) => haystack.includes(word));
}

// 검색 필드 type별 일치 여부 판단: (공고의 해당 값, 검색 조건, 필드 정의, 공고 전체)
const matchers = {
  text(value, query) {
    const needle = (query ?? '').trim().toLowerCase();
    if (!needle) return true;
    return String(value ?? '').toLowerCase().includes(needle);
  },

  // 여러 항목(field.fields)을 한꺼번에 검색. 띄어쓰기로 나눈 단어가 모두 들어 있어야 일치
  keyword(value, query, field, policy) {
    return matchesKeyword(policy, query, field.fields);
  },

  select(value, selected) {
    return !selected || value === selected;
  },

  // value가 날짜 문자열이면 그 날짜가, {start, end} 기간이면 기간이 [from, to]와 겹치는지 검사
  dateRange(value, range) {
    const { from, to } = range ?? {};
    if (!from && !to) return true;
    if (!value) return false;
    const start = typeof value === 'object' ? value.start : value;
    const end = typeof value === 'object' ? value.end : value;
    return (!from || end >= from) && (!to || start <= to);
  },
};

// region: 지역 id ('' 또는 없으면 전체)
export function filterPolicies(policies, { category, filters, region }, fields) {
  return policies.filter(
    (policy) =>
      (category === 'all' || policy.category === category) &&
      (!region || policy.region === region) &&
      fields.every((field) =>
        matchers[field.type](policy[field.key], filters[field.key], field, policy),
      ),
  );
}

// 정렬 기준값: 기간은 시작일 기준
function sortValue(value) {
  return value && typeof value === 'object' ? value.start : value;
}

// options.isLast(policy)가 true인 공고는 정렬 방향과 관계없이 맨 뒤로 보냄
export function sortPolicies(policies, { key, dir }, { isLast } = {}) {
  const sign = dir === 'desc' ? -1 : 1;
  return [...policies].sort((a, b) => {
    if (isLast) {
      const aLast = isLast(a);
      if (aLast !== isLast(b)) return aLast ? 1 : -1;
    }
    const left = sortValue(a[key]);
    const right = sortValue(b[key]);
    if (left == null) return 1;
    if (right == null) return -1;
    if (left < right) return -sign;
    if (left > right) return sign;
    return 0;
  });
}

// select 검색 필드의 선택지: 데이터에 있는 값을 중복 없이 가나다순으로
export function uniqueValues(policies, key) {
  return [...new Set(policies.map((policy) => policy[key]).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'ko'),
  );
}
