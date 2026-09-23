import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { createShadowHost } from '../src/content/shadow-host.js';

describe('Shadow Host Module', () => {
  it('should attach an isolated shadow root to custom element host', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    global.window = dom.window;
    global.document = dom.window.document;
    global.HTMLElement = dom.window.HTMLElement;
    global.customElements = dom.window.customElements;

    const { host, shadowRoot, unmount } = createShadowHost();
    expect(host.tagName.toLowerCase()).toBe('news-language-reader');
    expect(shadowRoot).toBeDefined();

    unmount();
    expect(document.querySelector('news-language-reader')).toBeNull();
  });
});
