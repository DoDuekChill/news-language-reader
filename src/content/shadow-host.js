export function createShadowHost() {
  const existing = document.querySelector('news-language-reader');
  if (existing) {
    existing.remove();
  }

  const host = document.createElement('news-language-reader');
  host.style.position = 'fixed';
  host.style.inset = '0';
  host.style.zIndex = '2147483647';
  host.style.display = 'block';

  const shadowRoot = host.attachShadow({ mode: 'open' });
  document.body.appendChild(host);

  const unmount = () => {
    if (host.parentNode) {
      host.remove();
    }
  };

  return { host, shadowRoot, unmount };
}
