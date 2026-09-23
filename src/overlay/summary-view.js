import { exportToMarkdown, exportToCSV } from '../storage/exporters.js';

export function createSummaryElement(session, onBack, doc = document) {
  const container = doc.createElement('div');
  container.className = 'summary-container';
  container.style.cssText = `
    padding: 64px;
    max-width: 900px;
    margin: 0 auto;
    overflow-y: auto;
    height: 100vh;
    font-size: 14px;
    line-height: 1.6;
    background: #ffffff;
    box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", "Arial", sans-serif;
    color: #111111;
  `;

  container.innerHTML = `
    <header style="border-bottom: 2px solid #111111; padding-bottom: 24px; margin-bottom: 48px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <button class="btn" id="btn-back-reader" title="Back" style="display:inline-flex;align-items:center;justify-content:center;padding:8px;border:1px solid #ccc;background:#fff;border-radius:4px;cursor:pointer;">
          <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:#111;"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        </button>
        <div style="display: flex; gap: 12px;">
          <button class="btn" id="btn-copy-md" title="Copy Markdown" aria-label="[ Markdown 복사 ]" style="display:inline-flex;align-items:center;justify-content:center;padding:8px;border:1px solid #ccc;background:#fff;border-radius:4px;cursor:pointer;">
             <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:#111;"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
          </button>
          <button class="btn" id="btn-download-csv" title="Download CSV" aria-label="[ CSV 다운로드 ]" style="display:inline-flex;align-items:center;justify-content:center;padding:8px;border:none;background:#111;border-radius:4px;cursor:pointer;">
             <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:#fff;"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
          </button>
        </div>
      </div>
      <h1 style="font-size: 28px; font-weight: 800; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing:-0.02em;">${session.meta.title}</h1>
      <div style="font-size: 12px; font-weight: 700; color: #888888; text-transform: uppercase;">${session.meta.url}</div>
    </header>

    <section style="margin-bottom: 48px;">
      <h2 style="font-size: 16px; font-weight: 800; text-transform: uppercase; margin-bottom: 24px; border-bottom: 1px solid #e5e5e5; padding-bottom: 8px;">
        <svg viewBox="0 0 24 24" style="width:16px;height:16px;vertical-align:text-bottom;margin-right:8px;fill:#111;"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg>
        Contextual Sentences
      </h2>
      <div id="summary-sentences"></div>
    </section>

    <section style="margin-bottom: 48px;">
      <h2 style="font-size: 16px; font-weight: 800; text-transform: uppercase; margin-bottom: 24px; border-bottom: 1px solid #e5e5e5; padding-bottom: 8px;">
        <svg viewBox="0 0 24 24" style="width:16px;height:16px;vertical-align:text-bottom;margin-right:8px;fill:#111;"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>
        Vocabulary Index
      </h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
        <thead>
          <tr style="background: #111111; color: #ffffff; text-transform: uppercase; letter-spacing: 0.05em;">
            <th style="padding: 12px;">Word</th>
            <th style="padding: 12px;">Base</th>
            <th style="padding: 12px;">POS</th>
            <th style="padding: 12px;">KO</th>
            <th style="padding: 12px;">EN</th>
          </tr>
        </thead>
        <tbody id="summary-table-body"></tbody>
      </table>
    </section>
  `;

  const sentenceList = container.querySelector('#summary-sentences');
  (session.sentences || []).forEach(s => {
    const card = doc.createElement('div');
    card.style.cssText = 'background: #f5f5f5; border-left: 4px solid #111111; padding: 16px 24px; margin-bottom: 16px;';
    card.innerHTML = `
      <div style="font-weight: 700; margin-bottom: 8px; color: #111111;">${s.originalText}</div>
      <div style="color: #800020; font-weight: 600; margin-bottom: 4px;">${s.translationKo}</div>
      ${s.translationEn ? `<div style="color: #555555; font-size: 12px; text-transform: uppercase; letter-spacing: 0.02em;">${s.translationEn}</div>` : ''}
    `;
    sentenceList?.appendChild(card);
  });

  const tableBody = container.querySelector('#summary-table-body');
  (session.words || []).forEach(w => {
    const tr = doc.createElement('tr');
    tr.style.cssText = 'border-bottom: 1px solid #e5e5e5;';
    tr.innerHTML = `
      <td style="padding: 12px; font-weight: 800;">${w.surface}</td>
      <td style="padding: 12px; color: #555555;">${w.baseForm}</td>
      <td style="padding: 12px;"><span style="background:#e5e5e5;padding:2px 6px;border-radius:2px;font-size:10px;text-transform:uppercase;font-weight:700;">${w.pos}</span></td>
      <td style="padding: 12px; font-weight: 600;">${w.translationKo}</td>
      <td style="padding: 12px; color: #888888;">${w.translationEn}</td>
    `;
    tableBody?.appendChild(tr);
  });

  container.querySelector('#btn-back-reader')?.addEventListener('click', onBack);
  container.querySelector('#btn-copy-md')?.addEventListener('click', async () => {
    const md = exportToMarkdown(session);
    try {
      await navigator.clipboard?.writeText(md);
      const btn = container.querySelector('#btn-copy-md');
      if (btn) {
        const origHTML = btn.innerHTML;
        btn.innerHTML = `<svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:#800020;"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>`;
        setTimeout(() => { btn.innerHTML = origHTML; }, 1500);
      }
    } catch (e) {
      console.warn('Clipboard copy error:', e);
    }
  });
  container.querySelector('#btn-download-csv')?.addEventListener('click', () => {
    const csv = exportToCSV(session);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = doc.createElement('a');
    a.href = url;
    a.download = `study_note_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  return container;
}
