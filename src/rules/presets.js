// Curated element-blocking presets. Each preset hides specific distraction
// elements on a site via CSS, so the site stays usable (search, the video you
// came for, DMs) while the rabbit hole (feeds, recommendations, Shorts) is gone.
//
// Pure module — no browser imports — so it can be consumed by both the content
// script and the manifest generator. Selectors are best-effort and may need
// updating as sites change (tracked in the v1.1 backlog).

/**
 * @typedef {Object} Preset
 * @property {string} id        unique toggle id
 * @property {string} group     site label for UI grouping
 * @property {string[]} hosts   bare hosts this applies to (subdomains matched)
 * @property {string} label     human label for the toggle
 * @property {string} description
 * @property {string[]} selectors CSS selectors to hide
 * @property {boolean} [defaultOff] if true, starts disabled
 */

/** @type {Preset[]} */
export const PRESETS = [
  // ---------------- YouTube ----------------
  {
    id: 'youtube-home-feed',
    group: 'YouTube',
    hosts: ['youtube.com'],
    label: 'Home feed',
    description: 'Hide the recommended video grid on the homepage.',
    selectors: [
      'ytd-browse[page-subtype="home"] #contents.ytd-rich-grid-renderer',
      'ytd-browse[page-subtype="home"] ytd-rich-grid-renderer',
    ],
  },
  {
    id: 'youtube-recommendations',
    group: 'YouTube',
    hosts: ['youtube.com'],
    label: 'Recommendations sidebar',
    description: 'Hide the "up next" / related videos beside the player.',
    selectors: ['#related', 'ytd-watch-next-secondary-results-renderer'],
  },
  {
    id: 'youtube-shorts',
    group: 'YouTube',
    hosts: ['youtube.com'],
    label: 'Shorts',
    description: 'Hide Shorts shelves and the Shorts nav entries.',
    selectors: [
      'ytd-reel-shelf-renderer',
      'ytd-rich-shelf-renderer[is-shorts]',
      'ytd-guide-entry-renderer:has(a[title="Shorts"])',
      'ytd-mini-guide-entry-renderer:has(a[title="Shorts"])',
      'a[title="Shorts"]',
    ],
  },
  {
    id: 'youtube-comments',
    group: 'YouTube',
    hosts: ['youtube.com'],
    label: 'Comments',
    description: 'Hide the comments section under videos.',
    selectors: ['#comments'],
    defaultOff: true,
  },
  {
    id: 'youtube-endscreen',
    group: 'YouTube',
    hosts: ['youtube.com'],
    label: 'End-screen suggestions',
    description: 'Hide the suggested-video overlay at the end of a video.',
    selectors: ['.ytp-endscreen-content', '.ytp-ce-element'],
  },

  // ---------------- Instagram ----------------
  {
    id: 'instagram-reels',
    group: 'Instagram',
    hosts: ['instagram.com'],
    label: 'Reels',
    description: 'Hide the Reels tab so you can DM without the rabbit hole.',
    selectors: ['a[href="/reels/"]', 'a[href^="/reels/"]'],
  },
  {
    id: 'instagram-explore',
    group: 'Instagram',
    hosts: ['instagram.com'],
    label: 'Explore',
    description: 'Hide the Explore tab.',
    selectors: ['a[href="/explore/"]', 'a[href^="/explore/"]'],
  },
  {
    id: 'instagram-suggestions',
    group: 'Instagram',
    hosts: ['instagram.com'],
    label: 'Suggested posts',
    description: 'Hide "Suggested for you" injected into the feed.',
    selectors: ['article:has(span:where([role="link"]))[data-suggested]'],
    defaultOff: true,
  },

  // ---------------- X / Twitter ----------------
  {
    id: 'x-for-you',
    group: 'X / Twitter',
    hosts: ['x.com', 'twitter.com'],
    label: '"For You" tab',
    description: 'Hide the algorithmic "For You" timeline tab (use Following).',
    selectors: ['[role="tablist"] > div:first-child'],
  },
  {
    id: 'x-trending',
    group: 'X / Twitter',
    hosts: ['x.com', 'twitter.com'],
    label: 'Trending & who-to-follow',
    description: 'Hide the trends and suggestions sidebar.',
    selectors: [
      '[aria-label="Timeline: Trending now"]',
      'div[data-testid="sidebarColumn"] section',
    ],
  },
  {
    id: 'x-explore',
    group: 'X / Twitter',
    hosts: ['x.com', 'twitter.com'],
    label: 'Explore nav',
    description: 'Hide the Explore navigation link.',
    selectors: ['a[href="/explore"]'],
  },

  // ---------------- Reddit ----------------
  {
    id: 'reddit-feed',
    group: 'Reddit',
    hosts: ['reddit.com'],
    label: 'Home / popular feed',
    description: 'Hide the scrolling feed on the homepage and r/popular.',
    selectors: ['shreddit-feed', 'div[data-testid="post-container"]'],
  },
  {
    id: 'reddit-popular-nav',
    group: 'Reddit',
    hosts: ['reddit.com'],
    label: 'Popular / All nav',
    description: 'Hide r/popular and r/all navigation entries.',
    selectors: ['a[href="/r/popular/"]', 'a[href="/r/all/"]'],
  },
];

/** Bare hosts that have at least one preset (used for content-script matches). */
export const PRESET_HOSTS = [...new Set(PRESETS.flatMap((p) => p.hosts))];

/** content_scripts match patterns for every preset host (incl. subdomains). */
export const PRESET_MATCHES = PRESET_HOSTS.map((h) => `*://*.${h}/*`);

/** Is `hostname` covered by `host` (exact or subdomain)? */
export function hostMatches(hostname, host) {
  return hostname === host || hostname.endsWith(`.${host}`);
}

/** Presets that apply to the given hostname. */
export function presetsForHost(hostname) {
  const clean = String(hostname || '').replace(/^www\./, '');
  return PRESETS.filter((p) => p.hosts.some((h) => hostMatches(clean, h)));
}

/** Whether a preset is enabled given the settings map (defaults: on unless defaultOff). */
export function isPresetEnabled(preset, presetSettings = {}) {
  const stored = presetSettings[preset.id];
  if (typeof stored === 'boolean') return stored;
  return !preset.defaultOff;
}
