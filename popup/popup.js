/**
 * Popup Script - Settings management
 */
document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const baseUrlInput = document.getElementById('baseUrl');
  const modelInput = document.getElementById('model');
  const sourceLangSelect = document.getElementById('sourceLang');
  const targetLangSelect = document.getElementById('targetLang');
  const summaryLangSelect = document.getElementById('summaryLang');
  const saveBtn = document.getElementById('saveBtn');
  const testBtn = document.getElementById('testBtn');
  const toggleApiKey = document.getElementById('toggleApiKey');
  const swapLang = document.getElementById('swapLang');
  const statusEl = document.getElementById('status');

  // Default values
  const defaults = {
    apiKey: '',
    baseUrl: 'https://api.openai.com',
    model: 'gpt-4o-mini',
    sourceLang: 'auto',
    targetLang: 'zh',
    summaryLang: 'zh'
  };

  function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        statusEl.className = 'status';
        statusEl.textContent = '';
      }, 3000);
    }
  }

  // Load saved settings
  chrome.storage.sync.get(defaults, (items) => {
    apiKeyInput.value = items.apiKey || '';
    baseUrlInput.value = items.baseUrl || defaults.baseUrl;
    modelInput.value = items.model || defaults.model;
    sourceLangSelect.value = items.sourceLang || defaults.sourceLang;
    targetLangSelect.value = items.targetLang || defaults.targetLang;
    summaryLangSelect.value = items.summaryLang || defaults.summaryLang;
  });

  // Toggle API key visibility
  toggleApiKey.addEventListener('click', () => {
    const isPassword = apiKeyInput.type === 'password';
    apiKeyInput.type = isPassword ? 'text' : 'password';
    toggleApiKey.innerHTML = isPassword
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  });

  // Swap languages
  swapLang.addEventListener('click', () => {
    const sourceVal = sourceLangSelect.value;
    const targetVal = targetLangSelect.value;
    if (sourceVal !== 'auto') {
      sourceLangSelect.value = targetVal;
      targetLangSelect.value = sourceVal;
    }
  });

  // Save settings
  saveBtn.addEventListener('click', () => {
    const settings = {
      apiKey: apiKeyInput.value.trim(),
      baseUrl: baseUrlInput.value.trim(),
      model: modelInput.value.trim(),
      sourceLang: sourceLangSelect.value,
      targetLang: targetLangSelect.value,
      summaryLang: summaryLangSelect.value
    };

    if (!settings.apiKey) {
      showStatus('Please enter your API key', 'error');
      return;
    }
    if (!settings.baseUrl) {
      showStatus('Please enter the Base URL', 'error');
      return;
    }
    if (!settings.model) {
      showStatus('Please enter the model name', 'error');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    chrome.storage.sync.set(settings, () => {
      if (chrome.runtime.lastError) {
        showStatus('Failed to save: ' + chrome.runtime.lastError.message, 'error');
      } else {
        showStatus('Settings saved successfully!', 'success');
      }
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Settings';
    });
  });

  // Test connection
  testBtn.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    const baseUrl = baseUrlInput.value.trim();
    const model = modelInput.value.trim();

    if (!apiKey || !baseUrl || !model) {
      showStatus('Please fill in all API fields first', 'error');
      return;
    }

    testBtn.disabled = true;
    testBtn.textContent = 'Testing...';
    showStatus('Testing connection...', 'info');

    chrome.runtime.sendMessage({ action: 'testConnection', data: {} }, (response) => {
      testBtn.disabled = false;
      testBtn.textContent = 'Test Connection';

      if (chrome.runtime.lastError) {
        showStatus('Connection error: ' + chrome.runtime.lastError.message, 'error');
        return;
      }

      if (response.error) {
        showStatus('Test failed: ' + response.error, 'error');
      } else {
        showStatus('Connection successful! API is working.', 'success');
      }
    });
  });

  // Keyboard shortcut: Ctrl+S to save
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveBtn.click();
    }
  });
});
