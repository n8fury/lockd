// Lockd dashboard — single-page app with four views (dashboard / setup / work / break),
// wired to the background session machine, settings, and stats.
import browser from 'webextension-polyfill';
import { MSG, STATUS } from '../../shared/constants.js';
import { PRESETS, isPresetEnabled } from '../../rules/presets.js';
import { normalizeDomain } from '../../shared/settings.js';
import { levelInfo, focusWall, weekMinutes, dayKey } from '../../shared/stats.js';
import { confirmExit } from '../exitFriction.js';

let snap = null;
let settings = null;
let stats = null;
let currentView = 'dashboard';
let countMode = 'left'; // 'left' = time remaining, 'up' = time focused this block

// Setup form local state.
const setupForm = { totalMinutes: 120, workMinutes: 50, breakMinutes: 10, surface: 'calm' };

const DURATIONS = [
  { label: '1h', v: 60 },
  { label: '2h', v: 120 },
  { label: '4h', v: 240 },
  { label: '6h', v: 360 },
  { label: 'Test', v: 0.5 },
];
const RHYTHMS = [
  { label: '25 / 5', w: 25, b: 5 },
  { label: '50 / 10', w: 50, b: 10 },
  { label: '90 / 15', w: 90, b: 15 },
  { label: 'Test', w: 0.1, b: 0.0667 },
];

const $ = (sel) => document.querySelector(sel);
const send = (type, extra = {}) => browser.runtime.sendMessage({ type, ...extra });

// Escape user-controlled values before they go into innerHTML (domains, channel
// names, intent) — these are the only untrusted strings we render.
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}

function fmt(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
function hm(mins) {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ---------- THEME ----------
function applyTheme() {
  const theme = settings?.theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelectorAll('[data-theme-btn]').forEach((b) => {
    b.classList.toggle('active', b.dataset.themeBtn === theme);
  });
}

// ---------- VIEW ROUTING ----------
function setView(view) {
  currentView = view;
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.dataset.view === view));
  document.querySelectorAll('.navlink').forEach((n) => n.classList.toggle('active', n.dataset.view === view));
  renderView(view);
}

function surfaceFor(status) {
  if (status === STATUS.WORK || status === STATUS.PAUSED) return 'work';
  if (status === STATUS.BREAK) return 'break';
  if (status === STATUS.DONE) return 'done';
  return null;
}

function autoRoute() {
  const surface = surfaceFor(snap?.status);
  if (surface && currentView !== surface) setView(surface);
  else if (!surface && ['work', 'break', 'done'].includes(currentView)) setView('dashboard');
}

// ---------- RENDER: DASHBOARD ----------
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning.';
  if (h < 18) return 'Good afternoon.';
  return 'Good evening.';
}

function renderDashboard() {
  $('#greeting').textContent = greeting();
  $('#greetingSub').textContent = snap?.status === STATUS.DONE ? 'Session complete — nice work.' : 'Ready to lock in?';

  const cards = [
    { icon: '🔥', cls: 'coral', value: `${stats.streak}`, label: 'Day streak' },
    { icon: '⏱️', cls: 'amber', value: hm(weekMinutes(stats)), label: 'Focus this week' },
    { icon: '✅', cls: 'cyan', value: `${stats.sessionsToday}`, label: 'Sessions today' },
    { icon: '🛡️', cls: 'violet', value: `${stats.distractionsBlocked}`, label: 'Distractions blocked' },
  ];
  $('#statGrid').innerHTML = cards
    .map(
      (c) => `<div class="stat-card">
        <div class="stat-icon ${c.cls}">${c.icon}</div>
        <p class="stat-value">${c.value}</p>
        <p class="stat-label">${c.label}</p>
      </div>`,
    )
    .join('');

  const lv = levelInfo(stats.xp);
  $('#levelCard').innerHTML = `
    <div class="level-badge">L${lv.level}</div>
    <div class="level-body">
      <p class="level-name">${lv.name}</p>
      <p class="level-xp">${lv.isMax ? `${stats.xp} XP · max level` : `${lv.xpInto} / ${lv.xpForNext} XP to next level`}</p>
      <div class="level-bar"><span style="width:${Math.round(lv.progress * 100)}%"></span></div>
    </div>`;

  renderPresets();
  renderBlocklist();
  renderChannels();
}

