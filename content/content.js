/**
 * AI 翻译助手 - 内容脚本
 * 监听 popup 消息执行「翻译页面」「网页总结」，划词翻译始终生效。
 */
(function () {
  'use strict';
  if (window.__aiTranslatorInjected) return;
  window.__aiTranslatorInjected = true;

  var settings = { sourceLang: 'auto', targetLang: 'zh', summaryLang: 'zh', apiConfigured: false };
  var originalTexts = new Map();
  var isPageTranslated = false;
  var selectionPopup = null;
  var abortTranslation = false;

  // ============ 加载设置 ============
  async function loadSettings() {
    var data = await chrome.storage.sync.get(['apiKey', 'baseUrl', 'model', 'sourceLang', 'targetLang', 'summaryLang']);
    settings.sourceLang = data.sourceLang || 'auto';
    settings.targetLang = data.targetLang || 'zh';
    settings.summaryLang = data.summaryLang || 'zh';
    settings.apiConfigured = !!(data.apiKey && data.baseUrl && data.model);
  }

  // ============ API 通信 ============
  function callAPI(action, data) {
    return new Promise(function (resolve, reject) {
      chrome.runtime.sendMessage({ action: action, data: data }, function (response) {
        if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
        if (response && response.error) { reject(new Error(response.error)); return; }
        resolve(response);
      });
    });
  }

  function requireConfig() {
    if (!settings.apiConfigured) { showToast('请先在插件弹窗中配置 API Key', 'warn', 3000); return false; }
    return true;
  }

  // ============ Toast ============
  function showToast(message, type, duration) {
    if (!type) type = 'ok'; if (!duration) duration = 2500;
    var old = document.querySelector('.ait-toast'); if (old) old.remove();
    var t = document.createElement('div');
    t.className = 'ait-toast ait-toast-' + type;
    t.textContent = message;
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('ait-toast-on'); });
    setTimeout(function () { t.classList.remove('ait-toast-on'); setTimeout(function () { if (t.parentNode) t.remove(); }, 300); }, duration);
  }

  // ============ 翻译进度条 ============
  var progressEl = null;

  function showProgress() {
    if (progressEl) return progressEl;
    progressEl = document.createElement('div');
    progressEl.id = 'ait-trans-progress';
    progressEl.innerHTML =
      '<div class="ait-tp-bar-wrap">' +
        '<div class="ait-tp-info"><span id="ait-tp-lbl">正在翻译…</span> <span class="ait-tp-pct" id="ait-tp-pct">0%</span></div>' +
        '<div class="ait-tp-track"><div class="ait-tp-fill" id="ait-tp-fill" style="width:0%"></div></div>' +
        '<button class="ait-tp-pause-btn" id="ait-tp-pause">⏸ 暂停</button>' +
      '</div>';
    document.body.appendChild(progressEl);

    document.getElementById('ait-tp-pause').addEventListener('click', function () {
      abortTranslation = true;
      var b = document.getElementById('ait-tp-pause');
      b.textContent = '⏸ 已暂停';
      b.classList.add('ait-paused');
      b.disabled = true;
    });
    return progressEl;
  }

  function updateProgress(current, total) {
    showProgress();
    var pct = total > 0 ? Math.round(current / total * 100) : 0;
    var pctEl = document.getElementById('ait-tp-pct'); if (pctEl) pctEl.textContent = pct + '%';
    var fillEl = document.getElementById('ait-tp-fill'); if (fillEl) fillEl.style.width = pct + '%';
    var lblEl = document.getElementById('ait-tp-lbl'); if (lblEl) lblEl.textContent = current + ' / ' + total;
  }

  function hideProgress() {
    if (progressEl) { progressEl.remove(); progressEl = null; }
  }

  // ============ 简易 Markdown 渲染器 ============
  function parseMarkdown(text) {
    if (!text) return '';
    var html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, function (m, lang, code) { return '<pre><code>' + code.trim() + '</code></pre>'; });
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
    html = html.replace(/<\/blockquote>\n<blockquote>/g, '<br>');
    html = html.replace(/^(---|\*\*\*)$/gm, '<hr>');
    html = parseMarkdownTable(html);
    html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/((?:<li>.*<\/li>\s*)+)/g, '<ul>$1</ul>');
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    html = html.replace(/((?:<li>.*<\/li>\s*)+)/g, function (m) { if (m.indexOf('<ul>') === -1 && m.indexOf('<ol>') === -1) return '<ol>' + m + '</ol>'; return m; });
    html = html.replace(/\n{2,}/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    html = '<p>' + html + '</p>';
    html = html.replace(/<p>\s*(<br>\s*)*<\/p>/g, '');
    return html;
  }

  function parseMarkdownTable(html) {
    var lines = html.split('\n'), result = [], i = 0;
    while (i < lines.length) {
      var line = lines[i];
      if (/^\|.+\|$/.test(line) && i + 1 < lines.length && /^\|[-:|\s]+\|$/.test(lines[i + 1])) {
        var hCells = line.split('|').filter(function (c) { return c.trim(); });
        var rows = []; i += 2;
        while (i < lines.length && /^\|.+\|$/.test(lines[i])) { rows.push(lines[i].split('|').filter(function (c) { return c.trim(); })); i++; }
        var tbl = '<table><thead><tr>';
        for (var h = 0; h < hCells.length; h++) tbl += '<th>' + hCells[h].trim() + '</th>';
        tbl += '</tr></thead><tbody>';
        for (var r = 0; r < rows.length; r++) { tbl += '<tr>'; for (var c = 0; c < rows[r].length; c++) tbl += '<td>' + rows[r][c].trim() + '</td>'; tbl += '</tr>'; }
        tbl += '</tbody></table>';
        result.push(tbl);
      } else { result.push(line); i++; }
    }
    return result.join('\n');
  }

  // ============ 全页面翻译 ============
  function collectTranslatableElements() {
    var selectors = [
      'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'li', 'td', 'th', 'figcaption', 'blockquote',
      'dt', 'dd', 'caption', 'legend', 'option', 'summary',
      'label:not(:has(input,select,textarea))',
      'span:not(:has(*))', 'a:not(:has(*))'
    ];
    var elements = document.querySelectorAll(selectors.join(','));
    var seen = new Set(), result = [];
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      if (el.closest('#ait-sel-popup, #ait-summary-overlay, #ait-trans-progress')) continue;
      if (el.closest('pre, code, textarea, input, [class*="code"], [class*="math"], script, style, noscript, svg')) continue;
      var t = el.textContent.trim(); if (!t || t.length < 2) continue;
      var anc = el.parentElement, skip = false;
      while (anc && anc !== document.body) { if (seen.has(anc)) { skip = true; break; } anc = anc.parentElement; }
      if (skip) continue;
      seen.add(el); result.push(el);
    }
    return result;
  }

  async function startPageTranslation() {
    if (!requireConfig()) return;
    if (isPageTranslated) { restoreOriginalText(); }
    abortTranslation = false;
    hideProgress();
    showProgress();
    updateProgress(0, 1);

    try {
      var elements = collectTranslatableElements();
      if (elements.length === 0) { hideProgress(); showToast('当前页面没有可翻译的文本', 'warn'); return; }

      var sourceLang = settings.sourceLang;
      var targetLang = settings.targetLang;
      var batchSize = 8;
      var translatedCount = 0;

      for (var i = 0; i < elements.length; i += batchSize) {
        if (abortTranslation) { updateProgress(i, elements.length); break; }
        var batch = elements.slice(i, i + batchSize);
        var texts = batch.map(function (el) { return el.textContent.trim(); });

        updateProgress(Math.min(i + batch.length, elements.length), elements.length);

        var translations = [];
        try {
          var resp = await callAPI('translateBatch', { texts: texts, sourceLang: sourceLang, targetLang: targetLang, url: window.location.href });
          translations = resp.results;
        } catch (err) {
          for (var k = 0; k < texts.length; k++) {
            if (abortTranslation) break;
            try { var r = await callAPI('translate', { text: texts[k], sourceLang: sourceLang, targetLang: targetLang, url: window.location.href }); translations.push(r.result); }
            catch (e2) { translations.push(texts[k]); }
          }
        }
        for (var j = 0; j < batch.length; j++) {
          if (abortTranslation) break;
          var el = batch[j], tr = translations[j];
          if (tr && tr !== el.textContent.trim()) { originalTexts.set(el, el.textContent); el.textContent = tr.trim(); translatedCount++; }
        }
      }

      if (!abortTranslation) {
        isPageTranslated = true;
        updateProgress(elements.length, elements.length);
        document.getElementById('ait-tp-lbl').textContent = '翻译完成';
        document.getElementById('ait-tp-pause').textContent = '✓';
        document.getElementById('ait-tp-pause').disabled = true;
        setTimeout(hideProgress, 1800);
        showToast('翻译完成（共 ' + translatedCount + ' 个文本）', 'ok');
      } else {
        setTimeout(hideProgress, 2500);
        showToast('翻译已暂停（已完成 ' + translatedCount + ' 项）', 'warn', 3000);
      }
    } catch (err) {
      hideProgress();
      showToast('翻译失败：' + err.message, 'err', 4000);
    }
  }

  function restoreOriginalText() {
    var count = 0;
    originalTexts.forEach(function (original, el) { el.textContent = original; count++; });
    originalTexts.clear();
    isPageTranslated = false;
    showToast('已恢复原文（共 ' + count + ' 个文本）', 'ok');
  }

  // ============ 划词翻译 ============
  function initSelectionTranslation() {
    var timer = null;
    document.addEventListener('mouseup', function (e) { clearTimeout(timer); timer = setTimeout(function () { handleSelection(e); }, 150); });
    document.addEventListener('mousedown', function (e) { if (selectionPopup && !e.target.closest('#ait-sel-popup')) removeSelectionPopup(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && selectionPopup) removeSelectionPopup(); });
  }

  function handleSelection(e) {
    if (!settings.apiConfigured) return;
    if (e.target.closest('#ait-sel-popup, #ait-summary-overlay, #ait-trans-progress')) return;
    var sel = window.getSelection(); if (!sel || sel.isCollapsed) return;
    var text = sel.toString().trim(); if (!text || text.length < 2 || text.length > 3000) return;
    var range = sel.getRangeAt(0), rect = range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) return;
    showSelectionCard(text, rect);
  }

  function showSelectionCard(text, rect) {
    removeSelectionPopup();
    var popup = document.createElement('div');
    popup.id = 'ait-sel-popup';
    var top = rect.bottom + window.scrollY + 10;
    var left = Math.max(10, Math.min(rect.left + window.scrollX, window.innerWidth - 400));
    popup.style.cssText = 'top:' + top + 'px;left:' + left + 'px';
    popup.innerHTML =
      '<div class="ait-sel-card">' +
        '<div class="ait-sel-hd"><div class="ait-sel-hd-l"><span class="ait-sel-hd-dot"></span><span class="ait-sel-hd-title">划词翻译</span></div><button class="ait-sel-hd-close">&times;</button></div>' +
        '<div class="ait-sel-sec ait-sel-original"><div class="ait-sel-sec-label">原文</div><div class="ait-sel-original-text">' + escapeHtml(text.length > 200 ? text.substring(0, 200) + '…' : text) + '</div></div>' +
        '<div class="ait-sel-sec ait-sel-translation"><div class="ait-sel-sec-label" id="ait-stl">翻译中…</div><div class="ait-sel-translation-text" id="ait-stt"><span class="ait-sel-loading"><span class="ait-spinner"></span>正在翻译</span></div></div>' +
        '<div class="ait-sel-footer"><span class="ait-sel-meta">' + text.length + ' 个字符</span><button class="ait-sel-copy-btn" id="ait-scopy">📋 复制译文</button></div>' +
      '</div>';
    document.body.appendChild(popup);
    selectionPopup = popup;
    popup.querySelector('.ait-sel-hd-close').addEventListener('click', removeSelectionPopup);

    document.getElementById('ait-scopy').addEventListener('click', function () {
      var txt = document.getElementById('ait-stt').textContent;
      if (txt && txt !== '正在翻译') {
        navigator.clipboard.writeText(txt).then(function () {
          var b = document.getElementById('ait-scopy'); b.textContent = '✅ 已复制';
          setTimeout(function () { if (selectionPopup) document.getElementById('ait-scopy').textContent = '📋 复制译文'; }, 2000);
        }).catch(function () { showToast('复制失败', 'err'); });
      }
    });

    callAPI('translate', { text: text, sourceLang: settings.sourceLang, targetLang: settings.targetLang, url: window.location.href })
      .then(function (res) {
        if (!selectionPopup || selectionPopup !== popup) return;
        document.getElementById('ait-stl').textContent = '译文';
        document.getElementById('ait-stt').innerHTML = parseMarkdown(res.result);
      })
      .catch(function (err) {
        if (!selectionPopup || selectionPopup !== popup) return;
        document.getElementById('ait-stl').textContent = '出错';
        document.getElementById('ait-stt').innerHTML = '<span class="ait-sel-error">' + escapeHtml(err.message) + '</span>';
      });
  }

  function removeSelectionPopup() { if (selectionPopup) { selectionPopup.remove(); selectionPopup = null; } var e = document.getElementById('ait-sel-popup'); if (e) e.remove(); }

  // ============ 网页总结（带步骤进度） ============
  async function startSummarization() {
    if (!requireConfig()) return;
    var overlay = createSummaryOverlay();
    var body = overlay.querySelector('.ait-sum-modal-body');
    var abort = false;

    // 关闭时取消
    overlay.querySelector('.ait-sum-modal-close').addEventListener('click', function () { abort = true; });

    // 步骤视图
    body.innerHTML =
      '<div class="ait-sum-steps">' +
        '<div class="ait-sum-step ait-sum-step-active" id="ait-sum-step1"><span class="ait-sum-step-icon ait-step-busy"><span class="ait-spinner" style="width:14px;height:14px;border-width:2px"></span></span>正在提取页面内容…</div>' +
        '<div class="ait-sum-step" id="ait-sum-step2"><span class="ait-sum-step-icon ait-step-wait">2</span>AI 正在分析总结<span id="ait-sum-eta" style="font-size:11px;color:#94a3b8;margin-left:4px"></span></div>' +
        '<div class="ait-sum-step" id="ait-sum-step3"><span class="ait-sum-step-icon ait-step-wait">3</span>整理排版中…</div>' +
      '</div>';

    try {
      // 第一步：提取内容
      var content = extractPageContent();
      if (abort) { body.innerHTML = '<div class="ait-sum-loading">已取消</div>'; return; }
      if (!content || content.length < 50) {
        body.innerHTML = '<div class="ait-sum-loading" style="color:#dc2626">内容不足，无法总结。</div>'; return;
      }
      markStepDone('ait-sum-step1', '✓');
      markStepActive('ait-sum-step2');

      // 第二步：AI 总结
      var lang = settings.summaryLang || 'zh';
      var elapsed = 0;
      var etaInterval = setInterval(function () {
        elapsed++;
        var etaEl = document.getElementById('ait-sum-eta');
        if (etaEl) etaEl.textContent = '(' + elapsed + 's)';
      }, 1000);

      var resp = await callAPI('summarize', { text: content, lang: lang, url: window.location.href });
      clearInterval(etaInterval);
      if (abort) return;

      markStepDone('ait-sum-step2', '✓');
      markStepActive('ait-sum-step3');

      // 第三步：渲染结果
      delay(200).then(function () {
        markStepDone('ait-sum-step3', '✓');
      });
      delay(500).then(function () {
        body.innerHTML = parseMarkdown(resp.result);
      });

    } catch (err) {
      body.innerHTML = '<div class="ait-sum-loading" style="color:#dc2626">' + escapeHtml(err.message) + '</div>';
    }
  }

  function markStepDone(stepId, icon) {
    var step = document.getElementById(stepId); if (!step) return;
    step.classList.remove('ait-sum-step-active'); step.classList.add('ait-sum-step-done');
    var iconEl = step.querySelector('.ait-sum-step-icon');
    iconEl.className = 'ait-sum-step-icon ait-step-ok';
    iconEl.textContent = icon;
  }

  function markStepActive(stepId) {
    var step = document.getElementById(stepId); if (!step) return;
    step.classList.add('ait-sum-step-active');
    var iconEl = step.querySelector('.ait-sum-step-icon');
    iconEl.className = 'ait-sum-step-icon ait-step-busy';
    iconEl.innerHTML = '<span class="ait-spinner" style="width:14px;height:14px;border-width:2px"></span>';
  }

  function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function extractPageContent() {
    var ss = ['article','main','[role="main"]','#content','#main-content','#article','#post','.post','.article','.content','.main-content','.post-content','.entry-content','.markdown-body'];
    for (var i = 0; i < ss.length; i++) { var el = document.querySelector(ss[i]); if (el) { var t = el.textContent.trim(); if (t.length > 100) return t.substring(0, 12000); } }
    var body = document.body.cloneNode(true);
    body.querySelectorAll('script,style,nav,footer,header,.nav,.footer,.header,.sidebar,.menu,.advertisement,.ad,noscript,iframe,[role="navigation"],[role="banner"]').forEach(function (e) { e.remove(); });
    return body.textContent.replace(/\s{3,}/g, '\n\n').trim().substring(0, 12000);
  }

  function createSummaryOverlay() {
    removeSummaryOverlay();
    var overlay = document.createElement('div');
    overlay.id = 'ait-summary-overlay';
    overlay.innerHTML =
      '<div class="ait-sum-backdrop"></div>' +
      '<div class="ait-sum-modal">' +
        '<div class="ait-sum-modal-hd"><div class="ait-sum-modal-hd-title"><span class="ait-sum-modal-hd-icon">📋</span>网页摘要</div><button class="ait-sum-modal-close">&times;</button></div>' +
        '<div class="ait-sum-modal-body"></div>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.querySelector('.ait-sum-modal-close').addEventListener('click', removeSummaryOverlay);
    overlay.querySelector('.ait-sum-backdrop').addEventListener('click', removeSummaryOverlay);
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { removeSummaryOverlay(); document.removeEventListener('keydown', esc); } });
    return overlay;
  }

  function removeSummaryOverlay() { var e = document.getElementById('ait-summary-overlay'); if (e) e.remove(); }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  // ============ 监听 Popup 消息 ============
  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.hasOwnProperty('result') || request.hasOwnProperty('results') || request.hasOwnProperty('error') || request.hasOwnProperty('response')) return;
    if (!request.action) return;
    switch (request.action) {
      case 'startPageTranslation': startPageTranslation().then(function () { sendResponse({ ok: true }); }).catch(function (err) { sendResponse({ error: err.message }); }); return true;
      case 'startSummarization': startSummarization().then(function () { sendResponse({ ok: true }); }).catch(function (err) { sendResponse({ error: err.message }); }); return true;
      case 'restoreOriginalText': restoreOriginalText(); sendResponse({ ok: true }); return true;
      case 'abortTranslation': abortTranslation = true; sendResponse({ ok: true }); return true;
    }
  });

  // ============ 初始化 ============
  async function init() {
    await loadSettings();
    initSelectionTranslation();
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area !== 'sync') return;
      var keys = ['apiKey','baseUrl','model','sourceLang','targetLang','summaryLang'];
      if (keys.some(function (k) { return !!changes[k]; })) loadSettings();
    });
  }

  init();
})();
