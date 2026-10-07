// 정렬 선택 메뉴 (표 머리글이 보이지 않는 모바일 화면용)
export function createSortSelect(container, columns, { onChange }) {
  const id = 'sort-select';
  const label = document.createElement('label');
  label.className = 'sort-select__label';
  label.htmlFor = id;
  label.textContent = '정렬';

  const select = document.createElement('select');
  select.className = 'input sort-select__input';
  select.id = id;
  columns
    .filter((column) => column.sort)
    .forEach((column) => {
      Object.entries(column.sort.labels).forEach(([dir, text]) => {
        select.append(new Option(`${column.label} ${text}`, `${column.key}:${dir}`));
      });
    });
  select.addEventListener('change', () => {
    const [key, dir] = select.value.split(':');
    onChange({ key, dir });
  });

  container.replaceChildren(label, select);

  return {
    setValue(sort) {
      select.value = `${sort.key}:${sort.dir}`;
    },
  };
}
