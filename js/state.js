// 간단한 구독형 상태 저장소. 상태가 바뀌면 등록된 함수들을 호출합니다.
export function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();

  return {
    get: () => state,
    set(patch) {
      state = { ...state, ...patch };
      listeners.forEach((listener) => listener(state));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

// 검색 필드 정의로부터 빈 검색 조건을 만듭니다.
export function createEmptyFilters(fields) {
  return Object.fromEntries(
    fields.map((field) => [field.key, field.type === 'dateRange' ? { from: '', to: '' } : '']),
  );
}
