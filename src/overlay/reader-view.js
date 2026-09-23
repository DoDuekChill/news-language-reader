export function renderReaderOverlay({ shadowRoot, article, onFinish, onClose }) {
  const container = document.createElement('div');
  container.className = 'reader-container';

  container.innerHTML = `
    <header class="top-bar">
      <div style="display: flex; align-items: center; gap: 24px;">
        <button class="btn btn-close" id="btn-close" title="Close">
          <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
        <span class="title-badge">${article?.title || 'READER'}</span>
      </div>
      <div class="top-actions">
        <div class="icon-badge" title="Collected Words/Sentences">
          <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          <span id="badge-count">0 / 0</span>
        </div>
        <button class="btn btn-primary" id="btn-finish" title="Finish">
          <svg viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
        </button>
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
