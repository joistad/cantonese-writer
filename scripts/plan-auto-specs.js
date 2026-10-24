#!/usr/bin/env node
/*
 * plan-auto-specs.js
 *
 * Picks donors for every character in stroke-data/targets.tsv that has no
 * hand-written spec in build-stroke-data.js, and writes scripts/auto-specs.json.
 * build-stroke-data.js then builds those characters exactly like the manual ones.
 *
 * Needs local data:
 *   npm i --no-save hanzi-writer-data
 *   IDS file from https://github.com/cjkvi/cjkvi-ids (ids.txt), passed as
 *   --ids <path> or downloaded to scripts/.cache/ids.txt on first run
 *
 * For a target ⿰XY (or ⿱XY) it looks for:
 *   donorL  a dataset character ⿰X?  -> supplies X's strokes, in place
 *   donorR  a dataset character ⿰?Y  -> supplies Y's strokes as a right-hand
 *           (or bottom) component, keeping their designed proportions
 * If no donorR exists, the whole character Y is used instead.
 * The part boundary is found from stroke counts (left/top part is written
 * first), and each split is checked geometrically before it is used.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TARGETS = path.join(ROOT, 'stroke-data', 'targets.tsv');
const OUT = path.join(__dirname, 'auto-specs.json');
const IDS_URL = 'https://raw.githubusercontent.com/cjkvi/cjkvi-ids/master/ids.txt';

const OPS = new Set('⿰⿱⿲⿳⿴⿵⿶⿷⿸⿹⿺⿻');

// Planned automatically but rejected after the visual check.
const REJECT = {
  '㷫': 'bottom 火 too small (donor 磬 has a short bottom slot)',
  '覮': 'top 𤇾 comes out malformed',
  '糴': 'left 籴 squeezed into a sliver',
};

function arg(name) {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : null;
}

async function loadIds() {
  let p = arg('--ids');
  if (!p) {
    p = path.join(__dirname, '.cache', 'ids.txt');
    if (!fs.existsSync(p)) {
      fs.mkdirSync(path.dirname(p), { recursive: true });
      const r = await fetch(IDS_URL);
      if (!r.ok) throw new Error('Could not download ids.txt: HTTP ' + r.status);
      fs.writeFileSync(p, await r.text());
    }
  }
  const ids = new Map();
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const f = line.split('\t');
    if (f.length < 3 || f[0].startsWith('#')) continue;
    ids.set(f[1], Array.from(f[2].replace(/\[[^\]]*\]/g, '')));
  }
  return ids;
}

const dataDir = path.dirname(require.resolve('hanzi-writer-data/package.json'));
const dataCache = new Map();
function data(ch) {
  if (!dataCache.has(ch)) {
    const f = path.join(dataDir, ch + '.json');
    dataCache.set(ch, fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);
  }
  return dataCache.get(ch);
}
const n = (ch) => (data(ch) ? data(ch).strokes.length : null);

function bbox(char, idx) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const i of idx) {
    const v = char.strokes[i].match(/-?\d+(?:\.\d+)?/g).map(Number);
    for (let k = 0; k < v.length; k += 2) {
      x0 = Math.min(x0, v[k]); x1 = Math.max(x1, v[k]);
      y0 = Math.min(y0, v[k + 1]); y1 = Math.max(y1, v[k + 1]);
    }
  }
  return { x0, y0, x1, y1 };
}
const range = (a, b) => Array.from({ length: b - a }, (_, i) => a + i);

// Is "first k strokes = first part" geometrically plausible for this op?
const SIDE = new Set(['⿰', '⿱']);      // side by side / stacked
const FRAME = new Set(['⿵', '⿸']);     // frame written first, inner part after

// Is "first k strokes = first part" geometrically plausible for this op?
function splitOk(ch, k, op) {
  const d = data(ch);
  const total = d.strokes.length;
  if (k <= 0 || k >= total) return false;
  const a = bbox(d, range(0, k)), b = bbox(d, range(k, total));
  if (op === '⿰') {
    // first part's centre clearly left of the second's, and not much overlap
    const ca = (a.x0 + a.x1) / 2, cb = (b.x0 + b.x1) / 2;
    return ca + 120 < cb && a.x1 - b.x0 < 0.45 * (a.x1 - a.x0);
  }
  if (op === '⿱') {
    const ca = (a.y0 + a.y1) / 2, cb = (b.y0 + b.y1) / 2; // y up: top part has larger y
    return ca > cb + 120 && b.y1 - a.y0 < 0.45 * (a.y1 - a.y0);
  }
  // frame: inner part's centre inside the frame, and inner box mostly inside it
  const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
  const inside = cx > a.x0 && cx < a.x1 && cy > a.y0 && cy < a.y1;
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  return inside && w > 0.8 * (b.x1 - b.x0) && h > 0.8 * (b.y1 - b.y0);
}

async function main() {
  const ids = await loadIds();
  const manual = require('./build-stroke-data.js').SPECS;

  // Index dataset characters by their two-part decompositions.
  const byFirst = new Map(), bySecond = new Map();
  const push = (m, k, v) => { if (!m.has(k)) m.set(k, []); m.get(k).push(v); };
  for (const f of fs.readdirSync(dataDir)) {
    if (!f.endsWith('.json')) continue;
    const ch = f.slice(0, -5);
    if (Array.from(ch).length !== 1) continue;
    const d = ids.get(ch);
    if (!d || d.length !== 3 || !(SIDE.has(d[0]) || FRAME.has(d[0]))) continue;
    if (OPS.has(d[1]) || OPS.has(d[2])) continue;
    push(byFirst, d[0] + d[1], ch);
    push(bySecond, d[0] + d[2], ch);
  }

  // First-part stroke count of a dataset char ⿰AB: total minus n(B), or n(A).
  function firstCount(ch) {
    const [, a, b] = ids.get(ch);
    if (n(b) != null) return n(ch) - n(b);
    if (n(a) != null) return n(a);
    return null;
  }

  // Best dataset char with `part` in position `pos` (1 = first, 2 = second)
  // under `op`, with a valid split. score(k, total) picks among candidates.
  function findPart(op, part, pos, score) {
    let best = null;
    for (const c of (pos === 1 ? byFirst : bySecond).get(op + part) || []) {
      const k = firstCount(c);
      if (k == null || !splitOk(c, k, op)) continue;
      const s = score(k, n(c));
      const strokes = pos === 1 ? range(0, k) : range(k, n(c));
      if (!best || s < best.score) best = { char: c, strokes, rest: pos === 1 ? range(k, n(c)) : range(0, k), score: s };
    }
    return best;
  }

  const targets = fs.readFileSync(TARGETS, 'utf8').split('\n')
    .filter((l) => l && !l.startsWith('#')).map((l) => l.split('\t')[0]);

  const specs = {}, skipped = {};
  for (const t of targets) {
    if (manual[t] || data(t)) continue;
    if (REJECT[t]) { skipped[t] = 'rejected: ' + REJECT[t]; continue; }
    const d = ids.get(t);
    if (!d) { skipped[t] = 'no IDS'; continue; }
    if (d.length !== 3 || !(SIDE.has(d[0]) || FRAME.has(d[0])) || OPS.has(d[1]) || OPS.has(d[2])) {
      skipped[t] = 'structure ' + d.join(''); continue;
    }
    const [op, X, Y] = d;
    const base = { radStrokes: null, ids: d.join('') }; // first part is not always the radical

    // Second part: lifted from a char that has it in the same position
    // (designed proportions), else the whole character Y.
    let second = findPart(op, Y, 2, (k) => (n(X) == null ? 0 : Math.abs(k - n(X))));
    if (!second && n(Y) != null) second = { char: Y, strokes: range(0, n(Y)), whole: true };

    if (FRAME.has(op)) {
      if (!second) { skipped[t] = `no source for ${Y}`; continue; }
      const frame = findPart(op, X, 1, (k, tot) => Math.abs((tot - k) - second.strokes.length));
      if (!frame) { skipped[t] = `no donor for ${X}`; continue; }
      specs[t] = { layout: 'swap', donor: frame.char, keep: frame.strokes, boxFrom: frame.rest,
        comp: second.char, compStrokes: second.strokes, ...base };
      continue;
    }

    // Side by side / stacked. Keep the first part in place from a donor ⿰X?.
    const nY = second ? second.strokes.length : n(Y);
    const first = findPart(op, X, 1, (k, tot) => Math.abs((tot - k) - (nY || 0)));
    if (first && second) {
      specs[t] = { layout: op === '⿰' ? 'lr' : 'tb', donor: first.char, keep: first.strokes,
        comp: second.char, compStrokes: second.strokes, ...base };
      // A lifted component keeps its own extent on the cross axis.
      if (!second.whole) specs[t].slotFromComp = true;
      continue;
    }
    // Mirror: keep the second part in place, fit the whole of X into the first slot.
    if (second && !second.whole && n(X) != null) {
      specs[t] = { layout: op === '⿰' ? 'rl' : 'bt', donor: second.char, keep: second.strokes,
        comp: X, ...base };
      continue;
    }
    skipped[t] = !second ? `no source for ${Y}` : `no donor for ${X}`;
  }

  fs.writeFileSync(OUT, JSON.stringify({ specs, skipped }, null, 1) + '\n');
  console.log(`planned ${Object.keys(specs).length}, skipped ${Object.keys(skipped).length}`);
  for (const [c, why] of Object.entries(skipped)) console.log(`  skip ${c}: ${why}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
