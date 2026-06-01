// Stats model: streak, focus time, XP/level, and the focus-wall daily map.
// Phase 5 defines the shape + read helpers so the dashboard can render.
// Phase 6 wires the increments (XP per block, streak updates, etc.).
import { STORAGE_KEYS } from './constants.js';
import { getItem, setItem } from './storage.js';

export const DEFAULT_STATS = {
  streak: 0,
  lastSessionDay: null, // 'YYYY-MM-DD'
  sessionsToday: 0,
  sessionsDay: null, // day the sessionsToday counter belongs to
  distractionsBlocked: 0,
  totalFocusMinutes: 0,
  xp: 0,
  daily: {}, // { 'YYYY-MM-DD': focusMinutes }
};

// Level thresholds (cumulative XP). 1 XP ≈ 1 focused minute is a reasonable default.
const LEVELS = [
  { min: 0, name: 'Spark' },
  { min: 100, name: 'Kindling' },
  { min: 300, name: 'Steady' },
  { min: 600, name: 'Focused' },
  { min: 1000, name: 'Locked In' },
  { min: 1600, name: 'Flow Master' },
  { min: 2500, name: 'Deep Diver' },
  { min: 4000, name: 'Monk Mode' },
];

export function levelInfo(xp = 0) {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i += 1) {
    if (xp >= LEVELS[i].min) idx = i;
  }
  const current = LEVELS[idx];
  const next = LEVELS[idx + 1] || null;
  const floor = current.min;
  const ceil = next ? next.min : floor;
  return {
    level: idx + 1,
    name: current.name,
    xpInto: xp - floor,
    xpForNext: next ? ceil - floor : null,
    progress: next ? Math.min(1, (xp - floor) / (ceil - floor)) : 1,
    isMax: !next,
  };
}

export function mergeStats(saved) {
  if (!saved || typeof saved !== 'object') return { ...DEFAULT_STATS };
  return { ...DEFAULT_STATS, ...saved, daily: { ...(saved.daily || {}) } };
}

export async function loadStats() {
  return mergeStats(await getItem(STORAGE_KEYS.STATS, null));
}

export async function saveStats(stats) {
  const merged = mergeStats(stats);
  await setItem(STORAGE_KEYS.STATS, merged);
  return merged;
}

/**
 * Normalize stored stats for display "as of today": a streak only counts if the
 * last completed session was today or yesterday, and sessionsToday resets when
 * the day rolls over. Does not mutate stored values.
 */
export function displayStats(stats) {
  const today = dayKey();
  const yesterday = dayKey(new Date(Date.now() - 86_400_000));
  const streakAlive = stats.lastSessionDay === today || stats.lastSessionDay === yesterday;
  return {
    ...stats,
    streak: streakAlive ? stats.streak : 0,
    sessionsToday: stats.sessionsDay === today ? stats.sessionsToday : 0,
  };
}

export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Last `days` days as [{ date, minutes }], oldest first — for the focus wall. */
export function focusWall(stats, days = 28) {
  const out = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = dayKey(d);
    out.push({ date: key, minutes: stats.daily?.[key] || 0 });
  }
  return out;
}

/** Sum focus minutes over the last 7 days. */
export function weekMinutes(stats) {
  return focusWall(stats, 7).reduce((sum, c) => sum + c.minutes, 0);
}
