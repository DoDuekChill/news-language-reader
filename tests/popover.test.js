import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { createPopoverElement } from '../src/overlay/popover.js';

describe('Popover Module', () => {
  it('should render popover with baseForm, readings, nuances, and no emoticons', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    const wordData = {
      surface: '検討',
      reading: 'けんとう',
      baseForm: '検討する',
      pos: '명사/동사',
      translationKo: '검토',
      translationEn: 'consideration, review',
      nuance: '공적 회의에서 신중히 따져볼 때 쓰는 격식 표현',
      isSaved: false
    };

    const popover = createPopoverElement(wordData, () => {}, dom.window.document);
    expect(popover.innerHTML).toContain('検討');
    expect(popover.innerHTML).toContain('けんとう');
    expect(popover.innerHTML).toContain('検討する');
    expect(popover.innerHTML).toContain('공적 회의에서 신중히');
    expect(popover.innerHTML).toContain('[ 단어장에 추가 ]');
    expect(/[\u{1F300}-\u{1F9FF}]/u.test(popover.innerHTML)).toBe(false);
  });
});
