// 표(CSV)에서 공고 읽기: 구글 시트 'CSV로 게시' 주소, 또는 저장소 안의 CSV 파일
// 열 이름은 사이트의 '엑셀 다운로드' 파일과 같습니다. (templates/policies-template.csv 참고)
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { CATEGORIES } from '../../js/config.js';
import { parseCsv } from '../lib/csv.js';

// 열 이름(띄어쓰기 무시) → 공고 필드
const COLUMN_ALIASES = {
  id: ['공고ID', '공고번호', 'id'],
  category: ['검색유형', '유형', 'category'],
  title: ['공고명', 'title'],
  announceDate: ['공고일', 'announceDate'],
  agency: ['주체기관', '기관', 'agency'],
  period: ['사업기간', 'period'],
  periodStart: ['사업시작일'],
  periodEnd: ['사업종료일'],
  content: ['정책사업내용', '사업내용', 'content'],
  target: ['지원대상', 'target'],
  budget: ['예산(원)', '예산', 'budget'],
  deadline: ['지원마감일', '마감일', 'deadline'],
  url: ['공고URL', '원문', 'url'],
};

const squash = (text) => String(text).replace(/\s+/g, '').toLowerCase();

function mapHeader(header) {
  return header.map((name) => {
    const key = squash(name);
    return Object.keys(COLUMN_ALIASES).find((field) =>
      COLUMN_ALIASES[field].some((alias) => squash(alias) === key),
    );
  });
}

// 엑셀 다운로드 때 수식 방지용으로 붙인 ' 제거
const clean = (value) => String(value ?? '').trim().replace(/^'(?=[=+\-@])/, '');

// '12억 5,000만원', '30,000,000', '3000만' → 원 단위 숫자
export function parseAmount(text) {
  const compact = clean(text).replace(/[\s,원]/g, '');
  if (!compact) return null;
  if (/^\d+(\.\d+)?$/.test(compact)) return Number(compact);
  const match = compact.match(/^(?:(\d+(?:\.\d+)?)억)?(?:(\d+(?:\.\d+)?)만)?$/);
  if (!match || (!match[1] && !match[2])) return null;
  return Math.round(Number(match[1] ?? 0) * 1e8 + Number(match[2] ?? 0) * 1e4);
}

// '수의계약' 같은 이름 또는 'contract' 같은 id → 카테고리 id
function toCategory(value, fallback) {
  const text = clean(value);
  const found = CATEGORIES.find((c) => c.id !== 'all' && (c.label === text || c.id === text));
  return found?.id ?? fallback;
}

// ID 열이 없으면 공고명·기관·공고일로 항상 같은 ID를 만듦
function stableId(prefix, parts) {
  const hash = createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 10);
  return `${prefix}-${hash}`;
}

async function readText(source, env, root) {
  const url = (source.urlEnv && env[source.urlEnv]) || source.url;
  if (url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`CSV를 받지 못했습니다 (${response.status})`);
    return response.text();
  }
  if (source.file) return readFile(path.join(root, source.file), 'utf8');
  throw new Error(`CSV 주소가 없습니다. GitHub Secrets에 ${source.urlEnv ?? 'CSV 주소'}를 등록하거나 file을 지정하세요.`);
}

export async function collectCsv(source, env, { root, log }) {
  const rows = parseCsv(await readText(source, env, root));
  if (!rows.length) return [];

  const fields = mapHeader(rows[0]);
  if (!fields.includes('title')) {
    throw new Error('CSV 첫 줄에 "공고명" 열이 없습니다. templates/policies-template.csv 양식을 사용하세요.');
  }

  const items = [];
  let skipped = 0;
  rows.slice(1).forEach((cells) => {
    const row = {};
    fields.forEach((field, index) => {
      if (field) row[field] = clean(cells[index]);
    });
    if (!row.title) {
      skipped += 1;
      return;
    }
    const [start, end] = row.period ? row.period.split(/\s*~\s*/) : [row.periodStart, row.periodEnd];
    items.push({
      id: row.id || stableId(source.id, [row.title, row.agency, row.announceDate]),
      category: toCategory(row.category, source.defaultCategory ?? 'contract'),
      title: row.title,
      announceDate: row.announceDate,
      agency: row.agency || undefined,
      period: start || end ? { start, end } : null,
      content: row.content || undefined,
      target: row.target || undefined,
      budget: parseAmount(row.budget),
      deadline: row.deadline,
      url: row.url || undefined,
    });
  });
  if (skipped) log(`  공고명이 비어 있는 줄 ${skipped}개는 건너뛰었습니다.`);
  return items;
}
