// 광고 영역: 설정(config.js의 AD_SLOTS)에 이미지·링크가 있으면 광고를, 없으면 빈 광고 틀을 보여 줌
// 실제 광고 네트워크(예: 애드센스)를 쓸 때는 이 틀 안에 그 광고 코드를 넣으면 됩니다.
import { isSafeUrl } from '../services/links.js';

export function renderAdSlot(container, slot, { onClose } = {}) {
  if (!slot?.enabled) {
    container.hidden = true;
    return;
  }

  const frame = document.createElement('div');
  frame.className = 'ad-slot__frame';
  frame.style.setProperty('--ad-width', `${slot.width}px`);
  frame.style.setProperty('--ad-height', `${slot.height}px`);

  // 광고임을 알리는 표시
  const tag = document.createElement('span');
  tag.className = 'ad-slot__tag';
  tag.textContent = '광고';

  if (slot.imageUrl && isSafeUrl(slot.imageUrl) && isSafeUrl(slot.linkUrl)) {
    const link = document.createElement('a');
    link.className = 'ad-slot__link';
    link.href = slot.linkUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer sponsored';
    const image = document.createElement('img');
    image.src = slot.imageUrl;
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
    const size = document.createElement('span');
    size.textContent = `${slot.width} × ${slot.height}`;
    placeholder.append(title, size);
    frame.append(placeholder);
  }
  frame.append(tag);

  const children = [frame];
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
