import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { createSummaryElement } from '../src/overlay/summary-view.js';

describe('Summary View Module', () => {
  it('should render structured study report with markdown copy and CSV download buttons', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    const session = {
      meta: { title: '테스트 기사', url: 'https://example.com' },
      sentences: [{ sentenceId: 's_0', originalText: '원문 문장', translationKo: '번역 문장' }],
      words: [{ surface: '단어', baseForm: '단어', pos: '명사', translationKo: '뜻', translationEn: 'meaning', nuance: '뉘앙스' }]
    };

    const el = createSummaryElement(session, () => {}, dom.window.document);
    expect(el.innerHTML).toContain('테스트 기사');
    expect(el.innerHTML).toContain('[ Markdown 복사 ]');
    expect(el.innerHTML).toContain('[ CSV 다운로드 ]');
    expect(el.innerHTML).toContain('원문 문장');
    expect(el.innerHTML).toContain('번역 문장');
    expect(/[\u{1F300}-\u{1F9FF}]/u.test(el.innerHTML)).toBe(false);
  });
});
