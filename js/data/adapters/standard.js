// 기본 변환: 이 앱의 공고 형식(data/policies.json과 같은 필드)을 그대로 받는 경우
// 응답이 배열이거나 { policies: [...] } / { items: [...] } 형태면 됩니다.
import { normalizePolicies } from '../normalize.js';

export function standardAdapter(response) {
  const list = Array.isArray(response) ? response : response?.policies ?? response?.items ?? [];
  return normalizePolicies(list);
}
