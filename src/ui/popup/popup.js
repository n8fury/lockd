// Phase 1 debug popup: drives + visualizes the session machine.
import browser from 'webextension-polyfill';
import { MSG, STATUS } from '../../shared/constants.js';

const el = {
  pill: document.getElementById('statusPill'),
  timer: document.getElementById('timer'),
  sub: document.getElementById('sub'),
  controls: document.getElementById('controls'),
  alwaysOn: document.getElementById('alwaysOn'),
};

let snap = null;
let nudgedAt = 0;

function send(type, extra = {}) {
  return browser.runtime.sendMessage({ type, ...extra });
}

function fmt(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function render() {
  if (!snap) return;
  const { status, phase, blocksCompleted, blocksPlanned, alwaysOn } = snap;

  el.pill.textContent = status;
  el.pill.className = `status-pill ${status}`;
  el.alwaysOn.checked = !!alwaysOn;

  // Live countdown is computed client-side from phaseEndsAt so the worker can sleep.
  let remaining = snap.remainingMs;
  if (status === STATUS.WORK || status === STATUS.BREAK) {
    remaining = Math.max(0, snap.phaseEndsAt - Date.now());
  }

  if (status === STATUS.IDLE) {
    el.timer.textContent = '--:--';
    el.sub.textContent = 'No session';
  } else if (status === STATUS.DONE) {
    el.timer.textContent = '00:00';
    el.sub.textContent = `Session complete · ${blocksCompleted} blocks`;
  } else {
    el.timer.textContent = fmt(remaining);
    const label = status === STATUS.PAUSED ? `paused · ${phase?.type ?? ''}` : status;
    el.sub.textContent = `${label} · block ${Math.min(blocksCompleted + 1, blocksPlanned)}/${blocksPlanned}`;
  }

  setEnabled('pause', status === STATUS.WORK || status === STATUS.BREAK);
  setEnabled('resume', status === STATUS.PAUSED);
  setEnabled('skip', status === STATUS.WORK || status === STATUS.BREAK);
  setEnabled('stop', status !== STATUS.IDLE);

  // When the countdown hits zero while the popup is open, nudge the worker to
  // transition immediately (alarms can be clamped for sub-minute test phases).
  if ((status === STATUS.WORK || status === STATUS.BREAK) && remaining <= 0) {
    const now = Date.now();
    if (now - nudgedAt > 500) {
      nudgedAt = now;
      send(MSG.TICK).then((s) => { snap = s; });
    }
  }
}

function setEnabled(action, enabled) {
  const btn = el.controls.querySelector(`[data-action="${action}"]`);
  if (btn) btn.disabled = !enabled;
}

async function refresh() {
  snap = await send(MSG.GET_STATE);
  render();
}

el.controls.addEventListener('click', async (e) => {
  const action = e.target?.dataset?.action;
  if (!action) return;
  switch (action) {
    case 'start-test':
      // Fractional minutes → 6s work / 4s break, ~3 work blocks.
      snap = await send(MSG.START_SESSION, {
        config: { intent: 'Test session', totalMinutes: 0.5, workMinutes: 0.1, breakMinutes: 0.0667 },
      });
      break;
    case 'start-standard':
      snap = await send(MSG.START_SESSION, {
        config: { intent: 'Deep work', totalMinutes: 120, workMinutes: 50, breakMinutes: 10 },
      });
      break;
    case 'pause': snap = await send(MSG.PAUSE); break;
    case 'resume': snap = await send(MSG.RESUME); break;
    case 'skip': snap = await send(MSG.SKIP); break;
    case 'stop': snap = await send(MSG.STOP); break;
  }
  render();
});

el.alwaysOn.addEventListener('change', async () => {
  snap = await send(MSG.TOGGLE_ALWAYS_ON, { value: el.alwaysOn.checked });
  render();
});

// Live updates: poll for the countdown + listen for background broadcasts.
browser.runtime.onMessage.addListener((message) => {
  if (message?.type === MSG.STATE_CHANGED) {
    snap = message.snapshot;
    render();
  }
});

setInterval(render, 250);
refresh();
