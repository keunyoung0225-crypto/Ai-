// 화면 모드 버튼: 자동(기기 설정) → 밝게 → 어둡게 순서로 바뀜
import { readValue, writeValue } from '../services/storage.js';

const MODES = ['system', 'light', 'dark'];
const LABELS = { system: '자동', light: '밝게', dark: '어둡게' };

function applyTheme(mode) {
  if (mode === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = mode;
}

export function createThemeToggle(container, { storageKey }) {
  const saved = readValue(storageKey);
  let mode = MODES.includes(saved) ? saved : 'system';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'header-button theme-toggle';

  function render() {
    button.textContent = `화면: ${LABELS[mode]}`;
    button.setAttribute('aria-label', `화면 모드 바꾸기 (현재: ${LABELS[mode]})`);
  }

  button.addEventListener('click', () => {
    mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
    applyTheme(mode);
    writeValue(storageKey, mode === 'system' ? null : mode);
    render();
  });

  applyTheme(mode);
  render();
  container.replaceChildren(button);
}
