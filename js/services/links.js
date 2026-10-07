// 외부 링크(공고 원문·신청 페이지) 도구 — 브라우저와 Node.js 공용

// http·https 주소만 허용 (javascript: 같은 위험한 주소 차단)
export function isSafeUrl(url) {
  try {
    return ['http:', 'https:'].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

// 화면에 보여줄 짧은 주소: 'https://www.g2b.go.kr/notice/123' → 'g2b.go.kr/notice/123'
export function displayUrl(url, maxLength = 48) {
  try {
    const { hostname, pathname, search } = new URL(url);
    const text = `${hostname.replace(/^www\./, '')}${pathname === '/' ? '' : pathname}${search}`;
    return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
  } catch {
    return String(url ?? '');
  }
}

// 주소의 사이트 이름만: 'g2b.go.kr'
export function displayHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
