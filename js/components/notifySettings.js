// 휴대폰 알림 설정 창: 관심 키워드를 정하고, 이 기기에서 앱 알림(PWA 웹 푸시)을 켜거나
// ntfy 앱 알림을 시험하고, 매일 아침 발송에 쓸 설정(alerts/subscriptions.json 내용)을 만들어 줍니다.
import { buildDigest, findAlertMatches, parseKeywords } from '../services/alerts.js';
import { isValidTopic, publishNtfy, randomTopic } from '../services/ntfy.js';
import { readJson, writeJson } from '../services/storage.js';
import {
  generateVapidKeys,
  getSubscription,
  isIos,
  isPushSupported,
  isStandalone,
  isValidVapidPublicKey,
  showPreview,
  subscribe,
  subscriptionText,
  unsubscribe,
} from '../services/webPush.js';

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else node.setAttribute(key, value);
  });
  node.append(...children);
  return node;
}

// 복사 버튼 공통 동작: 복사가 막힌 브라우저에서는 내용을 선택해 직접 복사하도록 안내
async function copyText(input, status) {
  try {
    await navigator.clipboard.writeText(input.value);
    status.textContent = '복사했습니다.';
  } catch {
    input.select();
    status.textContent = '선택된 내용을 Ctrl+C(⌘+C)로 복사하세요.';
  }
}

function copyBlock(id, label, { rows = 1 } = {}) {
  const input =
    rows > 1
      ? el('textarea', { id, class: 'input notify-textarea notify-code', rows: String(rows), readonly: '' })
      : el('input', { id, class: 'input notify-code', type: 'text', readonly: '', spellcheck: 'false' });
  const button = el('button', { type: 'button', class: 'btn btn--ghost', text: '복사' });
  const status = el('span', { class: 'notify-help', role: 'status' });
  button.addEventListener('click', () => copyText(input, status));
  const wrap = el('div', { class: 'search-field' }, [
    el('label', { class: 'search-field__label', for: id, text: label }),
    input,
    el('div', { class: 'notify-row' }, [button, status]),
  ]);
  return { wrap, input, status };
}

