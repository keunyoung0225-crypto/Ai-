// 데이터 조회 창구. 화면 코드는 load()만 사용하므로
// 데이터 출처(JSON → API)를 바꿔도 화면은 수정할 필요가 없습니다.
import { createJsonSource } from './sources/jsonSource.js';
import { createApiSource } from './sources/apiSource.js';

const sourceFactories = {
  json: (options) => createJsonSource(options.url),
  api: (options) => createApiSource(options),
};

function createSource(type, options) {
  const factory = sourceFactories[type];
  if (!factory) {
    throw new Error(`알 수 없는 데이터 출처입니다: ${type}`);
  }
  return factory(options);
}

// options.fallback = { type, ...옵션 }: 기본 출처가 실패하면 대신 사용할 출처
export function createRepository(type, options = {}) {
  const primary = createSource(type, options);
  const fallback = options.fallback ? createSource(options.fallback.type, options.fallback) : null;

  return {
    // 반환값: { policies, source(실제 사용한 출처), error(대체 사용 시 원래 오류) }
    async load() {
      try {
        return { policies: await primary.fetchAll(), source: type };
      } catch (error) {
        if (!fallback) throw error;
        console.warn('기본 데이터 출처 실패, 대체 출처를 사용합니다.', error);
        return { policies: await fallback.fetchAll(), source: options.fallback.type, error };
      }
    },
  };
}
