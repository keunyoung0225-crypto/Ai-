// 공고 데이터 매일 갱신 (매일 아침 GitHub Actions가 실행)
//
// scripts/sources.json에서 켜 둔(enabled) 출처에서 공고를 모아 data/policies.json에 합칩니다.
// - 처음 들어온 공고에는 수집한 날짜(firstSeen)를 기록하고, 그 목록을 알림 단계에 넘깁니다.
// - 출처 하나가 실패해도 그 출처의 기존 공고는 그대로 두고 나머지는 계속 갱신합니다.
// - 실제 출처에서 공고를 받아오면 시연용 샘플 공고(source: "sample")는 지웁니다.
// - 마감일(없으면 공고일)이 keepDays일보다 오래된 공고는 지웁니다.
//
// 사용법:
//   node scripts/update-data.mjs            갱신 후 data/policies.json 저장
//   node scripts/update-data.mjs --dry-run  저장하지 않고 결과만 출력
//
// 환경 변수: 각 출처의 urlEnv·keyEnv에 적은 이름 (예: POLICY_SHEET_CSV_URL, DATA_GO_KR_KEY)
//   NEW_POLICIES_FILE  새 공고 목록을 저장할 파일 (기본: .cache/new-policies.json)
import { mkdir, readFile, writeFile, appendFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { DATA_URL } from '../js/config.js';
import { normalizePolicies } from '../js/data/normalize.js';
import { isDateString } from '../js/services/date.js';
import { collectors } from './collectors/index.js';
import { addDays, koreaDate } from './lib/dates.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_FILE = path.join(ROOT, DATA_URL);
const SAMPLE_SOURCE = 'sample';

function parseOptions(argv) {
  const index = argv.indexOf('--today');
  return {
    dryRun: argv.includes('--dry-run') || process.env.DRY_RUN === 'true',
    today: index >= 0 ? argv[index + 1] : undefined,
  };
}

function byNewest(a, b) {
  return (b.announceDate ?? '').localeCompare(a.announceDate ?? '') || a.id.localeCompare(b.id);
}

// 같은 공고인지 비교할 때 수집 날짜는 빼고 비교
function sameContent(a, b) {
  const strip = ({ firstSeen, ...rest }) => rest;
  return JSON.stringify(strip(a)) === JSON.stringify(strip(b));
}

async function summary(lines) {
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
  }
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const today = options.today ?? koreaDate();
  if (!isDateString(today)) throw new Error('날짜는 YYYY-MM-DD 형식이어야 합니다.');

  const config = JSON.parse(await readFile(path.join(ROOT, 'scripts/sources.json'), 'utf8'));
  const sources = (config.sources ?? []).filter((source) => source.enabled);
  const existing = JSON.parse(await readFile(DATA_FILE, 'utf8'));
  const byId = new Map(existing.map((policy) => [policy.id, policy]));

  if (!sources.length) {
    console.log('켜 둔 데이터 출처가 없습니다. scripts/sources.json에서 출처의 "enabled"를 true로 바꾸세요.');
  }

  const report = [];
  const newIds = [];
  let realItems = 0;
  let failed = 0;

  for (const source of sources) {
    const collect = collectors[source.type];
    const label = `${source.name ?? source.id} (${source.type})`;
    if (!collect) {
      console.error(`알 수 없는 출처 종류입니다: ${source.type}`);
      failed += 1;
      continue;
    }
    try {
      const raw = await collect(source, process.env, { today, root: ROOT, log: console.log });
      const items = normalizePolicies(raw);
      // 이 출처에서 처음 가져오는 경우(첫 연결)는 알림 대상에서 제외
      const firstImport = !existing.some((policy) => policy.source === source.id);
      let added = 0;
      let changed = 0;

      items.forEach((item) => {
        const before = byId.get(item.id);
        const next = {
          ...item,
          source: source.id,
          firstSeen: before?.firstSeen ?? (firstImport ? item.announceDate ?? today : today),
        };
        if (!before) {
          added += 1;
          if (!firstImport) newIds.push(item.id);
        } else if (!sameContent(before, next)) {
          changed += 1;
        }
        byId.set(item.id, next);
      });

      realItems += items.length;
      const note = firstImport && added ? ' (첫 연결이라 알림은 보내지 않음)' : '';
      console.log(`✔ ${label}: ${items.length}건 수신, 새 공고 ${added}건, 변경 ${changed}건${note}`);
      report.push(`| ${label} | ${items.length} | ${added} | ${changed} | 성공${note} |`);
    } catch (error) {
      failed += 1;
      console.error(`✘ ${label}: ${error.message}`);
      console.log(`::warning title=공고 수집 실패::${label}: ${error.message}`);
      report.push(`| ${label} | - | - | - | 실패: ${error.message} |`);
    }
  }

  // 실제 공고가 들어오면 시연용 샘플 공고 제거
  let policies = [...byId.values()];
  if (realItems > 0) {
    policies = policies.filter((policy) => (policy.source ?? SAMPLE_SOURCE) !== SAMPLE_SOURCE);
  }
  // 오래된 공고 정리
  const cutoff = addDays(today, -(config.keepDays ?? 365));
  policies = policies.filter((policy) => (policy.deadline ?? policy.announceDate ?? today) >= cutoff);
  policies.sort(byNewest);

  const changedFile = JSON.stringify(policies) !== JSON.stringify([...existing].sort(byNewest));
  console.log(`\n전체 공고 ${existing.length}건 → ${policies.length}건, 오늘 새로 들어온 공고 ${newIds.length}건`);

  await summary([
    `### 공고 데이터 갱신 (${today})`,
    '',
    '| 출처 | 수신 | 새 공고 | 변경 | 결과 |',
    '|---|---|---|---|---|',
    ...(report.length ? report : ['| (켜 둔 출처 없음) | - | - | - | - |']),
    '',
    `전체 ${policies.length}건 · 새 공고 ${newIds.length}건`,
  ]);

  if (!options.dryRun) {
    if (changedFile) {
      await writeFile(DATA_FILE, `${JSON.stringify(policies, null, 2)}\n`);
      console.log(`${DATA_URL} 저장 완료`);
    } else {
      console.log('바뀐 내용이 없어 저장하지 않았습니다.');
    }
    // 켜 둔 출처가 없으면(직접 파일을 고치는 경우) 목록을 남기지 않아 알림이 공고일 기준으로 동작
    if (sources.length) {
      const newFile = path.resolve(ROOT, process.env.NEW_POLICIES_FILE || '.cache/new-policies.json');
      await mkdir(path.dirname(newFile), { recursive: true });
      await writeFile(newFile, `${JSON.stringify({ date: today, ids: newIds }, null, 2)}\n`);
    }
  }

  // 켜 둔 출처가 모두 실패하면 작업을 실패로 표시해 알 수 있게 함
  if (sources.length && failed === sources.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
