import { buildBriefPrompt, buildSentencePrompt } from './prompt-templates.js';

export class AIClient {
  constructor({ mockSession = null, customApiKey = null } = {}) {
    this.session = mockSession;
    this.customApiKey = customApiKey;
  }

  async checkAvailability() {
    if (this.session) {
      return { status: 'ready', message: '로컬 AI 준비 완료' };
    }
    if (typeof window !== 'undefined' && window.ai?.languageModel) {
      try {
        const capabilities = await window.ai.languageModel.capabilities();
        if (capabilities.available === 'readily') {
          return { status: 'ready', message: '로컬 AI 준비 완료' };
        }
        if (capabilities.available === 'after-download') {
          return { status: 'downloading', message: '로컬 AI 모델 백그라운드 다운로드 중' };
        }
      } catch (e) {
        console.warn('AI capabilities check error:', e);
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
    if (typeof window !== 'undefined' && window.ai?.languageModel) {
      const capabilities = await window.ai.languageModel.capabilities();
      if (capabilities.available === 'no') {
        throw new Error('Chrome Built-in AI is not supported on this device.');
      }
      this.session = await window.ai.languageModel.create();
      return this.session;
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
