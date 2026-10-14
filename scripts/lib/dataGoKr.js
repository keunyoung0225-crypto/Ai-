// 공공데이터포털(data.go.kr) API 공용 도구: 인증키 정리, 오류 코드를 한국어로 안내

// 공공데이터포털 공통 오류 코드 → 한국어 안내 ({api}는 활용신청한 API 이름)
const ERROR_HELP = {
  SERVICE_KEY_IS_NOT_REGISTERED_ERROR: (api) =>
    `등록되지 않은 인증키입니다. 공공데이터포털 마이페이지 → 활용신청 현황에서 "${api}"가 ` +
    '승인되었는지 확인하세요. 승인 직후에는 1~2시간 뒤부터 쓸 수 있습니다.',
  SERVICE_ACCESS_DENIED_ERROR: () => '이 API를 쓸 권한이 없습니다. 활용신청을 했는지 확인하세요.',
  LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR: () => '하루 호출 횟수를 넘었습니다. 내일 다시 시도됩니다.',
  DEADLINE_HAS_EXPIRED_ERROR: () => '활용 기간이 끝났습니다. 공공데이터포털에서 활용 기간을 연장하세요.',
  UNREGISTERED_IP_ERROR: () => '등록되지 않은 IP입니다. 활용신청 정보에서 IP 제한을 없애 주세요.',
};

// 오류 응답(JSON 또는 XML)에서 오류 코드 찾기 (예: SERVICE_KEY_IS_NOT_REGISTERED_ERROR)
function errorCodeOf(text) {
  const codes = String(text).match(/[A-Z]+(?:_[A-Z]+)*_ERROR/g) ?? [];
  return codes.find((code) => code in ERROR_HELP) ?? codes.find((code) => code !== 'SERVICE_ERROR');
}

// name: 화면에 보일 이름(예: '나라장터 API'), api: 활용신청한 API 이름
export function dataGoKrError(name, api, status, text) {
  const code = errorCodeOf(text);
  if (code) return new Error(`${name} 오류(${code}): ${ERROR_HELP[code]?.(api) ?? '공공데이터포털 안내를 확인하세요.'}`);
  return new Error(`${name} 오류 (${status}) ${String(text).replace(/\s+/g, ' ').slice(0, 120)}`);
}

// 공공데이터포털 화면의 인증키는 두 가지(Encoding/Decoding)입니다. 어느 쪽을 넣어도 되도록
// '%'가 들어 있는 Encoding 키는 원래 값으로 되돌린 뒤 주소에 넣습니다. (두 번 인코딩되면 '등록되지 않은 키' 오류)
export function normalizeServiceKey(key) {
  const trimmed = String(key ?? '').trim();
  if (!trimmed.includes('%')) return trimmed;
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}
