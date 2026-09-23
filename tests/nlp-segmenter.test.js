import { describe, it, expect } from 'vitest';
import { segmentIntoSentences, tokenizeSentence } from '../src/core/nlp-segmenter.js';

describe('NLP Segmenter Module', () => {
  it('should split Japanese text into sentences', () => {
    const text = '政府は検討する。決定は来週だ。';
    const sentences = segmentIntoSentences(text, 'ja');
    expect(sentences).toHaveLength(2);
    expect(sentences[0].sentenceId).toBe('s_0');
    expect(sentences[0].text).toBe('政府は検討하는。'.replace('하는', 'する'));
    expect(sentences[1].text).toBe('決定は来週だ。');
  });

  it('should tokenize a Japanese sentence into word tokens with IDs', () => {
    const sentence = '政府は検討する。';
    const tokens = tokenizeSentence(sentence, 's_0', 'ja');
    const wordTokens = tokens.filter(t => t.isWordLike);
    expect(wordTokens.length).toBeGreaterThan(1);
    expect(wordTokens[0].wordId).toBe('s_0_w_0');
    expect(wordTokens.some(t => t.surface === '検討')).toBe(true);
  });

  it('should handle empty or whitespace string without error', () => {
    expect(segmentIntoSentences('', 'ja')).toEqual([]);
    expect(tokenizeSentence('', 's_0', 'ja')).toEqual([]);
  });
});
