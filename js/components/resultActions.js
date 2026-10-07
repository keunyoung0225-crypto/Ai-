// 결과 도구: '관심공고만 보기' 전환 + 엑셀(CSV) 다운로드
export function createResultActions(container, { onToggleFavoritesOnly, onDownload }) {
  const favoritesButton = document.createElement('button');
  favoritesButton.type = 'button';
  favoritesButton.className = 'chip-button';
  favoritesButton.addEventListener('click', onToggleFavoritesOnly);

  const downloadButton = document.createElement('button');
  downloadButton.type = 'button';
  downloadButton.className = 'chip-button';
  downloadButton.textContent = '엑셀 다운로드';
  downloadButton.title = '현재 검색 결과 전체를 CSV 파일로 저장';
  downloadButton.addEventListener('click', onDownload);

  container.replaceChildren(favoritesButton, downloadButton);

  return {
    render({ favoritesOnly, favoriteCount, resultCount }) {
      favoritesButton.setAttribute('aria-pressed', String(favoritesOnly));
      favoritesButton.textContent = `★ 관심공고만 (${favoriteCount})`;
      downloadButton.disabled = resultCount === 0;
    },
  };
}
