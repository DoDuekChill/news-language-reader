export function renderAlignedTranslationHTML(translationText, alignments, sentenceId) {
  if (!translationText || !alignments || alignments.length === 0) {
    return translationText || '';
  }

  let result = translationText;
  // Sort by target word length descending to prevent partial match collisions
  const sortedAlignments = [...alignments].sort((a, b) => (b.targetKo?.length || 0) - (a.targetKo?.length || 0));

  for (const align of sortedAlignments) {
    const target = align.targetKo?.trim();
    if (!target) continue;

    const targetIdx = result.indexOf(target);
    if (targetIdx !== -1) {
      const before = result.slice(0, targetIdx);
      const after = result.slice(targetIdx + target.length);
      result = `${before}<span class="trans-word-token" data-wid="${align.wordId}">${target}</span>${after}`;
    }
  }

  return result;
}
