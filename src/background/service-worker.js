import { coerceModelText, openLanguageSession, queryAvailability } from '../core/on-device-model.js';

let languageSession = null;

function getLanguageModel() {
  if (typeof LanguageModel !== 'undefined') return LanguageModel;
  if (typeof globalThis.LanguageModel !== 'undefined') return globalThis.LanguageModel;
  return null;
}

async function ensureLanguageSession() {
  if (languageSession) return languageSession;
  const lm = getLanguageModel();
  if (!lm) {
    throw new Error('LanguageModel is not available in the extension service worker.');
  }
  languageSession = await openLanguageSession(lm);
  return languageSession;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.action !== 'ai') return;

  (async () => {
    try {
      if (message.op === 'check') {
        const result = await queryAvailability(getLanguageModel());
        sendResponse({ ok: true, result });
        return;
      }
      if (message.op === 'prompt') {
        const session = await ensureLanguageSession();
        const result = await coerceModelText(await session.prompt(message.prompt));
        sendResponse({ ok: true, result });
        return;
      }
      sendResponse({ ok: false, error: `Unknown AI operation: ${message.op}` });
    } catch (err) {
      languageSession = null;
      sendResponse({ ok: false, error: err?.message || String(err) });
    }
  })();

  return true;
});

chrome.action.onClicked.addListener(async (tab) => {
  if (tab?.id) {
    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'toggle-reader' });
    } catch (e) {
      console.warn('Failed to send toggle message to tab:', e);
    }
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-reader') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, { action: 'toggle-reader' });
      } catch (e) {
        console.warn('Failed to send command to tab:', e);
      }
    }
  }
});
