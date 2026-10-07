// '비슷한 공고' 추천
// provider는 (기준 공고, 전체 공고, 개수) → 추천 공고 배열(또는 Promise)을 돌려주는 함수입니다.

// 제목에서 비교에 쓸 단어 (흔한 단어는 제외)
const STOP_WORDS = new Set(['공고', '모집', '공모', '수의계약', '위탁', '기관', '사업', '운영']);

function keywords(title = '') {
  return new Set(
    title
      .split(/[\s·()[\],]+/)
      .map((word) => word.replace(/^\d{4}년$/, ''))
      .filter((word) => word.length >= 2 && !STOP_WORDS.has(word)),
  );
}

const providers = {
  // 규칙 기반: 같은 검색유형·같은 기관·제목 단어가 겹칠수록 점수가 높음
  rule(policy, policies, limit) {
    const words = keywords(policy.title);
    return policies
      .filter((other) => other.id !== policy.id)
      .map((other) => {
        let score = 0;
        if (other.category === policy.category) score += 2;
        if (other.agency === policy.agency) score += 2;
        keywords(other.title).forEach((word) => {
          if (words.has(word)) score += 1;
        });
        return { other, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || (b.other.announceDate ?? '').localeCompare(a.other.announceDate ?? ''))
      .slice(0, limit)
      .map(({ other }) => other);
  },

  // AI 연결 자리: 자체 서버(AI 요약·추천 API)를 호출해 추천 공고 id 목록을 받아오도록 구현합니다.
  // AI 서비스 인증키는 브라우저에 두지 말고 반드시 서버에 보관하세요.
  async ai() {
    throw new Error('AI 추천 서버가 아직 연결되지 않았습니다.');
  },
};

// 설정된 provider가 실패하면 규칙 기반 추천으로 대체
export async function recommendSimilar(policy, policies, { provider = 'rule', limit = 3 } = {}) {
  try {
    return await providers[provider](policy, policies, limit);
  } catch (error) {
    console.warn('추천 기능 오류, 규칙 기반 추천을 사용합니다.', error);
    return providers.rule(policy, policies, limit);
  }
}
