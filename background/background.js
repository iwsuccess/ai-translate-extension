/**
 * 后台 Service Worker
 * 代理 API 请求 + 转发 popup 指令到 content script
 */
importScripts('/lib/ai-client.js');

async function getClient() {
  var settings = await chrome.storage.sync.get(['apiKey', 'baseUrl', 'model']);
  if (!settings.apiKey) throw new Error('请在插件弹窗中设置 API Key');
  if (!settings.baseUrl) throw new Error('请在插件弹窗中设置接口地址');
  if (!settings.model) throw new Error('请在插件弹窗中设置模型名称');
  return new AIClient(settings.apiKey, settings.baseUrl, settings.model);
}

/**
 * 转发消息到当前活跃标签页的 content script
 * 如果 content script 未注入（扩展刚更新/chrome://页面），返回友好提示
 */
async function forwardToTab(tabAction) {
  var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs || !tabs[0] || !tabs[0].id) {
    throw new Error('无法获取当前标签页');
  }
  var tab = tabs[0];

  // chrome:// 和 chrome-extension:// 等页面不允许注入
  if (!tab.url || /^(chrome|about|edge|brave|opera):/i.test(tab.url)) {
    throw new Error('当前页面不支持此操作，请在普通网页上使用');
  }

  return new Promise(function (resolve, reject) {
    chrome.tabs.sendMessage(tab.id, { action: tabAction }, function (response) {
      if (chrome.runtime.lastError) {
        // 最常见的错误：content script 未注入（刚更新扩展或页面不支持）
        var msg = chrome.runtime.lastError.message;
        if (msg.indexOf('Receiving end does not exist') >= 0) {
          reject(new Error('请刷新当前页面后重试（扩展刚更新，页面需要重新加载）'));
        } else {
          reject(new Error(msg));
        }
        return;
      }
      if (response && response.error) {
        reject(new Error(response.error));
      } else {
        resolve(response || { ok: true });
      }
    });
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
      var result = await client.translate(data.text, data.sourceLang, data.targetLang);
      return { result: result };
    }

    case 'translateBatch': {
      var client = await getClient();
      var results = await client.translateBatch(data.texts, data.sourceLang, data.targetLang);
      return { results: results };
    }

    case 'summarize': {
      var client = await getClient();
      var result = await client.summarize(data.text, data.lang);
      return { result: result };
    }

    case 'testConnection': {
      var client = new AIClient(data.apiKey, data.baseUrl, data.model);
      var result = await client.chat(
        [{ role: 'user', content: 'Reply with exactly: OK' }],
        { maxTokens: 10, temperature: 0 }
      );
      return { success: true, response: result };
    }

    // popup → background → content script 中转
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
