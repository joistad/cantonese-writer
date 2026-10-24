// One-off: add the stroke-data fallback loader to DECK_HTML_WITH_HANZI_WRITER.
// Decodes the current template from anki-templates.dat.js, patches, re-encodes.
'use strict';
const fs = require('fs');
const path = require('path');
const P = path.join(__dirname, '..', 'anki-templates.dat.js');
const KEY = /ANKI_TEMPLATES_B64\.DECK_HTML_WITH_HANZI_WRITER = "([^"]+)"/;

const dat = fs.readFileSync(P, 'utf8');
let html = Buffer.from(dat.match(KEY)[1], 'base64').toString('utf8');
if (html.includes('cwCharDataLoader')) { console.log('already patched'); process.exit(0); }

const urlLine = 'var url_hanzi = "https://cdn.jsdelivr.net/npm/hanzi-writer-data@latest/";';
const loader = `${urlLine}
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
    }`;

function once(src, find, repl) {
  const n = src.split(find).length - 1;
  if (n !== 1) throw new Error(`expected 1 match, got ${n}: ${find}`);
  return src.replace(find, repl);
}
html = once(html, urlLine, loader);
html = once(html,
  'HanziWriter.create("onfinish-grid-background-target" + i, hanzi, {',
  'HanziWriter.create("onfinish-grid-background-target" + i, hanzi, {\n                charDataLoader: cwCharDataLoader,');
html = once(html,
  "HanziWriter.create('grid-background-target' + i, hanzi, {",
  "HanziWriter.create('grid-background-target' + i, hanzi, {\n                charDataLoader: cwCharDataLoader,");

const b64 = Buffer.from(html, 'utf8').toString('base64');
fs.writeFileSync(P, dat.replace(KEY, `ANKI_TEMPLATES_B64.DECK_HTML_WITH_HANZI_WRITER = "${b64}"`));
console.log('patched');
