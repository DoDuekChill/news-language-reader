import { extractArticle } from './parser.js';
import { createShadowHost } from './shadow-host.js';
import { renderReaderOverlay } from '../overlay/reader-view.js';
import { createSummaryElement } from '../overlay/summary-view.js';
import { segmentIntoSentences, tokenizeSentence } from '../core/nlp-segmenter.js';
import { AIClient } from '../core/ai-client.js';
import { renderAlignedTranslationHTML } from '../core/word-aligner.js';
import { createPopoverElement, positionPopover } from '../overlay/popover.js';
import { StorageManager } from '../storage/storage-manager.js';

let isMounted = false;
let currentHost = null;

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'toggle-reader') {
      if (isMounted) {
        currentHost?.unmount();
        isMounted = false;
      } else {
        startReader();
      }
    }
  });
}

const READER_STYLES = `
  :host {
    all: initial;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #1a1a1a;
    background-color: #f8f9fa;
    box-sizing: border-box;
  }
  *, *::before, *::after { box-sizing: inherit; }
  .reader-container { display: flex; flex-direction: column; width: 100vw; height: 100vh; background: #ffffff; }
  .top-bar { display: flex; justify-content: space-between; align-items: center; padding: 12px 24px; border-bottom: 1px solid #e5e7eb; background: #fafafa; }
  .title-badge { font-size: 15px; font-weight: 600; max-width: 500px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .top-actions { display: flex; gap: 12px; align-items: center; }
  .btn { padding: 6px 14px; border: 1px solid #d1d5db; border-radius: 6px; background: #ffffff; font-size: 13px; font-weight: 500; cursor: pointer; }
  .btn-primary { background: #2563eb; color: #ffffff; border-color: #2563eb; }
  .btn-primary:hover { background: #1d4ed8; }
  .split-body { display: flex; flex: 1; overflow: hidden; }
  .column { flex: 1; overflow-y: auto; padding: 32px 48px; line-height: 1.8; font-size: 17px; }
  .column-left { border-right: 1px solid #e5e7eb; }
  .column-right { background: #fbfbfb; }
  .sentence-block { margin-bottom: 24px; padding: 8px 12px; border-radius: 6px; transition: background 0.15s ease; }
  .sentence-block:hover { background: #f1f5f9; }
  .word-token { cursor: pointer; border-radius: 3px; padding: 1px 2px; transition: background 0.15s ease; }
  .word-token:hover, .word-token.highlight-synced { background-color: #fef08a; }
  .trans-word-token { cursor: pointer; border-radius: 3px; padding: 1px 2px; font-weight: 600; }
  .trans-word-token:hover, .trans-word-token.highlight-synced { background-color: #fef08a; }
  .sub-en-text { display: block; font-size: 13px; color: #6b7280; margin-top: 4px; }
`;