// buttonContainer: 헤더의 '휴대폰 알림' 버튼 자리
// getCurrentKeyword(): 지금 검색칸의 키워드 (처음 열 때 채워 넣기용)
export function createNotifySettings(
  buttonContainer,
  { policies, keywordFields, getCurrentKeyword, storageKey, config, appName },
) {
  const saved = readJson(storageKey, {});
  let topic = isValidTopic(saved.topic) ? saved.topic : randomTopic(config.topicPrefix);
  const webPush = config.webPush ?? {};
  const vapidPublicKey = String(webPush.vapidPublicKey ?? '').trim();
  const pushReady = isValidVapidPublicKey(vapidPublicKey);
  const pushEnv = webPush.subscriptionsEnv ?? 'WEB_PUSH_SUBSCRIPTIONS';

  const openButton = el('button', { type: 'button', class: 'header-button', text: '휴대폰 알림' });
  buttonContainer.replaceChildren(openButton);

  // ---------- 관심 키워드 ----------
  const keywordsInput = el('textarea', {
    id: 'notify-keywords',
    class: 'input notify-textarea',
    rows: '3',
    placeholder: '예)\n청년 창업\n돌봄',
  });
  keywordsInput.value = (saved.keywords ?? []).join('\n');
  const preview = el('p', { class: 'notify-help', 'aria-live': 'polite' });

  // ---------- ① 앱 알림 (PWA) ----------
  const pushStatus = el('p', { class: 'notify-status', role: 'status' });
  const iosHint = el('div', { class: 'notify-callout' }, [
    el('strong', { text: '아이폰·아이패드는 먼저 홈 화면에 추가해야 알림을 받을 수 있습니다.' }),
    el('ol', { class: 'notify-steps' }, [
      el('li', {}, ['Safari 아래쪽 ', el('strong', { text: '공유 버튼(□↑)' }), '을 누릅니다.']),
      el('li', {}, [el('strong', { text: '홈 화면에 추가' }), '를 누릅니다. (iOS 16.4 이상)']),
      el('li', {}, ['홈 화면에 생긴 ', el('strong', { text: '정책한눈' }), ' 아이콘으로 열고, 이 창에서 다시 알림을 켭니다.']),
    ]),
  ]);
  const enableButton = el('button', { type: 'button', class: 'btn btn--primary', text: '이 기기에서 알림 켜기' });
  const previewButton = el('button', { type: 'button', class: 'btn btn--ghost', text: '알림 미리보기' });
  const disableButton = el('button', { type: 'button', class: 'btn btn--ghost', text: '알림 끄기' });
  const subscriptionBlock = copyBlock('notify-subscription', '이 기기의 알림 구독 정보', { rows: 4 });
  const subscriptionArea = el('div', { class: 'notify-subscription' }, [
    subscriptionBlock.wrap,
    el('p', { class: 'notify-help' }, [
      '이 내용을 GitHub Secret ',
      el('code', { text: pushEnv }),
      '에 넣으면 이 기기로 매일 아침 알림이 옵니다. 기기가 여러 대면 한 줄에 하나씩 붙여 넣으세요. ',
      '(이 정보를 아는 사람은 이 기기로 알림을 보낼 수 있으니 공개된 곳에 올리지 마세요)',
    ]),
  ]);

  // 처음 한 번(운영자): 알림 키 만들기 — 공개 키가 아직 설정되지 않았을 때만 보임
  const keyButton = el('button', { type: 'button', class: 'btn btn--primary', text: '알림 키 만들기' });
  const publicKeyBlock = copyBlock('notify-vapid-public', '공개 키');
  const privateKeyBlock = copyBlock('notify-vapid-private', '비밀 키');
  const keyResult = el('div', { class: 'notify-keys' }, [
    publicKeyBlock.wrap,
    privateKeyBlock.wrap,
    el('ol', { class: 'notify-steps' }, [
      el('li', {}, [
        '공개 키를 저장소 ',
        el('code', { text: 'js/config.js' }),
        '의 ',
        el('code', { text: 'NOTIFY_CONFIG.webPush.vapidPublicKey' }),
        ' 따옴표 안에 붙여 넣고 저장합니다.',
      ]),
      el('li', {}, [
        'GitHub Secrets에 ',
        el('code', { text: 'VAPID_PUBLIC_KEY' }),
        ' = 공개 키, ',
        el('code', { text: 'VAPID_PRIVATE_KEY' }),
        ' = 비밀 키를 등록합니다.',
      ]),
      el('li', {}, ['사이트에 반영되면(1~2분) 이 창을 다시 열어 ', el('strong', { text: '이 기기에서 알림 켜기' }), '를 누릅니다.']),
    ]),
    el('p', {
      class: 'notify-help notify-warning',
      text: '비밀 키는 이 브라우저 안에서만 만들어지고 어디에도 저장되지 않습니다. 창을 닫기 전에 Secret에 등록하고, 다른 사람에게 보여 주지 마세요.',
    }),
  ]);
  keyResult.hidden = true;
  const keyMaker = el('div', { class: 'notify-callout' }, [
    el('strong', { text: '처음 한 번만 (운영자): 알림 키 만들기' }),
    el('p', {
      class: 'notify-help',
      text: '앱 알림을 보내려면 이 사이트 전용 알림 키 한 쌍(공개 키·비밀 키)이 필요합니다.',
    }),
    el('div', { class: 'notify-row' }, [keyButton]),
    keyResult,
  ]);

  // ---------- ntfy (다른 방법) ----------
  const topicInput = el('input', { id: 'notify-topic', class: 'input', type: 'text', spellcheck: 'false' });
  topicInput.value = topic;
  const newTopicButton = el('button', { type: 'button', class: 'btn btn--ghost', text: '새로 만들기' });
  const testButton = el('button', { type: 'button', class: 'btn btn--ghost', text: 'ntfy 테스트 알림 보내기' });
  const testStatus = el('p', { class: 'notify-help', role: 'status' });
  const ntfySection = el('details', { class: 'notify-details' }, [
    el('summary', { text: '다른 방법: 무료 앱 ntfy로 받기' }),
    el('ol', { class: 'notify-steps' }, [
      el('li', {}, ['휴대폰에 무료 앱 ', el('strong', { text: 'ntfy' }), '를 설치합니다. (Play 스토어·App Store에서 "ntfy" 검색)']),
      el('li', {}, ['앱에서 ', el('strong', { text: '+' }), '를 눌러 아래 알림 주제 이름을 구독하고, 테스트 알림이 오는지 확인합니다.']),
      el('li', {}, ['GitHub Secret ', el('code', { text: 'NTFY_TOPIC' }), '에 알림 주제 이름을 등록합니다.']),
    ]),
    el('div', { class: 'search-field' }, [
      el('label', { class: 'search-field__label', for: 'notify-topic', text: '알림 주제 이름' }),
      el('div', { class: 'notify-row' }, [topicInput, newTopicButton]),
      el('p', {
        class: 'notify-help',
        text: '이 이름을 아는 사람은 누구나 알림을 받아볼 수 있으니 추측하기 어려운 이름을 쓰세요.',
      }),
    ]),
    el('div', { class: 'notify-row' }, [testButton]),
    testStatus,
  ]);

  // ---------- ② GitHub 설정 ----------
  const configBlock = copyBlock('notify-config', `관심 키워드 설정 (${config.subscriptionsFile})`, { rows: 9 });
  const closeButton = el('button', { type: 'button', class: 'detail-modal__close', 'aria-label': '닫기', text: '×' });

  const panel = el('div', { class: 'detail-modal__panel notify-panel' }, [
    el('div', { class: 'detail-modal__header' }, [
      el('h2', { class: 'detail-modal__title', id: 'notify-title', text: '휴대폰 알림 설정' }),
      closeButton,
    ]),
    el('p', {
      class: 'notify-intro',
      text: `관심 키워드에 맞는 새 공고가 올라오면 매일 아침 ${config.sendTime}에 휴대폰으로 알려 드립니다. 별도 앱 설치 없이 이 사이트를 앱처럼 추가해 알림을 받습니다.`,
    }),
    el('div', { class: 'search-field' }, [
      el('label', { class: 'search-field__label', for: 'notify-keywords', text: '관심 키워드 (한 줄에 하나)' }),
      keywordsInput,
      preview,
    ]),
    el('h3', { class: 'detail-section__title', text: '① 이 휴대폰에서 알림 켜기' }),
    pushStatus,
    iosHint,
    keyMaker,
    el('div', { class: 'notify-row' }, [enableButton, previewButton, disableButton]),
    subscriptionArea,
    ntfySection,
    el('h3', { class: 'detail-section__title', text: '② 매일 아침 보내기 설정 (GitHub)' }),
    el('ol', { class: 'notify-steps' }, [
      el('li', {}, [
        '아래 설정을 복사해 저장소의 ',
        el('code', { text: config.subscriptionsFile }),
        ' 파일 내용으로 저장합니다.',
      ]),
      el('li', {}, [
        'GitHub 저장소 ',
        el('strong', { text: 'Settings → Secrets and variables → Actions' }),
        '에 위에서 만든 Secret(',
        el('code', { text: pushEnv }),
        ' 또는 ',
        el('code', { text: 'NTFY_TOPIC' }),
        ')이 있는지 확인합니다.',
      ]),
      el('li', {}, [
        '(선택) 같은 화면의 Variables에 ',
        el('code', { text: 'SITE_URL' }),
        '(사이트 주소)을 추가하면 알림을 눌렀을 때 그 주소가 열립니다.',
      ]),
    ]),
    configBlock.wrap,
  ]);

  const dialog = el('dialog', { class: 'detail-modal', 'aria-labelledby': 'notify-title' }, [panel]);
  document.body.append(dialog);

  // ---------- 동작 ----------
  function keywords() {
    return parseKeywords(keywordsInput.value);
  }

  function save() {
    writeJson(storageKey, { topic, keywords: keywords() });
  }

  function digestFor(list, { maxItems, titlePrefix }) {
    const matches = findAlertMatches(policies, { keywords: list }, keywordFields);
    return matches.length
      ? buildDigest(matches, { maxItems, titlePrefix })
      : { title: titlePrefix, message: `키워드 "${list.join(', ')}"에 맞는 공고가 아직 없습니다.` };
  }

  function render() {
    const list = keywords();
    const matches = findAlertMatches(policies, { keywords: list }, keywordFields);
    preview.textContent = list.length
      ? `지금 데이터에서 키워드에 맞는 공고: ${matches.length}건 (알림은 새로 올라온 공고만 보냅니다)`
      : '키워드를 입력하세요.';

    const subscription = {
      subscriptions: [
        { name: '운영자', webPushEnv: pushEnv, topicEnv: 'NTFY_TOPIC', keywords: list, categories: [] },
      ],
    };
    configBlock.input.value = JSON.stringify(subscription, null, 2);
    testButton.disabled = !list.length || !isValidTopic(topic);
  }

  // 이 기기의 앱 알림 상태에 맞게 안내·버튼 표시
  async function renderPush() {
    const supported = isPushSupported();
    const needsHomeScreen = isIos() && !isStandalone();
    iosHint.hidden = !needsHomeScreen;
    keyMaker.hidden = pushReady;

    let subscription = null;
    try {
      subscription = supported ? await getSubscription() : null;
    } catch {
      subscription = null;
    }

    enableButton.hidden = Boolean(subscription);
    enableButton.disabled = !supported || !pushReady;
    previewButton.hidden = !subscription;
    disableButton.hidden = !subscription;
    subscriptionArea.hidden = !subscription;
    if (subscription) subscriptionBlock.input.value = subscriptionText(subscription);

    if (!supported) {
      pushStatus.textContent = needsHomeScreen
        ? '아래 방법으로 홈 화면에 추가한 뒤 알림을 켤 수 있습니다.'
        : '이 브라우저는 앱 알림을 지원하지 않습니다. 크롬·엣지·삼성 인터넷이나 아래 ntfy 방법을 이용하세요.';
    } else if (!pushReady) {
      pushStatus.textContent = '앱 알림 준비 전입니다. 운영자가 아래에서 알림 키를 만들어 설정하면 켤 수 있습니다.';
    } else if (subscription) {
      pushStatus.textContent = '이 기기에서 알림이 켜져 있습니다. 아래 구독 정보를 GitHub Secret에 등록했는지 확인하세요.';
    } else if (Notification.permission === 'denied') {
      pushStatus.textContent =
        '이 사이트의 알림이 차단되어 있습니다. 브라우저 주소창의 자물쇠(사이트 설정)에서 알림을 허용으로 바꿔 주세요.';
    } else {
      pushStatus.textContent = '이 기기는 알림이 꺼져 있습니다.';
    }
  }

  keywordsInput.addEventListener('input', () => {
    save();
    render();
  });

  enableButton.addEventListener('click', async () => {
    enableButton.disabled = true;
    pushStatus.textContent = '알림을 켜는 중… (알림 허용 창이 뜨면 "허용"을 눌러 주세요)';
    try {
      await subscribe(vapidPublicKey);
      await renderPush();
      subscriptionBlock.status.textContent = '알림을 켰습니다. 구독 정보를 복사해 GitHub Secret에 등록하세요.';
    } catch (error) {
      await renderPush();
      pushStatus.textContent = error.message;
    }
  });

  previewButton.addEventListener('click', async () => {
    const list = keywords();
    const digest = digestFor(list, { maxItems: 3, titlePrefix: `[미리보기] ${appName}` });
    try {
      await showPreview({ title: digest.title, body: digest.message });
      pushStatus.textContent = '미리보기 알림을 보냈습니다. 실제 알림은 매일 아침 이런 모양으로 옵니다.';
    } catch (error) {
      pushStatus.textContent = error.message;
    }
  });

  disableButton.addEventListener('click', async () => {
    try {
      await unsubscribe();
    } finally {
      await renderPush();
      pushStatus.textContent = `이 기기의 알림을 껐습니다. GitHub Secret ${pushEnv}에서도 이 기기의 줄을 지워 주세요.`;
    }
  });

  keyButton.addEventListener('click', async () => {
    try {
      const keys = await generateVapidKeys();
      publicKeyBlock.input.value = keys.publicKey;
      privateKeyBlock.input.value = keys.privateKey;
      keyResult.hidden = false;
      keyButton.textContent = '다시 만들기';
    } catch {
      keyResult.hidden = true;
      pushStatus.textContent = '이 브라우저에서는 키를 만들 수 없습니다. 최신 크롬·엣지에서 다시 시도해 주세요.';
    }
  });

  topicInput.addEventListener('input', () => {
    topic = topicInput.value.trim();
    testStatus.textContent = '';
    topicInput.setAttribute('aria-invalid', String(!isValidTopic(topic)));
    if (isValidTopic(topic)) save();
    render();
  });

  newTopicButton.addEventListener('click', () => {
    topic = randomTopic(config.topicPrefix);
    topicInput.value = topic;
    testStatus.textContent = '';
    topicInput.removeAttribute('aria-invalid');
    save();
    render();
  });

  testButton.addEventListener('click', async () => {
    const digest = digestFor(keywords(), { maxItems: 3, titlePrefix: `[테스트] ${appName}` });
    testButton.disabled = true;
    testStatus.textContent = '보내는 중…';
    try {
      await publishNtfy({ server: config.server, topic, tags: ['bell'], ...digest });
      testStatus.textContent = `보냈습니다. ntfy 앱에서 "${topic}" 주제를 구독했다면 곧 알림이 옵니다.`;
    } catch (error) {
      testStatus.textContent = `${error.message} 인터넷 연결과 주제 이름을 확인해 주세요.`;
    } finally {
      testButton.disabled = false;
    }
  });

  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  openButton.addEventListener('click', () => {
    // 처음 열 때 키워드가 비어 있으면 지금 검색 중인 키워드를 채워 줌
    if (!keywords().length && getCurrentKeyword()) {
      keywordsInput.value = getCurrentKeyword();
      save();
    }
    [configBlock, subscriptionBlock].forEach((block) => (block.status.textContent = ''));
    testStatus.textContent = '';
    render();
    renderPush();
    dialog.showModal();
  });

  save();
  render();
}
