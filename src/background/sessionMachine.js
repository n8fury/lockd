// The session state machine. Holds the authoritative session in memory,
// persists every change to storage, and uses absolute timestamps + chrome.alarms
// so it survives the MV3 service worker going to sleep.
//
// Robustness model:
//  - Each phase has an absolute `phaseEndsAt` timestamp.
//  - An alarm is scheduled for that timestamp to drive the transition when idle.
//  - On boot (or any TICK), `recover()` fast-forwards through any phases whose
//    end time already passed while the worker was asleep.
import browser from 'webextension-polyfill';
import { STATUS, ALARM_PHASE, STORAGE_KEYS } from '../shared/constants.js';
import {
  makeIdleSession,
  startSessionState,
  currentPhase,
  isActive,
  snapshot,
} from '../shared/session.js';
import { getItem, setItem } from '../shared/storage.js';

const MIN = 60_000;

let session = makeIdleSession();
let onChange = () => {}; // set by registerOnChange; used to broadcast + drive blocking later
let onEvent = async () => {}; // set by registerOnEvent; receives stat events
const pending = []; // stat events produced during a transition, flushed on commit

export function registerOnChange(fn) {
  onChange = fn;
}

export function registerOnEvent(fn) {
  onEvent = fn;
}

export function getSession() {
  return session;
}

export function getSnapshot() {
  return snapshot(session);
}

async function persist() {
  await setItem(STORAGE_KEYS.SESSION, session);
}

async function flushEvents() {
  if (pending.length === 0) return;
  const events = pending.splice(0, pending.length);
  for (const e of events) {
    try {
      await onEvent(e);
    } catch (err) {
      console.error('[Lockd] onEvent handler failed', err);
    }
  }
}

async function commit() {
  await persist();
  try {
    onChange(snapshot(session));
  } catch (err) {
    console.error('[Lockd] onChange handler failed', err);
  }
  await flushEvents();
}

async function scheduleAlarm() {
  await browser.alarms.clear(ALARM_PHASE);
  if (isActive(session)) {
    // `when` accepts a past time; Chrome may clamp very short alarms, so TICK
    // from an open UI provides a faster path. The alarm is the closed-UI fallback.
    await browser.alarms.create(ALARM_PHASE, { when: session.phaseEndsAt });
  }
}

/**
 * Advance exactly one phase. Returns true if the session is still active after.
 * @param {boolean} credit whether a finished work block earns stats (false when skipped)
 */
function advanceOne(credit = true) {
  const finished = currentPhase(session);
  if (finished?.type === STATUS.WORK && credit) {
    session.blocksCompleted += 1;
    pending.push({ type: 'workComplete', minutes: finished.minutes });
  }
  const nextIndex = session.phaseIndex + 1;
  if (nextIndex >= session.sequence.length) {
    session.status = STATUS.DONE;
    session.phaseEndsAt = 0;
    pending.push({ type: 'sessionDone', blocksCompleted: session.blocksCompleted });
    return false;
  }
  const next = session.sequence[nextIndex];
  session.phaseIndex = nextIndex;
  session.status = next.type;
  session.phaseEndsAt = Date.now() + next.minutes * MIN;
  return true;
}

/**
 * Fast-forward through any phases that ended while we were asleep, then
 * reschedule the alarm. Safe to call repeatedly (on boot, on alarm, on TICK).
 */
export async function recover() {
  if (!isActive(session)) {
    await scheduleAlarm();
    return;
  }
  let changed = false;
  let guard = 0;
  while (isActive(session) && session.phaseEndsAt <= Date.now() && guard++ < 1000) {
    advanceOne();
    changed = true;
  }
  await scheduleAlarm();
  if (changed) await commit();
}

// ---- Commands (called from message handlers) ----

export async function startSession(config) {
  session = startSessionState(session, config);
  await scheduleAlarm();
  await commit();
  return getSnapshot();
}

export async function pause() {
  if (!isActive(session)) return getSnapshot();
  session.pausedRemainingMs = Math.max(0, session.phaseEndsAt - Date.now());
  session.status = STATUS.PAUSED;
  await browser.alarms.clear(ALARM_PHASE);
  await commit();
  return getSnapshot();
}

export async function resume() {
  if (session.status !== STATUS.PAUSED) return getSnapshot();
  const phase = currentPhase(session);
  session.status = phase?.type ?? STATUS.WORK;
  session.phaseEndsAt = Date.now() + (session.pausedRemainingMs || 0);
  session.pausedRemainingMs = 0;
  await scheduleAlarm();
  await commit();
  return getSnapshot();
}

export async function skip() {
  if (!isActive(session)) return getSnapshot();
  advanceOne(false); // skipping a work block does not earn credit
  await scheduleAlarm();
  await commit();
  return getSnapshot();
}

export async function extendBreak(minutes = 5) {
  if (session.status !== STATUS.BREAK) return getSnapshot();
  session.phaseEndsAt += minutes * MIN;
  await scheduleAlarm();
  await commit();
  return getSnapshot();
}

export async function stop() {
  const alwaysOn = session.alwaysOn;
  session = makeIdleSession(alwaysOn);
  await browser.alarms.clear(ALARM_PHASE);
  await commit();
  return getSnapshot();
}

export async function toggleAlwaysOn(value) {
  session.alwaysOn = typeof value === 'boolean' ? value : !session.alwaysOn;
  await commit();
  return getSnapshot();
}

/** Called once when the worker boots. Restores persisted session and recovers. */
export async function init() {
  const saved = await getItem(STORAGE_KEYS.SESSION, null);
  if (saved && typeof saved === 'object') {
    session = { ...makeIdleSession(), ...saved };
  } else {
    session = makeIdleSession();
  }
  await recover();
}
