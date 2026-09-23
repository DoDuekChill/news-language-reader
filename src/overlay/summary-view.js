import { exportToMarkdown, exportToCSV } from '../storage/exporters.js';

export function createSummaryElement(session, onBack, doc = document) {
  const container = doc.createElement('div');
  container.className = 'summary-container';
  container.style.cssText = `
    padding: 40px;
    max-width: 900px;
    margin: 0 auto;
    overflow-y: auto;
    height: 100vh;
    font-size: 15px;
    line-height: 1.7;
    background: #ffffff;
    box-sizing: border-box;
  `;

  container.innerHTML = `
    <header style="border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <button class="btn" id="btn-back-reader">[ 리더 뷰로 돌아가기 ]</button>
        <div style="display: flex; gap: 8px;">
          <button class="btn" id="btn-copy-md">[ Markdown 복사 ]</button>
          <button class="btn btn-primary" id="btn-download-csv">[ CSV 다운로드 ]</button>
        </div>
      </div>
      <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 8px 0;">${session.meta.title}</h1>
      <div style="font-size: 13px; color: #6b7280;">출처: ${session.meta.url}</div>
    </header>

    <section style="margin-bottom: 32px;">
      <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 16px; border-bottom: 1px solid #f3f4f6; padding-bottom: 8px;">
        1. 맥락 기반 학습 문장
      </h2>
      <div id="summary-sentences"></div>
    </section>

    <section style="margin-bottom: 32px;">
      <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 16px; border-bottom: 1px solid #f3f4f6; padding-bottom: 8px;">
        2. 수집 단어 전체 색인표
      </h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="background: #f9fafb; border-bottom: 1px solid #e5e7eb; text-align: left;">
            <th style="padding: 8px;">원문 단어</th>
            <th style="padding: 8px;">사전형</th>
            <th style="padding: 8px;">품사</th>
            <th style="padding: 8px;">한국어 뜻</th>
            <th style="padding: 8px;">영어 뜻</th>
          </tr>
        </thead>
        <tbody id="summary-table-body"></tbody>
      </table>
    </section>
  `;

  // Render Sentences
  const sentenceList = container.querySelector('#summary-sentences');
  (session.sentences || []).forEach(s => {
    const card = doc.createElement('div');
    card.style.cssText = 'background: #fbfbfb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px;';
    card.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 4px; color: #111827;">${s.originalText}</div>
      <div style="color: #2563eb; margin-bottom: 2px;">${s.translationKo}</div>
      ${s.translationEn ? `<div style="color: #6b7280; font-size: 13px;">${s.translationEn}</div>` : ''}
    `;
    sentenceList?.appendChild(card);
  });

  // Render Table
  const tableBody = container.querySelector('#summary-table-body');
  (session.words || []).forEach(w => {
    const tr = doc.createElement('tr');
    tr.style.cssText = 'border-bottom: 1px solid #f3f4f6;';
    tr.innerHTML = `
      <td style="padding: 8px; font-weight: 600;">${w.surface}</td>
      <td style="padding: 8px;">${w.baseForm}</td>
      <td style="padding: 8px;">${w.pos}</td>
      <td style="padding: 8px;">${w.translationKo}</td>
      <td style="padding: 8px; color: #6b7280;">${w.translationEn}</td>
    `;
    tableBody?.appendChild(tr);
  });

  // Action listeners
  container.querySelector('#btn-back-reader')?.addEventListener('click', onBack);
  container.querySelector('#btn-copy-md')?.addEventListener('click', () => {
    const md = exportToMarkdown(session);
    navigator.clipboard?.writeText(md);
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
