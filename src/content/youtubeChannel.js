// YouTube channel allowlist content script.
// When "channel lock" is on (and the allowlist is non-empty) during a work block,
// only allowlisted channels are permitted — watching any other channel's video,
// or visiting any other channel page, redirects to the block page.
//
// YouTube is a SPA, so we re-check on `yt-navigate-finish` and briefly poll while
// a /watch page's channel link is still loading.
import browser from 'webextension-polyfill';
import { MSG, STATUS } from '../shared/constants.js';
import { normalizeChannel } from '../shared/settings.js';

let snap = null;
let settings = null;
let retryTimer = null;

function blockingActive(s) {
  if (!s) return false;
  if (s.alwaysOn) return true;
  return s.status === STATUS.WORK;
}

function lockEnforced() {
  return (
    blockingActive(snap) &&
    !!settings?.youtubeChannelLock &&
    (settings?.youtubeChannels?.length || 0) > 0
  );
}

function allowSet() {
  return new Set((settings?.youtubeChannels || []).map(normalizeChannel).filter(Boolean));
}

/**
 * @returns {string|null|undefined} token, null (not channel-specific page),
 *   or undefined (channel not yet resolved on a watch page).
 */
function currentChannelToken() {
  const path = location.pathname;
  if (/^\/@/.test(path) || path.startsWith('/channel/') || path.startsWith('/c/') || path.startsWith('/user/')) {
    return normalizeChannel(path);
  }
  if (path === '/watch') {
    const a = document.querySelector(
      'ytd-video-owner-renderer a[href^="/@"], ytd-video-owner-renderer a[href^="/channel/"], ' +
        '#owner a[href^="/@"], #owner a[href^="/channel/"]',
    );
    if (a) return normalizeChannel(a.getAttribute('href'));
    return undefined; // still loading
  }
  return null; // home / search / feed — not channel-specific (feed hidden by preset)
}

function enforce() {
  if (!lockEnforced()) return;
  const token = currentChannelToken();
  if (token === null || token === undefined) return; // not applicable / not resolved yet
  if (!allowSet().has(token)) {
    // location.replace avoids leaving the blocked URL in history (no back-loop).
    location.replace(browser.runtime.getURL('src/ui/block/index.html'));
  }
}

// Run now, then keep retrying briefly so a watch page's late-loading channel link
// is caught (and so an unauthorized video is stopped within ~a second).
function scheduleEnforce() {
  clearInterval(retryTimer);
  enforce();
  let tries = 0;
  retryTimer = setInterval(() => {
    tries += 1;
    enforce();
    if (currentChannelToken() !== undefined || tries > 20) clearInterval(retryTimer);
  }, 300);
}

async function sync() {
  try {
    const [state, s] = await Promise.all([
      browser.runtime.sendMessage({ type: MSG.GET_STATE }),
      browser.runtime.sendMessage({ type: MSG.GET_SETTINGS }),
    ]);
    snap = state;
    settings = s;
  } catch {
    /* background not ready */
  }
  scheduleEnforce();
}

browser.runtime.onMessage.addListener((message) => {
  if (message?.type === MSG.STATE_CHANGED) {
    snap = message.snapshot;
    scheduleEnforce();
  } else if (message?.type === MSG.SETTINGS_CHANGED) {
    settings = message.settings;
    scheduleEnforce();
  }
});

document.addEventListener('yt-navigate-finish', scheduleEnforce);
window.addEventListener('popstate', scheduleEnforce);

sync();
