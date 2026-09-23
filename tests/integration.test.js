import { describe, it, expect } from 'vitest';
import { extractArticle } from '../src/content/parser.js';
import { segmentIntoSentences, tokenizeSentence } from '../src/core/nlp-segmenter.js';
import { renderAlignedTranslationHTML } from '../src/core/word-aligner.js';
import { exportToMarkdown, exportToCSV } from '../src/storage/exporters.js';
import { JSDOM } from 'jsdom';

describe('End-to-End Orchestration Pipeline', () => {
  it('should process article text into sentences, tokens, and aligned translations', () => {
    const html = `
      <!DOCTYPE html>
      <html lang="ja">
      <body>
        <main>
          <h1>政府の検討方針</h1>
          <p>政府は総合対策を検討する。</p>
        </main>
      </body>
      </html>
    `;
    const dom = new JSDOM(html);
    const article = extractArticle(dom.window.document, 'https://example.com');
    expect(article.paragraphs.length).toBe(1);

    const sentences = segmentIntoSentences(article.paragraphs[0], 'ja');
    expect(sentences.length).toBe(1);

    const tokens = tokenizeSentence(sentences[0].text, sentences[0].sentenceId, 'ja');
    expect(tokens.filter(t => t.isWordLike).length).toBeGreaterThan(0);

    const alignments = [
      {
        wordId: 's_0_w_1',
        srcWord: '検討',
        targetKo: '검토'
      }
    ];

    const alignedHtml = renderAlignedTranslationHTML('정부는 종합 대책을 검토한다.', alignments, 's_0');
    expect(alignedHtml).toContain('data-wid="s_0_w_1"');
    expect(alignedHtml).toContain('검토');

    // Test export format integrity
    const session = {
      sessionId: 'session_test',
      meta: { title: article.title, url: 'https://example.com', sourceLang: 'ja', targetLangs: ['ko', 'en'] },
      sentences: [{ sentenceId: 's_0', originalText: sentences[0].text, translationKo: '정부는 종합 대책을 검토한다.' }],
      words: [{ surface: '検討', baseForm: '検討する', pos: '명사/동사', translationKo: '검토', translationEn: 'review', nuance: '격식 표현' }]
    };

    const md = exportToMarkdown(session);
    expect(md).toContain('政府の検討方針');
    expect(md).toContain('検討する');
    expect(/[\u{1F300}-\u{1F9FF}]/u.test(md)).toBe(false);

    const csv = exportToCSV(session);
    expect(csv).toContain('"検討","検討する"');
  });
});
