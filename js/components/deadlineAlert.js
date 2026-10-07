// 마감 알림: 관심공고 중 마감이 임박한 공고를 화면 위쪽에 알려줌
export function createDeadlineAlert(container, { onOpen }) {
  container.setAttribute('role', 'status');

  return {
    // items: [{ policy, status }]
    render(items) {
      container.hidden = items.length === 0;
      if (!items.length) {
        container.replaceChildren();
        return;
      }

      const title = document.createElement('strong');
      title.className = 'deadline-alert__title';
      title.textContent = `관심공고 마감 임박 ${items.length}건`;

      const list = document.createElement('ul');
      list.className = 'deadline-alert__list';
      items.forEach(({ policy, status }) => {
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'deadline-alert__link';
        button.textContent = policy.title;
        button.addEventListener('click', () => onOpen(policy.id));
        const badge = document.createElement('span');
        badge.className = 'badge badge--urgent';
        badge.textContent = status.label;
        item.append(button, ' ', badge);
        list.append(item);
      });

      container.replaceChildren(title, list);
    },
  };
}
