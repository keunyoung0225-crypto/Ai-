// 공고 수집용 인터넷 요청: 연결이 잠깐 끊기거나 서버가 바쁠 때 몇 번 다시 시도합니다.
// (공공기관 서버는 해외에 있는 GitHub 서버의 연결을 잠시 받지 않는 경우가 있음)

const ATTEMPTS = 3;
const WAIT_SECONDS = [5, 20]; // 1번째 실패 후 5초, 2번째 실패 후 20초 기다렸다가 다시 시도
const TIMEOUT_SECONDS = 30;

// 연결 오류 코드 → 한국어 설명
const NETWORK_ERRORS = {
  ETIMEDOUT: '응답 시간 초과',
  UND_ERR_CONNECT_TIMEOUT: '연결 시간 초과',
  UND_ERR_HEADERS_TIMEOUT: '응답 시간 초과',
  ECONNRESET: '서버가 연결을 끊음',
  UND_ERR_SOCKET: '연결이 도중에 끊김',
  ECONNREFUSED: '서버가 연결을 거부함',
  ENOTFOUND: '서버 주소를 찾을 수 없음',
  EAI_AGAIN: '서버 주소 확인 실패',
  TimeoutError: `${TIMEOUT_SECONDS}초 안에 응답 없음`,
};

function describe(error) {
  const code = error?.cause?.code ?? error?.code ?? error?.name;
  if (NETWORK_ERRORS[code]) return `${NETWORK_ERRORS[code]}, ${code}`;
  return error?.cause?.code ?? error?.cause?.message ?? error?.message ?? '알 수 없는 오류';
}

const sleep = (seconds) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));

// fetch와 같지만, 연결 실패·서버 오류(429, 5xx)는 다시 시도. 그래도 안 되면 한국어 설명과 함께 오류
export async function fetchWithRetry(url, { name = '서버', log = console.log, attempts = ATTEMPTS, wait = WAIT_SECONDS } = {}) {
  let lastProblem = '';
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_SECONDS * 1000) });
      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt === attempts) return response;
      lastProblem = `서버 오류 ${response.status}`;
    } catch (error) {
      lastProblem = describe(error);
      if (attempt === attempts) {
        throw new Error(
          `${name}에 연결하지 못했습니다(${lastProblem}). ${attempts}번 시도했습니다. ` +
            '공공기관 서버가 잠시 응답하지 않는 경우가 많으니, 잠시 뒤 다시 실행하거나 다음 날 자동 실행을 기다려 주세요.',
        );
      }
    }
    const seconds = wait[attempt - 1] ?? wait[wait.length - 1] ?? 0;
    log(`  ${name} 요청 실패(${lastProblem}) → ${seconds}초 뒤 다시 시도 (${attempt + 1}/${attempts})`);
    await sleep(seconds);
  }
  throw new Error(`${name} 요청 실패`);
}
