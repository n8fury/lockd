// Block interstitial: shows why you're locked + time until break, and steps aside
// (navigates back) automatically the moment blocking lifts.
import browser from 'webextension-polyfill';
import { MSG, STATUS } from '../../shared/constants.js';

const timeEl = document.getElementById('time');
const intentEl = document.getElementById('intent');
const eyebrowEl = document.getElementById('eyebrow');
const footEl = document.getElementById('foot');

let snap = null;

function fmt(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

async function refresh() {
  try {
    snap = await browser.runtime.sendMessage({ type: MSG.GET_STATE });
  } catch {
    return;
  }
  if (!snap) return;

  const active = snap.alwaysOn || snap.status === STATUS.WORK;
  if (!active) {
    // Break started (or session stopped): release the page.
    history.back();
    return;
  }

  intentEl.textContent = snap.intent ? `“${snap.intent}”` : '';

  if (snap.alwaysOn && snap.status !== STATUS.WORK) {
    eyebrowEl.textContent = 'Always-on focus';
    timeEl.textContent = '∞';
    footEl.textContent = 'Always-on focus is keeping this blocked.';
    return;
  }

  const remaining = Math.max(0, snap.phaseEndsAt - Date.now());
  timeEl.textContent = fmt(remaining);
}

browser.runtime.onMessage.addListener((message) => {
  if (message?.type === MSG.STATE_CHANGED) {
    snap = message.snapshot;
    const active = snap.alwaysOn || snap.status === STATUS.WORK;
    if (!active) history.back();
  }
});

// Tick the local countdown smoothly; re-sync with the worker periodically.
setInterval(() => {
  if (snap && snap.status === STATUS.WORK && !snap.alwaysOn) {
    timeEl.textContent = fmt(Math.max(0, snap.phaseEndsAt - Date.now()));
  }
}, 250);
setInterval(refresh, 2000);
refresh();
