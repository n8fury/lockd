// Settings model + load/save. Settings persist independently of any session.
import { BLOCK_MODE, STORAGE_KEYS } from './constants.js';
import { getItem, setItem } from './storage.js';

export const DEFAULT_SETTINGS = {
  mode: BLOCK_MODE.BLOCKLIST,
  // Pure time-sinks are hard-blocked (whole-site redirect). YouTube / Instagram /
  // X / Reddit are deliberately NOT here by default — element presets trim them so
  // they stay usable. Users can still add any of these for a full block.
  blocklist: ['tiktok.com', 'facebook.com'],
  // Used only in 'allowlist' mode (everything else is blocked).
  allowlist: [],
  // Element-blocking presets (Phase 3): { [presetId]: boolean }.
  presets: {},
  // Channel allowlist (Phase 4): YouTube channels allowed during work.
  youtubeChannels: [],
  // When on (and the allowlist is non-empty), only allowlisted channels play
  // during a work block; every other YouTube video/channel is blocked.
  youtubeChannelLock: false,
  theme: 'dark',
};

export async function loadSettings() {
  const saved = await getItem(STORAGE_KEYS.SETTINGS, null);
  return mergeSettings(saved);
}

export function mergeSettings(saved) {
  if (!saved || typeof saved !== 'object') return { ...DEFAULT_SETTINGS };
  return {
    ...DEFAULT_SETTINGS,
    ...saved,
    presets: { ...DEFAULT_SETTINGS.presets, ...(saved.presets || {}) },
  };
}

export async function saveSettings(settings) {
  const merged = mergeSettings(settings);
  await setItem(STORAGE_KEYS.SETTINGS, merged);
  return merged;
}

/**
 * Normalize a YouTube channel reference to a comparable token.
 * Accepts handles ("@LofiGirl", "lofigirl"), channel URLs, /channel/UC… ids,
 * and legacy /c/ /user/ paths. Returns e.g. "h:lofigirl" or "id:uc..." (or null).
 */
export function normalizeChannel(input) {
  let s = String(input || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?youtube\.com/, '');
  if (!s) return null;
  if (s.includes('/channel/')) {
    const id = s.split('/channel/')[1].split(/[/?#]/)[0];
    return id ? `id:${id}` : null;
  }
  let h;
  if (s.includes('/@')) h = s.split('/@')[1];
  else if (s.startsWith('@')) h = s.slice(1);
  else if (s.includes('/c/')) h = s.split('/c/')[1];
  else if (s.includes('/user/')) h = s.split('/user/')[1];
  else h = s.replace(/^@/, '');
  if (h == null) return null;
  h = h.split(/[/?#]/)[0];
  return h ? `h:${h}` : null;
}

/** Normalize a user-entered domain to a bare host (no scheme, no www, no path). */
export function normalizeDomain(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '');
}
