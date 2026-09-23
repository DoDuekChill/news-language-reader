export function createPopoverElement(wordData, onSaveToggle, doc = document) {
  const popover = doc.createElement('div');
  popover.className = 'lexical-popover';
  popover.style.cssText = `
    position: absolute;
    width: 320px;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);
    padding: 16px;
    font-size: 13px;
    line-height: 1.5;
    color: #1f2937;
    z-index: 1000;
  `;

  popover.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #f3f4f6; padding-bottom: 8px; margin-bottom: 10px;">
      <div>
        <span style="font-size: 18px; font-weight: 700; color: #111827;">${wordData.surface}</span>
        ${wordData.reading ? `<span style="font-size: 12px; color: #6b7280; margin-left: 6px;">[${wordData.reading}]</span>` : ''}
      </div>
      <span style="font-size: 11px; padding: 2px 6px; background: #e5e7eb; border-radius: 4px;">${wordData.pos}</span>
    </div>
    <div style="margin-bottom: 8px;">
      <span style="color: #6b7280; font-size: 11px;">사전형(원형):</span>
      <span style="font-weight: 600; margin-left: 4px;">${wordData.baseForm}</span>
    </div>
    <div style="margin-bottom: 6px;">
      <span style="color: #6b7280; font-size: 11px;">해석(한국어):</span>
      <span style="font-weight: 500; margin-left: 4px;">${wordData.translationKo}</span>
    </div>
    <div style="margin-bottom: 10px;">
      <span style="color: #6b7280; font-size: 11px;">해석(영어):</span>
      <span style="color: #374151; margin-left: 4px;">${wordData.translationEn}</span>
    </div>
    <div style="background: #f9fafb; border-left: 3px solid #3b82f6; padding: 8px; font-size: 12px; color: #4b5563; margin-bottom: 12px;">
      <div style="font-weight: 600; margin-bottom: 2px; color: #1f2937;">원어민 뉘앙스 및 용법</div>
      ${wordData.nuance || '일반적인 문맥에서 사용되는 표준 표현입니다.'}
    </div>
    <button class="btn btn-save" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px; background: ${wordData.isSaved ? '#10b981' : '#ffffff'}; color: ${wordData.isSaved ? '#ffffff' : '#374151'}; font-weight: 600; cursor: pointer;">
      ${wordData.isSaved ? '[ 저장됨 ]' : '[ 단어장에 추가 ]'}
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
  const left = Math.max(16, Math.min(window.innerWidth - 340, rect.left + window.scrollX));

  popover.style.top = `${top}px`;
  popover.style.left = `${left}px`;
}
