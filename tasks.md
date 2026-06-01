# Lockd — Build Tasks

> Browser-extension-first focus tool. Cross-browser (Chromium + Firefox, shared codebase),
> curated element-blocking presets, work/break **sessions** (headline) + an **always-on** focus toggle.
> Built from the ground up, phase by phase. We finish and verify one phase before starting the next.

**Decisions locked** (from spec analysis):
- Target: Chromium (Chrome/Edge/Brave/Arc) **and** Firefox from one codebase, per-browser manifests.
- Element blocking: **curated presets + on/off toggles** (YouTube, Instagram, X, Reddit… to start).
- Lock model: **work/break sessions are the headline**, plus a quick **always-on** focus toggle.
- Design: reuse the spec's CyberX (dark) / Noteflow (light) system; mockups port into extension pages.

**Conventions**
- `[ ]` todo · `[~]` in progress · `[x]` done.
- Every phase ends with a **Definition of Done (DoD)** = something loadable/verifiable. We don't move on until it's met.
- Logic code uses a `browser.*` polyfill so it's identical across both browsers; only manifests differ.

---

## Phase 0 — Foundation & "hello, loadable extension" ✅ built (pending browser load-test)
Goal: an empty-but-real extension that loads in both browsers.

- [x] Build tooling decided: **Vite + CRXJS** (Chromium-first; Firefox via CRXJS `browser:'firefox'`).
- [x] `package.json` + scripts: `build:chrome`, `build:firefox`, `build` (both), `watch:*`.
- [x] Repo structure (`src/background`, `src/ui/*`, `src/manifest.js`; `content`/`rules`/`shared` added as phases need them).
- [x] `src/manifest.js` generator → Chrome (MV3 `service_worker`) + Firefox (MV3 `background.scripts` + `browser_specific_settings.gecko`). Verified in emitted manifests.
- [x] `webextension-polyfill` shim so `browser.*` works on both (bundled into background + popup).
- [x] Minimal background worker that logs "Lockd alive".
- [x] Placeholder popup that opens and reads `runtime.getManifest()`.
- [x] Build emits `dist/chrome` and `dist/firefox` cleanly.

