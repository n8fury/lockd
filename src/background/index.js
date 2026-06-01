// Lockd background — Phase 0 skeleton.
// In later phases this becomes the session state machine (work/break loop + always-on)
// and the owner of the blocking engine. For now it just proves the worker boots.

import browser from 'webextension-polyfill';

console.log('[Lockd] background alive');

browser.runtime.onInstalled.addListener((details) => {
  console.log('[Lockd] installed/updated:', details.reason);
});

browser.runtime.onStartup?.addListener(() => {
  console.log('[Lockd] browser startup');
});
