// ==================== Tab Switching ====================
document.querySelectorAll('.tab-btn').forEach(function (btn) {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.tab-btn, .tab-panel').forEach(function (el) { el.classList.remove('active'); });
    btn.classList.add('active');
    document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'history') loadHistory();
    if (btn.dataset.tab === 'stats') loadStats();
  });
});

// ==================== Load Settings ====================
function loadSettings() {
  chrome.storage.sync.get(['apiKey', 'baseUrl', 'model', 'sourceLang', 'targetLang', 'summaryLang'], function (data) {
    document.getElementById('apiKey').value = data.apiKey || '';
    document.getElementById('baseUrl').value = data.baseUrl || '';
    document.getElementById('model').value = data.model || '';
    document.getElementById('sourceLang').value = data.sourceLang || 'auto';
    document.getElementById('targetLang').value = data.targetLang || 'zh';
    document.getElementById('summaryLang').value = data.summaryLang || 'zh';
  });
}

// ==================== Toggle API Key visibility ====================
document.getElementById('toggleApiKey').addEventListener('click', function () {
  var el = document.getElementById('apiKey');
  el.type = el.type === 'password' ? 'text' : 'password';
});

// ==================== Swap Languages ====================
document.getElementById('swapLang').addEventListener('click', function () {
  var src = document.getElementById('sourceLang');
  var tgt = document.getElementById('targetLang');
  if (src.value === 'auto') return;
  var tmp = src.value;
  src.value = tgt.value;
  tgt.value = tmp;
});

// ==================== Save Settings ====================
document.getElementById('saveBtn').addEventListener('click', function () {
  var apiKey = document.getElementById('apiKey').value.trim();
  var baseUrl = document.getElementById('baseUrl').value.trim();
  var model = document.getElementById('model').value.trim();
  var sourceLang = document.getElementById('sourceLang').value;
  var targetLang = document.getElementById('targetLang').value;
  var summaryLang = document.getElementById('summaryLang').value;

  chrome.storage.sync.set({ apiKey: apiKey, baseUrl: baseUrl, model: model, sourceLang: sourceLang, targetLang: targetLang, summaryLang: summaryLang }, function () {
    showStatus('设置已保存', 'success');
  });
});

// ==================== Test Connection ====================
document.getElementById('testBtn').addEventListener('click', function () {
  var apiKey = document.getElementById('apiKey').value.trim();
  var baseUrl = document.getElementById('baseUrl').value.trim();
  var model = document.getElementById('model').value.trim();
  if (!apiKey || !baseUrl || !model) { showStatus('请填写完整的 API 配置', 'error'); return; }

  showStatus('正在测试连接...', '');
  chrome.runtime.sendMessage({ action: 'testConnection', data: { apiKey: apiKey, baseUrl: baseUrl, model: model } }, function (response) {
    if (chrome.runtime.lastError) { showStatus('连接失败：' + chrome.runtime.lastError.message, 'error'); return; }
    if (response && response.error) { showStatus('连接失败：' + response.error, 'error'); return; }
    showStatus('连接成功！API 工作正常', 'success');
  });
});

function showStatus(msg, type) {
  var el = document.getElementById('status');
  el.textContent = msg;
  el.className = 'status-msg ' + type;
}

