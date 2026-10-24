#!/usr/bin/env node
/*
 * build-stroke-data.js
 *
 * Generates Hanzi Writer stroke data for Cantonese characters that are missing
 * from hanzi-writer-data, by composing strokes from characters that are in it.
 * No strokes are drawn by hand: every outline and median comes from the
 * Make Me a Hanzi / hanzi-writer-data set, cut out and affine-transformed.
 *
 * Usage:
 *   node scripts/build-stroke-data.js            # write all to stroke-data/
 *   node scripts/build-stroke-data.js 喺 咗       # only these characters
 *
 * Source data: uses the local `hanzi-writer-data` npm package if it can be
 * resolved (npm i --no-save hanzi-writer-data), otherwise fetches from jsDelivr.
 *
 * Coordinate system: 1024x1024, x 0..1024, y -124..900, y axis points UP.
 *
 * Licence: the generated files are derived from hanzi-writer-data
 * (Arphic Public License / LGPL-3.0) and are distributed under the same terms.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'stroke-data');
const CDN = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@latest/';

const range = (a, b) => Array.from({ length: b - a }, (_, i) => a + i);

/*
 * Spec fields
 *   donor        character whose `keep` strokes are copied as-is (the radical)
 *   keep         stroke indices from donor to keep (default: donor.radStrokes)
 *   boxFrom      donor stroke indices whose bounding box is the target slot
 *                (default: all donor strokes not in `keep`)
 *   comp         character supplying the component strokes
 *   compStrokes  which comp strokes to use (default: all)
 *   layout       'lr'   slot starts right of the kept strokes (+ gap)
 *                'tb'   slot sits below the kept strokes (- gap)
 *                'swap' slot is exactly the boxFrom box, no clamping
 *                'del'  just drop strokes from donor (uses `drop`)
 *   gap          clearance from the kept strokes (lr/tb), font units
 *   box          {x0,y0,x1,y1} adjustments added to the computed slot
 *   scaleX/Y     shrink the placed component about the slot centre
 *   radStrokes   radical indices in the output (default: the kept strokes)
 */
const SPECS = {
  // --- Strategy A: 口 + component -----------------------------------------
  '喺': { layout: 'lr', donor: '唔', comp: '係' },
  '咗': { layout: 'lr', donor: '唔', comp: '左' },
  '啱': { layout: 'lr', donor: '唔', comp: '岩' },
  '啲': { layout: 'lr', donor: '唔', comp: '的' },
  '嚟': { layout: 'lr', donor: '唔', comp: '黎' },
  '咁': { layout: 'lr', donor: '唔', comp: '甘' },
  '哋': { layout: 'lr', donor: '唔', comp: '地' },
  '嗰': { layout: 'lr', donor: '唔', comp: '個' },
  '㗎': { layout: 'lr', donor: '唔', comp: '架' },
  '嘥': { layout: 'lr', donor: '唔', comp: '徙' },
  '噉': { layout: 'lr', donor: '唔', comp: '敢' },
  '嚿': { layout: 'lr', donor: '唔', comp: '舊' },
  '喐': { layout: 'lr', donor: '唔', comp: '郁' },

  // --- Strategy A: other radicals -----------------------------------------
  '佢': { layout: 'lr', donor: '你', comp: '巨' },
  '諗': { layout: 'lr', donor: '說', comp: '念' },

  // --- 扌 + right part lifted out of 溫 / 温 (its 氵 removed) ---------------
  '搵': { layout: 'lr', donor: '提', comp: '溫', compStrokes: range(3, 13) },
  '揾': { layout: 'lr', donor: '提', comp: '温', compStrokes: range(3, 12) },

  // --- Strategy C: stroke deletion ----------------------------------------
  // 有 minus the two inner horizontals of 月. Radical of 冇 is 冂.
  '冇': { layout: 'del', donor: '有', drop: [4, 5], radStrokes: [2, 3] },

  // --- Strategy B/D: 攰 = ⿺支力, same frame as 翅 = ⿺支羽 -------------------
  '攰': {
    layout: 'swap', donor: '翅', keep: [0, 1, 2, 3], boxFrom: range(4, 10),
    comp: '力', radStrokes: [0, 1, 2, 3],
  },

  // --- 冚 = ⿱冖山, frame from 冗 = ⿱冖几 ------------------------------------
  '冚': { layout: 'tb', donor: '冗', keep: [0, 1], comp: '山', radStrokes: [0, 1] },
};

// Per-character visual tuning, merged into the spec. Filled in after the
// preview check.
const OVERRIDES = {
  // 冗's 几 slot is much wider than 山 should be; pull it in under 冖.
  '冚': { gap: 0, box: { x0: 50, x1: -70, y0: -20 } },
};

const DEFAULT_GAP = { lr: 20, tb: 20 };

// ---------------------------------------------------------------------------
// Data loading

let localDir = null;
try {
  localDir = path.dirname(require.resolve('hanzi-writer-data/package.json'));
} catch (_) { /* fall back to CDN */ }

