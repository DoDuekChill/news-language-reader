import { describe, it, expect } from 'vitest';
import { renderAlignedTranslationHTML } from '../src/core/word-aligner.js';

describe('Word Aligner Module', () => {
  it('should wrap matched translation target words in span tags with data-wid', () => {
    const translation = '정부는 이번 정책을 검토할 방침이다.';
    const alignments = [
      {
        wordId: 's_0_w_1',
        srcWord: '検討',
        targetKo: '검토'
      }
    ];

    const html = renderAlignedTranslationHTML(translation, alignments, 's_0');
    expect(html).toContain('<span class="trans-word-token" data-wid="s_0_w_1">검토</span>');
    expect(html).toContain('정부는 이번 정책을');
  });

  it('should handle target words not found in translation without mangling text', () => {
    const translation = '정부는 논의를 계속한다.';
    const alignments = [
      {
        wordId: 's_0_w_1',
        srcWord: '検討',
        targetKo: '검토'
      }
    ];

    const html = renderAlignedTranslationHTML(translation, alignments, 's_0');
    expect(html).toBe('정부는 논의를 계속한다.');
  });

  it('should use fuzzy matching when target word has slight inflection difference in translation', () => {
    const translation = '정부는 신중하게 검토했다.';
    const alignments = [
      {
        wordId: 's_0_w_1',
        srcWord: '検討',
        targetKo: '검토하다'
      }
    ];

    const html = renderAlignedTranslationHTML(translation, alignments, 's_0');
    expect(html).toContain('<span class="trans-word-token" data-wid="s_0_w_1">검토</span>');
  });
});
