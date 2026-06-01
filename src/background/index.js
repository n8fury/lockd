// Lockd background — message router, alarm handler, and blocking driver
// around the session machine.
import browser from 'webextension-polyfill';
import { MSG, ALARM_PHASE } from '../shared/constants.js';
import { loadSettings, saveSettings } from '../shared/settings.js';
import { loadStats, saveStats, displayStats, dayKey } from '../shared/stats.js';
import * as machine from './sessionMachine.js';
import { applyBlocking } from './blocking.js';

console.log('[Lockd] background alive');

let settings = null;
let stats = null;

async function ensureSettings() {
  if (!settings) settings = await loadSettings();
  return settings;
}

async function ensureStats() {
  if (!stats) stats = await loadStats();
  return stats;
}

async function commitStats() {
  await saveStats(stats);
  broadcast({ type: MSG.STATS_CHANGED, stats: displayStats(stats) });
}

// Re-apply blocking to match the latest session snapshot + settings.
async function reapplyBlocking(snap) {
  await ensureSettings();
  const s = snap ?? machine.getSnapshot();
  await applyBlocking(s, settings);
}

// Broadcast a message to extension pages (popup/dashboard) AND content scripts in
// all tabs. runtime.sendMessage only reaches extension pages, so tabs need an
// explicit fan-out (content scripts that don't listen simply ignore it).
async function broadcast(message) {
  browser.runtime.sendMessage(message).catch(() => {});
  try {
    const tabs = await browser.tabs.query({});
    await Promise.all(
      tabs.map((t) =>
        t.id != null ? browser.tabs.sendMessage(t.id, message).catch(() => {}) : null,
      ),
    );
  } catch {
    // tabs API unavailable — ignore.
  }
}

// Any session change → broadcast to UI + content scripts + refresh blocking rules.
machine.registerOnChange((snap) => {
  broadcast({ type: MSG.STATE_CHANGED, snapshot: snap });
  reapplyBlocking(snap).catch((err) => console.error('[Lockd] blocking apply failed', err));
});

// Stat events from the session machine → update XP / focus minutes / streak / sessions.
machine.registerOnEvent(async (event) => {
  await ensureStats();
  if (event.type === 'workComplete') {
    const mins = Math.round(event.minutes);
    if (mins > 0) {
      const key = dayKey();
      stats.totalFocusMinutes += mins;
      stats.daily[key] = (stats.daily[key] || 0) + mins;
      stats.xp += mins; // 1 XP per focused minute
    }
  } else if (event.type === 'sessionDone') {
    const today = dayKey();
    const yesterday = dayKey(new Date(Date.now() - 86_400_000));
    if (stats.lastSessionDay !== today) {
      stats.streak = (stats.lastSessionDay === yesterday ? stats.streak : 0) + 1;
      stats.lastSessionDay = today;
    }
    if (stats.sessionsDay !== today) {
      stats.sessionsDay = today;
      stats.sessionsToday = 0;
    }
    stats.sessionsToday += 1;
  }
  await commitStats();
});

async function boot() {
  await ensureSettings();
  await machine.init(); // restores the persisted session from storage
  await reapplyBlocking(); // ensure rules match restored state on every worker wake
}

// MV3 suspends the service worker aggressively. On every cold wake the module
// re-evaluates with a fresh (idle) in-memory session, so we must finish restoring
// from storage BEFORE answering any message — otherwise a GET_STATE that wakes the
// worker would reply "idle" and a running session would look deleted.
let readyPromise = null;
function ready() {
  if (!readyPromise) readyPromise = boot().catch((err) => console.error('[Lockd] boot failed', err));
  return readyPromise;
}

// Message types this background handles (used to decide whether to keep the channel open).
const HANDLED = new Set([
  MSG.GET_STATE, MSG.START_SESSION, MSG.PAUSE, MSG.RESUME, MSG.STOP, MSG.SKIP,
  MSG.EXTEND_BREAK, MSG.TOGGLE_ALWAYS_ON, MSG.TICK, MSG.GET_SETTINGS,
  MSG.UPDATE_SETTINGS, MSG.GET_STATS, MSG.BLOCKED_HIT,
]);

function dispatch(message) {
  switch (message.type) {
    case MSG.GET_STATE:
      return machine.getSnapshot();
    case MSG.START_SESSION:
      return machine.startSession(message.config);
    case MSG.PAUSE:
      return machine.pause();
    case MSG.RESUME:
      return machine.resume();
    case MSG.STOP:
      return machine.stop();
    case MSG.SKIP:
      return machine.skip();
    case MSG.EXTEND_BREAK:
      return machine.extendBreak(message.minutes);
    case MSG.TOGGLE_ALWAYS_ON:
      return machine.toggleAlwaysOn(message.value);
    case MSG.TICK:
      return machine.recover().then(() => machine.getSnapshot());
    case MSG.GET_SETTINGS:
      return ensureSettings();
    case MSG.GET_STATS:
      return ensureStats().then((s) => displayStats(s));
    case MSG.BLOCKED_HIT:
      return ensureStats().then(async () => {
        stats.distractionsBlocked += 1;
        await commitStats();
        return { ok: true };
      });
    case MSG.UPDATE_SETTINGS:
      return saveSettings(message.settings).then(async (merged) => {
        settings = merged;
        await reapplyBlocking();
        broadcast({ type: MSG.SETTINGS_CHANGED, settings: merged });
        return merged;
      });
    default:
      return undefined;
  }
}

browser.runtime.onInstalled.addListener(async (details) => {
  console.log('[Lockd] installed/updated:', details.reason);
  await ready();
});

browser.runtime.onStartup?.addListener(async () => {
  console.log('[Lockd] browser startup');
  await ready();
});

browser.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_PHASE) {
    await ready();
    await machine.recover();
  }
});

// Every handled message waits for restore to complete before being served.
browser.runtime.onMessage.addListener((message) => {
  if (!message || !HANDLED.has(message.type)) return undefined;
  return ready().then(() => dispatch(message));
});

// Kick off restore at module load so it's usually done before the first message.
ready();
