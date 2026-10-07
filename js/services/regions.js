// 지역(시·도) 찾기 — 브라우저와 Node.js 공용
import { REGIONS } from '../config.js';

const byId = new Map(REGIONS.map((region) => [region.id, region]));

export function regionLabel(id) {
  return byId.get(id)?.label ?? '';
}

// '서울', 'seoul', '서울특별시 강남구', '경기도 수원시' 같은 글에서 지역 id를 찾음. 못 찾으면 null
// 글 안에서 가장 앞에 나오는 지역 이름을 고름 ('경기도 광주시' → 경기)
export function resolveRegion(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  if (byId.has(text)) return text;

  let best = null;
  REGIONS.forEach((region) => {
    region.names.forEach((name) => {
      const index = text.indexOf(name);
      if (index < 0) return;
      if (!best || index < best.index || (index === best.index && name.length > best.length)) {
        best = { id: region.id, index, length: name.length };
      }
    });
  });
  return best?.id ?? null;
}