function renderPresets() {
  const groups = {};
  for (const p of PRESETS) (groups[p.group] ||= []).push(p);
  $('#presetGroups').innerHTML = Object.entries(groups)
    .map(
      ([group, items]) => `<div class="preset-group">
        <h4>${group}</h4>
        ${items
          .map(
            (p) => `<div class="preset-item">
              <div class="meta"><b>${p.label}</b><span>${p.description}</span></div>
              <input type="checkbox" class="toggle-input" data-preset="${p.id}" ${isPresetEnabled(p, settings.presets) ? 'checked' : ''} />
            </div>`,
          )
          .join('')}
      </div>`,
    )
    .join('');
}

function chip(value, removeAttr) {
  const v = esc(value);
  return `<li><span>${v}</span><span class="rm" data-${removeAttr}="${v}" title="Remove">✕</span></li>`;
}

function renderBlocklist() {
  const list = settings.blocklist || [];
  $('#blockList').innerHTML = list.length
    ? list.map((d) => chip(d, 'rm-block')).join('')
    : '<li class="empty">No hard-blocked sites</li>';
}

function renderChannels() {
  $('#ytLock').checked = !!settings.youtubeChannelLock;
  const list = settings.youtubeChannels || [];
  $('#ytList').innerHTML = list.length
    ? list.map((c) => chip(c, 'rm-yt')).join('')
    : '<li class="empty">No channels allowed yet</li>';
}

// ---------- RENDER: SETUP ----------
function renderSetup() {
  $('#durationPills').innerHTML = DURATIONS.map(
    (d) => `<button class="pill ${setupForm.totalMinutes === d.v ? 'active' : ''}" data-dur="${d.v}">${d.label}</button>`,
  ).join('');
  $('#rhythmPills').innerHTML = RHYTHMS.map(
    (r) => `<button class="pill ${setupForm.workMinutes === r.w && setupForm.breakMinutes === r.b ? 'active' : ''}" data-rhythm="${r.w}|${r.b}">${r.label}</button>`,
  ).join('');
  $('#surfacePills').innerHTML = ['calm', 'command']
    .map(
      (s) => `<button class="pill ${setupForm.surface === s ? 'active' : ''}" data-surface-pick="${s}">${s === 'calm' ? '🌙 Calm' : '🛰️ Command'}<small>${s === 'calm' ? 'just the work and the time' : 'mission control'}</small></button>`,
    )
    .join('');
}

// ---------- RENDER: WORK ----------
function renderWork() {
  const work = $('.view.work');
  const surface = settings.surface === 'command' ? 'command' : 'calm';
  work.classList.toggle('command', surface === 'command');
  document.querySelectorAll('#surfaceToggle button').forEach((b) => b.classList.toggle('active', b.dataset.surface === surface));

  $('#workIntent').textContent = snap.intent ? `“${snap.intent}”` : '';
  const pill = $('#workStatusPill');
  if (snap.status === STATUS.PAUSED) {
    pill.innerHTML = '<span class="dot"></span> Paused';
  } else {
    pill.innerHTML = '<span class="dot"></span> Focus locked';
  }
  $('#workPause').textContent = snap.status === STATUS.PAUSED ? 'Resume' : 'Pause';
  $('#countToggle').textContent = countMode === 'left' ? 'Show focused' : 'Show time left';
  $('#blockProgress').textContent = `BLOCK ${Math.min(snap.blocksCompleted + 1, snap.blocksPlanned)} / ${snap.blocksPlanned}`;

  // Command extras
  const focusedToday = stats.daily?.[dayKey()] || 0;
  $('#cmdStats').innerHTML = [
    { v: hm(focusedToday), l: 'Focused today' },
    { v: `${stats.streak}`, l: 'Day streak' },
    { v: `${stats.distractionsBlocked}`, l: 'Blocked' },
    { v: `${stats.xp}`, l: 'Total XP' },
  ]
    .map((s) => `<div class="cmd-stat"><div class="v">${s.v}</div><div class="l">${s.l}</div></div>`)
    .join('');
  renderFocusWall();
  tickTimers();
}

