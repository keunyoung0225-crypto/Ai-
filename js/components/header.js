// 상단 제목 영역. emphasis로 지정한 낱말은 강조 색으로 표시
export function renderHeader(container, { title, subtitle, emphasis }) {
  const heading = document.createElement('h1');
  heading.className = 'site-title';
  const index = emphasis ? title.lastIndexOf(emphasis) : -1;
  if (index >= 0) {
    const mark = document.createElement('span');
    mark.className = 'site-title__emphasis';
    mark.textContent = emphasis;
    heading.append(title.slice(0, index), mark, title.slice(index + emphasis.length));
  } else {
    heading.textContent = title;
  }
  container.replaceChildren(heading);

  if (subtitle) {
    const sub = document.createElement('p');
    sub.className = 'site-subtitle';
    sub.textContent = subtitle;
    container.append(sub);
  }
}
