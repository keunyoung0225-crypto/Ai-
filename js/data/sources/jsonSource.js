// 로컬 JSON 파일에서 정책 목록을 읽어옵니다.
import { standardAdapter } from '../adapters/standard.js';

export function createJsonSource(url) {
  return {
    async fetchAll() {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`데이터를 불러오지 못했습니다 (${response.status})`);
      }
      return standardAdapter(await response.json());
    },
  };
}
