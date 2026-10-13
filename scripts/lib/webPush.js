// 앱 알림(PWA 웹 푸시) 보내기 — scripts/notify.mjs에서 사용
// 보내는 데 필요한 web-push 패키지는 scripts 폴더에 설치합니다. (npm ci --prefix scripts)

const TTL_SECONDS = 12 * 60 * 60; // 휴대폰이 꺼져 있어도 12시간 안에 켜지면 전달

// 사이트에서 복사한 구독 정보: 기기마다 한 줄(JSON), 또는 JSON 배열
export function parseWebPushSubscriptions(text) {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) return [];
  const list = trimmed.startsWith('[')
    ? JSON.parse(trimmed)
    : trimmed
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, index) => {
          try {
            return JSON.parse(line);
          } catch {
            throw new Error(`${index + 1}번째 줄이 올바른 구독 정보가 아닙니다. 사이트에서 복사한 내용을 그대로 붙여 넣으세요.`);
          }
        });
  list.forEach((sub, index) => {
    if (!/^https:\/\//.test(sub?.endpoint ?? '') || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      throw new Error(`${index + 1}번째 구독 정보에 필요한 값(endpoint, keys)이 없습니다.`);
    }
  });
  return list;
}

// 기기마다 보내고 결과를 돌려줌: { sent, expired: [기기 순서], errors: [메시지] }
export async function sendWebPush(targets, payload, { publicKey, privateKey, subject }) {
  let webpush;
  try {
    ({ default: webpush } = await import('web-push'));
  } catch {
    return { sent: 0, expired: [], errors: ['web-push 패키지가 없습니다. 먼저 "npm ci --prefix scripts"를 실행하세요.'] };
  }

  const result = { sent: 0, expired: [], errors: [] };
  const body = JSON.stringify(payload);
  for (const [index, subscription] of targets.entries()) {
    try {
      await webpush.sendNotification(subscription, body, {
        TTL: TTL_SECONDS,
        vapidDetails: { subject, publicKey, privateKey },
      });
      result.sent += 1;
    } catch (error) {
      // 404·410: 사용자가 알림을 끄거나 앱을 지워 더 이상 없는 구독
      if (error.statusCode === 404 || error.statusCode === 410) result.expired.push(index);
      else result.errors.push(`${index + 1}번째 기기: ${error.statusCode ?? ''} ${error.body || error.message}`.trim());
    }
  }
  return result;
}
