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

## Phase 0 — Foundation & "hello, loadable extension"
Goal: an empty-but-real extension that loads in both browsers.

- [ ] Decide build tooling (esbuild or Vite) vs. zero-build plain JS — confirm with user.
- [ ] `package.json` + scripts: `build:chrome`, `build:firefox`, `build` (both), `watch`.
- [ ] Repo structure (`src/background`, `src/content`, `src/rules`, `src/ui/*`, `src/shared`).
- [ ] `manifest.base.json` + `manifest.chrome.json` (MV3, service_worker) + `manifest.firefox.json` (MV3, `browser_specific_settings.gecko`, background fallback).
- [ ] `webextension-polyfill` shim so `browser.*` works on both.
- [ ] Minimal background service worker that logs "Lockd alive".
- [ ] Placeholder popup that opens.
- [ ] Build emits `dist/chrome` and `dist/firefox`.

**DoD:** Loads via `chrome://extensions` (unpacked) **and** `about:debugging` (Firefox); popup opens; no console errors.

---

## Phase 1 — Session model & state machine (no blocking yet)
Goal: the work/break loop runs in the background and is observable.

- [ ] `shared/storage.js` — typed get/set wrappers over `browser.storage.local`.
- [ ] `shared/session.js` — session model (duration, work/break rhythm, intent, allowlists, presets on).
- [ ] State machine: `idle → work → break → work → … → done`, plus orthogonal `alwaysOn` flag.
- [ ] `chrome.alarms`-driven tick; transitions fire on schedule and survive service-worker sleep.
- [ ] Message API between background ↔ UI (start/pause/stop session, toggle always-on, get state).
- [ ] Temporary debug popup showing current state + timer counting down.

**DoD:** Start a session in the popup → watch it tick work→break→work and auto-resume after a reload.

---

## Phase 2 — Blocking engine (whole-site) + block page
Goal: during a work block, blocked sites redirect; during break/idle they don't.

- [ ] `shared/resolver.js` — single source of truth: `shouldBlock(url, state)` (handles sessions + always-on).
- [ ] `declarativeNetRequest` dynamic rules generated from the resolver; redirect to `ui/block`.
- [ ] Background applies rules on work-block enter, clears them on break/stop.
- [ ] `ui/block` interstitial page (uses design tokens; shows why blocked + time until break).
- [ ] Verify behavior identical on Chromium & Firefox.

**DoD:** With a session running, a blocked domain shows the block page during work and loads normally during break.

---

## Phase 3 — Element-level blocking (the differentiator)
Goal: curated presets surgically hide distraction elements while keeping the site usable.

- [ ] `rules/` schema: per-site `{ host, label, selectors[], description }` preset definitions.
- [ ] Content script that injects a `<style>` of active hide-rules; reacts to SPA navigation (MutationObserver / `chrome.webNavigation`).
- [ ] First presets: **YouTube** (recs, Shorts shelf, homepage feed, autoplay, comments), **Instagram** (Reels, Explore), **X** (For You, trending), **Reddit** (home feed).
- [ ] Presets gated by session/always-on state via the resolver.
- [ ] Toggle plumbing (storage) — per-preset on/off (UI comes in Phase 5).

**DoD:** During a work block, YouTube loads but recommendations + Shorts are gone; toggling the preset off restores them.

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