const cache = new Map();
async function load(ch) {
  if (cache.has(ch)) return cache.get(ch);
  let json;
  const local = localDir && path.join(localDir, ch + '.json');
  if (local && fs.existsSync(local)) {
    json = JSON.parse(fs.readFileSync(local, 'utf8'));
  } else {
    const r = await fetch(CDN + encodeURIComponent(ch) + '.json');
    if (!r.ok) throw new Error(`No source data for ${ch} (HTTP ${r.status})`);
    json = await r.json();
  }
  cache.set(ch, json);
  return json;
}

// ---------------------------------------------------------------------------
// Geometry

const NUM = /-?\d+(?:\.\d+)?/g;
const ALLOWED_CMDS = /^[MLQCZ\s\d.\-]*$/;

function pathPoints(d) {
  const n = d.match(NUM).map(Number);
  const pts = [];
  for (let i = 0; i < n.length; i += 2) pts.push([n[i], n[i + 1]]);
  return pts;
}

function bbox(char, idx) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const i of idx) {
    for (const [x, y] of pathPoints(char.strokes[i])) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  return { x0, y0, x1, y1 };
}

function transformPath(d, f) {
  if (!ALLOWED_CMDS.test(d)) throw new Error('Unexpected SVG command in: ' + d.slice(0, 60));
  // Every command used (M L Q C) takes absolute x,y pairs; Z takes none.
  let toggle = 0, x = 0;
  return d.replace(NUM, (s) => {
    const v = Number(s);
    if (toggle === 0) { x = v; toggle = 1; return '\u0000'; }
    toggle = 0;
    const [nx, ny] = f(x, v);
    return `${Math.round(nx)} ${Math.round(ny)}`;
  }).replace(/\u0000[ ,]?/g, '');
}

function fitTransform(src, dst, scaleX = 1, scaleY = 1) {
  const sx = (dst.x1 - dst.x0) / (src.x1 - src.x0) * scaleX;
  const sy = (dst.y1 - dst.y0) / (src.y1 - src.y0) * scaleY;
  const scx = (src.x0 + src.x1) / 2, scy = (src.y0 + src.y1) / 2;
  const dcx = (dst.x0 + dst.x1) / 2, dcy = (dst.y0 + dst.y1) / 2;
  return (x, y) => [dcx + (x - scx) * sx, dcy + (y - scy) * sy];
}

// ---------------------------------------------------------------------------
// Build

async function build(target) {
  const spec = { ...SPECS[target], ...(OVERRIDES[target] || {}) };
  const donor = await load(spec.donor);
  const all = donor.strokes.map((_, i) => i);

  if (spec.layout === 'del') {
    const keep = all.filter((i) => !spec.drop.includes(i));
    return {
      strokes: keep.map((i) => donor.strokes[i]),
      medians: keep.map((i) => donor.medians[i]),
      radStrokes: spec.radStrokes,
    };
  }

  const keep = spec.keep || donor.radStrokes;
  if (!keep || !keep.length) throw new Error(`${target}: donor ${spec.donor} has no radStrokes; set keep`);
  const boxFrom = spec.boxFrom || all.filter((i) => !keep.includes(i));

  const keepBB = bbox(donor, keep);
  const slot = bbox(donor, boxFrom);
  const gap = spec.gap ?? DEFAULT_GAP[spec.layout] ?? 0;
  if (spec.layout === 'lr') slot.x0 = Math.max(slot.x0, keepBB.x1 + gap);
  if (spec.layout === 'tb') slot.y1 = Math.min(slot.y1, keepBB.y0 - gap);
  if (spec.box) for (const k of ['x0', 'y0', 'x1', 'y1']) slot[k] += spec.box[k] || 0;

  const comp = await load(spec.comp);
  const compIdx = spec.compStrokes || comp.strokes.map((_, i) => i);
  const f = fitTransform(bbox(comp, compIdx), slot, spec.scaleX, spec.scaleY);

  const strokes = keep.map((i) => donor.strokes[i]);
  const medians = keep.map((i) => donor.medians[i]);
  for (const i of compIdx) {
    strokes.push(transformPath(comp.strokes[i], f));
    medians.push(comp.medians[i].map(([x, y]) => f(x, y).map(Math.round)));
  }
  return { strokes, medians, radStrokes: spec.radStrokes || keep.map((_, i) => i) };
}

async function main() {
  const wanted = process.argv.slice(2).join('').split('').filter((c) => c.trim());
  const targets = wanted.length ? wanted : Object.keys(SPECS);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let failed = 0;
  for (const t of targets) {
    if (!SPECS[t]) { console.error(`skip ${t}: no spec`); failed++; continue; }
    try {
      const data = await build(t);
      if (data.strokes.length !== data.medians.length) throw new Error('strokes/medians length mismatch');
      fs.writeFileSync(path.join(OUT_DIR, t + '.json'), JSON.stringify(data));
      console.log(`${t}  ${data.strokes.length} strokes  (${SPECS[t].layout}: ${SPECS[t].donor}${SPECS[t].comp ? ' + ' + SPECS[t].comp : ''})`);
    } catch (e) {
      console.error(`FAIL ${t}: ${e.message}`); failed++;
    }
  }
  process.exitCode = failed ? 1 : 0;
}

main();
