/**
 * Background Service Worker
 * Proxies API requests from content scripts and popup to avoid CORS issues.
 * The AI Client is imported and API keys are read from chrome.storage.
 */
importScripts('/lib/ai-client.js');

async function getClient() {
  const settings = await chrome.storage.sync.get(['apiKey', 'baseUrl', 'model']);
  if (!settings.apiKey) {
    throw new Error('Please set your API key in the extension popup');
  }
  if (!settings.baseUrl) {
    throw new Error('Please set the Base URL in the extension popup');
  }
  if (!settings.model) {
    throw new Error('Please set the model name in the extension popup');
  }
  return new AIClient(settings.apiKey, settings.baseUrl, settings.model);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleRequest(request).then(sendResponse).catch(error => {
    sendResponse({ error: error.message || 'Unknown error' });
  });
  return true;
});

async function handleRequest(request) {
  const { action, data } = request;

  switch (action) {
    case 'translate': {
      const client = await getClient();
      const result = await client.translate(data.text, data.sourceLang, data.targetLang);
      return { result };
    }

    case 'translateBatch': {
      const client = await getClient();
      const results = await client.translateBatch(data.texts, data.sourceLang, data.targetLang);
      return { results };
    }

    case 'summarize': {
      const client = await getClient();
      const result = await client.summarize(data.text, data.lang);
      return { result };
    }

    case 'testConnection': {
      const client = await getClient();
      const result = await client.chat(
        [{ role: 'user', content: 'Reply with exactly: OK' }],
        { maxTokens: 10, temperature: 0 }
      );
      return { success: true, response: result };
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}
