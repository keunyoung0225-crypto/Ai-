// 서비스 워커: 사이트가 닫혀 있어도 휴대폰 알림(웹 푸시)을 받아 화면에 보여 줍니다.
// 알림은 매일 아침 GitHub Actions의 scripts/notify.mjs가 보냅니다.
// (화면·데이터는 캐시하지 않습니다. 공고 데이터가 매일 바뀌므로 항상 최신 내용을 받도록)

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// 보내온 내용: { title, body, url, tag }
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data?.text() };
  }
  const title = data.title || '정책한눈';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '관심 키워드에 맞는 새 공고가 있습니다.',
      icon: 'images/icon-192.png',
      badge: 'images/badge-96.png',
      tag: data.tag || 'policy-digest',
      renotify: true,
      lang: 'ko',
      data: { url: data.url || self.registration.scope },
    }),
  );
});

// 알림을 누르면 사이트를 열고, 이미 열려 있으면 그 창으로 이동
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || self.registration.scope, self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => client.url.startsWith(self.registration.scope));
      if (!open) return self.clients.openWindow(target);
      // 열린 창으로 이동이 안 되는 경우(서비스 워커 연결 전 창)에는 새 창으로 열기
      return open
        .focus()
        .then((client) => client.navigate(target))
        .catch(() => self.clients.openWindow(target));
    }),
  );
});
