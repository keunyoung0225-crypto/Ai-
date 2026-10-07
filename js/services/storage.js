// 브라우저 저장소(localStorage) 안전 사용
// 사생활 보호 모드 등에서 저장이 막혀도 앱은 저장 없이 그대로 동작합니다.
// 추후 로그인·서버 저장으로 바꿀 때는 이 파일의 함수만 교체하면 됩니다.
export function readValue(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeValue(key, value) {
  try {
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // 저장할 수 없는 환경: 이번 방문 동안만 유지
  }
}

export function readJson(key, fallback) {
  try {
    const text = readValue(key);
    return text == null ? fallback : JSON.parse(text);
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  writeValue(key, JSON.stringify(value));
}
