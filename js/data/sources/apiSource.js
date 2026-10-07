// 외부 API에서 정책 목록을 읽어옵니다.
// 응답 형식이 API마다 다르므로 adapter(js/data/adapters/)가 공고 형식으로 바꿉니다.
import { adapters } from '../adapters/index.js';

export function createApiSource({ endpoint, params = {}, adapter = 'standard' }) {
  return {
    async fetchAll() {
      if (!endpoint) {
        throw new Error('API 주소(config.js의 API_CONFIG.endpoint)가 설정되지 않았습니다.');
      }
      const convert = adapters[adapter];
      if (!convert) {
        throw new Error(`알 수 없는 API 변환 방식입니다: ${adapter}`);
      }

      const url = new URL(endpoint, window.location.href);
      Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API 요청에 실패했습니다 (${response.status})`);
      }
      return convert(await response.json());
    },
  };
}