function renderFocusWall() {
  const cells = focusWall(stats, 28);
  const today = dayKey();
  $('#focusWall').innerHTML = cells
    .map((c) => {
      let lvl = 0;
      if (c.minutes >= 60) lvl = 4;
      else if (c.minutes >= 30) lvl = 3;
      else if (c.minutes >= 15) lvl = 2;
      else if (c.minutes > 0) lvl = 1;
      return `<div class="fw-cell ${lvl ? 'l' + lvl : ''} ${c.date === today ? 'today' : ''}" title="${c.date}: ${c.minutes}m"></div>`;
    })
    .join('');
}

function renderBreak() {
  tickTimers();
}

function renderDone() {
  const cfg = snap.config || {};
  const focused = Math.round((snap.blocksCompleted || 0) * (cfg.workMinutes || 0));
  $('#rollupIntent').textContent = snap.intent ? `“${snap.intent}”` : 'Nice work.';
  $('#rollupGrid').innerHTML = [
    { v: `${snap.blocksCompleted || 0}`, l: 'Blocks completed' },
    { v: hm(focused), l: 'Focused' },
    { v: `+${focused}`, l: 'XP earned' },
    { v: `${stats.streak}`, l: 'Day streak' },
  ]
    .map((c) => `<div class="rollup-cell"><div class="v">${c.v}</div><div class="l">${c.l}</div></div>`)
    .join('');
}

// ---------- LIVE TIMERS ----------
let nudgedAt = 0;
function tickTimers() {
  if (!snap) return;
  if (snap.status === STATUS.WORK || snap.status === STATUS.PAUSED) {
    const phaseTotal = (snap.phase?.minutes || 0) * 60000;
    let remaining = snap.status === STATUS.PAUSED ? snap.remainingMs : Math.max(0, snap.phaseEndsAt - Date.now());
    const shown = countMode === 'up' ? phaseTotal - remaining : remaining;
    const t = $('#workTimer');
    if (t) t.textContent = fmt(shown);
    if (snap.status === STATUS.WORK && remaining <= 0 && Date.now() - nudgedAt > 500) {
      nudgedAt = Date.now();
      send(MSG.TICK).then((s) => { snap = s; });
    }
  } else if (snap.status === STATUS.BREAK) {
    const remaining = Math.max(0, snap.phaseEndsAt - Date.now());
    const t = $('#breakTimer');
    if (t) t.textContent = fmt(remaining);
    if (remaining <= 0 && Date.now() - nudgedAt > 500) {
      nudgedAt = Date.now();
      send(MSG.TICK).then((s) => { snap = s; });
    }
  }
}

function renderView(view) {
  if (view === 'dashboard') renderDashboard();
  else if (view === 'setup') renderSetup();
  else if (view === 'work') renderWork();
  else if (view === 'break') renderBreak();
  else if (view === 'done') renderDone();
}

// ---------- SETTINGS UPDATES ----------
async function patchSettings(patch) {
  settings = await send(MSG.UPDATE_SETTINGS, { settings: { ...settings, ...patch } });
  applyTheme();
  if (currentView === 'dashboard') renderDashboard();
}

