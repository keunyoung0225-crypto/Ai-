// '더보기' 버튼: 아직 보이지 않는 공고가 있을 때만 표시
export function createLoadMore(container, { onClick }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn--ghost load-more';
  button.addEventListener('click', onClick);
  container.replaceChildren(button);

  return {
    render(shown, total) {
      button.hidden = shown >= total;
      button.textContent = `더보기 (${shown.toLocaleString('ko-KR')} / ${total.toLocaleString('ko-KR')})`;
    },
  };
}
