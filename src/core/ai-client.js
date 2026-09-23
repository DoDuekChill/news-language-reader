import { buildBriefPrompt, buildSentencePrompt } from './prompt-templates.js';
import { coerceModelText, openLanguageSession, queryAvailability } from './on-device-model.js';

function extensionRequest(op, extra = {}, timeout = 20000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for extension AI on action: ${op}`));
    }, timeout);

    Promise.resolve(chrome.runtime.sendMessage({ action: 'ai', op, ...extra }))
      .then((response) => {
        clearTimeout(timer);
        if (!response) {
          reject(new Error('Extension AI did not respond'));
          return;
        }
        if (!response.ok) reject(new Error(response.error || 'Extension AI request failed'));
        else resolve(response.result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      });
  });
}

function getLocalLanguageModel() {
  if (typeof window === 'undefined') return null;
  return window.ai?.languageModel
    || window.LanguageModel
    || (typeof LanguageModel !== 'undefined' ? LanguageModel : null);
}

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

function statusFromAvailability(available) {
  if (available === 'readily') {
    return { status: 'ready', message: '로컬 AI 준비 완료' };
  }
  if (available === 'after-download') {
    return { status: 'downloading', message: '로컬 AI 모델 백그라운드 다운로드 중' };
  }
  return null;
}

export class AIClient {
  constructor({ mockSession = null, customApiKey = null } = {}) {
    this.session = mockSession;
    this.customApiKey = customApiKey;
    this.useExtension = typeof chrome !== 'undefined' && !!chrome.runtime?.id && typeof chrome.runtime?.sendMessage === 'function';
    this.useBridge = this.useExtension && typeof window !== 'undefined';
  }

  async checkAvailability() {
    if (this.session) {
      return { status: 'ready', message: '로컬 AI 준비 완료' };
    }

    if (this.useExtension) {
      try {
        const available = await extensionRequest('check', {}, 10000);
        const status = statusFromAvailability(available);
        if (status) return status;
      } catch (e) {
        console.warn('Extension AI check error:', e);
      }
    }

    const localModel = getLocalLanguageModel();
    if (localModel) {
      const status = statusFromAvailability(await queryAvailability(localModel));
      if (status) return status;
    }

    if (this.useBridge) {
      try {
        const available = await postMessageAsync('checkAvailability', {}, 5000);
        const status = statusFromAvailability(available);
        if (status) return status;
      } catch (e) {
        console.warn('Bridge check error:', e);
      }
    }

    if (this.customApiKey) {
      return { status: 'byok', message: '외부 API 키 모드로 실행 중' };
    }
    return {
      status: 'unavailable',
      message: 'Chrome Built-in AI가 비활성화되어 있습니다. chrome://flags에서 Prompt API for Gemini Nano를 활성화한 뒤 chrome://on-device-internals에서 모델 상태를 확인하세요.'
    };
  }

  async ensureSession() {
    if (this.session) return this.session;

    if (this.useExtension) {
      try {
        const available = await extensionRequest('check', {}, 10000);
        if (available === 'readily' || available === 'after-download') {
          this.session = {
            prompt: async (text) => extensionRequest('prompt', { prompt: text }, 180000)
          };
          return this.session;
        }
      } catch (e) {
        console.warn('Extension AI session error:', e);
      }
    }

    const localModel = getLocalLanguageModel();
    if (localModel) {
      const available = await queryAvailability(localModel);
      if (available === 'no') {
        throw new Error('Chrome Built-in AI is not supported on this device.');
      }
      this.session = await openLanguageSession(localModel);
      const session = this.session;
      const rawPrompt = session.prompt.bind(session);
      session.prompt = async (text) => coerceModelText(await rawPrompt(text));
      return session;
    }

    if (this.useBridge) {
      await postMessageAsync('createSession', {}, 180000);
      this.session = {
        prompt: async (text) => coerceModelText(await postMessageAsync('prompt', { prompt: text }, 180000))
      };
      return this.session;
    }

    throw new Error('Chrome Prompt API is unavailable. Check chrome://flags and chrome://on-device-internals.');
  }

  async generateArticleBrief({ title, firstParagraph, sourceLang = 'ja' }) {
    const session = await this.ensureSession();
    const prompt = buildBriefPrompt({ title, firstParagraph, sourceLang });
    const raw = await coerceModelText(await session.prompt(prompt));
    return raw.trim();
  }

  async translateSentenceWithContext({ sentence, words, brief, previousContext, sourceLang = 'ja', targetLangs = ['ko', 'en'] }) {
    const session = await this.ensureSession();
    const prompt = buildSentencePrompt({ sentence, words, brief, previousContext, sourceLang, targetLangs });
    const raw = await coerceModelText(await session.prompt(prompt));

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