// ---------- EVENTS ----------
document.addEventListener('click', async (e) => {
  const t = e.target;
  const action = t.closest('[data-action]')?.dataset.action;

  // top nav
  if (t.dataset.view) return setView(t.dataset.view);
  // theme
  if (t.dataset.themeBtn) return patchSettings({ theme: t.dataset.themeBtn });
  // setup pills
  if (t.closest('[data-dur]')) { setupForm.totalMinutes = Number(t.closest('[data-dur]').dataset.dur); return renderSetup(); }
  if (t.closest('[data-rhythm]')) {
    const [w, b] = t.closest('[data-rhythm]').dataset.rhythm.split('|').map(Number);
    setupForm.workMinutes = w; setupForm.breakMinutes = b; return renderSetup();
  }
  if (t.closest('[data-surface-pick]')) { setupForm.surface = t.closest('[data-surface-pick]').dataset.surfacePick; return renderSetup(); }
  // work surface toggle
  if (t.dataset.surface) return patchSettings({ surface: t.dataset.surface }).then(() => renderWork());
  // chip removals
  if (t.dataset.rmBlock != null) return patchSettings({ blocklist: settings.blocklist.filter((d) => d !== t.dataset.rmBlock) });
  if (t.dataset.rmYt != null) return patchSettings({ youtubeChannels: settings.youtubeChannels.filter((c) => c !== t.dataset.rmYt) });

  switch (action) {
    case 'goto-setup': return setView('setup');
    case 'goto-dashboard': return setView('dashboard');
    case 'start-session': {
      const intent = $('#intentInput').value.trim();
      await patchSettings({ surface: setupForm.surface });
      snap = await send(MSG.START_SESSION, {
        config: { intent, totalMinutes: setupForm.totalMinutes, workMinutes: setupForm.workMinutes, breakMinutes: setupForm.breakMinutes },
      });
      return setView('work');
    }
    case 'toggle-count': countMode = countMode === 'left' ? 'up' : 'left'; return renderWork();
    case 'pause':
      snap = await send(snap.status === STATUS.PAUSED ? MSG.RESUME : MSG.PAUSE);
      return renderWork();
    case 'exit': {
      const done = snap.blocksCompleted || 0;
      const ok = await confirmExit({
        consequence:
          `${snap.intent ? `“${esc(snap.intent)}” — ` : ''}` +
          `${done} block${done === 1 ? '' : 's'} done won't count, and the session won't complete. ` +
          `It earns no streak and no XP.`,
      });
      if (!ok) return;
      snap = await send(MSG.STOP);
      return setView('dashboard');
    }
    case 'extend': snap = await send(MSG.EXTEND_BREAK, { minutes: 5 }); return renderBreak();
    case 'skip-break': snap = await send(MSG.SKIP); return autoRoute();
    case 'block-add': {
      const v = normalizeDomain($('#blockInput').value);
      if (v && !settings.blocklist.includes(v)) await patchSettings({ blocklist: [...settings.blocklist, v] });
      $('#blockInput').value = '';
      return;
    }
    case 'yt-add': {
      const v = $('#ytInput').value.trim();
      if (v && !settings.youtubeChannels.includes(v)) await patchSettings({ youtubeChannels: [...settings.youtubeChannels, v] });
      $('#ytInput').value = '';
      return;
    }
    default:
      break;
  }
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.preset) {
    patchSettings({ presets: { ...settings.presets, [t.dataset.preset]: t.checked } });
  } else if (t.id === 'ytLock') {
    patchSettings({ youtubeChannelLock: t.checked });
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  if (e.target.id === 'blockInput') document.querySelector('[data-action="block-add"]').click();
  if (e.target.id === 'ytInput') document.querySelector('[data-action="yt-add"]').click();
});

// Live background broadcasts.
browser.runtime.onMessage.addListener((message) => {
  if (message?.type === MSG.STATE_CHANGED) {
    snap = message.snapshot;
    autoRoute();
    if (currentView === 'work') renderWork();
    if (currentView === 'break') renderBreak();
  } else if (message?.type === MSG.SETTINGS_CHANGED) {
    settings = message.settings;
    applyTheme();
  } else if (message?.type === MSG.STATS_CHANGED) {
    stats = message.stats;
    if (currentView === 'dashboard') renderDashboard();
    else if (currentView === 'work') renderWork();
    else if (currentView === 'done') renderDone();
  }
});

// ---------- INIT ----------
async function init() {
  [snap, settings, stats] = await Promise.all([send(MSG.GET_STATE), send(MSG.GET_SETTINGS), send(MSG.GET_STATS)]);
  setupForm.surface = settings.surface || 'calm';
  applyTheme();
  const surface = surfaceFor(snap?.status);
  const hashView = location.hash.replace('#', '');
  const requested = ['dashboard', 'setup'].includes(hashView) ? hashView : null;
  setView(surface || requested || 'dashboard');
  setInterval(tickTimers, 250);
}

init();
