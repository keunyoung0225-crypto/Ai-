// 휴대폰 알림 설정 창: 관심 키워드·알림 주제를 정하고, 테스트 알림을 보내고,
// 매일 아침 발송에 쓸 설정(alerts/subscriptions.json 내용)을 만들어 줍니다.
import { buildDigest, findAlertMatches, parseKeywords } from '../services/alerts.js';
import { isValidTopic, publishNtfy, randomTopic } from '../services/ntfy.js';
import { readJson, writeJson } from '../services/storage.js';

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

// buttonContainer: 헤더의 '휴대폰 알림' 버튼 자리
// getCurrentKeyword(): 지금 검색칸의 키워드 (처음 열 때 채워 넣기용)
export function createNotifySettings(
  buttonContainer,
  { policies, keywordFields, getCurrentKeyword, storageKey, config },
) {
  const saved = readJson(storageKey, {});
  let topic = isValidTopic(saved.topic) ? saved.topic : randomTopic(config.topicPrefix);

  const openButton = el('button', { type: 'button', class: 'header-button', text: '휴대폰 알림' });
  buttonContainer.replaceChildren(openButton);

  // ---------- 창 구성 ----------
  const keywordsInput = el('textarea', {
    id: 'notify-keywords',
    class: 'input notify-textarea',
    rows: '3',
    placeholder: '예)\n청년 창업\n돌봄',
  });
  keywordsInput.value = (saved.keywords ?? []).join('\n');

  const preview = el('p', { class: 'notify-help', 'aria-live': 'polite' });

  const topicInput = el('input', { id: 'notify-topic', class: 'input', type: 'text', spellcheck: 'false' });
  topicInput.value = topic;
  const newTopicButton = el('button', { type: 'button', class: 'btn btn--ghost', text: '새로 만들기' });

  const testButton = el('button', { type: 'button', class: 'btn btn--primary', text: '테스트 알림 보내기' });
  const testStatus = el('p', { class: 'notify-help', role: 'status' });

  const configOutput = el('textarea', {
    id: 'notify-config',
    class: 'input notify-textarea notify-code',
    rows: '9',
    readonly: '',
  });
  const copyButton = el('button', { type: 'button', class: 'btn btn--ghost', text: '설정 복사' });
  const copyStatus = el('span', { class: 'notify-help', role: 'status' });

  const closeButton = el('button', { type: 'button', class: 'detail-modal__close', 'aria-label': '닫기', text: '×' });

  const steps = el('ol', { class: 'notify-steps' }, [
    el('li', {}, ['휴대폰에 무료 앱 ', el('strong', { text: 'ntfy' }), '를 설치합니다. (Play 스토어·App Store에서 "ntfy" 검색)']),
    el('li', {}, ['앱에서 ', el('strong', { text: '+' }), '를 눌러 위의 알림 주제 이름을 구독하고, 테스트 알림이 오는지 확인합니다.']),
    el('li', {}, [
      'GitHub 저장소 ',
      el('strong', { text: 'Settings → Secrets and variables → Actions' }),
      '에서 Secret을 추가합니다. 이름: ',
      el('code', { text: 'NTFY_TOPIC' }),
      ', 값: 알림 주제 이름',
    ]),
    el('li', {}, [
      '아래 설정을 복사해 저장소의 ',
      el('code', { text: config.subscriptionsFile }),
      ' 파일 내용으로 저장합니다.',
    ]),
    el('li', {}, [
      '(선택) 같은 화면의 Variables에 ',
      el('code', { text: 'SITE_URL' }),
      '(사이트 주소)을 추가하면 알림을 눌렀을 때 사이트가 열립니다.',
    ]),
  ]);

  const panel = el('div', { class: 'detail-modal__panel notify-panel' }, [
    el('div', { class: 'detail-modal__header' }, [
      el('h2', { class: 'detail-modal__title', id: 'notify-title', text: '휴대폰 알림 설정' }),
      closeButton,
    ]),
    el('p', {
      class: 'notify-intro',
      text: `관심 키워드에 맞는 새 공고가 올라오면 매일 아침 ${config.sendTime}에 휴대폰으로 알려 드립니다. 무료 알림 앱 ntfy를 사용합니다.`,
    }),
    el('div', { class: 'search-field' }, [
      el('label', { class: 'search-field__label', for: 'notify-keywords', text: '관심 키워드 (한 줄에 하나)' }),
      keywordsInput,
      preview,
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
    el('h3', { class: 'detail-section__title', text: '매일 아침 알림 받기 설정' }),
    steps,
    configOutput,
    el('div', { class: 'notify-row' }, [copyButton, copyStatus]),
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

  function render() {
    const list = keywords();
    const matches = findAlertMatches(policies, { keywords: list }, keywordFields);
    preview.textContent = list.length
      ? `지금 데이터에서 키워드에 맞는 공고: ${matches.length}건 (알림은 새로 올라온 공고만 보냅니다)`
      : '키워드를 입력하세요.';

    const subscription = {
      subscriptions: [{ name: '운영자', topicEnv: 'NTFY_TOPIC', keywords: list, categories: [] }],
    };
    configOutput.value = JSON.stringify(subscription, null, 2);
    testButton.disabled = !list.length || !isValidTopic(topic);
  }

  keywordsInput.addEventListener('input', () => {
    save();
    render();
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
    const list = keywords();
    const matches = findAlertMatches(policies, { keywords: list }, keywordFields);
    const digest = matches.length
      ? buildDigest(matches, { maxItems: 3, titlePrefix: '[테스트] 정책모아' })
      : { title: '[테스트] 정책모아', message: `키워드 "${list.join(', ')}"에 맞는 공고가 아직 없습니다.` };

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

  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(configOutput.value);
      copyStatus.textContent = '복사했습니다.';
    } catch {
      configOutput.select();
      copyStatus.textContent = '선택된 내용을 Ctrl+C(⌘+C)로 복사하세요.';
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
    copyStatus.textContent = '';
    testStatus.textContent = '';
    render();
    dialog.showModal();
  });

  save();
  render();
}
