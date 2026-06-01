// Shared constants used across background, content scripts, and UI.

export const STATUS = {
  IDLE: 'idle',
  WORK: 'work',
  BREAK: 'break',
  PAUSED: 'paused',
  DONE: 'done',
};

// Messages exchanged between UI ↔ background.
export const MSG = {
  GET_STATE: 'GET_STATE',
  START_SESSION: 'START_SESSION',
  PAUSE: 'PAUSE',
  RESUME: 'RESUME',
  STOP: 'STOP',
  SKIP: 'SKIP',
  EXTEND_BREAK: 'EXTEND_BREAK',
  TOGGLE_ALWAYS_ON: 'TOGGLE_ALWAYS_ON',
  TICK: 'TICK', // UI nudge: "a phase may have ended, re-check"
  STATE_CHANGED: 'STATE_CHANGED', // broadcast from background
  SETTINGS_CHANGED: 'SETTINGS_CHANGED', // broadcast from background
  GET_SETTINGS: 'GET_SETTINGS',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  GET_STATS: 'GET_STATS',
};

// Blocking modes:
//  - 'blocklist': block a set of distracting domains (friendly default).
//  - 'allowlist': block everything except an explicit allowlist (the spec's strict lock).
export const BLOCK_MODE = { BLOCKLIST: 'blocklist', ALLOWLIST: 'allowlist' };

export const STORAGE_KEYS = {
  SESSION: 'session',
  SETTINGS: 'settings',
  STATS: 'stats',
};

export const ALARM_PHASE = 'lockd-phase';

// Default session config (minutes). Fractional minutes are allowed (used by test sessions).
export const DEFAULT_CONFIG = {
  intent: '',
  totalMinutes: 120,
  workMinutes: 50,
  breakMinutes: 10,
};
