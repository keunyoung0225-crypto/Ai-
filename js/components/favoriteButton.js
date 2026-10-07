// 관심공고 별 버튼 (표·상세 보기 공통)
export function createFavoriteButton(policy, { isFavorite, onToggle }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'favorite-button';
  button.dataset.favoriteId = policy.id;
  button.dataset.title = policy.title ?? '공고';
  button.addEventListener('click', () => onToggle(policy.id));
  setFavoriteState(button, isFavorite);
  return button;
}

export function setFavoriteState(button, isFavorite) {
  button.setAttribute('aria-pressed', String(isFavorite));
  button.textContent = isFavorite ? '★' : '☆';
  button.setAttribute('aria-label', `${button.dataset.title} 관심공고 ${isFavorite ? '해제' : '등록'}`);
  button.title = isFavorite ? '관심공고 해제' : '관심공고 등록';
}
