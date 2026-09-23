export function exportToMarkdown(session) {
  const { meta, sentences = [], words = [] } = session;
  const wordMapBySentence = words.reduce((acc, w) => {
    acc[w.contextSentenceId] = acc[w.contextSentenceId] || [];
    acc[w.contextSentenceId].push(w);
    return acc;
  }, {});

  let md = `# ${meta.title || 'Untitled Study Note'}\n\n`;
  md += `- 출처: ${meta.url || ''}\n`;
  md += `- 학습일시: ${meta.createdAt || ''}\n`;
  md += `- 언어: ${meta.sourceLang} -> ${meta.targetLangs?.join(', ')}\n\n`;

  md += `## 1. 맥락 기반 학습 문장\n\n`;
  sentences.forEach((s, idx) => {
    md += `### 문장 ${idx + 1}\n\n`;
    md += `- 원문: ${s.originalText}\n`;
    md += `- 번역(한국어): ${s.translationKo}\n`;
    if (s.translationEn) {
      md += `- 번역(영어): ${s.translationEn}\n`;
    }
    md += `\n`;

    const attachedWords = wordMapBySentence[s.sentenceId] || [];
    if (attachedWords.length > 0) {
      md += `**학습 어휘 상세:**\n\n`;
      attachedWords.forEach(w => {
        md += `- **${w.surface}** (${w.reading || ''})\n`;
        md += `  - 기본형/품사: ${w.baseForm} / ${w.pos}\n`;
        md += `  - 해석: ${w.translationKo} (영어: ${w.translationEn})\n`;
        md += `  - 원어민 뉘앙스 및 용법: ${w.nuance}\n`;
      });
      md += `\n`;
    }
  });

  md += `## 2. 수집 단어 전체 색인표\n\n`;
  md += `| 원문 단어 | 사전 원형 | 발음 | 품사 | 한국어 뜻 | 영어 뜻 |\n`;
  md += `|---|---|---|---|---|---|\n`;
  words.forEach(w => {
    md += `| ${w.surface} | ${w.baseForm} | ${w.reading || '-'} | ${w.pos} | ${w.translationKo} | ${w.translationEn} |\n`;
  });

  return md;
}

export function exportToCSV(session) {
  const { words = [], sentences = [] } = session;
  const sentenceMap = sentences.reduce((acc, s) => {
    acc[s.sentenceId] = s.originalText;
    return acc;
  }, {});

  const headers = ['원문단어', '기본형', '발음', '품사', '한국어뜻', '영어뜻', '뉘앙스', '출처문장'];
  const rows = words.map(w => {
    const clean = val => `"${(val || '').replace(/"/g, '""')}"`;
    return [
      clean(w.surface),
      clean(w.baseForm),
      clean(w.reading),
      clean(w.pos),
      clean(w.translationKo),
      clean(w.translationEn),
      clean(w.nuance),
      clean(sentenceMap[w.contextSentenceId] || '')
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
