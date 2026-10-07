// ntfy(무료 푸시 알림 서비스)로 알림 보내기 — 브라우저와 Node.js 모두에서 동작
// 참고: https://docs.ntfy.sh/publish/

const TOPIC_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export function isValidTopic(topic) {
  return TOPIC_PATTERN.test(topic ?? '');
}

// 추측하기 어려운 주제 이름 (이 이름을 아는 사람은 누구나 알림을 볼 수 있으므로)
export function randomTopic(prefix = '') {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const id = [...bytes].map((byte) => (byte % 36).toString(36)).join('');
  return `${prefix}${id}`;
}

// delay: 예약 발송 시각(유닉스 초) 또는 '30m' 같은 기간. token: 보호된 주제용 접근 토큰(선택)
export async function publishNtfy({ server = 'https://ntfy.sh', topic, title, message, click, tags, delay, token }) {
  if (!isValidTopic(topic)) {
    throw new Error('알림 주제 이름은 영문·숫자·-·_ 로 64자 이내여야 합니다.');
  }
  const body = { topic, title, message };
  if (click) body.click = click;
  if (tags?.length) body.tags = tags;
  if (delay) body.delay = String(delay);

  const response = await fetch(`${server.replace(/\/+$/, '')}/`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`알림을 보내지 못했습니다 (${response.status})`);
  }
  return response.json();
}
