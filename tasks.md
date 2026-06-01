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

## Phase 4 — Channel-level allowlist ✅
Goal: allow one specific YouTube channel/stream, block the rest.

- [x] `content/youtubeChannel.js` resolves the current channel — from `/@`, `/channel/UC…`, `/c/`, `/user/` paths, or the owner link on `/watch` pages.
- [x] `shared/settings.js` `normalizeChannel()` maps handles/ids/URLs to comparable tokens (`h:` / `id:`), shared by content script + UI.
- [x] When `youtubeChannelLock` is on (+ non-empty allowlist) during a work block / always-on, non-allowlisted channels redirect to the block page (`location.replace`, no back-loop). Home/search untouched (feed hidden by preset).
- [x] SPA-aware: re-checks on `yt-navigate-finish`/`popstate` + brief poll for late-loading `/watch` owner link; reacts to STATE/SETTINGS broadcasts.
- [x] Settings: `youtubeChannelLock` flag + `youtubeChannels` list. Debug controls added to popup (lock toggle, add/remove channels) for testing.
- [x] Manifest: second content script scoped to `*://*.youtube.com/*` (verified, 2 content scripts).

**DoD:** Allow one lofi channel; that channel plays during work, any other YouTube video is blocked.
> Builds clean (chrome+firefox). Verify in browser at the end.

---

## Phase 5 — UI surfaces (port the spec mockups) ✅
Goal: the real, beautiful surfaces from the spec, wired to live state.

- [x] `ui/theme.css` — CyberX dark + Noteflow light tokens; theme switch persisted in settings + applied on every page.
- [x] **Popup = mini-timer** (spec §06): themed, live countdown + status dot, contextual controls (pause/resume/end, +5/skip, quick-start/plan), always-on toggle, "Open dashboard".
- [x] **Dashboard** (full page SPA, also `options_ui`): greeting, 4 stat cards, level/XP bar, preset toggles, hard-block editor, YouTube channel-lock editor.
- [x] **Session setup**: duration pills (1/2/4/6h + Test), rhythm pills (25/5, 50/10, 90/15, Test), intent input, Calm/Command surface pick → starts session.
- [x] **Break view**: sage-tinted big countdown, "everything unlocked", +5 / skip / end.
- [x] **Calm vs Command** work surface toggle (Command adds live stat tiles + 28-day focus wall); count up/down toggle; auto-routing by session status.
- [x] `shared/stats.js` model + `GET_STATS` so the dashboard renders real shapes (XP/level/streak/wall); increments wired in Phase 6.

**DoD:** Full visual flow (dashboard → setup → work → break) navigable and matches the spec's look in both themes.
> Builds clean (chrome+firefox); dashboard bundled + registered as options_ui. Stats show zeros until Phase 6 wires increments. Verify visuals in browser at the end.

---

## Phase 6 — Gamification & persistence ✅
Goal: the numbers that pull users back.

- [x] Session machine emits `workComplete` / `sessionDone` events (flushed on commit); `skip()` on a work block earns no credit.
- [x] Background increments on `workComplete`: XP (1/min), `totalFocusMinutes`, and `daily[today]` (feeds the focus wall).
- [x] Day streak on `sessionDone` (continues if last session was yesterday, else resets to 1); `displayStats()` shows 0 when the streak has lapsed.
- [x] Sessions-today counter (day-scoped, auto-resets); distractions-blocked counter via `BLOCKED_HIT` reported by the block page (once per interception).
- [x] Focus-this-week derived from `daily`; 28-day focus wall lights up in Command Mode.
- [x] End-of-session **roll-up view** (blocks, focused time, XP earned, streak) + "Back to dashboard".
- [x] `STATS_CHANGED` broadcast → dashboard/popup update live; all stats persisted in `browser.storage.local`.

**DoD:** Completing sessions visibly increments XP/streak/blocked-count and lights up the focus wall; survives restart.
> Builds clean (chrome+firefox). Use the Test rhythm to see a full loop quickly. Verify in browser at the end.

---

## Phase 7 — Exit friction & honesty ✅
Goal: respect the "no easy escape hatch" principle within an extension's limits.

- [x] `ui/exitFriction.js` — reusable `confirmExit()` modal requiring BOTH an 8s countdown AND typing a guilt-tinged phrase ("i am giving up"); self-styling via theme tokens so popup + dashboard share it.
- [x] Honest browser-only scope note on the dashboard (native apps/phone out of scope; the work happens where the scrolling does).
- [x] Loss warning baked into the modal: states blocks-done won't count, no streak, no XP (dashboard variant names the intent + block count).
- [x] Gated every session-end: dashboard work/break "End session" and popup "End" both route through the friction (pause stays a soft control).

**DoD:** Disabling a live session requires deliberate friction; quitting early warns about streak loss.
> Builds clean (chrome+firefox). Verify the modal feel in browser at the end.

---

## Phase 8 — Packaging, QA & store prep ✅
Goal: shippable on both stores.

- [x] Icons (16/32/48/128) via a zero-dep PNG generator (`scripts/gen-icons.mjs`, built-in zlib); wired into manifest `icons` + `action.default_icon`.
- [x] Zero-dep ZIP packager (`scripts/package.mjs`) → `artifacts/lockd-{chrome,firefox}-<version>.zip`; verified (manifest at root, 23 files, parses).
- [x] `web-ext lint` on `dist/firefox`: **0 errors**, 15 warnings (all `innerHTML` — allowed by AMO).
- [x] Permissions audit documented in `store/listing.md`; closed the real risk by HTML-escaping user-controlled values before `innerHTML` (`esc()`).
- [x] Store listing copy (`store/listing.md`) + screenshot shot-list (`store/screenshots.md`) + project `README.md`.
- [x] `npm run package` / `npm run lint:firefox` scripts added.

**DoD:** Clean lint, minimal permissions, packaged zips for both stores.
> 0 lint errors; zips build + validate. Screenshots must be captured manually from the loaded extension (see `store/screenshots.md`).

---

## Backlog / later (v1.1+)
- [ ] User-defined selectors / click-to-hide custom blocking.
- [ ] Thin Tauri desktop companion for OS-level lock enforcement (bypass-resistance).
- [ ] Context-aware allowlists; schedules; history & goals views.
- [ ] Phone pairing (the real market gap).

---

### How we proceed
We work **top to bottom, one phase at a time**. After each phase I'll stop, report what's loadable/verifiable against its DoD, and wait before starting the next. First up: **Phase 0**, starting with the build-tooling decision.
