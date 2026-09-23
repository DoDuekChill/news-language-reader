(function() {
  let mainSession = null;

  function getLanguageModel() {
    if (typeof window !== 'undefined' && window.ai?.languageModel) return window.ai.languageModel;
    if (typeof window !== 'undefined' && window.LanguageModel) return window.LanguageModel;
    if (typeof LanguageModel !== 'undefined') return LanguageModel;
    return null;
  }

  async function checkModelAvailability(lm) {
    if (!lm) return 'no';
    try {
      if (typeof lm.availability === 'function') {
        const res = await lm.availability();
        return typeof res === 'string' ? res : (res?.available || 'readily');
      }
      if (typeof lm.capabilities === 'function') {
        const caps = await lm.capabilities();
        return caps?.available || 'readily';
      }
      return 'readily';
    } catch (e) {
      console.warn('ai-bridge availability check error:', e);
      return 'readily';
    }
  }

  window.addEventListener('message', async (event) => {
    if (event.source !== window || !event.data || event.data.source !== 'ai-client-request') return;

    const { id, action, payload } = event.data;
    const lm = getLanguageModel();

    try {
      if (action === 'checkAvailability') {
        const available = await checkModelAvailability(lm);
        window.postMessage({ source: 'ai-bridge-response', id, result: available }, '*');
      } else if (action === 'createSession') {
        if (!lm) {
          throw new Error('Chrome 내장 AI API (Prompt API / LanguageModel)를 페이지에서 찾을 수 없습니다. chrome://flags 설정을 확인하세요.');
        }
        mainSession = await lm.create();
        window.postMessage({ source: 'ai-bridge-response', id, result: 'created' }, '*');
      } else if (action === 'prompt') {
        if (!mainSession) {
          if (!lm) {
            throw new Error('Chrome 내장 AI API (Prompt API / LanguageModel)를 페이지에서 찾을 수 없습니다.');
          }
          mainSession = await lm.create();
        }
        const result = await mainSession.prompt(payload.prompt);
        window.postMessage({ source: 'ai-bridge-response', id, result }, '*');
      }
    } catch (err) {
      window.postMessage({ source: 'ai-bridge-response', id, error: err.message }, '*');
    }
  });
})();
