# News Language Reader Chrome Extension

Chrome Extension (Manifest V3) for deep multi-language acquisition via web news articles (e.g., NHK News, BBC, Der Spiegel).

## Core Capabilities

- **In-Place Reader Split View**: Automatically extracts ad-free article text via Mozilla Readability and renders an isolated 5:5 side-by-side study view inside a Shadow DOM overlay.
- **Chrome Built-in AI Integration**: Uses on-device Gemini Nano via Chrome Prompt API (`window.ai.languageModel`) with a sliding-window context chaining mechanism. Zero API cost and total local privacy.
- **Word-Level Alignment & Native Nuances**: Synchronized hover highlights between source and translated words. Clicking any word displays base dictionary lemma, part of speech, Korean and English translations, and native cultural nuance notes.
- **Sentence Scraping & Contextual Study Sheet**: Drag-to-scrap sentences and finish reading to generate an organized contextual study sheet with Markdown and CSV export.
- **Zero Emoticon Design**: Professional, clean typography with high readability.

## Project Structure

```
news-language-reader/
├── manifest.json                  # Manifest V3 definition
├── package.json                   # Dependencies and Vitest runner
├── src/
│   ├── background/
│   │   └── service-worker.js      # Shortcut and action dispatcher
│   ├── content/
│   │   ├── content-script.js      # Overlay lifecycle and event orchestration
│   │   ├── parser.js              # Readability extraction
│   │   └── shadow-host.js         # Shadow DOM isolation
│   ├── core/
│   │   ├── ai-client.js           # Chrome Built-in AI client
│   │   ├── nlp-segmenter.js       # Intl.Segmenter sentence/word tokenizer
│   │   ├── prompt-templates.js    # Context chaining prompts
│   │   └── word-aligner.js        # Fuzzy stem alignment mapper
│   ├── overlay/
│   │   ├── popover.js             # Lexical nuance popover
│   │   ├── reader-view.css        # Reader overlay styling
│   │   ├── reader-view.js         # Split view DOM generator
│   │   └── summary-view.js        # Contextual study sheet generator
│   └── storage/
│       ├── exporters.js           # Markdown & CSV exporters
│       └── storage-manager.js     # chrome.storage.local persistence
└── tests/                         # Vitest unit and integration test suite
```

## Installation

1. Open Google Chrome.
2. Navigate to `chrome://extensions/` and enable "Developer mode" in the top-right corner.
3. Click "Load unpacked" and select the `news-language-reader` directory.
4. Ensure Chrome Built-in AI is enabled at `chrome://flags/#prompt-api-for-gemini-nano`.
5. Open any news article and press `Alt+L` (or click the extension icon) to launch the reader.

## Tests

```bash
npm install
npm test
```
