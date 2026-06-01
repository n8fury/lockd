// Phase 0 popup: confirms the polyfill works and the extension context is live.
import browser from 'webextension-polyfill';

const statusEl = document.getElementById('status');

try {
  const manifest = browser.runtime.getManifest();
  statusEl.textContent = `Alive — v${manifest.version}`;
  console.log('[Lockd] popup loaded', manifest.name, manifest.version);
} catch (err) {
  statusEl.textContent = 'Error loading extension context';
  console.error('[Lockd] popup error', err);
}
