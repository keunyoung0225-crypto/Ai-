// 관심 키워드 공고 알림 발송 (매일 아침 GitHub Actions가 실행)
//
// 사용법:
//   node scripts/notify.mjs              어제 올라온 공고 중 키워드에 맞는 공고를 알림
//   node scripts/notify.mjs --dry-run    보내지 않고 알림 내용만 출력
//   node scripts/notify.mjs --since 2026-09-01   이 날짜부터 올라온 공고를 확인 (시험용)
//   node scripts/notify.mjs --now        예약 없이 바로 발송
//   node scripts/notify.mjs --new-ids .cache/new-policies.json
//                                        공고 갱신(update-data.mjs)에서 오늘 새로 들어온 공고만 알림
//
// 환경 변수:
//   NTFY_TOPIC        알림 주제 이름 (subscriptions.json의 topicEnv로 다른 이름도 사용 가능)
//   NTFY_SERVER       ntfy 서버 주소 (기본: config.js의 NOTIFY_CONFIG.server)
//   NTFY_TOKEN        보호된 주제용 접근 토큰 (선택)
//   SITE_URL          알림을 눌렀을 때 열 사이트 주소 (선택)
//   POLICY_DATA_URL   공고 데이터를 받아올 주소 (선택, 없으면 data/policies.json 사용)
//   SINCE, DRY_RUN, SEND_NOW, NEW_IDS_FILE   위 옵션과 같은 뜻 (GitHub Actions용)
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { API_CONFIG, DATA_URL, NOTIFY_CONFIG, SEARCH_FIELDS } from '../js/config.js';
import { adapters } from '../js/data/adapters/index.js';
import { standardAdapter } from '../js/data/adapters/standard.js';
import { buildDigest, findAlertMatches, parseKeywords } from '../js/services/alerts.js';
import { isDateString } from '../js/services/date.js';
import { publishNtfy } from '../js/services/ntfy.js';
import { addDays, koreaDate } from './lib/dates.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseOptions(argv, env) {
  const args = [...argv];
  const valueOf = (flag) => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : undefined;
  };
  return {
    dryRun: args.includes('--dry-run') || env.DRY_RUN === 'true',
    sendNow: args.includes('--now') || env.SEND_NOW === 'true',
    since: valueOf('--since') || env.SINCE || undefined,
    today: valueOf('--today') || undefined,
    newIdsFile: valueOf('--new-ids') || env.NEW_IDS_FILE || undefined,
  };
}

// 공고 갱신 단계가 남긴 '오늘 새로 들어온 공고' 목록 (오늘 날짜 것만 사용)
async function loadNewIds(file, today) {
  try {
    const data = JSON.parse(await readFile(path.resolve(ROOT, file), 'utf8'));
    return data.date === today && Array.isArray(data.ids) ? new Set(data.ids) : null;
  } catch {
    return null;
  }
}

async function loadPolicies(env) {
  if (env.POLICY_DATA_URL) {
    const response = await fetch(env.POLICY_DATA_URL);
    if (!response.ok) throw new Error(`공고 데이터를 받지 못했습니다 (${response.status})`);
    const convert = adapters[API_CONFIG.adapter] ?? standardAdapter;
    return convert(await response.json());
  }
  return standardAdapter(JSON.parse(await readFile(path.join(ROOT, DATA_URL), 'utf8')));
}

async function loadSubscriptions() {
  const file = path.join(ROOT, NOTIFY_CONFIG.subscriptionsFile);
  const data = JSON.parse(await readFile(file, 'utf8'));
  return (data.subscriptions ?? [])
    .map((sub, index) => ({
      name: sub.name || `구독 ${index + 1}`,
      topicEnv: sub.topicEnv || 'NTFY_TOPIC',
      keywords: parseKeywords((sub.keywords ?? []).join('\n')),
      categories: Array.isArray(sub.categories) ? sub.categories : [],
    }))
    .filter((sub) => sub.keywords.length);
}

// 알림 도착 시각(오늘 sendTime, 한국 시각)까지 15초 이상 남았으면 예약 발송
function scheduledDelay(today, now) {
  const target = new Date(`${today}T${NOTIFY_CONFIG.sendTime}:00+09:00`);
  return target - now > 15_000 ? Math.floor(target / 1000) : undefined;
}

async function main() {
  const env = process.env;
  const options = parseOptions(process.argv.slice(2), env);
  const now = new Date();
  const today = options.today ?? koreaDate(now);
  const since = options.since ?? addDays(today, -1);
  if (!isDateString(today) || !isDateString(since)) {
    throw new Error('날짜는 YYYY-MM-DD 형식이어야 합니다.');
  }

  const keywordField = SEARCH_FIELDS.find((field) => field.type === 'keyword');
  const keywordFields = keywordField?.fields ?? ['title', 'content'];
  const [policies, subscriptions] = await Promise.all([loadPolicies(env), loadSubscriptions()]);
  const delay = options.sendNow ? undefined : scheduledDelay(today, now);

  // 시작 날짜를 직접 지정하지 않았고 갱신 단계의 새 공고 목록이 있으면 그 공고만 대상으로 함
  const newIds = !options.since && options.newIdsFile ? await loadNewIds(options.newIdsFile, today) : null;
  const candidates = newIds ? policies.filter((policy) => newIds.has(policy.id)) : policies;
  const window = newIds ? {} : { since, until: today };

  console.log(
    newIds
      ? `확인 대상: 오늘 갱신에서 새로 들어온 공고 ${candidates.length}건 | 구독 ${subscriptions.length}개`
      : `확인 기간: 공고일 ${since} ~ ${addDays(today, -1)} | 공고 ${policies.length}건 | 구독 ${subscriptions.length}개`,
  );

  let failures = 0;
  for (const sub of subscriptions) {
    const matches = findAlertMatches(
      candidates,
      { keywords: sub.keywords, categories: sub.categories, ...window },
      keywordFields,
    );
    console.log(`\n[${sub.name}] 키워드: ${sub.keywords.join(', ')} → 새 공고 ${matches.length}건`);
    if (!matches.length) continue;

    const digest = buildDigest(matches, { maxItems: NOTIFY_CONFIG.maxItems, siteUrl: env.SITE_URL || undefined });
    if (options.dryRun) {
      console.log(`(보내지 않음) ${digest.title}\n${digest.message}`);
      continue;
    }

    const topic = env[sub.topicEnv];
    if (!topic) {
      console.error(`알림 주제가 없습니다. GitHub 저장소 Secrets에 ${sub.topicEnv}를 등록하세요.`);
      failures += 1;
      continue;
    }
    try {
      await publishNtfy({
        server: env.NTFY_SERVER || NOTIFY_CONFIG.server,
        topic,
        token: env.NTFY_TOKEN || undefined,
        tags: ['bell'],
        delay,
        ...digest,
      });
      console.log(delay ? `예약 발송 완료 (${NOTIFY_CONFIG.sendTime} 도착)` : '발송 완료');
    } catch (error) {
      console.error(`발송 실패: ${error.message}`);
      failures += 1;
    }
  }

  if (failures) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
