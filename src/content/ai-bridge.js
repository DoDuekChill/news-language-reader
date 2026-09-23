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
      const normalize = (value) => {
        const raw = typeof value === 'string' ? value : (value?.available || '');
        if (raw === 'readily' || raw === 'available') return 'readily';
        if (raw === 'after-download' || raw === 'downloadable' || raw === 'downloading') return 'after-download';
        return 'no';
      };
      if (typeof lm.availability === 'function') {
        const res = await lm.availability();
        return normalize(res);
      }
      if (typeof lm.capabilities === 'function') {
        const caps = await lm.capabilities();
        return normalize(caps?.available || 'readily');
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
        let result = await mainSession.prompt(payload.prompt);
        if (result && typeof result !== 'string') {
          if (typeof result.text === 'string') result = result.text;
          else if (typeof result[Symbol.asyncIterator] === 'function') {
            let acc = '';
            for await (const chunk of result) acc += typeof chunk === 'string' ? chunk : '';
            result = acc;
          } else {
            result = String(result);
          }
        }
        window.postMessage({ source: 'ai-bridge-response', id, result }, '*');
      }
    } catch (err) {
      window.postMessage({ source: 'ai-bridge-response', id, error: err.message }, '*');
    }
  });
})();
