import { Readability } from '@mozilla/readability';

export function extractArticle(doc, fallbackUrl = typeof window !== 'undefined' ? window.location?.href : '') {
  const docClone = doc.cloneNode(true);
  const lang = doc.documentElement?.lang?.split('-')[0] || 'ja';
  const h1Title = doc.querySelector('h1')?.textContent?.trim();

  try {
    const reader = new Readability(docClone, {
      charThreshold: 20
    });
    const parsed = reader.parse();

    if (parsed && parsed.textContent && parsed.textContent.trim().length > 30) {
      // Parse paragraphs from parsed HTML content
      const tempDiv = doc.createElement('div');
      tempDiv.innerHTML = parsed.content;
      const pElements = Array.from(tempDiv.querySelectorAll('p'))
        .map(p => p.textContent.trim())
        .filter(text => text.length > 0);

      const paragraphs = pElements.length > 0
        ? pElements
        : parsed.textContent.split('\n').map(t => t.trim()).filter(Boolean);

      return {
        title: h1Title || parsed.title || doc.title || 'Untitled Article',
        byline: parsed.byline || '',
        lang: lang,
        paragraphs: paragraphs,
        url: fallbackUrl
      };
    }
  } catch (error) {
    console.warn('Readability parsing error:', error);
  }

  // Fallback: extract visible text from main/article or body
  const mainElem = doc.querySelector('main, article, [role="main"]') || doc.body;
  const rawParagraphs = Array.from(mainElem?.querySelectorAll('p') || [])
    .map(p => p.textContent.trim())
    .filter(t => t.length > 0);

  return {
    title: h1Title || doc.title || 'Untitled Article',
    byline: '',
    lang: lang,
    paragraphs: rawParagraphs,
    url: fallbackUrl
  };
}
