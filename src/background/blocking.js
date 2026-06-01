// Whole-site blocking via declarativeNetRequest dynamic rules.
// Rules are (re)built whenever the session state or settings change, and cleared
// entirely whenever blocking is not active (break / idle / paused / done).
import browser from 'webextension-polyfill';
import { BLOCK_MODE } from '../shared/constants.js';
import { normalizeDomain } from '../shared/settings.js';
import { blockingActive } from '../shared/resolver.js';

const BLOCK_PAGE_PATH = '/src/ui/block/index.html';

function redirectAction() {
  return { type: 'redirect', redirect: { extensionPath: BLOCK_PAGE_PATH } };
}

/** Build the DNR ruleset for the current settings. Assumes blocking is active. */
function buildRules(settings) {
  const rules = [];
  let id = 1;

  if (settings.mode === BLOCK_MODE.ALLOWLIST) {
    // Redirect every top-level http(s) navigation…
    rules.push({
      id: id++,
      priority: 1,
      action: redirectAction(),
      condition: { urlFilter: '|http', resourceTypes: ['main_frame'] },
    });
    // …except allowlisted domains, which win via higher priority.
    for (const domain of dedupeDomains(settings.allowlist)) {
      rules.push({
        id: id++,
        priority: 10,
        action: { type: 'allow' },
        condition: { requestDomains: [domain], resourceTypes: ['main_frame'] },
      });
    }
  } else {
    // Blocklist mode: redirect each listed domain (and its subdomains).
    for (const domain of dedupeDomains(settings.blocklist)) {
      rules.push({
        id: id++,
        priority: 1,
        action: redirectAction(),
        condition: { requestDomains: [domain], resourceTypes: ['main_frame'] },
      });
    }
  }
  return rules;
}

function dedupeDomains(list) {
  const set = new Set((list || []).map(normalizeDomain).filter(Boolean));
  return [...set];
}

/** Apply or clear blocking rules to match the current state. */
export async function applyBlocking(snap, settings) {
  const existing = await browser.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map((r) => r.id);
  const addRules = blockingActive(snap) ? buildRules(settings) : [];

  await browser.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
  console.log(
    `[Lockd] blocking ${addRules.length ? 'ON' : 'off'} — ${addRules.length} rule(s), mode=${settings.mode}`,
  );
}
