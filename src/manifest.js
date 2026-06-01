// Single source of truth for the extension manifest, parameterized per browser.
// Chromium uses an MV3 service_worker background; Firefox MV3 uses background.scripts
// and requires a gecko id. Everything else is shared.

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
    action: {
      default_popup: 'src/ui/popup/index.html',
      default_title: 'Lockd',
    },
    // Kept minimal for Phase 0; blocking-related permissions arrive in later phases.
    permissions: ['storage', 'alarms'],
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
