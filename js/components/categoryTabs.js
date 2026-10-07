// 검색유형(카테고리) 버튼: config의 CATEGORIES로 자동 생성
export function createCategoryTabs(container, categories, { onChange }) {
  const buttons = categories.map((category) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'category-tab';
    button.textContent = category.label;
    button.dataset.category = category.id;
    button.setAttribute('aria-pressed', 'false');
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
  };
}
