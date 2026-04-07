/**
 * anki-export.js - Generate .apkg files for the Cantonese-xiehanzi note type.
 *
 * The note type (model) must be created in Anki first with the correct
 * templates and CSS. This exporter writes notes/cards that match that
 * model's 6 fields: Simplified, Traditional, Pinyin, Zhuyin, Definitions, Audio.
 *
 * For Cantonese: Simplified=Traditional, Pinyin=Jyutping, Zhuyin="".
 */

const AnkiExport = (function () {

  // Must match the model ID the user sets up, or Anki will create a new type.
  // Using the same ID as the original xiehanzi so the templates are compatible.
  const MODEL_ID = 1969669504;
  const MODEL_NAME = 'Cantonese-xiehanzi';

  // Cantonese 6-tone colors
  const TONE_COLORS = {
    1: '#f44336',
    2: '#ff9800',
    3: '#4caf50',
    4: '#2196f3',
    5: '#9c27b0',
    6: '#607d8b'
  };

  function colorizeJyutping(jyutping) {
    if (!jyutping) return '';
    return jyutping.split(/\s+/).map(s => {
      const m = s.match(/(\d)$/);
      if (m) {
        const color = TONE_COLORS[m[1]] || '#000';
        return `<span style="color:${color}">${s}</span>`;
      }
      return s;
    }).join(' ');
  }


  // ===================================================================
  // Build Definitions HTML (like original create.tsx)
  // ===================================================================

  function buildDefinitionsHTML(card) {
    const trad = card.traditional;
    const jyut = card.jyutping || '';
    const defs = card.definitions || '';

    const jyutSyllables = jyut.split(/\s+/);
    const tradChars = trad.split('');

    let tradSpan = '';
    for (let j = 0; j < tradChars.length; j++) {
      const syllable = jyutSyllables[j] || '';
      const toneMatch = syllable.match(/(\d)$/);
      const tone = toneMatch ? toneMatch[1] : '0';
      tradSpan += `<span class="char-tone${tone}">${tradChars[j]}</span>`;
    }

    return `<div class="meaning-container">
    <div class="char">
        <span id="char-trad-id">${tradSpan}</span>
    </div>
    <div class="jyutping">${jyut}</div>
    <div class="meaning">${defs}</div>
</div>`;
  }


  // ===================================================================
  // Checksum & GUID helpers
  // ===================================================================

  function fieldChecksum(field) {
    let hash = 5381;
    for (let i = 0; i < field.length; i++) {
      hash = ((hash << 5) + hash + field.charCodeAt(i)) & 0xFFFFFFFF;
    }
    return hash >>> 0;
  }

  function generateGuid() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let guid = '';
    for (let i = 0; i < 10; i++) {
      guid += chars[Math.floor(Math.random() * chars.length)];
    }
    return guid;
  }


  // ===================================================================
  // Templates (embedded in .apkg so the note type is auto-created
  // if it doesn't exist yet in Anki)
  // ===================================================================

  function getTemplates() {
    // These are decoded from the base64-encoded data file
    // b64ToUtf8: atob() alone mangles multibyte UTF-8 (e.g. Chinese chars).
    // We decode bytes as UTF-8 to get proper Unicode strings.
    function b64ToUtf8(b64) {
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      return new TextDecoder('utf-8').decode(bytes);
    }

    const FRONT   = b64ToUtf8(ANKI_TEMPLATES_B64.DECK_HTML_FRONT);
    const BACK    = b64ToUtf8(ANKI_TEMPLATES_B64.DECK_HTML_BACK);
    const WRITING = b64ToUtf8(ANKI_TEMPLATES_B64.DECK_HTML_WITH_HANZI_WRITER);
    const CSS     = b64ToUtf8(ANKI_TEMPLATES_B64.DECK_CSS);
    return { FRONT, BACK, WRITING, CSS };
  }


  // ===================================================================
  // Generate .apkg
  // ===================================================================

  async function generateApkg(options) {
    const {
      deckTitle = 'cantonese-xiehanzi',
      cards = [],
      cardTypes = [{ front: [], hasWriting: true }],
      includeAudio = false,
      audioFiles = {},
      onProgress = () => {}
    } = options;

    onProgress(0, 'Initializing database...');

    const SQL = await initSqlJs({
      locateFile: file => `https://cdn.jsdelivr.net/npm/sql.js@1.8.0/dist/${file}`
    });
    const db = new SQL.Database();

    // Create Anki schema
    db.run(`CREATE TABLE IF NOT EXISTS col (
      id integer primary key, crt integer not null, mod integer not null,
      scm integer not null, ver integer not null, dty integer not null,
      usn integer not null, ls integer not null, conf text not null,
      models text not null, decks text not null, dconf text not null,
      tags text not null
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS notes (
      id integer primary key, guid text not null, mid integer not null,
      mod integer not null, usn integer not null, tags text not null,
      flds text not null, sfld text not null, csum integer not null,
      flags integer not null, data text not null
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS cards (
      id integer primary key, nid integer not null, did integer not null,
      ord integer not null, mod integer not null, usn integer not null,
      type integer not null, queue integer not null, due integer not null,
      ivl integer not null, factor integer not null, reps integer not null,
      lapses integer not null, left integer not null, odue integer not null,
      odid integer not null, flags integer not null, data text not null
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS revlog (
      id integer primary key, cid integer not null, usn integer not null,
      ease integer not null, ivl integer not null, lastIvl integer not null,
      factor integer not null, time integer not null, type integer not null
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS graves (
      usn integer not null, oid integer not null, type integer not null
    )`);

    onProgress(10, 'Building model and templates...');

    const now = Math.floor(Date.now() / 1000);
    const deckId = now * 1000 + Math.floor(Math.random() * 1000);

    const T = getTemplates();

    // Build templates for each card type
    const tmpls = [];

    for (let i = 0; i < cardTypes.length; i++) {
      const ct = cardTypes[i];

      let QFMT, AFMT;

      if (ct.hasWriting) {
        // Writing card: QFMT = full writing template, AFMT = {{FrontSide}}
        QFMT = T.WRITING;
        AFMT = '<div id="back">{{FrontSide}}</div>';

        if (!includeAudio) {
          QFMT = QFMT.replace(`<div id='audio' style='display:none'>{{Audio}}</div>`, '');
          QFMT = QFMT.replace(`    <a class="btn" id='btnPlayAudio'>\n        <div class="icon"><i class="material-icons">play_arrow</i></div>\n    </a>`, '');
        }
      } else {
        // Regular card: QFMT = front template, AFMT = back template
        QFMT = T.FRONT;
        AFMT = T.BACK;

        if (!includeAudio) {
          AFMT = AFMT.replace(`<div id='audio' style='display:none'>{{Audio}}</div>`, '');
          AFMT = AFMT.replace(`    <a class="btn" id='btnPlayAudio'>\n        <div class="icon">\n            <i class="material-icons">play_arrow</i>\n        </div>\n    </a>`, '');
        }
      }

      tmpls.push({
        name: `Card ${i + 1}`,
        ord: i,
        qfmt: QFMT,
        afmt: AFMT,
        bqfmt: '',
        bafmt: '',
        did: null,
        bfont: '',
        bsize: 0
      });
    }

    // 6-field model
    const flds = [
      { name: 'Simplified', ord: 0, sticky: false, rtl: false, font: 'Arial', size: 20, media: [] },
      { name: 'Traditional', ord: 1, sticky: false, rtl: false, font: 'Arial', size: 20, media: [] },
      { name: 'Pinyin', ord: 2, sticky: false, rtl: false, font: 'Arial', size: 20, media: [] },
      { name: 'Zhuyin', ord: 3, sticky: false, rtl: false, font: 'Arial', size: 20, media: [] },
      { name: 'Definitions', ord: 4, sticky: false, rtl: false, font: 'Arial', size: 20, media: [] },
      { name: 'Audio', ord: 5, sticky: false, rtl: false, font: 'Arial', size: 20, media: [] }
    ];

    const model = {
      [MODEL_ID]: {
        id: MODEL_ID,
        name: MODEL_NAME,
        type: 0,
        mod: now,
        usn: -1,
        sortf: 0,
        did: deckId,
        tmpls: tmpls,
        flds: flds,
        css: T.CSS,
        latexPre: '',
        latexPost: '',
        latexsvg: false,
        req: tmpls.map((_, i) => [i, 'any', [0]])
      }
    };

    const deck = {
      [deckId]: {
        id: deckId, name: deckTitle, mod: now, usn: -1,
        lrnToday: [0, 0], revToday: [0, 0], newToday: [0, 0], timeToday: [0, 0],
        collapsed: false, browserCollapsed: false,
        desc: 'Cantonese character writing practice deck generated by 寫粵字',
        dyn: 0, conf: 1, extendNew: 0, extendRev: 0
      },
      1: {
        id: 1, name: 'Default', mod: now, usn: -1,
        lrnToday: [0, 0], revToday: [0, 0], newToday: [0, 0], timeToday: [0, 0],
        collapsed: false, browserCollapsed: false, desc: '',
        dyn: 0, conf: 1, extendNew: 0, extendRev: 0
      }
    };

    const dconf = {
      1: {
        id: 1, name: 'Default', mod: 0, usn: 0, maxTaken: 60,
        autoplay: true, timer: 0, replayq: true,
        new: { bury: true, delays: [1, 10], initialFactor: 2500, ints: [1, 4, 0], order: 1, perDay: 20 },
        rev: { bury: true, ease4: 1.3, ivlFct: 1, maxIvl: 36500, perDay: 200, hardFactor: 1.2 },
        lapse: { delays: [10], leechAction: 1, leechFails: 8, minInt: 1, mult: 0 }
      }
    };

    const conf = {
      activeDecks: [1], curDeck: 1, newSpread: 0, collapseTime: 1200,
      timeLim: 0, estTimes: true, dueCounts: true, curModel: MODEL_ID,
      nextPos: 1, sortType: 'noteFld', sortBackwards: false, addToCur: true
    };

    db.run(
      `INSERT INTO col VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [1, now, now, now * 1000, 11, 0, 0, 0,
        JSON.stringify(conf), JSON.stringify(model),
        JSON.stringify(deck), JSON.stringify(dconf), JSON.stringify({})]
    );

    onProgress(20, 'Creating notes and cards...');

    const mediaManifest = {};
    const mediaBlobs = {};
    let mediaIndex = 0;

    // Add static media files (Material Icons font + sidebar icons)
    const staticMediaFiles = [
      '_MaterialIcons-Regular.woff2',
      '_characterpop.svg',
      '_hanzicraft.png',
      '_pleco.png',
      '_rtega.png',
      '_youdao.png',
      '_tatoeba.png'
    ];

    for (const filename of staticMediaFiles) {
      try {
        const response = await fetch(`https://krmanik.github.io/Anki-xiehanzi/img/${filename}`);
        if (response.ok) {
          const blob = await response.blob();
          mediaManifest[mediaIndex.toString()] = filename;
          mediaBlobs[mediaIndex.toString()] = blob;
          mediaIndex++;
        }
      } catch (e) {
        console.warn('Failed to fetch media:', filename, e);
      }
    }

    onProgress(25, 'Building notes...');

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const noteId = now * 1000 + i + 1;
      const guid = generateGuid();

      // Audio field
      let audioField = '';
      if (includeAudio && audioFiles[card.traditional]) {
        const filename = `yue-${card.traditional}.mp3`;
        mediaManifest[mediaIndex.toString()] = filename;
        mediaBlobs[mediaIndex.toString()] = audioFiles[card.traditional];
        audioField = `[sound:${filename}]`;
        mediaIndex++;
      }

      const definitionsHTML = buildDefinitionsHTML(card);

      // 6 fields: Simplified, Traditional, Pinyin, Zhuyin, Definitions, Audio
      const fldValues = [
        card.traditional,
        card.traditional,
        card.jyutping || '',
        '',
        definitionsHTML,
        audioField
      ].join('\x1f');

      const sfld = card.traditional;
      const csum = fieldChecksum(sfld);

      db.run(
        `INSERT INTO notes VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [noteId, guid, MODEL_ID, now, -1, '', fldValues, sfld, csum, 0, '']
      );

      for (let t = 0; t < cardTypes.length; t++) {
        const cardId = noteId * 10 + t;
        db.run(
          `INSERT INTO cards VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [cardId, noteId, deckId, t, now, -1, 0, 0, i + 1, 0, 0, 0, 0, 0, 0, 0, 0, '{}']
        );
      }

      if (i % 50 === 0) {
        const pct = 25 + Math.floor((i / cards.length) * 60);
        onProgress(pct, `Processing card ${i + 1} of ${cards.length}...`);
      }
    }

    onProgress(88, 'Packaging .apkg file...');

    const dbBinary = db.export();
    db.close();

    const zip = new JSZip();
    zip.file('collection.anki2', dbBinary);
    zip.file('media', JSON.stringify(mediaManifest));

    for (const [idx, blob] of Object.entries(mediaBlobs)) {
      zip.file(idx, blob);
    }

    onProgress(95, 'Generating file...');

    const blob = await zip.generateAsync({ type: 'blob' });

    onProgress(100, 'Done!');

    return blob;
  }


  // ===================================================================
  // TTS Audio generation
  // ===================================================================

  async function generateAudio(word) {
    try {
      // Edge TTS via WebSocket (same as original Xiehanzi) — no CORS restrictions,
      // Cantonese Hong Kong neural voice.
      if (typeof EdgeTTSBrowser === 'undefined') {
        throw new Error('EdgeTTSBrowser not loaded');
      }
      const tts = new EdgeTTSBrowser(word, 'zh-HK-HiuGaaiNeural');
      const result = await tts.synthesize();
      if (!result || !result.audio || result.audio.size < 100) {
        throw new Error('Empty audio from EdgeTTS');
      }
      // Small delay between requests
      await new Promise(r => setTimeout(r, 300 + Math.floor(Math.random() * 300)));
      return result.audio;
    } catch (e) {
      console.warn('EdgeTTS failed for:', word, e.message);
      return null;
    }
  }


  // ===================================================================
  // CSV Export
  // ===================================================================

  function exportCSV(cards) {
    const header = 'Traditional,Jyutping,Definitions\n';
    const rows = cards.map(c =>
      `"${c.traditional}","${c.jyutping}","${(c.definitions || '').replace(/"/g, '""')}"`
    ).join('\n');
    const csv = header + rows;
    return new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  }


  return {
    generateApkg,
    generateAudio,
    exportCSV,
    colorizeJyutping,
    TONE_COLORS
  };
})();
