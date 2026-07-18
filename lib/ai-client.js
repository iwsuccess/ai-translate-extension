/**
 * AI Client - OpenAI-compatible API client (with token usage tracking)
 */
class AIClient {
  constructor(apiKey, baseUrl, model) {
    this.apiKey = apiKey;
    let normalized = baseUrl.replace(/\/+$/, '');
    normalized = normalized.replace(/\/v1\/?$/, '');
    this.baseUrl = normalized + '/v1';
    this.model = model;
  }

  /** Returns { content: string, usage: { prompt_tokens, completion_tokens, total_tokens } | null } */
  async chat(messages, options) {
    if (!options) options = {};
    var url = this.baseUrl + '/chat/completions';
    var body = {
      model: this.model,
      messages: messages,
      temperature: options.temperature != null ? options.temperature : 0.3,
      max_tokens: options.maxTokens != null ? options.maxTokens : 4096,
      stream: false
    };

    var response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + this.apiKey
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      var bodyText = await response.text();
      var errorText = bodyText;
      try { var errData = JSON.parse(bodyText); errorText = errData.error ? errData.error.message : bodyText; } catch (e) {}
      throw new Error('API Error (' + response.status + '): ' + errorText);
    }

    var data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Unexpected API response format');
    }
    return {
      content: data.choices[0].message.content,
      usage: data.usage || null
    };
  }

  async translate(text, sourceLang, targetLang) {
    var langNames = { zh: 'Chinese', en: 'English', ja: 'Japanese', ko: 'Korean', fr: 'French', de: 'German', es: 'Spanish', auto: 'the source language' };
    var srcName = langNames[sourceLang] || sourceLang;
    var tgtName = langNames[targetLang] || targetLang;
    var messages = [
      { role: 'system', content: 'You are a professional translator. Translate the following text from ' + srcName + ' to ' + tgtName + '. Return ONLY the translated text, with no explanations, notes, or additional formatting. Preserve paragraph structure and line breaks.' },
      { role: 'user', content: text }
    ];
    return await this.chat(messages, { temperature: 0.1 });
  }

  async translateBatch(texts, sourceLang, targetLang) {
    if (texts.length === 0) return { content: [], usage: null };
    if (texts.length === 1) {
      var r = await this.translate(texts[0], sourceLang, targetLang);
      return { content: [r.content], usage: r.usage };
    }
    var langNames = { zh: 'Chinese', en: 'English', ja: 'Japanese', ko: 'Korean', fr: 'French', de: 'German', es: 'Spanish', auto: 'the original language' };
    var srcName = langNames[sourceLang] || sourceLang;
    var tgtName = langNames[targetLang] || targetLang;
    var segments = texts.map(function (t, i) { return '[SEGMENT_' + i + ']\n' + t + '\n[/SEGMENT_' + i + ']'; }).join('\n\n');
    var messages = [
      { role: 'system', content: 'You are a professional translator. Translate each SEGMENT below from ' + srcName + ' to ' + tgtName + '. Return the translations in the exact same format with SEGMENT tags, like:\n[SEGMENT_0]\ntranslated text\n[/SEGMENT_0]\n\nOnly return the translations, nothing else.' },
      { role: 'user', content: segments }
    ];
    var result = await this.chat(messages, { temperature: 0.1, maxTokens: 8192 });
    var translations = [];
    for (var i = 0; i < texts.length; i++) {
      var regex = new RegExp('\\[SEGMENT_' + i + '\\][\\s\\S]*?\\[\\/SEGMENT_' + i + '\\]', 'i');
      var match = result.content.match(regex);
      if (match) {
        translations.push(match[0].replace(new RegExp('\\[SEGMENT_' + i + '\\]', 'i'), '').replace(new RegExp('\\[\\/SEGMENT_' + i + '\\]', 'i'), '').trim());
      } else {
        translations.push(texts[i]);
      }
    }
    return { content: translations, usage: result.usage };
  }

  async summarize(text, targetLang) {
    var langInstruction = targetLang === 'zh' ? 'in Chinese (Simplified)' : 'in English';
    var messages = [
      { role: 'system', content: 'You are a professional content summarizer. Summarize the following web page content concisely ' + langInstruction + '. Include key points, main arguments, and important details. Use clear structure with bullet points or numbered lists. Keep the summary within 500 words. Return only the summary.' },
      { role: 'user', content: text }
    ];
    return await this.chat(messages, { temperature: 0.5, maxTokens: 2048 });
  }
}
