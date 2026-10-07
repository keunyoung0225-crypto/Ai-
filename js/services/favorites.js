// 관심공고: 공고 id 목록을 이 기기에 저장
import { readJson, writeJson } from './storage.js';

export function loadFavorites(key) {
  const ids = readJson(key, []);
  return Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : [];
}

export function saveFavorites(key, ids) {
  writeJson(key, ids);
}

export function toggleFavorite(ids, id) {
  return ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id];
}
