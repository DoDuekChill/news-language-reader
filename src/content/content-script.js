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
let activeCleanupFns = [];
let activePopoverCleanup = null;

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'toggle-reader') {
      if (isMounted) {
        closeReader();
      } else {
        startReader();
      }
    }
  });
}

const READER_STYLES = `
  :host {
    all: initial;
    font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", "Arial", sans-serif;
    color: #111111;
    background-color: #f5f5f5;
    box-sizing: border-box;
  }
  *, *::before, *::after { box-sizing: inherit; }
  .reader-container { display: flex; flex-direction: column; width: 100vw; height: 100vh; background: #ffffff; }
  .top-bar { display: flex; justify-content: space-between; align-items: center; padding: 16px 32px; border-bottom: 2px solid #e5e5e5; background: #ffffff; }
  .title-badge { font-size: 14px; font-weight: 700; letter-spacing: -0.01em; text-transform: uppercase; max-width: 500px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #1e1e1e; }
  .top-actions { display: flex; gap: 16px; align-items: center; }
  .btn { display: inline-flex; align-items: center; justify-content: center; padding: 8px; border: 1px solid #cccccc; border-radius: 4px; background: #ffffff; color: #111111; cursor: pointer; transition: all 0.2s ease; }
  .btn:hover { background: #f5f5f5; border-color: #888888; }
  .btn-primary { background: #111111; color: #ffffff; border-color: #111111; }
  .btn-primary:hover { background: #800020; border-color: #800020; }
  .btn svg { width: 18px; height: 18px; fill: currentColor; }
  .icon-badge { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: #555555; }
  .icon-badge svg { width: 16px; height: 16px; fill: #888888; }
  .split-body { display: flex; flex: 1; overflow: hidden; }
  .column { flex: 1; overflow-y: auto; padding: 48px 64px; line-height: 1.6; font-size: 16px; }
  .column-left { border-right: 2px solid #e5e5e5; }
  .column-right { background: #f5f5f5; }
  .sentence-block { margin-bottom: 32px; padding: 12px 16px; border-left: 3px solid transparent; transition: all 0.2s ease; }
  .sentence-block:hover { border-left-color: #cccccc; background: #ffffff; }
  .word-token { cursor: pointer; border-radius: 2px; padding: 2px 4px; transition: all 0.2s ease; }
  .word-token:hover, .word-token.highlight-synced { background-color: #111111; color: #ffffff; }
  .trans-word-token { cursor: pointer; border-radius: 2px; padding: 2px 4px; font-weight: 700; }
  .trans-word-token:hover, .trans-word-token.highlight-synced { background-color: #111111; color: #ffffff; }
  .sub-en-text { display: block; font-size: 12px; color: #888888; margin-top: 8px; font-weight: 500; letter-spacing: 0.02em; }
`;

function closeReader() {
  if (activePopoverCleanup) {
    try { activePopoverCleanup(); } catch (e) { console.warn('Popover cleanup error:', e); }
    activePopoverCleanup = null;
  }
  activeCleanupFns.forEach(fn => {
    try { fn(); } catch (e) { console.warn('Cleanup error:', e); }
  });
  activeCleanupFns = [];
  currentHost?.unmount();
  currentHost = null;
  isMounted = false;
}

