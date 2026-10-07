// 지역별 공고 지도: 시·도를 눌러 지역을 고르면 그 지역 공고만 보여 줌
// - 지도 색이 진할수록 공고가 많음 (한 가지 색의 진하기로 많고 적음을 표시)
// - 지도는 마우스·터치용이고, 같은 기능을 하는 지역 버튼 목록이 옆에 있어 키보드·화면 읽기 프로그램으로도 쓸 수 있음
import { formatValue } from '../services/format.js';
import { deadlineStatus, todayString } from '../services/date.js';
import { createDeadlineBadge } from './deadlineBadge.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const LEVELS = 4; // 색 단계 수 (공고 없음 제외)

function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// 공고 수 → 색 단계(0~4). 최댓값이 4 이하이면 1건=1단계…, 그보다 크면 최댓값을 4등분
function levelOf(count, max) {
  if (!count) return 0;
  if (max <= LEVELS) return Math.min(count, LEVELS);
  return Math.max(1, Math.ceil((count / max) * LEVELS));
}

function legendLabels(max) {
  if (max <= LEVELS) return ['1건', '2건', '3건', `${LEVELS}건 이상`].slice(0, LEVELS);
  return Array.from({ length: LEVELS }, (_, i) => {
    const low = Math.floor((i / LEVELS) * max) + 1;
    const high = Math.floor(((i + 1) / LEVELS) * max);
    return low >= high ? `${high}건` : `${low}~${high}건`;
  });
}

