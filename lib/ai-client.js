/**
 * AI Client - OpenAI-compatible API client
 * Supports any API that follows the OpenAI chat completions protocol.
 */
class AIClient {
  constructor(apiKey, baseUrl, model) {
    this.apiKey = apiKey;
    // Normalize: strip trailing slashes, then strip trailing /v1 so we can re-add it consistently
    let normalized = baseUrl.replace(/\/+$/, '');
    normalized = normalized.replace(/\/v1\/?$/, '');
    this.baseUrl = normalized + '/v1';
    this.model = model;
  }

  async chat(messages, options = {}) {
    const url = `${this.baseUrl}/chat/completions`;
    const body = {
      model: this.model,
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 4096,
      stream: false
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const bodyText = await response.text();
      let errorText = bodyText;
      try {
        const errorData = JSON.parse(bodyText);
        errorText = errorData.error?.message || bodyText;
      } catch {
        // bodyText is not JSON, use raw text
      }
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Unexpected API response format');
    }
    return data.choices[0].message.content;
  }

  async translate(text, sourceLang, targetLang) {
    const langNames = { zh: 'Chinese', en: 'English', ja: 'Japanese', ko: 'Korean', fr: 'French', de: 'German', es: 'Spanish', auto: 'the source language' };
    const srcName = langNames[sourceLang] || sourceLang;
    const tgtName = langNames[targetLang] || targetLang;

    const messages = [
      {
        role: 'system',
        content: `You are a professional translator. Translate the following text from ${srcName} to ${tgtName}. Return ONLY the translated text, with no explanations, notes, or additional formatting. Preserve paragraph structure and line breaks.`
      },
      { role: 'user', content: text }
    ];
    return await this.chat(messages, { temperature: 0.1 });
  }

  async translateBatch(texts, sourceLang, targetLang) {
    if (texts.length === 0) return [];
    if (texts.length === 1) {
      const result = await this.translate(texts[0], sourceLang, targetLang);
      return [result];
    }

    const langNames = { zh: 'Chinese', en: 'English', ja: 'Japanese', ko: 'Korean', fr: 'French', de: 'German', es: 'Spanish', auto: 'the original language' };
    const srcName = langNames[sourceLang] || sourceLang;
    const tgtName = langNames[targetLang] || targetLang;

    const segments = texts.map((t, i) => `[SEGMENT_${i}]\n${t}\n[/SEGMENT_${i}]`).join('\n\n');

    const messages = [
      {
        role: 'system',
        content: `You are a professional translator. Translate each SEGMENT below from ${srcName} to ${tgtName}. Return the translations in the exact same format with SEGMENT tags, like:\n[SEGMENT_0]\ntranslated text\n[/SEGMENT_0]\n\nOnly return the translations, nothing else.`
      },
      { role: 'user', content: segments }
    ];

    const result = await this.chat(messages, { temperature: 0.1, maxTokens: 8192 });
    const translations = [];
    for (let i = 0; i < texts.length; i++) {
      const regex = new RegExp(`\\[SEGMENT_${i}\\][\\s\\S]*?\\[\\/SEGMENT_${i}\\]`, 'i');
      const match = result.match(regex);
      if (match) {
        const content = match[0]
          .replace(new RegExp(`\\[SEGMENT_${i}\\]`, 'i'), '')
          .replace(new RegExp(`\\[\\/SEGMENT_${i}\\]`, 'i'), '')
          .trim();
        translations.push(content);
      } else {
        translations.push(texts[i]);
      }
    }
    return translations;
  }

  async summarize(text, targetLang) {
    const langInstruction = targetLang === 'zh' ? 'in Chinese (Simplified)' : 'in English';
    const messages = [
      {
        role: 'system',
        content: `You are a professional content summarizer. Summarize the following web page content concisely ${langInstruction}. Include key points, main arguments, and important details. Use clear structure with bullet points or numbered lists. Keep the summary within 500 words. Return only the summary.`
      },
      { role: 'user', content: text }
    ];
    return await this.chat(messages, { temperature: 0.5, maxTokens: 2048 });
  }
}
