// 데이터 조회 창구. 화면 코드는 getPolicies()만 사용하므로
// 데이터 출처(JSON → API)를 바꿔도 화면은 수정할 필요가 없습니다.
import { createJsonSource } from './sources/jsonSource.js';
import { createApiSource } from './sources/apiSource.js';

const sourceFactories = {
  json: (options) => createJsonSource(options.url),
  api: (options) => createApiSource(options),
};

export function createRepository(type, options = {}) {
  const factory = sourceFactories[type];
  if (!factory) {
    throw new Error(`알 수 없는 데이터 출처입니다: ${type}`);
  }
  const source = factory(options);

  return {
    getPolicies: () => source.fetchAll(),
  };
}
