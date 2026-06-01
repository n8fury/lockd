// The single source of truth for "should blocking be active right now?".
// Both the whole-site engine (Phase 2) and element presets (Phase 3) consult this,
// so the rule lives in exactly one place.
import { STATUS } from './constants.js';

/**
 * Blocking is active during a work block, or whenever always-on is enabled.
 * It is explicitly OFF during break, paused, idle, and done.
 * @param {object} snap session snapshot
 */
export function blockingActive(snap) {
  if (!snap) return false;
  if (snap.alwaysOn) return true;
  return snap.status === STATUS.WORK;
}
