// Lockd popup — the glanceable mini-timer + quick controls.
// Session planning (intent, duration) lives in the dashboard; the popup starts
// quick sessions and controls a running one.
import browser from 'webextension-polyfill';
import { MSG, STATUS } from '../../shared/constants.js';

const el = {
  pill: document.getElementById('statusPill'),
  timer: document.getElementById('timer'),
  intent: document.getElementById('intent'),
  controls: document.getElementById('controls'),
  alwaysOn: document.getElementById('alwaysOn'),
  openDash: document.getElementById('openDash'),
};

let snap = null;
let settings = null;
let nudgedAt = 0;

const send = (type, extra = {}) => browser.runtime.sendMessage({ type, ...extra });

function fmt(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function dashUrl() {
  return browser.runtime.getURL('src/ui/dashboard/index.html');
}

function openDashboard(view) {
  const url = view ? `${dashUrl()}#${view}` : dashUrl();
  browser.tabs.create({ url });
  window.close();
}

function controlsFor(status) {
  // Returns [{ label, action, cls }]
  if (status === STATUS.WORK) {
    return [
      { label: 'Pause', action: 'pause' },
      { label: 'End', action: 'stop', cls: 'danger' },
    ];
  }
  if (status === STATUS.PAUSED) {
    return [
      { label: 'Resume', action: 'resume' },
      { label: 'End', action: 'stop', cls: 'danger' },
    ];
  }
  if (status === STATUS.BREAK) {
    return [
      { label: '+5 min', action: 'extend' },
      { label: 'Skip →', action: 'skip' },
    ];
  }
  // idle / done
  return [
    { label: 'Plan a session', action: 'open-setup', cls: 'primary' },
    { label: 'Quick start · 50/10', action: 'quick', cls: 'primary' },
  ];
}

function render() {
  if (!snap) return;
  const { status } = snap;

  el.pill.className = `status-pill ${status}`;
  const pillLabel = status === STATUS.IDLE ? 'idle' : status === STATUS.DONE ? 'done' : status;
  el.pill.innerHTML = `<span class="dot"></span> ${pillLabel}`;
  el.alwaysOn.checked = !!snap.alwaysOn;

  let remaining = snap.remainingMs;
  if (status === STATUS.WORK || status === STATUS.BREAK) remaining = Math.max(0, snap.phaseEndsAt - Date.now());

  if (status === STATUS.IDLE) {
    el.timer.textContent = '--:--';
    el.intent.textContent = 'No active session';
  } else if (status === STATUS.DONE) {
    el.timer.textContent = '00:00';
    el.intent.textContent = `Done · ${snap.blocksCompleted} blocks`;
  } else {
    el.timer.textContent = fmt(remaining);
    el.intent.textContent = snap.intent ? `“${snap.intent}”` : status === STATUS.BREAK ? 'Step away. You earned it.' : '';
  }

  el.controls.innerHTML = controlsFor(status)
    .map((c) => `<button class="btn ${c.cls || ''}" data-action="${c.action}">${c.label}</button>`)
    .join('');

  // Nudge transition when the countdown hits zero while the popup is open.
  if ((status === STATUS.WORK || status === STATUS.BREAK) && remaining <= 0 && Date.now() - nudgedAt > 500) {
    nudgedAt = Date.now();
    send(MSG.TICK).then((s) => { snap = s; render(); });
  }
}

el.controls.addEventListener('click', async (e) => {
  const action = e.target?.dataset?.action;
  if (!action) return;
  switch (action) {
    case 'pause': snap = await send(MSG.PAUSE); break;
    case 'resume': snap = await send(MSG.RESUME); break;
    case 'stop': snap = await send(MSG.STOP); break;
    case 'extend': snap = await send(MSG.EXTEND_BREAK, { minutes: 5 }); break;
    case 'skip': snap = await send(MSG.SKIP); break;
    case 'open-setup': return openDashboard('setup');
    case 'quick':
      snap = await send(MSG.START_SESSION, {
        config: { intent: 'Deep work', totalMinutes: 120, workMinutes: 50, breakMinutes: 10 },
      });
      break;
    default: return;
  }
  render();
});

el.alwaysOn.addEventListener('change', async () => {
  snap = await send(MSG.TOGGLE_ALWAYS_ON, { value: el.alwaysOn.checked });
  render();
});

el.openDash.addEventListener('click', () => openDashboard());

browser.runtime.onMessage.addListener((message) => {
  if (message?.type === MSG.STATE_CHANGED) { snap = message.snapshot; render(); }
});

function applyTheme() {
  document.documentElement.setAttribute('data-theme', settings?.theme === 'light' ? 'light' : 'dark');
}

async function init() {
  [snap, settings] = await Promise.all([send(MSG.GET_STATE), send(MSG.GET_SETTINGS)]);
  applyTheme();
  render();
  setInterval(render, 250);
}

init();
