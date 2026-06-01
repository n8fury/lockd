// Single source of truth for the extension manifest, parameterized per browser.
// Chromium uses an MV3 service_worker background; Firefox MV3 uses background.scripts
// and requires a gecko id. Everything else is shared.
import { PRESET_MATCHES } from './rules/presets.js';

const VERSION = '0.0.1';

/**
 * @param {'chrome'|'firefox'} browser
 * @returns {object} a manifest_version 3 manifest
 */
export function getManifest(browser) {
  const base = {
    manifest_version: 3,
    name: 'Lockd',
    version: VERSION,
    description: 'Locks you in — surgical focus blocking with work/break sessions.',
    icons: {
      16: 'src/icons/icon-16.png',
      32: 'src/icons/icon-32.png',
      48: 'src/icons/icon-48.png',
      128: 'src/icons/icon-128.png',
    },
    action: {
      default_popup: 'src/ui/popup/index.html',
      default_title: 'Lockd',
      default_icon: {
        16: 'src/icons/icon-16.png',
        32: 'src/icons/icon-32.png',
      },
    },
    options_ui: {
      page: 'src/ui/dashboard/index.html',
      open_in_tab: true,
    },
    permissions: ['storage', 'alarms', 'declarativeNetRequest'],
    // Broad host access is required for a site blocker: DNR redirect actions need
    // host permission for the requests they rewrite, and content scripts (Phase 3)
    // run on the curated preset sites.
    host_permissions: ['<all_urls>'],
    // The block page is a DNR redirect target, so it must be reachable from web origins.
    web_accessible_resources: [
      {
        resources: ['src/ui/block/index.html', 'assets/*'],
        matches: ['<all_urls>'],
      },
    ],
    // Element-blocking content script, scoped to the curated preset hosts.
    content_scripts: [
      {
        matches: PRESET_MATCHES,
        js: ['src/content/elementBlocker.js'],
        run_at: 'document_start',
        all_frames: false,
      },
      // Channel allowlist enforcement, YouTube only.
      {
        matches: ['*://*.youtube.com/*'],
        js: ['src/content/youtubeChannel.js'],
        run_at: 'document_start',
        all_frames: false,
      },
    ],
  };

  if (browser === 'firefox') {
    return {
      ...base,
      background: {
        scripts: ['src/background/index.js'],
        type: 'module',
      },
      browser_specific_settings: {
        gecko: {
          id: 'lockd@lockd.app',
          strict_min_version: '121.0',
        },
      },
    };
  }

  // Chromium (Chrome / Edge / Brave / Arc)
  return {
    ...base,
    background: {
      service_worker: 'src/background/index.js',
      type: 'module',
    },
  };
}
