/**
 * 后台 Service Worker
 * 代理 API 请求 + 转发 popup 指令到 content script + 记录历史/统计
 */
importScripts('/lib/ai-client.js');

async function getClient() {
  var settings = await chrome.storage.sync.get(['apiKey', 'baseUrl', 'model']);
  if (!settings.apiKey) throw new Error('请在插件弹窗中设置 API Key');
  if (!settings.baseUrl) throw new Error('请在插件弹窗中设置接口地址');
  if (!settings.model) throw new Error('请在插件弹窗中设置模型名称');
  return new AIClient(settings.apiKey, settings.baseUrl, settings.model);
}

async function forwardToTab(tabAction) {
  var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs || !tabs[0] || !tabs[0].id) throw new Error('无法获取当前标签页');
  var tab = tabs[0];
  if (!tab.url || /^(chrome|about|edge|brave|opera):/i.test(tab.url)) throw new Error('当前页面不支持此操作，请在普通网页上使用');
  return new Promise(function (resolve, reject) {
    chrome.tabs.sendMessage(tab.id, { action: tabAction }, function (response) {
      if (chrome.runtime.lastError) {
        var msg = chrome.runtime.lastError.message;
        if (msg.indexOf('Receiving end does not exist') >= 0) reject(new Error('请刷新当前页面后重试（扩展刚更新，页面需要重新加载）'));
        else reject(new Error(msg));
        return;
      }
      if (response && response.error) reject(new Error(response.error));
      else resolve(response || { ok: true });
    });
  });
}

// ============ 历史记录 & 统计 ============

var MAX_HISTORY = 200;

function recordHistory(entry) {
  chrome.storage.local.get(['translationHistory'], function (data) {
    var list = data.translationHistory || [];
    list.unshift({ id: Date.now() + '_' + Math.random().toString(36).slice(2, 8), time: Date.now(), ...entry });
    if (list.length > MAX_HISTORY) list = list.slice(0, MAX_HISTORY);
    chrome.storage.local.set({ translationHistory: list });
  });
}

function addStats(usage, category) {
  if (!usage) return;
  chrome.storage.local.get(['tokenStats'], function (data) {
    var s = data.tokenStats || { totalTokens: 0, totalRequests: 0, translate: { tokens: 0, requests: 0 }, summarize: { tokens: 0, requests: 0 } };
    var t = usage.total_tokens || 0;
    s.totalTokens += t;
    s.totalRequests += 1;
    if (s[category]) { s[category].tokens += t; s[category].requests += 1; }
    chrome.storage.local.set({ tokenStats: s });
  });
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  handleRequest(request).then(sendResponse).catch(function (error) {
    sendResponse({ error: error.message || '未知错误' });
  });
  return true;
});

async function handleRequest(request) {
  var action = request.action;
  var data = request.data;

  switch (action) {

    case 'translate': {
      var client = await getClient();
      var r = await client.translate(data.text, data.sourceLang, data.targetLang);
      addStats(r.usage, 'translate');
      recordHistory({ action: 'translate', sourceText: data.text, result: r.content, sourceLang: data.sourceLang, targetLang: data.targetLang, tokens: r.usage ? r.usage.total_tokens || 0 : 0, url: data.url || '' });
      return { result: r.content };
    }

    case 'translateBatch': {
      var client = await getClient();
      var r = await client.translateBatch(data.texts, data.sourceLang, data.targetLang);
      addStats(r.usage, 'translate');
      var srcFull = data.texts.map(function (t, i) { return '[' + (i + 1) + '] ' + t; }).join('\n');
      var resFull = r.content.map(function (t, i) { return '[' + (i + 1) + '] ' + t; }).join('\n');
      recordHistory({ action: 'translateBatch', sourceText: srcFull, result: resFull, sourceLang: data.sourceLang, targetLang: data.targetLang, tokens: r.usage ? r.usage.total_tokens || 0 : 0, url: data.url || '' });
      return { results: r.content };
    }

    case 'summarize': {
      var client = await getClient();
      var r = await client.summarize(data.text, data.lang);
      addStats(r.usage, 'summarize');
      recordHistory({ action: 'summarize', sourceText: data.text, result: r.content, sourceLang: '', targetLang: data.lang, tokens: r.usage ? r.usage.total_tokens || 0 : 0, url: data.url || '' });
      return { result: r.content };
    }

    case 'testConnection': {
      var client = new AIClient(data.apiKey, data.baseUrl, data.model);
      var r = await client.chat([{ role: 'user', content: 'Reply with exactly: OK' }], { maxTokens: 10, temperature: 0 });
      return { success: true, response: r.content };
    }

    case 'getHistory':
      return new Promise(function (resolve) {
        chrome.storage.local.get(['translationHistory'], function (d) { resolve({ history: d.translationHistory || [] }); });
      });

    case 'getStats':
      return new Promise(function (resolve) {
        chrome.storage.local.get(['tokenStats'], function (d) { resolve({ stats: d.tokenStats || { totalTokens: 0, totalRequests: 0, translate: { tokens: 0, requests: 0 }, summarize: { tokens: 0, requests: 0 } } }); });
      });

    case 'clearHistory':
      return new Promise(function (resolve) { chrome.storage.local.remove(['translationHistory', 'tokenStats'], function () { resolve({ ok: true }); }); });

    case 'startPageTranslation':
      return await forwardToTab('startPageTranslation');

    case 'startSummarization':
      return await forwardToTab('startSummarization');

    case 'restoreOriginalText':
      return await forwardToTab('restoreOriginalText');

    default:
      throw new Error('未知操作：' + action);
  }
}
