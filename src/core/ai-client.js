import { buildBriefPrompt, buildSentencePrompt } from './prompt-templates.js';

function postMessageAsync(action, payload = {}, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const id = Date.now().toString() + Math.random().toString();
    const timer = setTimeout(() => {
      window.removeEventListener('message', listener);
      reject(new Error(`Timeout waiting for AI bridge on action: ${action}`));
    }, timeout);

    const listener = (event) => {
      if (event.source !== window || !event.data || event.data.source !== 'ai-bridge-response') return;
      if (event.data.id === id) {
        window.removeEventListener('message', listener);
        clearTimeout(timer);
        if (event.data.error) reject(new Error(event.data.error));
        else resolve(event.data.result);
      }
    };

    window.addEventListener('message', listener);
    window.postMessage({ source: 'ai-client-request', id, action, payload }, '*');
  });
}

export class AIClient {
  constructor({ mockSession = null, customApiKey = null } = {}) {
    this.session = mockSession;
    this.customApiKey = customApiKey;
    this.useBridge = typeof window !== 'undefined' && typeof chrome !== 'undefined' && chrome?.runtime?.id;
  }

  async checkAvailability() {
    if (this.session) {
      return { status: 'ready', message: '로컬 AI 준비 완료' };
    }

    if (this.useBridge) {
      try {
        const available = await postMessageAsync('checkAvailability', {}, 2000);
        if (available === 'readily') {
          return { status: 'ready', message: '로컬 AI 준비 완료' };
        }
        if (available === 'after-download') {
          return { status: 'downloading', message: '로컬 AI 모델 백그라운드 다운로드 중' };
        }
      } catch (e) {
        console.warn('Bridge check error:', e);
      }
    } else {
      const lm = (typeof window !== 'undefined') ? (window.ai?.languageModel || window.LanguageModel || (typeof LanguageModel !== 'undefined' ? LanguageModel : null)) : null;
      if (lm) {
        try {
          let avail = 'readily';
          if (typeof lm.availability === 'function') {
            const res = await lm.availability();
            avail = typeof res === 'string' ? res : (res?.available || 'readily');
          } else if (typeof lm.capabilities === 'function') {
            const caps = await lm.capabilities();
            avail = caps?.available || 'readily';
          }
          if (avail === 'readily') {
            return { status: 'ready', message: '로컬 AI 준비 완료' };
          }
          if (avail === 'after-download') {
            return { status: 'downloading', message: '로컬 AI 모델 백그라운드 다운로드 중' };
          }
        } catch (e) {
          console.warn('AI capabilities check error:', e);
        }
      }
    }
    if (this.customApiKey) {
      return { status: 'byok', message: '외부 API 키 모드로 실행 중' };
    }
    return {
      status: 'unavailable',
      message: 'Chrome Built-in AI가 비활성화되어 있습니다. chrome://flags에서 Prompt API를 활성화해 주세요.'
    };
  }

  async ensureSession() {
    if (this.session) return this.session;
    
    if (this.useBridge) {
      await postMessageAsync('createSession');
      this.session = {
        prompt: async (text) => {
          return await postMessageAsync('prompt', { prompt: text });
        }
      };
      return this.session;
    } else {
      const lm = (typeof window !== 'undefined') ? (window.ai?.languageModel || window.LanguageModel || (typeof LanguageModel !== 'undefined' ? LanguageModel : null)) : null;
      if (lm) {
        if (typeof lm.capabilities === 'function') {
          const capabilities = await lm.capabilities();
          if (capabilities.available === 'no') {
            throw new Error('Chrome Built-in AI is not supported on this device.');
          }
        } else if (typeof lm.availability === 'function') {
          const avail = await lm.availability();
          if (avail === 'no') {
            throw new Error('Chrome Built-in AI is not supported on this device.');
          }
        }
        this.session = await lm.create();
        return this.session;
      }
    }
    throw new Error('Chrome Prompt API is unavailable. Check chrome://flags.');
  }

  async generateArticleBrief({ title, firstParagraph, sourceLang = 'ja' }) {
    const session = await this.ensureSession();
    const prompt = buildBriefPrompt({ title, firstParagraph, sourceLang });
    const raw = await session.prompt(prompt);
    return raw.trim();
  }

  async translateSentenceWithContext({ sentence, words, brief, previousContext, sourceLang = 'ja', targetLangs = ['ko', 'en'] }) {
    const session = await this.ensureSession();
    const prompt = buildSentencePrompt({ sentence, words, brief, previousContext, sourceLang, targetLangs });
    const raw = await session.prompt(prompt);

    const cleaned = raw.replace(/^```json/m, '').replace(/```$/m, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { translation_ko: raw, translation_en: '', alignments: [] };
    }

    return {
      translationKo: parsed.translation_ko || '',
      translationEn: parsed.translation_en || '',
      alignments: (parsed.alignments || []).map(a => ({
        srcWord: a.src_word || '',
        targetKo: a.target_ko || '',
        targetEn: a.target_en || '',
        baseForm: a.base_form || a.src_word || '',
        reading: a.reading || '',
        pos: a.pos || '단어',
        nuance: a.nuance || ''
      }))
    };
  }
}
