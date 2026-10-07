// 광고 영역: 설정(config.js의 AD_SLOTS)에 이미지·링크가 있으면 광고를, 없으면 빈 광고 틀을 보여 줌
// 실제 광고 네트워크(예: 애드센스)를 쓸 때는 이 틀 안에 그 광고 코드를 넣으면 됩니다.
// resizable이 켜져 있으면 틀 아래 손잡이로 세로 높이를 조절할 수 있습니다.
import { isSafeUrl } from '../services/links.js';
import { readValue, writeValue } from '../services/storage.js';

const KEY_STEP = 20; // 키보드 ↑↓ 한 번에 바뀌는 높이(px)
const VIEWPORT_MARGIN = 72; // 화면 위아래 여백 (틀 + 손잡이가 화면 안에 들어오도록)

export function renderAdSlot(container, slot, { onClose } = {}) {
  if (!slot?.enabled) {
    container.hidden = true;
    return;
  }

  const frame = document.createElement('div');
  frame.className = 'ad-slot__frame';
  frame.style.setProperty('--ad-width', `${slot.width}px`);

  // 광고임을 알리는 표시
  const tag = document.createElement('span');
  tag.className = 'ad-slot__tag';
  tag.textContent = '광고';

  const sizeText = document.createElement('span');
  const imageUrl = resolveImageUrl(slot.imageUrl);
  const isImageAd = imageUrl && isSafeUrl(imageUrl) && isSafeUrl(slot.linkUrl);
  if (isImageAd) {
    const link = document.createElement('a');
    link.className = 'ad-slot__link';
    link.href = slot.linkUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer sponsored';
    const image = document.createElement('img');
    image.src = imageUrl;
    image.alt = slot.alt || '광고';
    image.width = slot.width;
    image.height = slot.height;
    image.loading = 'lazy';
    link.append(image);
    frame.append(link);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'ad-slot__placeholder';
    const title = document.createElement('strong');
    title.textContent = '광고 영역';
    placeholder.append(title, sizeText);
    frame.append(placeholder);
  }
  frame.append(tag);

  // ---------- 세로 높이 ----------
  const min = slot.minHeight ?? slot.height;
  const configuredMax = slot.maxHeight ?? slot.height;
  const maxHeight = () => Math.max(min, Math.min(configuredMax, window.innerHeight - VIEWPORT_MARGIN));
  const clamp = (value) => Math.round(Math.min(maxHeight(), Math.max(min, value)));

  const saved = slot.resizable && slot.storageKey ? Number(readValue(slot.storageKey)) : NaN;
  // preferred: 사용자가 고른 높이, height: 지금 화면에 맞춰 실제로 쓰는 높이(화면이 작으면 잠시 줄어듦)
  let preferred = Number.isFinite(saved) && saved > 0 ? saved : slot.height;
  let height = clamp(preferred);

  const children = [frame];
  let handle = null;

  function applyHeight(next, { save = false, remember = true } = {}) {
    height = clamp(next);
    if (remember) preferred = height;
    frame.style.setProperty('--ad-height', `${height}px`);
    sizeText.textContent = `${slot.width} × ${height}`;
    if (handle) {
      handle.setAttribute('aria-valuemin', String(min));
      handle.setAttribute('aria-valuemax', String(maxHeight()));
      handle.setAttribute('aria-valuenow', String(height));
      handle.setAttribute('aria-valuetext', `세로 ${height}픽셀`);
    }
    if (save && slot.storageKey) writeValue(slot.storageKey, String(height));
  }

  if (slot.resizable) {
    handle = document.createElement('div');
    handle.className = 'ad-slot__resize';
    handle.tabIndex = 0;
    handle.setAttribute('role', 'separator');
    handle.setAttribute('aria-orientation', 'horizontal');
    handle.setAttribute('aria-label', '광고 영역 세로 크기 조절');
    handle.title = '끌어서 세로 크기 조절 · 두 번 누르면 원래 크기';
    const grip = document.createElement('span');
    grip.className = 'ad-slot__grip';
    grip.setAttribute('aria-hidden', 'true');
    handle.append(grip);

    // 마우스·터치로 끌기
    let startY = 0;
    let startHeight = 0;
    handle.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      startY = event.clientY;
      startHeight = height;
      handle.setPointerCapture(event.pointerId);
      handle.classList.add('is-dragging');
    });
    handle.addEventListener('pointermove', (event) => {
      if (!handle.hasPointerCapture(event.pointerId)) return;
      applyHeight(startHeight + (event.clientY - startY));
    });
    const endDrag = (event) => {
      if (!handle.hasPointerCapture(event.pointerId)) return;
      handle.releasePointerCapture(event.pointerId);
      handle.classList.remove('is-dragging');
      applyHeight(height, { save: true });
    };
    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);

    // 키보드: ↑↓ 20px, Home 최소, End 최대
    handle.addEventListener('keydown', (event) => {
      const moves = {
        ArrowUp: height - KEY_STEP,
        ArrowDown: height + KEY_STEP,
        Home: min,
        End: maxHeight(),
      };
      if (!(event.key in moves)) return;
      event.preventDefault();
      applyHeight(moves[event.key], { save: true });
    });

    // 두 번 누르면 기본 높이로
    handle.addEventListener('dblclick', () => applyHeight(slot.height, { save: true }));

    // 창 크기가 바뀌면 화면을 넘지 않게 다시 맞춤
    window.addEventListener('resize', () => applyHeight(preferred, { remember: false }));

    children.push(handle);
  }
  applyHeight(preferred, { remember: false });

  if (slot.closable) {
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'ad-slot__close';
    close.setAttribute('aria-label', '광고 닫기');
    close.textContent = '×';
    close.addEventListener('click', () => {
      container.hidden = true;
      onClose?.();
    });
    children.push(close);
  }

  container.replaceChildren(...children);
  container.hidden = false;
}

// 'images/ad-side.jpg'처럼 이 사이트 안의 경로도 받도록 전체 주소로 바꿈
function resolveImageUrl(value) {
  if (!value) return '';
  try {
    return new URL(value, document.baseURI).href;
  } catch {
    return '';
  }
}
