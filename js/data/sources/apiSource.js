// 공공데이터 API 연동 자리 (3단계 확장용).
// 구현 시 API 응답을 data/policies.json과 같은 형태의 배열로 변환해 반환하면
// 화면 코드는 수정 없이 그대로 동작합니다.
export function createApiSource() {
  return {
    async fetchAll() {
      throw new Error('API 데이터 출처는 아직 구현되지 않았습니다.');
    },
  };
}
