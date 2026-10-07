// 공고 수집기 목록. 새 출처를 붙일 때는 (출처 설정, 환경 변수, { today, root, log }) → 공고 배열을
// 돌려주는 함수를 만들어 여기에 등록하고, scripts/sources.json에 그 type으로 출처를 추가합니다.
import { collectBizinfo } from './bizinfo.js';
import { collectCsv } from './csv.js';
import { collectNaraBid } from './naraBid.js';

export const collectors = {
  csv: collectCsv,
  naraBid: collectNaraBid,
  bizinfo: collectBizinfo,
};
