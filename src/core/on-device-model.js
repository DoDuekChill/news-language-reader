export const TEXT_SESSION_OPTIONS = {
  expectedInputs: [{ type: 'text', languages: ['ja', 'en', 'ko'] }],
  expectedOutputs: [{ type: 'text', languages: ['ko', 'en'] }]
};

export function normalizeAvailability(value) {
  const raw = typeof value === 'string' ? value : (value?.available || value?.availability || '');
  if (raw === 'readily' || raw === 'available') return 'readily';
  if (raw === 'after-download' || raw === 'downloadable' || raw === 'downloading') return 'after-download';
  return 'no';
}

async function readAvailability(lm, options) {
  if (typeof lm.availability === 'function') {
    return normalizeAvailability(options ? await lm.availability(options) : await lm.availability());
  }
  if (typeof lm.capabilities === 'function') {
    return normalizeAvailability(await lm.capabilities());
  }
  return 'readily';
}

export async function queryAvailability(lm) {
  if (!lm) return 'no';
  try {
    const withLanguages = await readAvailability(lm, TEXT_SESSION_OPTIONS);
    if (withLanguages !== 'no') return withLanguages;
  } catch (err) {
    console.warn('[NewsLanguageReader] availability() with language options failed', err);
  }
  try {
    return await readAvailability(lm);
  } catch (err) {
    console.warn('[NewsLanguageReader] availability() failed', err);
    return 'no';
  }
}

export async function openLanguageSession(lm) {
  const monitor = (m) => {
    m.addEventListener('downloadprogress', (event) => {
      const pct = event.total
        ? Math.round((event.loaded / event.total) * 100)
        : Math.round((event.loaded || 0) * 100);
      console.log(`[NewsLanguageReader] On-device model download ${pct}%`);
    });
  };

  try {
    return await lm.create({ ...TEXT_SESSION_OPTIONS, monitor });
  } catch (err) {
    console.warn('[NewsLanguageReader] LanguageModel.create with language options failed', err);
    return await lm.create({ monitor });
  }
}

export async function coerceModelText(raw) {
  if (typeof raw === 'string') return raw;
  if (raw == null) return '';
  if (typeof raw === 'object' && typeof raw.text === 'string') return raw.text;

  if (raw && typeof raw[Symbol.asyncIterator] === 'function') {
    let acc = '';
    for await (const chunk of raw) {
      acc += typeof chunk === 'string' ? chunk : (chunk?.text || '');
    }
    return acc;
  }

  if (typeof raw?.getReader === 'function') {
    const reader = raw.getReader();
    const decoder = new TextDecoder();
    let acc = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      acc += typeof value === 'string' ? value : decoder.decode(value, { stream: true });
    }
    return acc;
  }

  return String(raw);
}