export async function startReader() {
  const article = extractArticle(document);
  if (!article || article.paragraphs.length === 0) {
    alert('기사 본문을 감지하지 못했습니다.');
    return;
  }

  isMounted = true;
  currentHost = createShadowHost();
  const { shadowRoot, unmount } = currentHost;

  // Inject stylesheet inside Shadow DOM
  const styleEl = document.createElement('style');
  styleEl.textContent = READER_STYLES;
  shadowRoot.appendChild(styleEl);

  const session = {
    sessionId: `session_${Date.now()}`,
    meta: {
      title: article.title,
      url: article.url,
      sourceLang: article.lang,
      targetLangs: ['ko', 'en'],
      createdAt: new Date().toISOString()
    },
    sentences: [],
    words: []
  };

  const aiClient = new AIClient();

  const handleFinish = async () => {
    await StorageManager.saveSession(session);
    shadowRoot.innerHTML = '';
    shadowRoot.appendChild(styleEl);
    const summaryEl = createSummaryElement(session, () => {
      shadowRoot.innerHTML = '';
      shadowRoot.appendChild(styleEl);
      setupReader();
    });
    shadowRoot.appendChild(summaryEl);
  };

  const handleClose = () => {
    unmount();
    isMounted = false;
  };

  // Keyboard shortcut: ESC to close
  const keyHandler = (e) => {
    if (e.key === 'Escape') {
      handleClose();
      document.removeEventListener('keydown', keyHandler);
    }
  };
  document.addEventListener('keydown', keyHandler);

  function setupReader() {
    const ui = renderReaderOverlay({
      shadowRoot,
      article,
      onFinish: handleFinish,
      onClose: handleClose
    });

    const activeAlignmentsMap = new Map();

    // Populate Left & Right columns
    article.paragraphs.forEach((pText) => {
      const sentences = segmentIntoSentences(pText, article.lang);
      sentences.forEach((s) => {
        const sBlock = document.createElement('div');
        sBlock.className = 'sentence-block';
        sBlock.id = `left-${s.sentenceId}`;

        const tokens = tokenizeSentence(s.text, s.sentenceId, article.lang);
        tokens.forEach(tok => {
          if (tok.isWordLike) {
            const span = document.createElement('span');
            span.className = 'word-token';
            span.dataset.wid = tok.wordId;
            span.textContent = tok.surface;

            // Hover sync
            span.addEventListener('mouseenter', () => {
              span.classList.add('highlight-synced');
              const target = shadowRoot.querySelector(`.trans-word-token[data-wid="${tok.wordId}"]`);
              target?.classList.add('highlight-synced');
            });
            span.addEventListener('mouseleave', () => {
              span.classList.remove('highlight-synced');
              const target = shadowRoot.querySelector(`.trans-word-token[data-wid="${tok.wordId}"]`);
              target?.classList.remove('highlight-synced');
            });

            span.addEventListener('click', () => {
              showLexicalPopover(span, tok, s.sentenceId);
            });

            sBlock.appendChild(span);
          } else {
            sBlock.appendChild(document.createTextNode(tok.surface));
          }
        });

        ui.colLeft.appendChild(sBlock);

        // Right side placeholder
        const rightBlock = document.createElement('div');
        rightBlock.className = 'sentence-block';
        rightBlock.id = `right-${s.sentenceId}`;
        rightBlock.textContent = '번역 분석 대기 중...';
        ui.colRight.appendChild(rightBlock);
      });
    });

    // Sentence Drag Scraping
    ui.colLeft.addEventListener('mouseup', () => {
      const selection = window.getSelection();
      const selectedText = selection?.toString()?.trim();
      if (selectedText && selectedText.length > 5) {
        if (!session.sentences.some(s => s.originalText.includes(selectedText))) {
          session.sentences.push({
            sentenceId: `scrap_${Date.now()}`,
            originalText: selectedText,
            translationKo: '사용자 스크랩 문장',
            translationEn: ''
          });
          ui.badgeCount.textContent = `수집: 단어 ${session.words.length}개 / 문장 ${session.sentences.length}개`;
        }
      }
    });

    // Start background translation queue
    processQueue(article, ui, activeAlignmentsMap);
  }

  setupReader();

  function showLexicalPopover(targetSpan, token, sentenceId) {
    const existing = session.words.find(w => w.surface === token.surface);
    const wordData = existing || {
      surface: token.surface,
      reading: '',
      baseForm: token.surface,
      pos: '단어',
      translationKo: '단어 분석',
      translationEn: 'word',
      nuance: '원어민 뉘앙스 분석',
      isSaved: false
    };

    const popover = createPopoverElement(wordData, () => {
      wordData.isSaved = !wordData.isSaved;
      if (wordData.isSaved) {
        session.words.push({ ...wordData, contextSentenceId: sentenceId });
      } else {
        session.words = session.words.filter(w => w.surface !== wordData.surface);
      }
      ui.badgeCount.textContent = `수집: 단어 ${session.words.length}개 / 문장 ${session.sentences.length}개`;
    });

    shadowRoot.appendChild(popover);
    positionPopover(popover, targetSpan);

    const closeHandler = (e) => {
      if (!popover.contains(e.target) && e.target !== targetSpan) {
        popover.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 10);
  }

  async function processQueue(article, ui, alignmentsMap) {
    let brief = '';
    try {
      brief = await aiClient.generateArticleBrief({
        title: article.title,
        firstParagraph: article.paragraphs[0] || '',
        sourceLang: article.lang
      });
    } catch (e) {
      console.warn('AI brief generation fallback:', e);
    }

    let prevContext = '';
    const allSentences = article.paragraphs.flatMap(p => segmentIntoSentences(p, article.lang));

    for (const s of allSentences) {
      const tokens = tokenizeSentence(s.text, s.sentenceId, article.lang).filter(t => t.isWordLike);
      try {
        const res = await aiClient.translateSentenceWithContext({
          sentence: s.text,
          words: tokens.map(t => t.surface),
          brief,
          previousContext: prevContext,
          sourceLang: article.lang,
          targetLangs: ['ko', 'en']
        });

        const alignmentsWithIds = (res.alignments || []).map((align) => {
          const matchingToken = tokens.find(t => t.surface === align.srcWord) || tokens[0];
          return {
            ...align,
            wordId: matchingToken ? matchingToken.wordId : `${s.sentenceId}_w_0`
          };
        });

        alignmentsWithIds.forEach(a => alignmentsMap.set(a.wordId, a));

        const rightBlock = ui.colRight.querySelector(`#right-${s.sentenceId}`);
        if (rightBlock) {
          rightBlock.innerHTML = `
            <div>${renderAlignedTranslationHTML(res.translationKo, alignmentsWithIds, s.sentenceId)}</div>
            ${res.translationEn ? `<span class="sub-en-text">${res.translationEn}</span>` : ''}
          `;

          // Add hover listener on right side tokens
          rightBlock.querySelectorAll('.trans-word-token').forEach(span => {
            const wid = span.dataset.wid;
            span.addEventListener('mouseenter', () => {
              span.classList.add('highlight-synced');
              const leftToken = shadowRoot.querySelector(`.word-token[data-wid="${wid}"]`);
              leftToken?.classList.add('highlight-synced');
            });
            span.addEventListener('mouseleave', () => {
              span.classList.remove('highlight-synced');
              const leftToken = shadowRoot.querySelector(`.word-token[data-wid="${wid}"]`);
              leftToken?.classList.remove('highlight-synced');
            });
          });
        }

        prevContext = `${s.text} -> ${res.translationKo}`;
      } catch (err) {
        const rightBlock = ui.colRight.querySelector(`#right-${s.sentenceId}`);
        if (rightBlock) {
          rightBlock.textContent = '번역 대기 중 (또는 AI 준비 중)';
        }
      }
    }
  }
}
