/**
 * AI 翻译助手 - 弹窗脚本
 * 设置管理 + 快捷操作（翻译页面 / 网页总结）
 */
document.addEventListener('DOMContentLoaded', function () {
  var apiKeyInput = document.getElementById('apiKey');
  var baseUrlInput = document.getElementById('baseUrl');
  var modelInput = document.getElementById('model');
  var sourceLangSelect = document.getElementById('sourceLang');
  var targetLangSelect = document.getElementById('targetLang');
  var summaryLangSelect = document.getElementById('summaryLang');
  var saveBtn = document.getElementById('saveBtn');
  var testBtn = document.getElementById('testBtn');
  var toggleApiKey = document.getElementById('toggleApiKey');
  var swapLang = document.getElementById('swapLang');
  var statusEl = document.getElementById('status');
  var actionStatusEl = document.getElementById('actionStatus');

  var btnTranslate = document.getElementById('btnTranslate');
  var btnSummarize = document.getElementById('btnSummarize');
  var btnRestore = document.getElementById('btnRestore');
  var btnDashboard = document.getElementById('btnDashboard');

  var defaults = {
    apiKey: '',
    baseUrl: '',
    model: '',
    sourceLang: 'auto',
    targetLang: 'zh',
    summaryLang: 'zh'
  };

  // ====== 标签切换 ======
  document.querySelectorAll('.tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
      document.querySelectorAll('.tab-content').forEach(function (c) { c.classList.remove('active'); });
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });

  // ====== 状态提示 ======
  function showStatus(message, type, target) {
    var el = target === 'action' ? actionStatusEl : statusEl;
    el.textContent = message;
    el.className = 'status ' + type;
    if (type === 'success' || type === 'info') {
      setTimeout(function () {
        el.className = 'status hidden';
        el.textContent = '';
      }, 3000);
    }
  }

  // ====== 发送消息到当前页面（通过 background 中转） ======
  function sendToTab(action) {
    return new Promise(function (resolve, reject) {
      chrome.runtime.sendMessage({ action: action }, function (response) {
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

  // ====== 检查 API 配置 ======
  function checkConfig() {
    var apiKey = apiKeyInput.value.trim();
    var baseUrl = baseUrlInput.value.trim();
    var model = modelInput.value.trim();
    if (!apiKey || !baseUrl || !model) return false;
    return true;
  }

  // ====== 加载设置 ======
  function loadStoredSettings() {
    chrome.storage.sync.get(defaults, function (items) {
      apiKeyInput.value = items.apiKey || '';
      baseUrlInput.value = items.baseUrl || '';
      modelInput.value = items.model || '';
      sourceLangSelect.value = items.sourceLang || defaults.sourceLang;
      targetLangSelect.value = items.targetLang || defaults.targetLang;
      summaryLangSelect.value = items.summaryLang || defaults.summaryLang;
    });
  }
  loadStoredSettings();

  // ====== API Key 可见性 ======
  toggleApiKey.addEventListener('click', function () {
    var isPw = apiKeyInput.type === 'password';
    apiKeyInput.type = isPw ? 'text' : 'password';
    toggleApiKey.innerHTML = isPw
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  });

  // ====== 交换语言 ======
  swapLang.addEventListener('click', function () {
    var sv = sourceLangSelect.value, tv = targetLangSelect.value;
    if (sv !== 'auto') { sourceLangSelect.value = tv; targetLangSelect.value = sv; }
  });

  // ====== 翻译页面 ======
  btnTranslate.addEventListener('click', function () {
    if (!checkConfig()) {
      showStatus('请先在设置中配置 API 信息', 'error', 'action');
      return;
    }
    btnTranslate.disabled = true;
    showStatus('正在翻译页面…', 'info', 'action');
    sendToTab('startPageTranslation').then(function () {
      showStatus('翻译已启动，页面将在后台开始翻译', 'success', 'action');
    }).catch(function (err) {
      showStatus('失败：' + err.message, 'error', 'action');
    }).finally(function () { btnTranslate.disabled = false; });
    // 自动关闭弹窗
    setTimeout(function () { window.close(); }, 600);
  });

  // ====== 网页总结 ======
  btnSummarize.addEventListener('click', function () {
    if (!checkConfig()) {
      showStatus('请先在设置中配置 API 信息', 'error', 'action');
      return;
    }
    btnSummarize.disabled = true;
    showStatus('正在总结网页…', 'info', 'action');
    sendToTab('startSummarization').then(function () {
      showStatus('总结窗口已打开', 'success', 'action');
    }).catch(function (err) {
      showStatus('失败：' + err.message, 'error', 'action');
    }).finally(function () { btnSummarize.disabled = false; });
    setTimeout(function () { window.close(); }, 600);
  });

  // ====== 恢复原文 ======
  btnRestore.addEventListener('click', function () {
    sendToTab('restoreOriginalText').then(function () {
      showStatus('已恢复原文', 'success', 'action');
    }).catch(function (err) {
      showStatus('失败：' + err.message, 'error', 'action');
    });
  });

  // ====== 保存设置 ======
  saveBtn.addEventListener('click', function () {
    var settings = {
      apiKey: apiKeyInput.value.trim(),
      baseUrl: baseUrlInput.value.trim(),
      model: modelInput.value.trim(),
      sourceLang: sourceLangSelect.value,
      targetLang: targetLangSelect.value,
      summaryLang: summaryLangSelect.value
    };
    if (!settings.apiKey) { showStatus('请填写 API Key', 'error'); return; }
    if (!settings.baseUrl) { showStatus('请填写接口地址', 'error'); return; }
    if (!settings.model) { showStatus('请填写模型名称', 'error'); return; }

    saveBtn.disabled = true;
    saveBtn.textContent = '保存中…';
    chrome.storage.sync.set(settings, function () {
      if (chrome.runtime.lastError) {
        showStatus('保存失败：' + chrome.runtime.lastError.message, 'error');
      } else {
        showStatus('设置保存成功', 'success');
      }
      saveBtn.disabled = false;
      saveBtn.textContent = '保存设置';
    });
  });

  // ====== 测试连接 ======
  testBtn.addEventListener('click', function () {
    var apiKey = apiKeyInput.value.trim();
    var baseUrl = baseUrlInput.value.trim();
    var model = modelInput.value.trim();
    if (!apiKey || !baseUrl || !model) { showStatus('请先填写完整的 API 配置信息', 'error'); return; }

    testBtn.disabled = true;
    testBtn.textContent = '测试中…';
    showStatus('正在测试连接…', 'info');

    chrome.runtime.sendMessage({
      action: 'testConnection',
      data: { apiKey: apiKey, baseUrl: baseUrl, model: model }
    }, function (response) {
      testBtn.disabled = false;
      testBtn.textContent = '测试连接';
      if (chrome.runtime.lastError) { showStatus('连接错误：' + chrome.runtime.lastError.message, 'error'); return; }
      if (response.error) { showStatus('测试失败：' + response.error, 'error'); }
      else { showStatus('连接成功！API 工作正常。', 'success'); }
    });
  });

  // 打开管理面板
  btnDashboard.addEventListener('click', function () {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
  });

  // Ctrl+S
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveBtn.click(); }
  });
});
