// 검색 폼: config의 SEARCH_FIELDS로 입력칸을 자동 생성

function createInput(attrs) {
  const input = document.createElement('input');
  input.className = 'input';
  Object.assign(input, attrs);
  return input;
}

// type별 입력칸 생성기. 각 생성기는 { element, read, write }를 반환합니다.
const fieldBuilders = {
  text(field, id) {
    const input = createInput({ type: 'text', id, name: field.key, placeholder: field.placeholder ?? '' });
    return {
      element: input,
      read: () => input.value,
      write: (value) => (input.value = value ?? ''),
    };
  },

  select(field, id, options = []) {
    const select = document.createElement('select');
    select.className = 'input';
    select.id = id;
    select.name = field.key;
    select.append(new Option(field.placeholder ?? '전체', ''));
    options.forEach((option) => select.append(new Option(option, option)));
    return {
      element: select,
      read: () => select.value,
      write: (value) => (select.value = value ?? ''),
    };
  },

  dateRange(field, id) {
    const from = createInput({ type: 'date', id, name: `${field.key}From` });
    const to = createInput({ type: 'date', name: `${field.key}To` });
    from.setAttribute('aria-label', `${field.label} 시작일`);
    to.setAttribute('aria-label', `${field.label} 종료일`);

    const wrap = document.createElement('div');
    wrap.className = 'search-field__range';
    const tilde = document.createElement('span');
    tilde.textContent = '~';
    tilde.setAttribute('aria-hidden', 'true');
    wrap.append(from, tilde, to);

    return {
      element: wrap,
      read: () => ({ from: from.value, to: to.value }),
      write: (value) => {
        from.value = value?.from ?? '';
        to.value = value?.to ?? '';
      },
    };
  },
};

export function createSearchForm(container, fields, { options = {}, onSearch, onReset }) {
  const form = document.createElement('form');
  form.className = 'search-form';
  form.setAttribute('role', 'search');

  const controls = fields.map((field) => {
    const id = `search-${field.key}`;
    const control = fieldBuilders[field.type](field, id, options[field.key]);

    const wrapper = document.createElement('div');
    wrapper.className = 'search-field';
    const label = document.createElement('label');
    label.className = 'search-field__label';
    label.htmlFor = id;
    label.textContent = field.label;
    wrapper.append(label, control.element);
    form.append(wrapper);

    return { key: field.key, ...control };
  });

  const actions = document.createElement('div');
  actions.className = 'search-actions';
  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.className = 'btn btn--ghost';
  resetButton.textContent = '초기화';
  const submitButton = document.createElement('button');
  submitButton.type = 'submit';
  submitButton.className = 'btn btn--primary';
  submitButton.textContent = '검색';
  actions.append(resetButton, submitButton);
  form.append(actions);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    onSearch(Object.fromEntries(controls.map((control) => [control.key, control.read()])));
  });

  resetButton.addEventListener('click', () => {
    controls.forEach((control) => control.write(null));
    onReset();
  });

  container.replaceChildren(form);

  return {
    // 주소(URL)로 전달된 검색 조건을 입력칸에 채움
    setValues(filters) {
      controls.forEach((control) => control.write(filters[control.key]));
    },
  };
}
