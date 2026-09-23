export function createPopoverElement(wordData, onSaveToggle, doc = document) {
  const popover = doc.createElement('div');
  popover.className = 'lexical-popover';
  popover.style.cssText = `
    position: absolute;
    width: 280px;
    background: #ffffff;
    border: 2px solid #111111;
    border-radius: 0;
    box-shadow: 4px 4px 0 #111111;
    padding: 16px;
    font-size: 12px;
    line-height: 1.4;
    color: #111111;
    z-index: 1000;
    font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", "Arial", sans-serif;
  `;

  const btnColor = wordData.isSaved ? '#800020' : '#111111';
  const btnIcon = wordData.isSaved
    ? '<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:#fff"><path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>'
    : '<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:#fff"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>';

  popover.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #e5e5e5; padding-bottom: 8px; margin-bottom: 12px;">
      <div>
        <span style="font-size: 18px; font-weight: 800; text-transform: uppercase;">${wordData.surface}</span>
        ${wordData.reading ? `<span style="font-size: 11px; color: #888888; margin-left: 4px;">[${wordData.reading}]</span>` : ''}
      </div>
      <span style="font-size: 10px; font-weight: 700; padding: 2px 4px; background: #111111; color: #ffffff; text-transform: uppercase;">${wordData.pos}</span>
    </div>
    <div style="display: grid; grid-template-columns: 40px 1fr; gap: 8px; margin-bottom: 12px;">
      <div style="color: #888888; font-weight: 700; text-transform: uppercase;">ORG</div>
      <div style="font-weight: 600;">${wordData.baseForm}</div>
      <div style="color: #888888; font-weight: 700; text-transform: uppercase;">KO</div>
      <div style="font-weight: 600;">${wordData.translationKo}</div>
      <div style="color: #888888; font-weight: 700; text-transform: uppercase;">EN</div>
      <div style="color: #555555;">${wordData.translationEn}</div>
    </div>
    <div style="background: #f5f5f5; border-left: 3px solid #800020; padding: 8px; font-size: 11px; color: #555555; margin-bottom: 16px;">
      <div style="font-weight: 800; margin-bottom: 4px; color: #111111; text-transform: uppercase;">Context</div>
      ${wordData.nuance || 'Standard usage.'}
    </div>
    <button class="btn-save" aria-label="${wordData.isSaved ? '[ 저장됨 ]' : '[ 단어장에 추가 ]'}" style="display: flex; align-items: center; justify-content: center; width: 100%; padding: 8px; border: none; background: ${btnColor}; color: #ffffff; font-weight: 700; cursor: pointer; transition: background 0.2s;">
      ${btnIcon}
    </button>
  `;

  popover.querySelector('.btn-save').addEventListener('click', (e) => {
    e.stopPropagation();
    onSaveToggle();
  });

  return popover;
}

export function positionPopover(popover, targetEl) {
  const rect = targetEl.getBoundingClientRect();
  const top = rect.bottom + window.scrollY + 8;
  const left = Math.max(16, Math.min(window.innerWidth - 300, rect.left + window.scrollX));

  popover.style.top = `${top}px`;
  popover.style.left = `${left}px`;
}