// ==================== History ====================
function loadHistory() {
  chrome.runtime.sendMessage({ action: 'getHistory' }, function (response) {
    var list = response && response.history ? response.history : [];
    document.getElementById('historyCount').textContent = '共 ' + list.length + ' 条记录';
    var container = document.getElementById('historyList');
    if (list.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">暂无翻译记录</div><div class="empty-sub">开始使用翻译或总结功能后，记录会显示在这里</div></div>';
      return;
    }
    var html = '';
    list.forEach(function (item, idx) {
      var badgeClass = item.action === 'summarize' ? 'summarize' : (item.action === 'translateBatch' ? 'translateBatch' : 'translate');
      var badgeText = item.action === 'summarize' ? '总结' : (item.action === 'translateBatch' ? '批量翻译' : '翻译');
      var hasSource = !!(item.sourceText);
      var isSummarize = item.action === 'summarize';
      var time = new Date(item.time).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
      var sourcePreview = hasSource ? escapeHtml(truncate(item.sourceText, 120)) : '';
      var resultPreview = escapeHtml(truncate(item.result, 120));
      var sourceFull = hasSource ? escapeHtml(item.sourceText) : '';
      var resultFull = escapeHtml(item.result);
      var langInfo = '';
      if (item.sourceLang && item.targetLang) {
        var langMap = { zh: '中文', en: 'English', ja: '日本語', ko: '한국어', fr: 'Français', de: 'Deutsch', es: 'Español', auto: '自动' };
        langInfo = (langMap[item.sourceLang] || item.sourceLang) + ' → ' + (langMap[item.targetLang] || item.targetLang);
      } else if (item.targetLang) {
        langInfo = '目标：' + (item.targetLang === 'zh' ? '中文' : 'English');
      }

      html += '<div class="history-item">' +
        '<div class="history-header">' +
          '<div class="history-header-top">' +
            '<span class="history-badge ' + badgeClass + '">' + badgeText + '</span>' +
            '<span class="history-chevron">&#9654;</span>' +
          '</div>' +
          '<div class="history-header-info">' +
            '<span class="history-time">' + time + '</span>' +
            (langInfo ? '<span class="history-lang">' + langInfo + '</span>' : '') +
            (item.tokens ? '<span class="history-tokens-inline">' + formatToken(item.tokens) + '</span>' : '') +
          '</div>' +
          (hasSource ? '<div class="history-preview-text">' + sourcePreview + '</div>' : '') +
          '<div class="history-preview-text">' + resultPreview + '</div>' +
        '</div>' +
        '<div class="history-detail">' +
          (item.url ? '<div class="history-detail-row"><span class="history-detail-label">来源页面</span><a class="history-detail-url" href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener">' + escapeHtml(truncateUrl(item.url)) + '</a></div>' : '') +
          (hasSource ? '<div class="history-detail-section"><div class="history-detail-section-title">原文</div><div class="history-detail-content source">' + (isSummarize ? '<code class="history-code-plain">' + sourceFull + '</code>' : sourceFull) + '</div></div>' : '') +
          '<div class="history-detail-section"><div class="history-detail-section-title">' + (isSummarize ? '总结' : '译文') + '</div><div class="history-detail-content result">' + resultFull + '</div></div>' +
          '<div class="history-detail-footer">' +
            '<button class="btn btn-sm btn-outline history-copy-btn">📋 复制</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    });
    container.innerHTML = html;

    // delegated click: toggle expand/collapse on header click
    container.removeEventListener('click', historyClickDelegate);
    container.addEventListener('click', historyClickDelegate);

    // attach copy listeners
    container.querySelectorAll('.history-copy-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var detail = btn.closest('.history-detail');
        var resultEl = detail.querySelector('.history-detail-content.result');
        var text = resultEl ? resultEl.textContent : '';
        navigator.clipboard.writeText(text).then(function () {
          btn.textContent = '✅ 已复制';
          setTimeout(function () { btn.textContent = '📋 复制'; }, 2000);
        }).catch(function () {
          btn.textContent = '❌ 失败';
          setTimeout(function () { btn.textContent = '📋 复制'; }, 2000);
        });
      });
    });
  });
}

function historyClickDelegate(e) {
  var header = e.target.closest('.history-header');
  if (!header) return;
  var item = header.closest('.history-item');
  if (!item) return;
  var wasOpen = item.classList.contains('open');
  // close all others
  item.parentElement.querySelectorAll('.history-item.open').forEach(function (el) { el.classList.remove('open'); });
  if (!wasOpen) item.classList.add('open');
}

function truncate(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.substring(0, maxLen) + '…' : str;
}

function truncateUrl(url) {
  if (!url) return '';
  return url.length > 60 ? url.substring(0, 60) + '…' : url;
}

function formatToken(n) {
  if (n >= 10000) return (n / 1000).toFixed(1) + 'k tokens';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k tokens';
  return n + ' tokens';
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ==================== Clear History ====================
document.getElementById('clearHistoryBtn').addEventListener('click', function () {
  if (!confirm('确定要清空所有翻译历史和统计数据吗？此操作不可撤销。')) return;
  chrome.runtime.sendMessage({ action: 'clearHistory' }, function () {
    loadHistory();
    loadStats();
  });
});

// ==================== Stats ====================
function loadStats() {
  chrome.runtime.sendMessage({ action: 'getStats' }, function (response) {
    var s = response && response.stats ? response.stats : { totalTokens: 0, totalRequests: 0, translate: { tokens: 0, requests: 0 }, summarize: { tokens: 0, requests: 0 } };
    document.getElementById('statTotalTokens').textContent = formatNumber(s.totalTokens);
    document.getElementById('statTotalRequests').textContent = formatNumber(s.totalRequests);
    document.getElementById('statTranslateTokens').textContent = formatNumber(s.translate.tokens);
    document.getElementById('statSummarizeTokens').textContent = formatNumber(s.summarize.tokens);
    document.getElementById('statTranslateRequests').textContent = formatNumber(s.translate.requests);
    document.getElementById('statSummarizeRequests').textContent = formatNumber(s.summarize.requests);

    var total = s.totalTokens || 1;
    document.getElementById('barTranslate').style.width = Math.round(s.translate.tokens / total * 100) + '%';
    document.getElementById('barSummarize').style.width = Math.round(s.summarize.tokens / total * 100) + '%';
  });
}

function formatNumber(n) {
  if (n >= 10000) return (n / 1000).toFixed(1) + 'k';
  return n + '';
}

// ==================== Init ====================
loadSettings();
