// 공고 상세 보기 창 (<dialog> 사용: Esc 닫기·초점 가두기를 브라우저가 처리)
import { formatValue } from '../services/format.js';
import { createDeadlineBadge } from './deadlineBadge.js';
import { createFavoriteButton, setFavoriteState } from './favoriteButton.js';

function isSafeUrl(url) {
  try {
    return ['http:', 'https:'].includes(new URL(url, window.location.href).protocol);
  } catch {
    return false;
  }
}

// getSimilar(policy): 비슷한 공고 배열의 Promise
export function createDetailModal(
  fields,
  { categoryLabels, deadlineWarningDays, onClose, onToggleFavorite, onOpenDetail, getSimilar },
) {
  const dialog = document.createElement('dialog');
  dialog.className = 'detail-modal';
  dialog.setAttribute('aria-labelledby', 'detail-title');

  const panel = document.createElement('div');
  panel.className = 'detail-modal__panel';
  dialog.append(panel);
  document.body.append(dialog);

  // 바깥 어두운 영역을 누르면 닫기
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', onClose);

  let currentId = null;
  let favoriteButton = null;

  function displayValue(policy, field) {
    if (field.format === 'category') return categoryLabels[policy.category] ?? '-';
    return formatValue(policy[field.key], field.format);
  }

  function renderSimilar(section, policy) {
    const heading = document.createElement('h3');
    heading.className = 'detail-section__title';
    heading.textContent = '비슷한 공고';
    const status = document.createElement('p');
    status.className = 'detail-section__empty';
    status.textContent = '찾는 중…';
    section.replaceChildren(heading, status);

    getSimilar(policy).then((similar) => {
      if (currentId !== policy.id) return; // 그사이 다른 공고를 열었으면 무시
      if (!similar.length) {
        status.textContent = '비슷한 공고가 없습니다.';
        return;
      }
      const list = document.createElement('ul');
      list.className = 'similar-list';
      similar.forEach((other) => {
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'similar-list__link';
        button.textContent = other.title;
        button.addEventListener('click', () => onOpenDetail(other.id));
        const meta = document.createElement('span');
        meta.className = 'similar-list__meta';
        meta.textContent = `${other.agency ?? '-'} · 마감 ${formatValue(other.deadline, 'date')}`;
        item.append(button, meta);
        list.append(item);
      });
      status.replaceWith(list);
    });
  }

  function renderContent(policy, isFavorite) {
    const header = document.createElement('div');
    header.className = 'detail-modal__header';

    const title = document.createElement('h2');
    title.className = 'detail-modal__title';
    title.id = 'detail-title';
    title.tabIndex = -1;
    title.textContent = policy.title ?? '-';

    favoriteButton = createFavoriteButton(policy, { isFavorite, onToggle: onToggleFavorite });

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'detail-modal__close';
    closeButton.setAttribute('aria-label', '닫기');
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => dialog.close());
    header.append(title, favoriteButton, closeButton);

    const list = document.createElement('dl');
    list.className = 'detail-list';
    fields.forEach((field) => {
      const term = document.createElement('dt');
      term.textContent = field.label;
      const desc = document.createElement('dd');
      desc.textContent = displayValue(policy, field);
      if (field.key === 'deadline') {
        const badge = createDeadlineBadge(policy.deadline, deadlineWarningDays);
        if (badge) desc.append(' ', badge);
      }
      list.append(term, desc);
    });

    const similarSection = document.createElement('section');
    similarSection.className = 'detail-section';
    renderSimilar(similarSection, policy);

    const actions = document.createElement('div');
    actions.className = 'detail-modal__actions';
    if (policy.url && isSafeUrl(policy.url)) {
      const link = document.createElement('a');
      link.className = 'btn btn--primary';
      link.href = policy.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = '공고 원문 보기';
      actions.append(link);
    }
    const okButton = document.createElement('button');
    okButton.type = 'button';
    okButton.className = 'btn btn--ghost';
    okButton.textContent = '닫기';
    okButton.addEventListener('click', () => dialog.close());
    actions.append(okButton);

    panel.replaceChildren(header, list, similarSection, actions);
    return title;
  }

  return {
    open(policy, { isFavorite }) {
      if (currentId === policy.id) {
        setFavoriteState(favoriteButton, isFavorite);
      } else {
        const wasOpen = dialog.open;
        currentId = policy.id;
        const title = renderContent(policy, isFavorite);
        // 창 안에서 다른 공고로 넘어가면 제목으로 초점 이동
        if (wasOpen) title.focus();
      }
      if (!dialog.open) dialog.showModal();
    },
    close() {
      currentId = null;
      if (dialog.open) dialog.close();
    },
  };
}
