// Thin, typed-ish wrappers over browser.storage.local so the rest of the code
// never touches the raw storage API directly.
import browser from 'webextension-polyfill';

export async function getItem(key, fallback = null) {
  const result = await browser.storage.local.get(key);
  return key in result ? result[key] : fallback;
}

export async function setItem(key, value) {
  await browser.storage.local.set({ [key]: value });
}

export async function removeItem(key) {
  await browser.storage.local.remove(key);
}

export async function getMany(keys) {
  return browser.storage.local.get(keys);
}
