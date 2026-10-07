// 검색유형(카테고리) 버튼: config의 CATEGORIES로 자동 생성 (버튼마다 해당 공고 수 표시)
export function createCategoryTabs(container, categories, { onChange }) {
  const counts = new Map();
  const buttons = categories.map((category) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'category-tab';
    button.dataset.category = category.id;
    button.setAttribute('aria-pressed', 'false');

    const label = document.createElement('span');
    label.textContent = category.label;
    const count = document.createElement('span');
    count.className = 'category-tab__count';
    counts.set(category.id, count);
    button.append(label, count);

    button.addEventListener('click', () => onChange(category.id));
    return button;
  });
  container.replaceChildren(...buttons);

  return {
    setActive(categoryId) {
      buttons.forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.category === categoryId));
      });
    },
    // { 카테고리 id: 공고 수 } — 현재 검색 조건 기준
    setCounts(values) {
      counts.forEach((element, id) => {
        const value = values[id];
        element.textContent = value == null ? '' : value.toLocaleString('ko-KR');
        const button = element.closest('button');
        const label = categories.find((c) => c.id === id)?.label ?? '';
        if (value == null) button.removeAttribute('aria-label');
        else button.setAttribute('aria-label', `${label} ${value}건`);
      });
    },
  };
}
