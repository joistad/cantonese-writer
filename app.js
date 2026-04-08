/**
 * app.js - Main application logic for Cantonese Xiehanzi
 */

(function () {
  'use strict';

  // ===== State =====
  let currentPage = 1;
  let cardTypes = [{ id: 1, front: [], hasWriting: true }];
  let activeTabId = 1;
  let nextTabId = 2;
  let tableData = []; // Array of { traditional, jyutping, definitions, selected }
  let currentPageNum = 1;
  let rowsPerPage = 10;

  // ===== DOM Refs =====
  const page1 = document.getElementById('page-1');
  const page2 = document.getElementById('page-2');
  const deckTitleInput = document.getElementById('deck-title');
  const includeAudioCb = document.getElementById('include-audio');
  const audioNote = document.getElementById('audio-note');
  const audioKeySection = document.getElementById('audio-key-section');
  const ttsApiKeyInput = document.getElementById('tts-api-key');
  const tabsHeader = document.getElementById('tabs-header');
  const tabContent = document.getElementById('tab-content');
  const inputMode = document.getElementById('input-mode');
  const charInput = document.getElementById('char-input');
  const paragraphInput = document.getElementById('paragraph-input');
  const tableBody = document.getElementById('table-body');
  const pagination = document.getElementById('pagination');
  const progressContainer = document.getElementById('progress-container');
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  const dictStatus = document.getElementById('dict-status');
  const selectAllCb = document.getElementById('select-all');
  const toast = document.getElementById('toast');
  const loadingOverlay = document.getElementById('loading-overlay');

  // ===== Theme Toggle =====
  const themeToggle = document.getElementById('theme-toggle');
  const sunIcon = themeToggle.querySelector('.sun-icon');
  const moonIcon = themeToggle.querySelector('.moon-icon');

  function initTheme() {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
    }
  }

  themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      sunIcon.style.display = 'block';
      moonIcon.style.display = 'none';
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
    }
  });

  initTheme();

  // ===== Audio Toggle =====
  // Restore saved API key and auto-enable audio if key exists
  const savedKey = localStorage.getItem('gcloud_tts_key');
  if (savedKey) {
    ttsApiKeyInput.value = savedKey;
    includeAudioCb.checked = true;
    audioKeySection.style.display = 'block';
    audioNote.textContent = 'API key loaded — audio will be included';
  }

  includeAudioCb.addEventListener('change', () => {
    const checked = includeAudioCb.checked;
    audioKeySection.style.display = checked ? 'block' : 'none';
    audioNote.textContent = checked
      ? (ttsApiKeyInput.value.trim() ? 'API key loaded — audio will be included' : 'Enter your API key above to generate Cantonese audio')
      : 'Audio will not be included';
  });

  ttsApiKeyInput.addEventListener('input', () => {
    const key = ttsApiKeyInput.value.trim();
    if (key) localStorage.setItem('gcloud_tts_key', key);
  });

  // ===== Tab System =====
  function renderTabs() {
    tabsHeader.innerHTML = '';

    cardTypes.forEach(ct => {
      const btn = document.createElement('button');
      btn.className = 'tab-btn' + (ct.id === activeTabId ? ' active' : '');
      btn.innerHTML = `Card ${ct.id} `;

      const closeBtn = document.createElement('button');
      closeBtn.className = 'tab-close';
      closeBtn.innerHTML = '✕';
      closeBtn.title = 'Remove card type';
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (cardTypes.length <= 1) {
          showToast('Must have at least one card type', 'error');
          return;
        }
        cardTypes = cardTypes.filter(c => c.id !== ct.id);
        if (activeTabId === ct.id) {
          activeTabId = cardTypes[0].id;
        }
        renderTabs();
        renderTabContent();
      });

      btn.appendChild(closeBtn);
      btn.addEventListener('click', () => {
        activeTabId = ct.id;
        renderTabs();
        renderTabContent();
      });
      tabsHeader.appendChild(btn);
    });

    // Add button
    const addBtn = document.createElement('button');
    addBtn.className = 'tab-add';
    addBtn.textContent = '+';
    addBtn.title = 'Add card type';
    addBtn.addEventListener('click', () => {
      const newTab = { id: nextTabId++, front: [], hasWriting: false };
      cardTypes.push(newTab);
      activeTabId = newTab.id;
      renderTabs();
      renderTabContent();
    });
    tabsHeader.appendChild(addBtn);
  }

  function renderTabContent() {
    const ct = cardTypes.find(c => c.id === activeTabId);
    if (!ct) return;

    tabContent.innerHTML = `
      <h3 class="section-title" style="font-size:1.1rem; margin-top:0.5rem;">Front Side</h3>
      <div class="checkbox-group">
        <label class="checkbox-label">
          <input type="checkbox" data-field="traditional" ${ct.front.includes('traditional') ? 'checked' : ''}>
          Traditional
        </label>
        <label class="checkbox-label">
          <input type="checkbox" data-field="jyutping" ${ct.front.includes('jyutping') ? 'checked' : ''}>
          Jyutping
        </label>
        <label class="checkbox-label">
          <input type="checkbox" data-field="definitions" ${ct.front.includes('definitions') ? 'checked' : ''}>
          English Definitions
        </label>
      </div>

      <h3 class="section-title" style="font-size:1.1rem; margin-top:1.25rem;">Back Side</h3>
      <div class="info-box">
        <span class="info-icon">ℹ️</span>
        <span>All fields are available in back side, use side bar during deck review and turn off the fields you don't want to see.</span>
      </div>

      <h3 class="section-title" style="font-size:1.1rem; margin-top:1.25rem;">Additional Components</h3>
      <div class="checkbox-group">
        <label class="checkbox-label">
          <input type="checkbox" id="writing-cb" ${ct.hasWriting ? 'checked' : ''}>
          Writing Component
        </label>
      </div>
    `;

    // Bind checkbox events
    tabContent.querySelectorAll('[data-field]').forEach(cb => {
      cb.addEventListener('change', () => {
        const field = cb.dataset.field;
        if (cb.checked) {
          if (!ct.front.includes(field)) ct.front.push(field);
        } else {
          ct.front = ct.front.filter(f => f !== field);
        }
      });
    });

    const writingCb = tabContent.querySelector('#writing-cb');
    if (writingCb) {
      writingCb.addEventListener('change', () => {
        ct.hasWriting = writingCb.checked;
      });
    }
  }

  // ===== Page Navigation =====
  function showPage(pageNum) {
    currentPage = pageNum;
    page1.classList.toggle('active', pageNum === 1);
    page2.classList.toggle('active', pageNum === 2);
    window.scrollTo(0, 0);
  }

  document.getElementById('btn-next-1').addEventListener('click', () => {
    showPage(2);
    if (!CantoneseDict.isLoaded) {
      loadDictionary();
    }
  });

  document.getElementById('btn-prev-2').addEventListener('click', () => showPage(1));

  // ===== Dictionary Loading =====
  async function loadDictionary() {
    try {
      dictStatus.innerHTML = '<div class="spinner-sm"></div> Loading dictionary...';
      dictStatus.className = 'dict-status';
      await CantoneseDict.load();
      dictStatus.innerHTML = '✓ Dictionary loaded';
      dictStatus.className = 'dict-status loaded';
    } catch (err) {
      dictStatus.innerHTML = '⚠ Dictionary failed to load. Definitions may be limited.';
      dictStatus.className = 'dict-status';
      dictStatus.style.color = 'var(--danger)';
      console.error(err);
    }
  }

  // Start loading dictionary immediately
  loadDictionary();

  // ===== Input Mode Switching =====
  inputMode.addEventListener('change', () => {
    const mode = inputMode.value;
    document.getElementById('word-input-area').style.display = mode === 'word' ? '' : 'none';
    document.getElementById('paragraph-input-area').style.display = mode === 'paragraph' ? '' : 'none';
    document.getElementById('file-input-area').style.display = mode === 'file' ? '' : 'none';
  });

  // ===== Add Characters =====
  async function addWord(word) {
    word = word.trim();
    if (!word) return;

    // Check for Chinese characters
    if (!/[\u4e00-\u9fff\u3400-\u4dbf\uF900-\uFAFF]/.test(word)) {
      return;
    }

    // Check duplicates
    if (tableData.some(d => d.traditional === word)) {
      return;
    }

    const result = await CantoneseDict.fullLookup(word);
    tableData.push({
      traditional: result.traditional,
      jyutping: result.jyutping,
      definitions: result.definitions,
      selected: false
    });
  }

  async function addWords(words) {
    showProgress(true);
    let processed = 0;
    for (const word of words) {
      await addWord(word);
      processed++;
      updateProgress(Math.floor((processed / words.length) * 100), `Processing ${processed} / ${words.length}...`);
    }
    showProgress(false);
    renderTable();
  }

  // Word input
  document.getElementById('btn-add').addEventListener('click', async () => {
    const val = charInput.value.trim();
    if (!val) return;
    const words = CantoneseDict.extractChineseWords(val);
    if (words.length === 0) {
      showToast('Please enter Chinese characters', 'error');
      return;
    }
    await addWords(words);
    charInput.value = '';
    charInput.focus();
  });

  charInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('btn-add').click();
    }
  });

  // Paragraph input
  document.getElementById('btn-add-paragraph').addEventListener('click', async () => {
    const text = paragraphInput.value.trim();
    if (!text) return;
    const words = CantoneseDict.extractChineseWords(text);
    // Split into individual characters for Cantonese
    const chars = [];
    for (const word of words) {
      // Try the whole word first
      chars.push(word);
      // Also add individual characters
      if (word.length > 1) {
        for (const ch of word) {
          if (!chars.includes(ch)) chars.push(ch);
        }
      }
    }
    // Remove duplicates
    const unique = [...new Set(chars)];
    await addWords(unique);
    paragraphInput.value = '';
  });

  // File input
  document.getElementById('btn-add-file').addEventListener('click', async () => {
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];
    if (!file) {
      showToast('Please select a file', 'error');
      return;
    }

    const text = await file.text();
    const words = CantoneseDict.extractChineseWords(text);
    const unique = [...new Set(words)];
    await addWords(unique);
    fileInput.value = '';
  });

  // ===== Table Rendering =====
  function renderTable() {
    const start = (currentPageNum - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = tableData.slice(start, end);

    tableBody.innerHTML = '';

    if (pageData.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:2rem;">No characters added yet</td></tr>`;
    } else {
      pageData.forEach((item, idx) => {
        const globalIdx = start + idx;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><input type="checkbox" data-idx="${globalIdx}" ${item.selected ? 'checked' : ''}></td>
          <td class="chinese-char">${item.traditional}</td>
          <td>${item.jyutping}</td>
          <td>${escapeHtml(item.definitions)}</td>
        `;
        tr.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
          tableData[globalIdx].selected = e.target.checked;
          updateSelectAll();
        });
        tableBody.appendChild(tr);
      });
    }

    renderPagination();
    updateSelectAll();
  }

  function updateSelectAll() {
    const start = (currentPageNum - 1) * rowsPerPage;
    const end = Math.min(start + rowsPerPage, tableData.length);
    const pageItems = tableData.slice(start, end);
    selectAllCb.checked = pageItems.length > 0 && pageItems.every(i => i.selected);
  }

  selectAllCb.addEventListener('change', () => {
    const start = (currentPageNum - 1) * rowsPerPage;
    const end = Math.min(start + rowsPerPage, tableData.length);
    for (let i = start; i < end; i++) {
      tableData[i].selected = selectAllCb.checked;
    }
    renderTable();
  });

  function renderPagination() {
    const totalPages = Math.max(1, Math.ceil(tableData.length / rowsPerPage));
    if (currentPageNum > totalPages) currentPageNum = totalPages;

    pagination.innerHTML = '';

    // First
    const firstBtn = createPageBtn('«', () => { currentPageNum = 1; renderTable(); });
    firstBtn.disabled = currentPageNum === 1;
    pagination.appendChild(firstBtn);

    // Prev
    const prevBtn = createPageBtn('‹', () => { currentPageNum--; renderTable(); });
    prevBtn.disabled = currentPageNum === 1;
    pagination.appendChild(prevBtn);

    // Page numbers
    let startPage = Math.max(1, currentPageNum - 2);
    let endPage = Math.min(totalPages, currentPageNum + 2);

    for (let p = startPage; p <= endPage; p++) {
      const btn = createPageBtn(p.toString(), () => { currentPageNum = p; renderTable(); });
      if (p === currentPageNum) btn.classList.add('active');
      pagination.appendChild(btn);
    }

    // Next
    const nextBtn = createPageBtn('›', () => { currentPageNum++; renderTable(); });
    nextBtn.disabled = currentPageNum === totalPages;
    pagination.appendChild(nextBtn);

    // Last
    const lastBtn = createPageBtn('»', () => { currentPageNum = totalPages; renderTable(); });
    lastBtn.disabled = currentPageNum === totalPages;
    pagination.appendChild(lastBtn);
  }

  function createPageBtn(text, onClick) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.addEventListener('click', onClick);
    return btn;
  }

  // Rows per page
  document.getElementById('rows-per-page').addEventListener('change', (e) => {
    rowsPerPage = parseInt(e.target.value);
    currentPageNum = 1;
    renderTable();
  });

  // ===== Action Buttons =====

  // Delete selected
  document.getElementById('btn-delete').addEventListener('click', () => {
    const selectedCount = tableData.filter(d => d.selected).length;
    if (selectedCount === 0) {
      showToast('No rows selected', 'error');
      return;
    }
    tableData = tableData.filter(d => !d.selected);
    renderTable();
    showToast(`Deleted ${selectedCount} item(s)`, 'success');
  });

  // Cancel (clear all)
  document.getElementById('btn-cancel').addEventListener('click', () => {
    if (tableData.length === 0) return;
    if (confirm('Clear all entries?')) {
      tableData = [];
      renderTable();
      showToast('All entries cleared', 'success');
    }
  });

  // Export CSV
  document.getElementById('btn-export-csv').addEventListener('click', () => {
    if (tableData.length === 0) {
      showToast('No data to export', 'error');
      return;
    }
    const blob = AnkiExport.exportCSV(tableData);
    saveAs(blob, `${deckTitleInput.value || 'cantonese-xiehanzi'}.csv`);
    showToast('CSV exported', 'success');
  });

  // Generate Deck
  document.getElementById('btn-generate').addEventListener('click', async () => {
    if (tableData.length === 0) {
      showToast('No data to generate deck from', 'error');
      return;
    }

    const includeAudio = includeAudioCb.checked;
    let audioFiles = {};

    showProgress(true);

    try {
      // Generate audio if needed
      if (includeAudio) {
        const apiKey = ttsApiKeyInput.value.trim();
        if (!apiKey) {
          showToast('Please enter a Google Cloud TTS API key', 'error');
          showProgress(false);
          return;
        }

        let successCount = 0;
        let firstError = null;

        for (let i = 0; i < tableData.length; i++) {
          updateProgress(
            Math.floor((i / tableData.length) * 40),
            `Generating audio ${i + 1} / ${tableData.length}...`
          );
          const blob = await AnkiExport.generateAudio(tableData[i].traditional, apiKey);
          if (blob) {
            audioFiles[tableData[i].traditional] = blob;
            successCount++;
          } else if (!firstError) {
            firstError = tableData[i].traditional;
          }
        }

        if (successCount === 0) {
          showToast('Audio generation failed — check your API key', 'error');
          showProgress(false);
          return;
        }
        if (firstError) {
          console.warn('Some audio files failed, first failure:', firstError);
        }
      }

      // Generate .apkg
      const blob = await AnkiExport.generateApkg({
        deckTitle: deckTitleInput.value || 'cantonese-xiehanzi',
        cards: tableData,
        cardTypes: cardTypes,
        includeAudio: includeAudio,
        audioFiles: audioFiles,
        onProgress: (pct, msg) => {
          const adjustedPct = includeAudio ? 40 + Math.floor(pct * 0.6) : pct;
          updateProgress(adjustedPct, msg);
        }
      });

      saveAs(blob, `${deckTitleInput.value || 'cantonese-xiehanzi'}.apkg`);
      showToast('Deck generated successfully!', 'success');
    } catch (err) {
      console.error('Generation error:', err);
      showToast('Error generating deck: ' + (err.message || err || 'Unknown error'), 'error');
    } finally {
      showProgress(false);
    }
  });

  // ===== Utility Functions =====

  function showProgress(visible) {
    progressContainer.classList.toggle('visible', visible);
    if (!visible) {
      progressBar.style.width = '0%';
      progressText.textContent = '';
    }
  }

  function updateProgress(pct, msg) {
    progressBar.style.width = pct + '%';
    progressText.textContent = msg || '';
  }

  function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = 'toast ' + type;
    // Force reflow
    toast.offsetHeight;
    toast.classList.add('visible');
    setTimeout(() => {
      toast.classList.remove('visible');
    }, 3000);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // ===== Initialize =====
  renderTabs();
  renderTabContent();
  renderTable();

})();
