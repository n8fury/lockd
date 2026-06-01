// Element-level blocker content script.
// Injects a <style> that hides distraction elements for the active presets on
// this host — but only while blocking is active (work block or always-on).
// Because the rules are pure CSS, they automatically apply to elements added
// later by the site's SPA, so no MutationObserver is needed for static selectors.
import browser from 'webextension-polyfill';
import { MSG, STATUS } from '../shared/constants.js';
import { presetsForHost, isPresetEnabled } from '../rules/presets.js';

const STYLE_ID = 'lockd-element-blocker';
const sitePresets = presetsForHost(location.hostname);

// Bail immediately on hosts we have no presets for (defensive; matches already scope us).
if (sitePresets.length > 0) {
  let snap = null;
  let presetSettings = {};

  function blockingActive(s) {
    if (!s) return false;
    if (s.alwaysOn) return true;
    return s.status === STATUS.WORK;
  }

  function buildCss() {
    const active = sitePresets.filter((p) => isPresetEnabled(p, presetSettings));
    if (active.length === 0) return '';
    return active
      .map((p) => `/* ${p.id} */\n${p.selectors.join(',\n')} { display: none !important; }`)
      .join('\n');
  }

  function apply() {
    const existing = document.getElementById(STYLE_ID);
    const shouldBlock = blockingActive(snap);
    const css = shouldBlock ? buildCss() : '';

    if (!css) {
      existing?.remove();
      return;
    }
    const style = existing || document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    if (!existing) (document.head || document.documentElement).appendChild(style);
  }

  async function sync() {
    try {
      const [state, settings] = await Promise.all([
        browser.runtime.sendMessage({ type: MSG.GET_STATE }),
        browser.runtime.sendMessage({ type: MSG.GET_SETTINGS }),
      ]);
      snap = state;
      presetSettings = settings?.presets || {};
    } catch {
      // Background not ready yet; keep whatever we had.
    }
    apply();
  }

  // React to work↔break transitions and settings edits without a reload.
  browser.runtime.onMessage.addListener((message) => {
    if (message?.type === MSG.STATE_CHANGED) {
      snap = message.snapshot;
      apply();
    } else if (message?.type === MSG.SETTINGS_CHANGED) {
      presetSettings = message.settings?.presets || {};
      apply();
    }
  });

  sync();
}
