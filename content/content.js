/**
 * Content Script - Main translation & summarization logic
 * Injected into every page. Provides:
 * - Full page translation
 * - Word/phrase selection translation
 * - Page summarization
 */
(function () {
  'use strict';

  if (window.__aiTranslatorInjected) return;
  window.__aiTranslatorInjected = true;

  // ============ State ============
  let settings = {
    sourceLang: 'auto',
    targetLang: 'zh',
    summaryLang: 'zh',
    apiConfigured: false
  };

  const originalTexts = new Map();
  let isPageTranslated = false;
  let selectionPopup = null;

  // ============ Settings ============
  async function loadSettings() {
    const data = await chrome.storage.sync.get([
      'apiKey', 'baseUrl', 'model', 'sourceLang', 'targetLang', 'summaryLang'
    ]);
    settings.sourceLang = data.sourceLang || 'auto';
    settings.targetLang = data.targetLang || 'zh';
    settings.summaryLang = data.summaryLang || 'zh';
    settings.apiConfigured = !!(data.apiKey && data.baseUrl && data.model);
  }

  // ============ API Communication ============
  function callAPI(action, data) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action, data }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response && response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  async function translateText(text, sourceLang, targetLang) {
    const response = await callAPI('translate', { text, sourceLang, targetLang });
    return response.result;
  }

  async function translateBatch(texts, sourceLang, targetLang) {
    const response = await callAPI('translateBatch', { texts, sourceLang, targetLang });
    return response.results;
  }

  async function summarizeText(text, lang) {
    const response = await callAPI('summarize', { text, lang });
    return response.result;
  }

  // ============ CSS Injection ============
  function injectStyles() {
    if (document.getElementById('ait-injected-styles')) return;
    const styleEl = document.createElement('style');
    styleEl.id = 'ait-injected-styles';
    styleEl.textContent = `
      #ait-toolbar{position:fixed;bottom:24px;right:24px;z-index:2147483646;font-family:system-ui,-apple-system,sans-serif!important}
      #ait-toolbar *{box-sizing:border-box;margin:0;padding:0}
      .ait-tb-wrap{display:flex;align-items:center;gap:6px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:5px 6px;box-shadow:0 4px 24px rgba(0,0,0,.12),0 1px 3px rgba(0,0,0,.06)}
      .ait-tb-btn{display:inline-flex;align-items:center;gap:5px;padding:7px 12px;border:none;border-radius:8px;background:0 0;color:#4b5563;font-size:12px;font-weight:500;cursor:pointer;transition:all .15s;white-space:nowrap;font-family:inherit;line-height:1.4}
      .ait-tb-btn:hover{background:#f3f4f6;color:#4f46e5}
      .ait-tb-btn:active{transform:scale(.96)}
      .ait-tb-btn:disabled{opacity:.45;pointer-events:none}
      .ait-tb-btn-primary{background:#4f46e5;color:#fff!important}
      .ait-tb-btn-primary:hover{background:#4338ca}
      .ait-tb-icon{font-size:15px;line-height:1}
      .ait-tb-progress{display:flex;align-items:center;gap:6px;padding:7px 12px;font-size:11px;color:#6b7280}
      .ait-tb-spinner{width:14px;height:14px;border:2px solid #e5e7eb;border-top-color:#4f46e5;border-radius:50%;animation:ait-spin .6s linear infinite;flex-shrink:0}
      @keyframes ait-spin{to{transform:rotate(360deg)}}
      #ai-translator-selection-popup{position:absolute;z-index:2147483647;font-family:system-ui,-apple-system,sans-serif!important;animation:ait-popup-in .2s ease-out}
      #ai-translator-selection-popup *{box-sizing:border-box;margin:0;padding:0}
      @keyframes ait-popup-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      .ait-popup-wrap{width:320px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,.16);overflow:hidden}
      .ait-popup-hd{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#f9fafb;border-bottom:1px solid #f0f0f0}
      .ait-popup-hd-t{font-size:11px;font-weight:600;color:#4f46e5;text-transform:uppercase;letter-spacing:.5px}
      .ait-popup-hd-x{background:0 0;border:none;font-size:18px;color:#9ca3af;cursor:pointer;padding:0 4px;line-height:1;transition:color .15s}
      .ait-popup-hd-x:hover{color:#ef4444}
      .ait-popup-sec{padding:10px 12px}
      .ait-popup-sec+.ait-popup-sec{border-top:1px solid #f0f0f0}
      .ait-popup-lbl{font-size:10px;font-weight:600;color:#9ca3af;text-transform:uppercase;margin-bottom:3px;letter-spacing:.5px}
      .ait-popup-txt{font-size:13px;color:#1f2937;line-height:1.55;word-break:break-word;max-height:160px;overflow-y:auto}
      .ait-popup-trans .ait-popup-txt{color:#4f46e5}
      .ait-popup-trans{background:#f5f3ff}
      .ait-popup-act{display:flex;gap:6px;padding:8px 12px;border-top:1px solid #f0f0f0;justify-content:flex-end}
      .ait-btn-sm{padding:5px 10px;border:1.5px solid #e5e7eb;border-radius:6px;background:#fff;color:#4b5563;font-size:11px;font-weight:500;cursor:pointer;transition:all .15s;font-family:inherit}
      .ait-btn-sm:hover{background:#f3f4f6;border-color:#d1d5db}
      .ait-sep{width:1px;height:16px;background:#e5e7eb;margin:0 2px;align-self:center}
      #ait-summary-overlay{position:fixed;inset:0;z-index:2147483646;font-family:system-ui,-apple-system,sans-serif!important}
      #ait-summary-overlay *{box-sizing:border-box;margin:0;padding:0}
      .ait-sum-back{position:absolute;inset:0;background:rgba(0,0,0,.4);backdrop-filter:blur(2px);animation:ait-fade-in .25s}
      @keyframes ait-fade-in{from{opacity:0}to{opacity:1}}
      .ait-sum-panel{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:90%;max-width:640px;max-height:80vh;background:#fff;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.3);display:flex;flex-direction:column;animation:ait-scale-in .25s ease-out}
      @keyframes ait-scale-in{from{opacity:0;transform:translate(-50%,-50%) scale(.95)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
      .ait-sum-hd{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid #e5e7eb;flex-shrink:0}
      .ait-sum-hd h2{font-size:16px;font-weight:600;color:#1f2937}
      .ait-sum-x{background:0 0;border:none;font-size:22px;color:#9ca3af;cursor:pointer;padding:4px 6px;border-radius:6px;line-height:1;transition:all .15s}
      .ait-sum-x:hover{background:#f3f4f6;color:#ef4444}
      .ait-sum-body{padding:18px;overflow-y:auto;flex:1;font-size:14px;line-height:1.75;color:#374151}
      .ait-sum-body ul,.ait-sum-body ol{padding-left:20px;margin:6px 0}
      .ait-sum-body li{margin:3px 0}
      .ait-sum-body p{margin:6px 0}
      .ait-sum-body h3{font-size:15px;font-weight:600;margin:10px 0 4px;color:#1f2937}
      .ait-sum-body strong{color:#1f2937}
      .ait-toast{position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:2147483647;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:500;font-family:system-ui,-apple-system,sans-serif;pointer-events:none;opacity:0;transition:opacity .25s,transform .25s;transform:translateX(-50%) translateY(-8px)}
      .ait-toast-on{opacity:1;transform:translateX(-50%) translateY(0)}
      .ait-toast-ok{background:#059669;color:#fff;box-shadow:0 4px 14px rgba(5,150,105,.3)}
      .ait-toast-err{background:#dc2626;color:#fff;box-shadow:0 4px 14px rgba(220,38,38,.3)}
      .ait-toast-warn{background:#d97706;color:#fff;box-shadow:0 4px 14px rgba(217,119,6,.3)}
      .ait-load-dot{display:flex;align-items:center;justify-content:center;gap:8px;padding:30px;color:#9ca3af;font-size:13px}
      .ait-load-dot::before{content:'';width:18px;height:18px;border:2px solid #e5e7eb;border-top-color:#4f46e5;border-radius:50%;animation:ait-spin .6s linear infinite}
    `;
    document.head.appendChild(styleEl);
  }

  // ============ Toast ============
  function showToast(message, type, duration) {
    type = type || 'ok';
    duration = duration || 2500;
    const existing = document.querySelector('.ait-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'ait-toast ait-toast-' + type;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('ait-toast-on');
    });

    setTimeout(() => {
      toast.classList.remove('ait-toast-on');
      setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
    }, duration);
  }

  // ============ Toolbar ============
  function injectToolbar() {
    if (document.getElementById('ait-toolbar')) return;

    const toolbar = document.createElement('div');
    toolbar.id = 'ait-toolbar';
    toolbar.innerHTML = `
      <div class="ait-tb-wrap">
        <button class="ait-tb-btn" id="ait-btn-translate" title="Translate entire page">
          <span class="ait-tb-icon">&#127760;</span> Translate
        </button>
        <button class="ait-tb-btn" id="ait-btn-restore" title="Restore original text" style="display:none">
          <span class="ait-tb-icon">&#8617;</span> Original
        </button>
        <span class="ait-sep"></span>
        <button class="ait-tb-btn" id="ait-btn-summarize" title="Summarize this page">
          <span class="ait-tb-icon">&#128203;</span> Summarize
        </button>
        <span class="ait-tb-progress" id="ait-progress" style="display:none">
          <span class="ait-tb-spinner"></span>
          <span id="ait-progress-text"></span>
        </span>
      </div>
    `;

    document.body.appendChild(toolbar);

    document.getElementById('ait-btn-translate').addEventListener('click', startPageTranslation);
    document.getElementById('ait-btn-restore').addEventListener('click', restoreOriginalText);
    document.getElementById('ait-btn-summarize').addEventListener('click', startSummarization);
  }

  function setTranslating(isTranslating) {
    const translateBtn = document.getElementById('ait-btn-translate');
    const restoreBtn = document.getElementById('ait-btn-restore');
    const progressEl = document.getElementById('ait-progress');

    if (translateBtn) translateBtn.disabled = isTranslating;
    if (progressEl) progressEl.style.display = isTranslating ? 'flex' : 'none';
  }

  function updateProgress(current, total) {
    const textEl = document.getElementById('ait-progress-text');
    if (textEl) {
      textEl.textContent = 'Translating ' + current + '/' + total + '...';
    }
  }

  // ============ Full Page Translation ============
  function collectTranslatableElements() {
    const selectors = [
      'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'li', 'td', 'th', 'figcaption', 'blockquote',
      'dt', 'dd', 'caption', 'legend', 'option', 'summary',
      'label:not(:has(input,select,textarea))',
      'span:not(:has(*))',
      'a:not(:has(*))'
    ];

    const elements = document.querySelectorAll(selectors.join(','));
    const seen = new Set();
    const result = [];

    for (const el of elements) {
      if (el.closest('#ait-toolbar, #ai-translator-selection-popup, #ait-summary-overlay')) continue;
      if (el.closest('pre, code, textarea, input, [class*="code"], [class*="math"], script, style, noscript, svg')) continue;

      const text = el.textContent.trim();
      if (!text || text.length < 2) continue;

      // Avoid duplicate: if parent already in result, skip child
      let ancestor = el.parentElement;
      let shouldSkip = false;
      while (ancestor && ancestor !== document.body) {
        if (seen.has(ancestor)) { shouldSkip = true; break; }
        ancestor = ancestor.parentElement;
      }
      if (shouldSkip) continue;

      seen.add(el);
      result.push(el);
    }

    return result;
  }

  async function startPageTranslation() {
    if (!settings.apiConfigured) {
      showToast('Please configure API settings first', 'warn');
      return;
    }

    if (isPageTranslated) {
      restoreOriginalText();
    }

    setTranslating(true);
    updateProgress(0, 0);

    try {
      const elements = collectTranslatableElements();

      if (elements.length === 0) {
        showToast('No translatable text found on this page', 'warn');
        setTranslating(false);
        return;
      }

      const sourceLang = settings.sourceLang;
      const targetLang = settings.targetLang;
      const batchSize = 8;
      let translatedCount = 0;

      for (let i = 0; i < elements.length; i += batchSize) {
        const batch = elements.slice(i, i + batchSize);
        const texts = batch.map(el => el.textContent.trim());

        updateProgress(Math.min(i + batchSize, elements.length), elements.length);

        let translations;
        try {
          translations = await translateBatch(texts, sourceLang, targetLang);
        } catch (err) {
          // If batch fails, try one by one
          translations = [];
          for (const text of texts) {
            try {
              const t = await translateText(text, sourceLang, targetLang);
              translations.push(t);
            } catch {
              translations.push(text); // Keep original on failure
            }
          }
        }

        for (let j = 0; j < batch.length; j++) {
          const el = batch[j];
          const translated = translations[j];
          if (translated && translated !== el.textContent.trim()) {
            originalTexts.set(el, el.textContent);
            el.textContent = translated.trim();
            translatedCount++;
          }
        }
      }

      isPageTranslated = true;
      document.getElementById('ait-btn-translate').style.display = 'none';
      document.getElementById('ait-btn-restore').style.display = 'inline-flex';
      showToast('Page translated (' + translatedCount + ' elements)', 'ok');
    } catch (err) {
      showToast('Translation failed: ' + err.message, 'err', 4000);
    } finally {
      setTranslating(false);
    }
  }

  function restoreOriginalText() {
    let count = 0;
    for (const [el, original] of originalTexts) {
      el.textContent = original;
      count++;
    }
    originalTexts.clear();
    isPageTranslated = false;

    const translateBtn = document.getElementById('ait-btn-translate');
    const restoreBtn = document.getElementById('ait-btn-restore');
    if (translateBtn) translateBtn.style.display = 'inline-flex';
    if (restoreBtn) restoreBtn.style.display = 'none';
    showToast('Original text restored (' + count + ' elements)', 'ok');
  }

  // ============ Selection Translation ============
  function initSelectionTranslation() {
    let debounceTimer = null;

    document.addEventListener('mouseup', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => handleSelection(e), 150);
    });

    document.addEventListener('mousedown', (e) => {
      if (selectionPopup && !e.target.closest('#ai-translator-selection-popup')) {
        removeSelectionPopup();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && selectionPopup) {
        removeSelectionPopup();
      }
    });
  }

  async function handleSelection(e) {
    if (!settings.apiConfigured) return;
    if (e.target.closest('#ait-toolbar, #ai-translator-selection-popup, #ait-summary-overlay')) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      return;
    }

    const text = selection.toString().trim();
    if (!text || text.length < 2 || text.length > 2000) {
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) return;

    showSelectionPopup(text, rect);
  }

  function showSelectionPopup(text, rect) {
    removeSelectionPopup();

    const popup = document.createElement('div');
    popup.id = 'ai-translator-selection-popup';

    const top = rect.bottom + window.scrollY + 8;
    const left = Math.max(8, Math.min(rect.left + window.scrollX, window.innerWidth - 328));

    popup.style.cssText = 'top:' + top + 'px;left:' + left + 'px';
    popup.innerHTML = `
      <div class="ait-popup-wrap">
        <div class="ait-popup-hd">
          <span class="ait-popup-hd-t">&#127760; Translation</span>
          <button class="ait-popup-hd-x">&times;</button>
        </div>
        <div class="ait-popup-sec ait-popup-trans">
          <div class="ait-popup-lbl">Translating...</div>
          <div class="ait-popup-txt ait-load-dot" style="padding:12px 0">Loading translation</div>
        </div>
        <div class="ait-popup-act">
          <span class="ait-popup-lbl" style="margin:0;line-height:1.8;color:#6b7280;font-size:11px">Original: ${escapeHtml(text.length > 80 ? text.substring(0, 80) + '...' : text)}</span>
          <button class="ait-btn-sm ait-btn-copy">Copy</button>
        </div>
      </div>
    `;

    document.body.appendChild(popup);
    selectionPopup = popup;

    popup.querySelector('.ait-popup-hd-x').addEventListener('click', removeSelectionPopup);
    popup.querySelector('.ait-btn-copy').addEventListener('click', () => {
      const translatedText = popup.querySelector('.ait-popup-txt').textContent;
      if (translatedText && translatedText !== 'Loading translation') {
        navigator.clipboard.writeText(translatedText).then(() => {
          const btn = popup.querySelector('.ait-btn-copy');
          btn.textContent = 'Copied!';
          setTimeout(() => { btn.textContent = 'Copy'; }, 1800);
        }).catch(() => showToast('Failed to copy', 'err'));
      }
    });

    // Start translation
    const sourceLang = settings.sourceLang;
    const targetLang = settings.targetLang;
    translateText(text, sourceLang, targetLang)
      .then(translated => {
        if (!selectionPopup || selectionPopup !== popup) return;
        const txtEl = popup.querySelector('.ait-popup-txt');
        txtEl.textContent = translated;
        txtEl.className = 'ait-popup-txt';
        popup.querySelector('.ait-popup-lbl').textContent = 'Translation';
      })
      .catch(err => {
        if (!selectionPopup || selectionPopup !== popup) return;
        const txtEl = popup.querySelector('.ait-popup-txt');
        txtEl.textContent = 'Error: ' + err.message;
        txtEl.className = 'ait-popup-txt';
        txtEl.style.color = '#dc2626';
        popup.querySelector('.ait-popup-lbl').textContent = 'Error';
      });
  }

  function removeSelectionPopup() {
    if (selectionPopup) {
      selectionPopup.remove();
      selectionPopup = null;
    }
    const existing = document.getElementById('ai-translator-selection-popup');
    if (existing) existing.remove();
  }

  // ============ Summarization ============
  async function startSummarization() {
    if (!settings.apiConfigured) {
      showToast('Please configure API settings first', 'warn');
      return;
    }

    const overlay = createSummaryOverlay();
    overlay.querySelector('.ait-sum-body').innerHTML = '<div class="ait-load-dot">Extracting and summarizing page content...</div>';

    try {
      const content = extractPageContent();
      if (!content || content.length < 50) {
        overlay.querySelector('.ait-sum-body').innerHTML = '<div class="ait-load-dot" style="color:#dc2626">Not enough content to summarize. This page may have very little text.</div>';
        return;
      }

      const lang = settings.summaryLang || 'zh';
      const summary = await summarizeText(content, lang);
      overlay.querySelector('.ait-sum-body').innerHTML = formatSummary(summary);
    } catch (err) {
      overlay.querySelector('.ait-sum-body').innerHTML = '<div class="ait-load-dot" style="color:#dc2626">Summarization failed: ' + escapeHtml(err.message) + '</div>';
    }
  }

  function extractPageContent() {
    const mainSelectors = [
      'article', 'main', '[role="main"]',
      '#content', '#main-content', '#article', '#post',
      '.post', '.article', '.content', '.main-content',
      '.post-content', '.entry-content', '.markdown-body'
    ];

    for (const selector of mainSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        const text = el.textContent.trim();
        if (text.length > 100) {
          return text.substring(0, 10000);
        }
      }
    }

    const body = document.body.cloneNode(true);
    const removals = 'script, style, nav, footer, header, .nav, .footer, .header, .sidebar, .menu, .advertisement, .ad, noscript, iframe, [role="navigation"], [role="banner"]';
    body.querySelectorAll(removals).forEach(el => el.remove());
    const text = body.textContent.replace(/\s{3,}/g, '\n\n').trim();
    return text.substring(0, 10000);
  }

  function createSummaryOverlay() {
    removeSummaryOverlay();

    const overlay = document.createElement('div');
    overlay.id = 'ait-summary-overlay';
    overlay.innerHTML = `
      <div class="ait-sum-back"></div>
      <div class="ait-sum-panel">
        <div class="ait-sum-hd">
          <h2>&#128203; Page Summary</h2>
          <button class="ait-sum-x">&times;</button>
        </div>
        <div class="ait-sum-body"></div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('.ait-sum-x').addEventListener('click', removeSummaryOverlay);
    overlay.querySelector('.ait-sum-back').addEventListener('click', removeSummaryOverlay);

    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') {
        removeSummaryOverlay();
        document.removeEventListener('keydown', escHandler);
      }
    });

    return overlay;
  }

  function removeSummaryOverlay() {
    const overlay = document.getElementById('ait-summary-overlay');
    if (overlay) overlay.remove();
  }

  function formatSummary(text) {
    let html = escapeHtml(text);
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    html = '<p>' + html + '</p>';
    html = html.replace(/<p>\s*<br>\s*<\/p>/g, '');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/((?:<li>.*<\/li>\s*)+)/g, '<ul>$1</ul>');
    html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<li>$2</li>');
    return html || escapeHtml(text);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ============ Init ============
  async function init() {
    injectStyles();
    await loadSettings();

    if (settings.apiConfigured) {
      injectToolbar();
      initSelectionTranslation();
    }

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync') return;
      const relevantKeys = ['apiKey', 'baseUrl', 'model', 'sourceLang', 'targetLang', 'summaryLang'];
      if (relevantKeys.some(k => changes[k])) {
        loadSettings().then(() => {
          if (settings.apiConfigured) {
            injectToolbar();
            initSelectionTranslation();
          } else {
            // Remove toolbar if API is no longer configured
            const toolbar = document.getElementById('ait-toolbar');
            if (toolbar) toolbar.remove();
            removeSelectionPopup();
            removeSummaryOverlay();
          }
        });
      }
    });
  }

  init();
})();
