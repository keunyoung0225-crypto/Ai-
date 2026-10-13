// 웹 푸시(PWA 알림): 서비스 워커 등록, 이 기기의 알림 구독 켜기·끄기, 알림 키(VAPID) 만들기
// 구독 정보(JSON)는 매일 아침 알림을 보내는 GitHub Actions의 Secret에 등록해 사용합니다.

const SERVICE_WORKER_URL = 'sw.js';

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// 아이폰·아이패드 (iPadOS는 Mac처럼 보이므로 터치 지원으로 구분)
export function isIos() {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

// 홈 화면에 추가한 앱으로 열었는지
export function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
}

// 앱 설치·알림에 필요한 서비스 워커 등록 (지원하지 않거나 실패해도 사이트는 그대로 동작)
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register(SERVICE_WORKER_URL);
  } catch (error) {
    console.warn('서비스 워커 등록 실패:', error);
    return null;
  }
}

async function readyRegistration() {
  const registration = (await navigator.serviceWorker.getRegistration()) ?? (await registerServiceWorker());
  if (!registration) throw new Error('이 브라우저에서는 알림 기능을 준비하지 못했습니다.');
  return navigator.serviceWorker.ready;
}

function fromBase64Url(text) {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(text.length / 4) * 4, '=');
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

function toBase64Url(bytes) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// 공개 키는 65바이트(0x04로 시작)여야 함
export function isValidVapidPublicKey(key) {
  try {
    const bytes = fromBase64Url(String(key ?? '').trim());
    return bytes.length === 65 && bytes[0] === 4;
  } catch {
    return false;
  }
}

export async function getSubscription() {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  return registration ? registration.pushManager.getSubscription() : null;
}

// 알림 허용을 묻고 이 기기를 구독. 성공하면 구독 정보(JSON 문자열)를 돌려줌
export async function subscribe(vapidPublicKey) {
  if (!isPushSupported()) throw new Error('이 브라우저는 알림을 지원하지 않습니다.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('알림이 허용되지 않았습니다. 브라우저(또는 휴대폰) 설정에서 이 사이트의 알림을 허용해 주세요.');
  }
  const registration = await readyRegistration();
  const existing = await registration.pushManager.getSubscription();
  if (existing) return subscriptionText(existing);
  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: fromBase64Url(vapidPublicKey),
    });
    return subscriptionText(subscription);
  } catch (error) {
    throw new Error(
      `알림 등록에 실패했습니다. 잠시 후 다시 시도하거나 크롬·삼성 인터넷·Safari(홈 화면 앱)로 시도해 주세요. (${error.message})`,
    );
  }
}

export async function unsubscribe() {
  const subscription = await getSubscription();
  if (subscription) await subscription.unsubscribe();
}

export function subscriptionText(subscription) {
  return JSON.stringify(subscription.toJSON());
}

// 이 기기에 알림이 어떻게 보이는지 미리보기 (실제 발송은 매일 아침 GitHub Actions가 함)
export async function showPreview({ title, body, url, tag }) {
  const registration = await readyRegistration();
  await registration.showNotification(title, {
    body,
    icon: 'images/icon-192.png',
    badge: 'images/badge-96.png',
    tag: `preview-${tag ?? 'policy'}`,
    data: { url: new URL(url || './', registration.scope).href },
  });
}

// 알림 키(VAPID) 한 쌍 만들기: 이 브라우저 안에서만 만들어지고 어디에도 보내거나 저장하지 않음
export async function generateVapidKeys() {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  const x = fromBase64Url(jwk.x);
  const y = fromBase64Url(jwk.y);
  const publicKey = new Uint8Array([4, ...x, ...y]);
  return { publicKey: toBase64Url(publicKey), privateKey: jwk.d };
}
