import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { extractArticle } from '../src/content/parser.js';

describe('Article Parser Module', () => {
  it('should extract title and paragraphs from sample HTML document', () => {
    const html = `
      <!DOCTYPE html>
      <html lang="ja">
      <head><title>NHK News Test</title></head>
      <body>
        <header><nav><a href="/">Home</a></nav></header>
        <main>
          <h1>政府の新しい経済対策</h1>
          <div class="byline">記者: 山田太郎</div>
          <article>
            <p>政府は本日の閣僚会議において、新たな総合経済対策を取りまとめた。</p>
            <p>物価高への対応を最優先課題として位置づけ、電気・ガス料金の補助を継続する方針だ。</p>
          </article>
        </main>
        <footer><p>Copyright 2026</p></footer>
      </body>
      </html>
    `;
    const dom = new JSDOM(html, { url: 'https://www3.nhk.or.jp/news/test.html' });
    const result = extractArticle(dom.window.document, 'https://www3.nhk.or.jp/news/test.html');

    expect(result.title).toContain('政府の新しい経済対策');
    expect(result.lang).toBe('ja');
    expect(result.paragraphs.length).toBeGreaterThanOrEqual(1);
    expect(result.paragraphs[0]).toContain('新たな総合経済対策');
  });

  it('should handle pages with minimal text gracefully without throwing', () => {
    const dom = new JSDOM('<html><body><div>Short</div></body></html>', { url: 'https://example.com' });
    const result = extractArticle(dom.window.document, 'https://example.com');
    expect(result.title).toBeDefined();
    expect(Array.isArray(result.paragraphs)).toBe(true);
  });
});
