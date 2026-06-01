// Lockd background — message router, alarm handler, and blocking driver
// around the session machine.
import browser from 'webextension-polyfill';
import { MSG, ALARM_PHASE } from '../shared/constants.js';
import { loadSettings, saveSettings } from '../shared/settings.js';
import * as machine from './sessionMachine.js';
import { applyBlocking } from './blocking.js';

console.log('[Lockd] background alive');

let settings = null;

async function ensureSettings() {
  if (!settings) settings = await loadSettings();
  return settings;
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

async function boot() {
  await ensureSettings();
  await machine.init();
  await reapplyBlocking(); // ensure rules match restored state on every worker wake
}

browser.runtime.onInstalled.addListener(async (details) => {
  console.log('[Lockd] installed/updated:', details.reason);
  await boot();
});

browser.runtime.onStartup?.addListener(async () => {
  console.log('[Lockd] browser startup');
  await boot();
});

browser.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_PHASE) {
    await machine.recover();
  }
});

browser.runtime.onMessage.addListener((message) => {
  switch (message?.type) {
    case MSG.GET_STATE:
      return Promise.resolve(machine.getSnapshot());
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
});

boot().catch((err) => console.error('[Lockd] boot failed', err));