export function createRegionExplorer(
  container,
  { regions, paths, viewBox, deadlineWarningDays, onSelect, onOpenDetail, onShowResults },
) {
  const labels = Object.fromEntries(regions.map((r) => [r.id, r.label]));

  // ---------- 지도 ----------
  const mapBox = el('div', 'region-map');
  const svg = svgEl('svg', { viewBox, class: 'region-map__svg', 'aria-hidden': 'true', focusable: 'false' });
  const shapes = new Map();
  const bubbles = new Map();
  const shapeLayer = svgEl('g');
  const bubbleLayer = svgEl('g', { class: 'region-map__bubbles' });
  const nameLayer = svgEl('g', { class: 'region-map__names' });

  regions.forEach((region) => {
    const d = paths[region.id];
    if (!d) return;
    const path = svgEl('path', { d, class: 'region-shape', 'data-region': region.id });
    path.addEventListener('click', () => onSelect(currentSelected === region.id ? '' : region.id));
    shapeLayer.append(path);
    shapes.set(region.id, path);

    const [x, y] = region.point;
    const bubble = svgEl('g', { class: 'region-bubble', transform: `translate(${x} ${y})` });
    const circle = svgEl('circle', { r: '17' });
    const text = svgEl('text', { 'text-anchor': 'middle', dy: '0.35em' });
    bubble.append(circle, text);
    bubbleLayer.append(bubble);
    bubbles.set(region.id, { group: bubble, text });

    // 넓은 도 지역은 지도 위에 이름도 표시
    if (region.name) {
      const right = region.name === 'right';
      const name = svgEl('text', {
        class: 'region-name',
        x: String(right ? x + 26 : x),
        y: String(right ? y : y + 34),
        dy: '0.35em',
        'text-anchor': right ? 'start' : 'middle',
      });
      name.textContent = region.label;
      nameLayer.append(name);
    }
  });
  svg.append(shapeLayer, nameLayer, bubbleLayer);

  // 마우스를 올린 지역 이름·공고 수
  const tooltip = el('div', 'region-map__tooltip');
  tooltip.hidden = true;
  let counts = {};
  svg.addEventListener('pointermove', (event) => {
    const id = event.target.dataset?.region;
    if (!id) {
      tooltip.hidden = true;
      return;
    }
    const box = mapBox.getBoundingClientRect();
    tooltip.replaceChildren(el('strong', '', labels[id]), ` 공고 ${counts[id] ?? 0}건`);
    tooltip.style.left = `${event.clientX - box.left}px`;
    tooltip.style.top = `${event.clientY - box.top}px`;
    tooltip.hidden = false;
  });
  svg.addEventListener('pointerleave', () => {
    tooltip.hidden = true;
  });

  const legend = el('div', 'region-legend');
  mapBox.append(svg, tooltip, legend);

  // ---------- 지역 정보 ----------
  const panel = el('div', 'region-panel');
  const eyebrow = el('p', 'region-panel__eyebrow', '지역별 공고 지도');
  const heading = el('h2', 'region-panel__title');
  heading.id = 'region-title';
  const hint = el('p', 'region-panel__hint');
  const stats = el('dl', 'region-panel__stats');
  const listTitle = el('h3', 'region-panel__subtitle');
  const list = el('ul', 'region-panel__list');
  const actions = el('div', 'region-panel__actions');
  const chipsTitle = el('h3', 'region-panel__subtitle', '지역 선택');
  const chips = el('div', 'region-chips');
  chips.setAttribute('role', 'group');
  chips.setAttribute('aria-label', '지역 선택');

  const chipButtons = new Map();
  [{ id: '', label: '전국' }, ...regions].forEach((region) => {
    const button = el('button', 'region-chip');
    button.type = 'button';
    button.dataset.region = region.id;
    const name = el('span', '', region.label);
    const count = el('span', 'region-chip__count');
    button.append(name, count);
    button.addEventListener('click', () => onSelect(region.id));
    chips.append(button);
    chipButtons.set(region.id, { button, count, label: region.label });
  });

  panel.append(eyebrow, heading, hint, stats, listTitle, list, actions, chipsTitle, chips);
  container.replaceChildren(mapBox, panel);
  container.setAttribute('aria-labelledby', 'region-title');

  let currentSelected = '';

  function renderStats(items) {
    const statuses = items.map((p) => deadlineStatus(p.deadline, deadlineWarningDays));
    const values = [
      ['공고', items.length],
      ['접수 중', statuses.filter((s) => s && s.tone !== 'closed').length],
      ['마감 임박', statuses.filter((s) => s?.tone === 'urgent').length],
    ];
    stats.replaceChildren(
      ...values.map(([label, value]) => {
        const item = el('div', `region-panel__stat${label === '마감 임박' && value ? ' is-urgent' : ''}`);
        const desc = el('dd');
        desc.append(el('strong', '', value.toLocaleString('ko-KR')), '건');
        item.append(el('dt', '', label), desc);
        return item;
      }),
    );
  }

  // 접수 중인 공고를 먼저, 마감이 가까운 순으로 3건
  function renderTop(items) {
    const today = todayString();
    const top = [...items]
      .sort(
        (a, b) =>
          Number((a.deadline ?? '9999') < today) - Number((b.deadline ?? '9999') < today) ||
          (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999'),
      )
      .slice(0, 3);
    listTitle.textContent = top.length ? '마감이 가까운 공고' : '';
    list.replaceChildren(
      ...top.map((policy) => {
        const item = el('li', 'region-panel__item');
        const link = el('button', 'region-panel__link', policy.title);
        link.type = 'button';
        link.addEventListener('click', () => onOpenDetail(policy.id));
        const meta = el('p', 'region-panel__meta');
        meta.append(`${policy.agency ?? '-'} · 마감 ${formatValue(policy.deadline, 'date')}`);
        const badge = createDeadlineBadge(policy.deadline, deadlineWarningDays);
        if (badge) meta.append(' ', badge);
        item.append(link, meta);
        return item;
      }),
    );
    if (!top.length) list.append(el('li', 'region-panel__empty', '이 지역에는 조건에 맞는 공고가 없습니다.'));
  }

  return {
    // selected: 고른 지역 id('' = 전국), counts: { 지역 id: 공고 수 } (지역 조건을 뺀 현재 검색 기준),
    // items: 지금 결과(고른 지역 포함), total: 지역 조건을 뺀 전체 건수
    render({ selected, counts: nextCounts, items, total }) {
      currentSelected = selected;
      counts = nextCounts;
      const max = Math.max(0, ...Object.values(nextCounts));

      shapes.forEach((path, id) => {
        path.dataset.level = String(levelOf(nextCounts[id] ?? 0, max));
        path.classList.toggle('is-selected', id === selected);
        path.classList.toggle('is-dimmed', Boolean(selected) && id !== selected);
      });
      bubbles.forEach(({ group, text }, id) => {
        const count = nextCounts[id] ?? 0;
        group.style.display = count ? '' : 'none';
        group.classList.toggle('is-selected', id === selected);
        text.textContent = count;
      });
      // 고른 지역의 숫자가 다른 숫자에 가리지 않도록 맨 위로
      if (selected && bubbles.has(selected)) bubbleLayer.append(bubbles.get(selected).group);

      legend.replaceChildren(
        el('span', 'region-legend__title', '공고 수'),
        ...[['0', '없음'], ...legendLabels(max).map((label, i) => [String(i + 1), label])].map(([level, label]) => {
          const item = el('span', 'region-legend__item');
          const swatch = el('span', 'region-legend__swatch');
          swatch.dataset.level = level;
          item.append(swatch, label);
          return item;
        }),
      );

      const label = selected ? labels[selected] : '전국';
      heading.textContent = selected ? `${label} 지역 공고` : '전국 공고 한눈에 보기';
      hint.textContent = selected
        ? '지도에서 같은 지역을 다시 누르거나 [전국]을 고르면 전체로 돌아갑니다.'
        : '지도에서 지역을 누르면 그 지역 공고만 볼 수 있습니다.';
      renderStats(items);
      renderTop(items);

      const showButton = el('button', 'btn btn--primary', `${label} 공고 ${items.length.toLocaleString('ko-KR')}건 보기`);
      showButton.type = 'button';
      showButton.disabled = !items.length;
      showButton.addEventListener('click', onShowResults);
      actions.replaceChildren(showButton);

      chipButtons.forEach(({ button, count, label: name }, id) => {
        const value = id ? nextCounts[id] ?? 0 : total;
        count.textContent = value.toLocaleString('ko-KR');
        button.setAttribute('aria-pressed', String(id === selected));
        button.setAttribute('aria-label', `${name} ${value}건`);
        button.classList.toggle('is-empty', Boolean(id) && !value);
      });
    },
  };
}