export async function startReader() {
  let article = extractArticle(document);

  // Fallback: Check if user has selected text on screen
  if (!article || article.paragraphs.length === 0) {
    const selectedText = window.getSelection()?.toString()?.trim();
    if (selectedText && selectedText.length > 10) {
      article = {
        title: document.title || '선택 영역 학습',
        byline: '사용자 선택 텍스트',
        lang: document.documentElement?.lang?.split('-')[0] || 'ja',
        paragraphs: [selectedText],
        url: window.location.href
      };
    } else {
      alert('기사 본문이 감지되지 않았습니다. 학습할 텍스트를 마우스로 드래그하여 선택한 후 다시 실행해 주세요.');
      return;
    }
  }

  isMounted = true;
  currentHost = createShadowHost();
  const { shadowRoot } = currentHost;

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
    closeReader();
  };

  // Keyboard shortcut: ESC to close
  const keyHandler = (e) => {
    if (e.key === 'Escape') {
      closeReader();
    }
  };
  document.addEventListener('keydown', keyHandler);
  activeCleanupFns.push(() => document.removeEventListener('keydown', keyHandler));

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
              showLexicalPopover(span, tok, s.sentenceId, activeAlignmentsMap);
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
        rightBlock.innerHTML = '<span style="color:#888;">...</span>';
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
          ui.badgeCount.textContent = `${session.words.length} / ${session.sentences.length}`;
        }
      }
    });

    // Scroll Synchronization (Left -> Right)
    let isSyncingScroll = false;
    const handleScrollSync = () => {
      if (isSyncingScroll) return;
      isSyncingScroll = true;
      const maxLeft = ui.colLeft.scrollHeight - ui.colLeft.clientHeight;
      const maxRight = ui.colRight.scrollHeight - ui.colRight.clientHeight;
      if (maxLeft > 0 && maxRight > 0) {
        const ratio = ui.colLeft.scrollTop / maxLeft;
        ui.colRight.scrollTop = ratio * maxRight;
      }
      requestAnimationFrame(() => { isSyncingScroll = false; });
    };
    ui.colLeft.addEventListener('scroll', handleScrollSync);
    activeCleanupFns.push(() => ui.colLeft.removeEventListener('scroll', handleScrollSync));

    // Start background translation queue
    processQueue(article, ui, activeAlignmentsMap);
  }

  setupReader();

  function showLexicalPopover(targetSpan, token, sentenceId, activeAlignmentsMap) {
    if (activePopoverCleanup) {
      activePopoverCleanup();
      activePopoverCleanup = null;
    }

    const existing = session.words.find(w => w.surface === token.surface);
    const align = activeAlignmentsMap ? activeAlignmentsMap.get(token.wordId) : null;
    const wordData = existing || {
      surface: token.surface,
      reading: align?.reading || '',
      baseForm: align?.baseForm || token.surface,
      pos: align?.pos || '단어',
      translationKo: align?.targetKo || '단어 분석',
      translationEn: align?.targetEn || 'word',
      nuance: align?.nuance || '원어민 뉘앙스 분석',
      isSaved: false
    };

    const popover = createPopoverElement(wordData, () => {
      wordData.isSaved = !wordData.isSaved;
      if (wordData.isSaved) {
        session.words.push({ ...wordData, contextSentenceId: sentenceId });
      } else {
        session.words = session.words.filter(w => w.surface !== wordData.surface);
      }
      ui.badgeCount.textContent = `${session.words.length} / ${session.sentences.length}`;
    });

    shadowRoot.appendChild(popover);
    positionPopover(popover, targetSpan);

    const closeHandler = (e) => {
      if (!popover.contains(e.target) && e.target !== targetSpan) {
        if (activePopoverCleanup) {
          activePopoverCleanup();
          activePopoverCleanup = null;
        }
      }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 10);
    activePopoverCleanup = () => {
      popover.remove();
      document.removeEventListener('click', closeHandler);
    };
  }

  function formatTranslationError(err) {
    const msg = err?.message || '오류 발생';
    if (/download|after-download|downloading/i.test(msg)) {
      return `Chrome 내장 AI 모델 다운로드 중... (${msg})`;
    }
    if (/Timeout waiting/i.test(msg)) {
      return `Chrome 내장 AI 응답 시간 초과. chrome://on-device-internals에서 모델 다운로드 상태를 확인하세요. (${msg})`;
    }
    if (/not available|unavailable|not supported|찾을 수 없|Prompt API|LanguageModel/i.test(msg)) {
      return `Chrome 내장 AI를 사용할 수 없습니다. chrome://flags의 Prompt API for Gemini Nano와 chrome://on-device-internals를 확인하세요. (${msg})`;
    }
    return `번역에 실패했습니다. (${msg})`;
  }

  function isModelUnavailable(err) {
    const msg = err?.message || '';
    return /not available|unavailable|not supported|찾을 수 없|Prompt API|LanguageModel is not available|Timeout waiting/i.test(msg);
  }

  async function processQueue(article, ui, alignmentsMap) {
    const aiStatus = await aiClient.checkAvailability();
    if (aiStatus.status === 'downloading') {
      const firstRight = ui.colRight.querySelector('.sentence-block');
      if (firstRight) {
        firstRight.textContent = `${aiStatus.message}...`;
      }
    }

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
        console.error('[NewsLanguageReader] Translation failed for sentence:', s.sentenceId, err);
        const rightBlock = ui.colRight.querySelector(`#right-${s.sentenceId}`);
        if (rightBlock) {
          rightBlock.innerHTML = `<span style="color:#800020; font-size:12px;">${formatTranslationError(err)}</span>`;
        }
        if (isModelUnavailable(err)) break;
      }
    }
  }
}
