/**
 * dict.js - CEDICT dictionary loading, indexing, and lookup for Cantonese Xiehanzi
 */

const CantoneseDict = (function () {
  let dictEntries = []; // Array of {traditional, simplified, pinyin, definitions}
  let traditionalIndex = {}; // Map<traditional, [entry indices]>
  let simplifiedIndex = {}; // Map<simplified, [entry indices]>
  let isLoaded = false;
  let isLoading = false;
  let loadPromise = null;

  const CEDICT_ZIP_URL = 'https://krmanik.github.io/Anki-xiehanzi/data/cedict_ts.zip';

  /**
   * Parse a CEDICT line into an entry object
   * Format: Traditional Simplified [pinyin] /def1/def2/
   */
  function parseLine(line) {
    if (!line || line.startsWith('#')) return null;
    const match = line.match(/^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+\/(.+)\/\s*$/);
    if (!match) return null;
    return {
      traditional: match[1],
      simplified: match[2],
      pinyin: match[3],
      definitions: match[4].split('/').filter(d => d.trim())
    };
  }

  /**
   * Load and parse the CEDICT dictionary from ZIP
   */
  async function load() {
    if (isLoaded) return true;
    if (isLoading) return loadPromise;

    isLoading = true;
    loadPromise = (async () => {
      try {
        const response = await fetch(CEDICT_ZIP_URL);
        if (!response.ok) throw new Error(`Failed to fetch dictionary: ${response.status}`);

        const zipData = await response.arrayBuffer();
        const zip = await JSZip.loadAsync(zipData);

        // Find the .u8 file inside the zip
        let dictText = null;
        for (const filename of Object.keys(zip.files)) {
          if (filename.endsWith('.u8') || filename.includes('cedict')) {
            dictText = await zip.files[filename].async('string');
            break;
          }
        }

        if (!dictText) {
          // Try the first text file
          for (const filename of Object.keys(zip.files)) {
            if (!zip.files[filename].dir) {
              dictText = await zip.files[filename].async('string');
              break;
            }
          }
        }

        if (!dictText) throw new Error('Could not find dictionary file in ZIP');

        // Parse all lines
        const lines = dictText.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const entry = parseLine(lines[i]);
          if (entry) {
            const idx = dictEntries.length;
            dictEntries.push(entry);

            // Index by traditional
            if (!traditionalIndex[entry.traditional]) {
              traditionalIndex[entry.traditional] = [];
            }
            traditionalIndex[entry.traditional].push(idx);

            // Index by simplified
            if (!simplifiedIndex[entry.simplified]) {
              simplifiedIndex[entry.simplified] = [];
            }
            simplifiedIndex[entry.simplified].push(idx);
          }
        }

        isLoaded = true;
        isLoading = false;
        console.log(`Dictionary loaded: ${dictEntries.length} entries`);
        return true;
      } catch (err) {
        isLoading = false;
        console.error('Dictionary load error:', err);
        throw err;
      }
    })();

    return loadPromise;
  }

  /**
   * Look up a word/character. Returns array of matching entries.
   * Tries traditional first, then simplified.
   */
  function lookup(word) {
    if (!isLoaded) return [];

    let results = [];

    // Try traditional
    if (traditionalIndex[word]) {
      results = traditionalIndex[word].map(i => dictEntries[i]);
    }
    // Fallback to simplified
    if (results.length === 0 && simplifiedIndex[word]) {
      results = simplifiedIndex[word].map(i => dictEntries[i]);
    }

    return results;
  }

  /**
   * Look up a single character or word and return formatted result
   */
  function lookupWord(word) {
    const entries = lookup(word);
    if (entries.length === 0) return null;

    // Combine definitions from all matching entries
    const allDefs = [];
    let traditional = word;

    for (const entry of entries) {
      traditional = entry.traditional;
      for (const def of entry.definitions) {
        if (!allDefs.includes(def)) {
          allDefs.push(def);
        }
      }
    }

    return {
      traditional: traditional,
      definitions: allDefs.join('; ')
    };
  }

  /**
   * Get jyutping for a word using cantojpmin_data
   */
  function getJyutping(text) {
    if (typeof cantojpmin_data === 'undefined') return '';
    const chars = text.split('');
    const result = [];
    for (const char of chars) {
      const jp = cantojpmin_data[char];
      if (jp) {
        // Take first option (before any / or . delimiter)
        const first = jp.split(/[\/\.]/)[0];
        result.push(first);
      }
    }
    return result.join(' ');
  }

  /**
   * Fallback: get definition from Google Translate
   */
  async function translateFallback(word) {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-TW&tl=en-US&dt=t&q=${encodeURIComponent(word)}`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data && data[0] && data[0][0] && data[0][0][0]) {
        return data[0][0][0];
      }
    } catch (e) {
      console.warn('Translation fallback failed for:', word, e);
    }
    return '';
  }

  /**
   * Full lookup: dictionary + jyutping + fallback translation
   * Returns { traditional, jyutping, definitions }
   */
  async function fullLookup(word) {
    const jyutping = getJyutping(word);

    // Try dictionary first
    const dictResult = lookupWord(word);

    if (dictResult) {
      return {
        traditional: dictResult.traditional,
        jyutping: jyutping,
        definitions: dictResult.definitions
      };
    }

    // Try single-character lookups for multi-char words
    if (word.length > 1) {
      const charDefs = [];
      for (const char of word) {
        const charResult = lookupWord(char);
        if (charResult) {
          charDefs.push(charResult.definitions.split(';')[0].trim());
        }
      }
      if (charDefs.length > 0) {
        // Also try Google Translate for the whole word
        const translation = await translateFallback(word);
        const defs = translation || charDefs.join('; ');
        return {
          traditional: word,
          jyutping: jyutping,
          definitions: defs
        };
      }
    }

    // Fallback to Google Translate
    const translation = await translateFallback(word);
    return {
      traditional: word,
      jyutping: jyutping,
      definitions: translation || '(no definition found)'
    };
  }

  /**
   * Extract Chinese character sequences from text
   */
  function extractChineseWords(text) {
    const matches = text.match(/[\u4e00-\u9fff\u3400-\u4dbf\uF900-\uFAFF]+/g);
    return matches || [];
  }

  return {
    load,
    lookup,
    lookupWord,
    getJyutping,
    fullLookup,
    extractChineseWords,
    get isLoaded() { return isLoaded; }
  };
})();
