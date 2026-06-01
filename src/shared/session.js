// Pure helpers for the session model. No side effects, no storage, no alarms —
// just functions that build and read a session object. The stateful machine
// (background/sessionMachine.js) owns persistence and scheduling.
import { STATUS, DEFAULT_CONFIG } from './constants.js';

const MIN = 60_000;

/**
 * Build the ordered work/break phase sequence for a config.
 * Total wall-clock time (work + breaks) equals totalMinutes. The sequence
 * always ends on a work phase (no trailing break before "done").
 * @returns {Array<{type:'work'|'break', minutes:number}>}
 */
export function buildSequence({ totalMinutes, workMinutes, breakMinutes }) {
  const seq = [];
  let remaining = totalMinutes;
  let guard = 0;
  while (remaining > 0 && guard++ < 1000) {
    const w = Math.min(workMinutes, remaining);
    seq.push({ type: 'work', minutes: w });
    remaining -= w;
    if (remaining <= 0) break;
    const b = Math.min(breakMinutes, remaining);
    seq.push({ type: 'break', minutes: b });
    remaining -= b;
  }
  return seq;
}

export function makeIdleSession(alwaysOn = false) {
  return {
    status: STATUS.IDLE,
    alwaysOn,
    config: null,
    intent: '',
    sequence: [],
    phaseIndex: 0,
    phaseEndsAt: 0, // absolute ms timestamp
    startedAt: 0,
    blocksCompleted: 0,
    pausedRemainingMs: 0,
  };
}

export function startSessionState(prev, config) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const sequence = buildSequence(cfg);
  const now = Date.now();
  const first = sequence[0];
  return {
    ...makeIdleSession(prev?.alwaysOn ?? false),
    status: first.type, // 'work'
    config: cfg,
    intent: cfg.intent || '',
    sequence,
    phaseIndex: 0,
    phaseEndsAt: now + first.minutes * MIN,
    startedAt: now,
    blocksCompleted: 0,
    pausedRemainingMs: 0,
  };
}

export function currentPhase(session) {
  return session.sequence[session.phaseIndex] || null;
}

export function blocksPlanned(session) {
  return session.sequence.filter((p) => p.type === 'work').length;
}

export function isActive(session) {
  return session.status === STATUS.WORK || session.status === STATUS.BREAK;
}

export function remainingMs(session, now = Date.now()) {
  if (session.status === STATUS.PAUSED) return session.pausedRemainingMs;
  if (isActive(session)) return Math.max(0, session.phaseEndsAt - now);
  return 0;
}

/** A UI-friendly view of the session with computed fields. */
export function snapshot(session, now = Date.now()) {
  return {
    status: session.status,
    alwaysOn: session.alwaysOn,
    intent: session.intent,
    config: session.config,
    phaseIndex: session.phaseIndex,
    phase: currentPhase(session),
    blocksCompleted: session.blocksCompleted,
    blocksPlanned: blocksPlanned(session),
    remainingMs: remainingMs(session, now),
    phaseEndsAt: session.phaseEndsAt,
    startedAt: session.startedAt,
    now,
  };
}
