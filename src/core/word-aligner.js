export function renderAlignedTranslationHTML(translationText, alignments, sentenceId) {
  if (!translationText || !alignments || alignments.length === 0) {
    return translationText || '';
  }

  let result = translationText;
  // Sort by target word length descending to prevent partial match collisions
  const sortedAlignments = [...alignments].sort((a, b) => (b.targetKo?.length || 0) - (a.targetKo?.length || 0));

  for (const align of sortedAlignments) {
    const rawTarget = align.targetKo?.trim();
    if (!rawTarget) continue;

    // 1. Exact match attempt
    let targetIdx = result.indexOf(rawTarget);
    let matchedStr = rawTarget;

    // 2. Fuzzy / Stem match attempt if exact match fails
    if (targetIdx === -1 && rawTarget.length >= 2) {
      // Try progressive stem prefixes (e.g. "검토하다" -> "검토하" -> "검토")
      for (let len = rawTarget.length - 1; len >= 2; len--) {
        const stem = rawTarget.slice(0, len);
        const idx = result.indexOf(stem);
        if (idx !== -1) {
          targetIdx = idx;
          matchedStr = stem;
          break;
        }
      }
    }

    if (targetIdx !== -1) {
      const before = result.slice(0, targetIdx);
      const after = result.slice(targetIdx + matchedStr.length);
      result = `${before}<span class="trans-word-token" data-wid="${align.wordId}">${matchedStr}</span>${after}`;
    }
  }

  return result;
}
