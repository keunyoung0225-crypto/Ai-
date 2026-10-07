// API 응답 → 공고 데이터 변환 방식 목록
// 새 API를 붙일 때: 응답을 받아 공고 배열을 돌려주는 함수를 만들어 여기에 등록하고
// config.js의 API_CONFIG.adapter에 그 이름을 적습니다. (README의 'API 연동' 참고)
import { standardAdapter } from './standard.js';

export const adapters = {
  standard: standardAdapter,
};
