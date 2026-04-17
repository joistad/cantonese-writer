/**
 * app.js — Cantonese Writer
 */

(function () {
  'use strict';

  // ===== State =====
  let currentPage = 1;
  let cardTypes = [{ id: 1, front: [], hasWriting: true }];
  let activeTabId = 1;
  let nextTabId = 2;
  let tableData = [];
  let currentPageNum = 1;
  let rowsPerPage = 10;

  // ===== DOM Refs =====
  const page1            = document.getElementById('page-1');
  const page2            = document.getElementById('page-2');
  const deckTitleInput   = document.getElementById('deck-title');
  const includeAudioCb   = document.getElementById('include-audio');
  const audioNote        = document.getElementById('audio-note');
  const audioKeySection  = document.getElementById('audio-key-section');
  const ttsApiKeyInput   = document.getElementById('tts-api-key');
  const tabsHeader       = document.getElementById('tabs-header');
  const tabContent       = document.getElementById('tab-content');
  const inputMode        = document.getElementById('input-mode');
  const charInput        = document.getElementById('char-input');
  const paragraphInput   = document.getElementById('paragraph-input');
  const tableBody        = document.getElementById('table-body');
  const pagination       = document.getElementById('pagination');
  const progressContainer= document.getElementById('progress-container');
  const progressBar      = document.getElementById('progress-bar');
  const progressText     = document.getElementById('progress-text');
  const dictStatus       = document.getElementById('dict-status');
  const selectAllCb      = document.getElementById('select-all');
  const toast            = document.getElementById('toast');
  const loadingOverlay   = document.getElementById('loading-overlay');

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

  // ===== How It Works banner =====
  const hiwBanner = document.getElementById('how-it-works');
  const hiwDismiss = document.getElementById('hiw-dismiss');

  if (localStorage.getItem('hiw_dismissed')) {
    hiwBanner.style.display = 'none';
  }

  hiwDismiss.addEventListener('click', () => {
    hiwBanner.style.display = 'none';
    localStorage.setItem('hiw_dismissed', '1');
  });

  // ===== Audio Accordion =====
  const audioHeader = document.getElementById('audio-header');
  const audioPanel  = document.getElementById('audio-panel');
  const audioPill   = document.getElementById('audio-pill');

  function updateAudioPill() {
    const active = includeAudioCb.checked && ttsApiKeyInput.value.trim();
    audioPill.textContent = active ? 'On' : 'Off';
    audioPill.className = 'status-pill ' + (active ? 'on' : 'off');
  }

  audioHeader.addEventListener('click', () => {
    const isOpen = audioPanel.classList.toggle('open');
    audioHeader.classList.toggle('open', isOpen);
    audioHeader.setAttribute('aria-expanded', String(isOpen));
  });

  // Restore saved API key
  const savedKey = localStorage.getItem('gcloud_tts_key');
  if (savedKey) {
    ttsApiKeyInput.value = savedKey;
    includeAudioCb.checked = true;
    audioKeySection.style.display = 'block';
    // Auto-open accordion so user can see the saved key
    audioPanel.classList.add('open');
    audioHeader.classList.add('open');
    audioHeader.setAttribute('aria-expanded', 'true');
  }

  includeAudioCb.addEventListener('change', () => {
    const checked = includeAudioCb.checked;
    audioKeySection.style.display = checked ? 'block' : 'none';
    audioNote.textContent = checked
      ? (ttsApiKeyInput.value.trim()
          ? 'API key saved — audio will be generated for each character'
          : 'Paste your API key above to enable audio generation')
      : '';
    updateAudioPill();
  });

  ttsApiKeyInput.addEventListener('input', () => {
    const key = ttsApiKeyInput.value.trim();
    if (key) localStorage.setItem('gcloud_tts_key', key);
    updateAudioPill();
  });

  updateAudioPill();

  // ===== Tab System =====
  function renderTabs() {
    tabsHeader.innerHTML = '';

    cardTypes.forEach(ct => {
      const btn = document.createElement('button');
      btn.className = 'tab-btn' + (ct.id === activeTabId ? ' active' : '');
      btn.innerHTML = `Card Type ${ct.id} `;

      const closeBtn = document.createElement('button');
      closeBtn.className = 'tab-close';
      closeBtn.innerHTML = '✕';
      closeBtn.title = 'Remove this card type';
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (cardTypes.length <= 1) {
          showToast('You need at least one card type', 'error');
          return;
        }
        cardTypes = cardTypes.filter(c => c.id !== ct.id);
        if (activeTabId === ct.id) activeTabId = cardTypes[0].id;
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

    const addBtn = document.createElement('button');
    addBtn.className = 'tab-add';
    addBtn.textContent = '+ Add type';
    addBtn.title = 'Add another card type';
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
      <div style="margin-bottom:1.1rem;">
        <h3 class="section-title" style="font-size:0.95rem; margin-bottom:0.2rem;">Question side (front)</h3>
        <p class="section-helper" style="margin-bottom:0.65rem;">What Anki shows you when it's time to review this card.</p>
        <div class="checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" data-field="traditional" ${ct.front.includes('traditional') ? 'checked' : ''}>
            Traditional character
          </label>
          <label class="checkbox-label">
            <input type="checkbox" data-field="jyutping" ${ct.front.includes('jyutping') ? 'checked' : ''}>
            Jyutping (pronunciation)
          </label>
          <label class="checkbox-label">
            <input type="checkbox" data-field="definitions" ${ct.front.includes('definitions') ? 'checked' : ''}>
            English definition
          </label>
        </div>
      </div>

      <div style="margin-bottom:1.1rem;">
        <h3 class="section-title" style="font-size:0.95rem; margin-bottom:0.2rem;">Answer side (back)</h3>
        <div class="info-box">
          <span class="info-icon">ℹ️</span>
          <span>All fields are always shown on the answer side. You can toggle individual fields on/off using the sidebar while reviewing in Anki.</span>
        </div>
      </div>

      <div>
        <h3 class="section-title" style="font-size:0.95rem; margin-bottom:0.2rem;">Writing practice</h3>
        <div class="checkbox-group">
          <label class="checkbox-label" style="align-items:flex-start; gap:0.6rem;">
            <input type="checkbox" id="writing-cb" ${ct.hasWriting ? 'checked' : ''} style="margin-top:0.2rem;">
            <div class="checkbox-with-desc">
              <span>Include writing cards</span>
              <span class="checkbox-sub">Adds stroke-order tracing practice for each character, powered by HanziWriter</span>
            </div>
          </label>
        </div>
      </div>
    `;

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
    if (!CantoneseDict.isLoaded) loadDictionary();
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
      dictStatus.innerHTML = '⚠ Dictionary failed to load. Definitions may be missing.';
      dictStatus.className = 'dict-status';
      dictStatus.style.color = 'var(--danger)';
      console.error(err);
    }
  }

  loadDictionary();

  // ===== Input Mode Switching =====
  inputMode.addEventListener('change', () => {
    const mode = inputMode.value;
    document.getElementById('word-input-area').style.display      = mode === 'word'      ? '' : 'none';
    document.getElementById('paragraph-input-area').style.display = mode === 'paragraph' ? '' : 'none';
    document.getElementById('file-input-area').style.display      = mode === 'file'      ? '' : 'none';
  });

  // ===== Add Characters =====
  async function addWord(word) {
    word = word.trim();
    if (!word) return;
    if (!/[\u4e00-\u9fff\u3400-\u4dbf\uF900-\uFAFF]/.test(word)) return;
    if (tableData.some(d => d.traditional === word)) return;

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
      updateProgress(
        Math.floor((processed / words.length) * 100),
        `Processing ${processed} / ${words.length}...`
      );
    }
    showProgress(false);
    renderTable();
  }

  document.getElementById('btn-add').addEventListener('click', async () => {
    const val = charInput.value.trim();
    if (!val) return;
    const words = CantoneseDict.extractChineseWords(val);
    if (words.length === 0) {
      showToast('No Chinese characters found', 'error');
      return;
    }
    await addWords(words);
    charInput.value = '';
    charInput.focus();
  });

  charInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-add').click();
  });

  document.getElementById('btn-add-paragraph').addEventListener('click', async () => {
    const text = paragraphInput.value.trim();
    if (!text) return;
    const words = CantoneseDict.extractChineseWords(text);
    const chars = [];
    for (const word of words) {
      chars.push(word);
      if (word.length > 1) {
        for (const ch of word) {
          if (!chars.includes(ch)) chars.push(ch);
        }
      }
    }
    await addWords([...new Set(chars)]);
    paragraphInput.value = '';
  });

  document.getElementById('btn-add-file').addEventListener('click', async () => {
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];
    if (!file) {
      showToast('Please select a file first', 'error');
      return;
    }
    const text = await file.text();
    const words = CantoneseDict.extractChineseWords(text);
    await addWords([...new Set(words)]);
    fileInput.value = '';
  });

  // ===== Table Rendering =====
  function renderTable() {
    const start = (currentPageNum - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = tableData.slice(start, end);

    // Show/hide table header row with count
    const tableHeaderRow = document.getElementById('table-header-row');
    const charCountBadge = document.getElementById('char-count-badge');
    if (tableHeaderRow) {
      tableHeaderRow.style.display = tableData.length > 0 ? 'flex' : 'none';
    }
    if (charCountBadge) {
      charCountBadge.textContent = `${tableData.length} character${tableData.length !== 1 ? 's' : ''}`;
    }

    // Update generate button count
    const generateBtn = document.getElementById('btn-generate');
    if (generateBtn) {
      generateBtn.textContent = tableData.length > 0
        ? `Generate Deck (${tableData.length})`
        : 'Generate Deck';
    }

    tableBody.innerHTML = '';

    if (pageData.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align:center; color:var(--text-muted); padding:2.5rem 1rem;">
            <div style="font-size:1.5rem; margin-bottom:0.5rem;">粵</div>
            <div style="font-weight:500; margin-bottom:0.25rem;">No characters yet</div>
            <div style="font-size:0.8rem;">Add some Cantonese characters above to get started</div>
          </td>
        </tr>`;
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

    const firstBtn = createPageBtn('«', () => { currentPageNum = 1; renderTable(); });
    firstBtn.disabled = currentPageNum === 1;
    pagination.appendChild(firstBtn);

    const prevBtn = createPageBtn('‹', () => { currentPageNum--; renderTable(); });
    prevBtn.disabled = currentPageNum === 1;
    pagination.appendChild(prevBtn);

    const startPage = Math.max(1, currentPageNum - 2);
    const endPage = Math.min(totalPages, currentPageNum + 2);

    for (let p = startPage; p <= endPage; p++) {
      const btn = createPageBtn(p.toString(), () => { currentPageNum = p; renderTable(); });
      if (p === currentPageNum) btn.classList.add('active');
      pagination.appendChild(btn);
    }

    const nextBtn = createPageBtn('›', () => { currentPageNum++; renderTable(); });
    nextBtn.disabled = currentPageNum === totalPages;
    pagination.appendChild(nextBtn);

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

  document.getElementById('rows-per-page').addEventListener('change', (e) => {
    rowsPerPage = parseInt(e.target.value);
    currentPageNum = 1;
    renderTable();
  });

  // ===== Action Buttons =====

  document.getElementById('btn-delete').addEventListener('click', () => {
    const selected = tableData.filter(d => d.selected).length;
    if (selected === 0) {
      showToast('Select rows to remove first', 'error');
      return;
    }
    tableData = tableData.filter(d => !d.selected);
    renderTable();
    showToast(`Removed ${selected} character${selected !== 1 ? 's' : ''}`, 'success');
  });

  document.getElementById('btn-cancel').addEventListener('click', () => {
    if (tableData.length === 0) return;
    if (confirm('Clear all characters?')) {
      tableData = [];
      renderTable();
      showToast('All characters cleared', 'success');
    }
  });

  document.getElementById('btn-export-csv').addEventListener('click', () => {
    if (tableData.length === 0) {
      showToast('No data to export', 'error');
      return;
    }
    const blob = AnkiExport.exportCSV(tableData);
    saveAs(blob, `${deckTitleInput.value || 'cantonese-writer'}.csv`);
    showToast('CSV exported', 'success');
  });

  document.getElementById('btn-generate').addEventListener('click', async () => {
    if (tableData.length === 0) {
      showToast('Add some characters first', 'error');
      return;
    }

    const includeAudio = includeAudioCb.checked;
    let audioFiles = {};

    showProgress(true);

    try {
      if (includeAudio) {
        const apiKey = ttsApiKeyInput.value.trim();
        if (!apiKey) {
          showToast('Open the Audio section and enter your API key', 'error');
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
        if (firstError) console.warn('Some audio failed, first:', firstError);
      }

      const blob = await AnkiExport.generateApkg({
        deckTitle: deckTitleInput.value || 'Cantonese Writer',
        cards: tableData,
        cardTypes: cardTypes,
        includeAudio: includeAudio,
        audioFiles: audioFiles,
        onProgress: (pct, msg) => {
          const adjusted = includeAudio ? 40 + Math.floor(pct * 0.6) : pct;
          updateProgress(adjusted, msg);
        }
      });

      saveAs(blob, `${deckTitleInput.value || 'cantonese-writer'}.apkg`);
      showToast(`Deck generated — ${tableData.length} cards ready to import into Anki`, 'success');
    } catch (err) {
      console.error('Generation error:', err);
      showToast('Error generating deck: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      showProgress(false);
    }
  });

  // ===== Utility =====

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
    toast.offsetHeight; // reflow
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 3000);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ===== Initialize =====
  renderTabs();
  renderTabContent();
  renderTable();

})();
