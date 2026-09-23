import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { createPopoverElement, positionPopover } from '../src/overlay/popover.js';

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

  it('should position popover relative to viewport without window.scrollY offset', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    global.window = dom.window;
    window.scrollY = 800; // Simulated webpage scroll
    window.innerHeight = 900;
    window.innerWidth = 1200;

    const popover = dom.window.document.createElement('div');
    const targetEl = dom.window.document.createElement('span');
    targetEl.getBoundingClientRect = () => ({
      top: 200,
      bottom: 220,
      left: 150,
      right: 200,
      width: 50,
      height: 20
    });

    positionPopover(popover, targetEl);
    // Should be bottom (220) + 8 = 228px, NOT 228 + 800 = 1028px
    expect(popover.style.top).toBe('228px');
    expect(popover.style.left).toBe('150px');
  });
});
