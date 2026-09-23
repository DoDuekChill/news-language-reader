export function segmentIntoSentences(text, lang = 'ja') {
  if (!text || typeof text !== 'string') return [];
  const segmenter = new Intl.Segmenter(lang, { granularity: 'sentence' });
  const segments = Array.from(segmenter.segment(text));

  return segments
    .map((seg, idx) => ({
      sentenceId: `s_${idx}`,
      text: seg.segment.trim(),
      startIndex: seg.index,
      endIndex: seg.index + seg.segment.length
    }))
    .filter(s => s.text.length > 0);
}

export function tokenizeSentence(sentenceText, sentenceId, lang = 'ja') {
  if (!sentenceText) return [];
  const segmenter = new Intl.Segmenter(lang, { granularity: 'word' });
  const segments = Array.from(segmenter.segment(sentenceText));

  let wordIndex = 0;
  return segments.map((seg) => {
    const isWord = seg.isWordLike;
    const token = {
      wordId: `${sentenceId}_w_${wordIndex}`,
      surface: seg.segment,
      isWordLike: Boolean(isWord),
      startIndex: seg.index,
      endIndex: seg.index + seg.segment.length
    };
    if (isWord) {
      wordIndex += 1;
    }
    return token;
  });
}
