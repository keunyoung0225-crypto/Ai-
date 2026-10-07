// 상단 제목 영역
export function renderHeader(container, { title, subtitle }) {
  const heading = document.createElement('h1');
  heading.className = 'site-title';
  heading.textContent = title;
  container.replaceChildren(heading);

  if (subtitle) {
    const sub = document.createElement('p');
    sub.className = 'site-subtitle';
    sub.textContent = subtitle;
    container.append(sub);
  }
}
