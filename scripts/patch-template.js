// Idempotent patches for DECK_HTML_WITH_HANZI_WRITER in anki-templates.dat.js.
// Always decodes the current template, patches it, and re-encodes it; never
// rebuilds the template from other sources. Safe to rerun.
'use strict';
const fs = require('fs');
const path = require('path');
const P = path.join(__dirname, '..', 'anki-templates.dat.js');
const KEY = /ANKI_TEMPLATES_B64\.DECK_HTML_WITH_HANZI_WRITER = "([^"]+)"/;

const dat = fs.readFileSync(P, 'utf8');
let html = Buffer.from(dat.match(KEY)[1], 'base64').toString('utf8');
const before = html;

function once(src, find, repl) {
  const n = src.split(find).length - 1;
  if (n !== 1) throw new Error(`expected 1 match, got ${n}: ${find}`);
  return src.replace(find, repl);
}

// 1. Fallback loader: official CDN first, then generated stroke-data/ on Pages.
if (!html.includes('cwCharDataLoader')) {
  const urlLine = 'var url_hanzi = "https://cdn.jsdelivr.net/npm/hanzi-writer-data@latest/";';
  html = once(html, urlLine, `${urlLine}
    var url_hanzi_fallback = "https://joistad.github.io/cantonese-writer/stroke-data/";
    function cwCharDataLoader(ch, onLoad, onError) {
        var enc = encodeURIComponent(ch);
        fetch(url_hanzi + enc + ".json")
            .then(function (r) { if (!r.ok) throw r.status; return r.json(); })
            .catch(function () {
                return fetch(url_hanzi_fallback + enc + ".json")
                    .then(function (r) { if (!r.ok) throw r.status; return r.json(); });
            })
            .then(onLoad)
            .catch(onError);
    }`);
  html = once(html,
    'HanziWriter.create("onfinish-grid-background-target" + i, hanzi, {',
    'HanziWriter.create("onfinish-grid-background-target" + i, hanzi, {\n                charDataLoader: cwCharDataLoader,');
  html = once(html,
    "HanziWriter.create('grid-background-target' + i, hanzi, {",
    "HanziWriter.create('grid-background-target' + i, hanzi, {\n                charDataLoader: cwCharDataLoader,");
}

// 2. Characters outside the BMP (𠵱, 𨋢, 𡃁 …) are two UTF-16 code units, so
//    characters[i] on the raw string split them in half. Store `characters` as
//    an array of code points instead; the template only uses .length and [i].
const RAW = /document\.getElementById\('char_(sim|trad)'\)\.textContent(?!\))/g;
if (!html.includes("Array.from(document.getElementById('char_")) {
  const n = (html.match(RAW) || []).length;
  if (n !== 6) throw new Error(`expected 6 character-field reads, got ${n}`);
  html = html.replace(RAW, "Array.from(document.getElementById('char_$1').textContent)");
}

if (html === before) { console.log('already patched'); process.exit(0); }
const b64 = Buffer.from(html, 'utf8').toString('base64');
fs.writeFileSync(P, dat.replace(KEY, `ANKI_TEMPLATES_B64.DECK_HTML_WITH_HANZI_WRITER = "${b64}"`));
console.log('patched');
