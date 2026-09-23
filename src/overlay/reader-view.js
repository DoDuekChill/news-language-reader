export function renderReaderOverlay({ shadowRoot, article, onFinish, onClose }) {
  const container = document.createElement('div');
  container.className = 'reader-container';

  container.innerHTML = `
    <header class="top-bar">
      <div style="display: flex; align-items: center; gap: 16px;">
        <button class="btn btn-close" id="btn-close">[ 닫기 (ESC) ]</button>
        <span class="title-badge">${article?.title || '기사 리더'}</span>
      </div>
      <div class="top-actions">
        <span id="badge-count" style="font-size: 13px; color: #4b5563;">수집: 단어 0개 / 문장 0개</span>
        <button class="btn btn-primary" id="btn-finish">[ 학습 종료 ]</button>
      </div>
    </header>
    <main class="split-body">
      <div class="column column-left" id="col-left"></div>
      <div class="column column-right" id="col-right"></div>
    </main>
  `;

  shadowRoot.appendChild(container);

  container.querySelector('#btn-close').addEventListener('click', onClose);
  container.querySelector('#btn-finish').addEventListener('click', onFinish);

  return {
    container,
    colLeft: container.querySelector('#col-left'),
    colRight: container.querySelector('#col-right'),
    badgeCount: container.querySelector('#badge-count')
  };
}
