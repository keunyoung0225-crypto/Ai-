// 공고 상세 보기 창 (<dialog> 사용: Esc 닫기·초점 가두기를 브라우저가 처리)
import { formatValue } from '../services/format.js';
import { createDeadlineBadge } from './deadlineBadge.js';

function isSafeUrl(url) {
  try {
    return ['http:', 'https:'].includes(new URL(url, window.location.href).protocol);
  } catch {
    return false;
  }
}

export function createDetailModal(fields, { categoryLabels, deadlineWarningDays, onClose }) {
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

  function displayValue(policy, field) {
    if (field.format === 'category') return categoryLabels[policy.category] ?? '-';
    return formatValue(policy[field.key], field.format);
  }

  function renderContent(policy) {
    const header = document.createElement('div');
    header.className = 'detail-modal__header';

    const title = document.createElement('h2');
    title.className = 'detail-modal__title';
    title.id = 'detail-title';
    title.textContent = policy.title ?? '-';

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'detail-modal__close';
    closeButton.setAttribute('aria-label', '닫기');
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => dialog.close());
    header.append(title, closeButton);

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

    panel.replaceChildren(header, list, actions);
  }

  let currentId = null;

  return {
    open(policy) {
      if (currentId !== policy.id) {
        renderContent(policy);
        currentId = policy.id;
      }
      if (!dialog.open) dialog.showModal();
    },
    close() {
      currentId = null;
      if (dialog.open) dialog.close();
    },
  };
}