**DoD:** Loads via `chrome://extensions` (unpacked) **and** `about:debugging` (Firefox); popup opens; no console errors.
> ⏳ Builds are valid MV3 and manifests verified correct. **Needs a manual load-test in each browser** (can't drive a browser from here) before we call Phase 0 fully closed.

---

## Phase 1 — Session model & state machine (no blocking yet) ✅
Goal: the work/break loop runs in the background and is observable.

- [x] `shared/storage.js` — typed get/set wrappers over `browser.storage.local`.
- [x] `shared/constants.js` — STATUS, MSG, STORAGE_KEYS, defaults.
- [x] `shared/session.js` — pure session model + helpers (sequence builder, snapshot, remaining).
- [x] State machine (`background/sessionMachine.js`): `idle → work → break → … → done`, orthogonal `alwaysOn`.
- [x] `chrome.alarms` + absolute timestamps; `recover()` fast-forwards missed transitions after SW sleep/reload.
- [x] Message API (`background/index.js`): start/pause/resume/stop/skip/extend, toggle always-on, get state, TICK.
- [x] Debug popup: live countdown, status pill, block progress, controls, always-on toggle.

**DoD:** Start a session in the popup → watch it tick work→break→work and auto-resume after a reload.
> Builds clean (chrome+firefox). Live-tick + recovery logic in place; verify in browser at the end.

---

## Phase 2 — Blocking engine (whole-site) + block page ✅
Goal: during a work block, blocked sites redirect; during break/idle they don't.

- [x] `shared/resolver.js` — single source of truth: `blockingActive(snap)` (work block OR always-on; off on break/idle/paused).
- [x] `shared/settings.js` — settings model (mode, blocklist, allowlist, presets), load/save/merge, domain normalize.
- [x] `background/blocking.js` — `declarativeNetRequest` dynamic rules; supports **blocklist** + strict **allowlist** modes; redirect to block page.
- [x] Background applies rules on every session/settings change; clears them on break/stop.
- [x] `ui/block` interstitial (design tokens; shows intent + time-until-break; auto-`history.back()` when blocking lifts).
- [x] Manifest: `declarativeNetRequest` + `<all_urls>` host perms + block page in `web_accessible_resources`. Verified in emitted manifest.

**DoD:** With a session running, a blocked domain shows the block page during work and loads normally during break.
> Builds clean (chrome+firefox). Behavior identical across both (same DNR API). Verify in browser at the end.

---

## Phase 3 — Element-level blocking (the differentiator) ✅
Goal: curated presets surgically hide distraction elements while keeping the site usable.

- [x] `rules/presets.js`: per-preset `{ id, group, hosts[], label, description, selectors[], defaultOff? }` + host helpers.
- [x] Content script (`content/elementBlocker.js`) injects a `<style>` of active hide-rules. Pure CSS → auto-applies to SPA-added nodes (no observer needed).
- [x] Presets: **YouTube** (home feed, recs sidebar, Shorts, comments, end-screen), **Instagram** (Reels, Explore, suggested), **X/Twitter** (For You, trending, explore), **Reddit** (feed, popular nav).
- [x] Gated by `blockingActive(snap)` — trims during work/always-on, restores on break.
- [x] Default blocklist trimmed to pure time-sinks (tiktok/facebook) so preset sites stay usable; per-preset toggle plumbing in settings (UI in Phase 5).
- [x] Background fans out STATE_CHANGED/SETTINGS_CHANGED to **tabs** (content scripts) so changes apply without reload. Content script scoped to preset hosts in manifest (verified).

**DoD:** During a work block, YouTube loads but recommendations + Shorts are gone; toggling the preset off restores them.
> Builds clean. Selectors are best-effort (site-change fragility tracked in backlog). Verify in browser at the end.

---

## Phase 4 — Channel-level allowlist
Goal: allow one specific YouTube channel/stream, block the rest.

- [ ] Content script reads current YouTube channel/playlist identity.
- [ ] If not in the allowlist during a work block → redirect to block page (search still allowed if configured).
- [ ] Allowlist stored per session + globally.

**DoD:** Allow one lofi channel; that channel plays during work, any other YouTube video is blocked.

---

## Phase 5 — UI surfaces (port the spec mockups)
Goal: the real, beautiful surfaces from the spec, wired to live state.

- [ ] `shared/theme` — CyberX dark + Noteflow light tokens; theme switch persisted.
- [ ] **Popup = floating mini-timer** (spec §06): block countdown + live dot + always-on toggle + start/stop.
- [ ] **Dashboard** (full extension page): greeting, stat cards, level/XP bar, weekly chart, today's plan, preset toggles, allowlist editor.
- [ ] **Session setup**: duration pills, work/break rhythm, intent input, app/site/preset selection.
- [ ] **Break page**: large sage-tinted countdown, extend/skip.
- [ ] Calm vs. Command work-surface toggle (Command adds live stats + 28-day focus wall).

**DoD:** Full visual flow (dashboard → setup → work → break) navigable and matches the spec's look in both themes.

---

## Phase 6 — Gamification & persistence
Goal: the numbers that pull users back.

- [ ] XP per completed block; levels with names; progress bar.
- [ ] Day streak (consecutive days with a completed session).
- [ ] Focus-this-week hours + trend; sessions today (done/planned); distractions blocked counter.
- [ ] 28-day focus wall (contribution grid) in Command Mode.
- [ ] End-of-session stats roll-up screen.

**DoD:** Completing sessions visibly increments XP/streak/blocked-count and lights up the focus wall; survives restart.

---

## Phase 7 — Exit friction & honesty
Goal: respect the "no easy escape hatch" principle within an extension's limits.

- [ ] One deliberately-annoying mid-session disable (type-a-phrase or timed countdown) — not a soft pause.
- [ ] Honest in-app note about browser-only scope (native apps/phone out of scope for v1).
- [ ] Optional guilt/streak-loss confirmation on early quit.

**DoD:** Disabling a live session requires deliberate friction; quitting early warns about streak loss.

---

## Phase 8 — Packaging, QA & store prep
Goal: shippable on both stores.

- [ ] Icons, store screenshots (reuse the beautiful UI as the marketing asset), descriptions.
- [ ] Cross-browser regression pass (Chrome, Edge, Firefox).
- [ ] `web-ext lint` (Firefox) + Chrome MV3 review checklist; minimal permissions audit.
- [ ] Zipped artifacts for Chrome Web Store + Firefox AMO.

**DoD:** Clean lint, minimal permissions, packaged zips for both stores.

---

## Backlog / later (v1.1+)
- [ ] User-defined selectors / click-to-hide custom blocking.
- [ ] Thin Tauri desktop companion for OS-level lock enforcement (bypass-resistance).
- [ ] Context-aware allowlists; schedules; history & goals views.
- [ ] Phone pairing (the real market gap).

---

### How we proceed
We work **top to bottom, one phase at a time**. After each phase I'll stop, report what's loadable/verifiable against its DoD, and wait before starting the next. First up: **Phase 0**, starting with the build-tooling decision.
