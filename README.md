# Lockd

A browser extension that locks you in. Lockd fuses a Pomodoro work/break loop with
**surgical focus blocking** — it doesn't just block whole sites, it trims the rabbit
holes (YouTube recommendations & Shorts, Instagram Reels, X "For You", Reddit feed)
so the sites you need stay usable while the dopamine traps disappear. Cross-browser
(Chromium + Firefox), gamified, and deliberately hard to quit mid-session.

## Features
- **Work/break sessions** + an always-on focus toggle.
- **Element-level presets** — curated, per-site CSS that hides distraction elements (the differentiator).
- **Whole-site blocking** — blocklist (friendly) or strict allowlist mode, via `declarativeNetRequest`.
- **YouTube channel lock** — allow one lofi stream, block every other channel during focus.
- **Calm & Command** work surfaces; **dashboard** with streak, XP/levels, focus wall, distractions blocked.
- **Deliberate exit friction** — ending early takes a countdown + a typed phrase (no soft off-switch).
- Dark (CyberX) + light (Noteflow) themes.

## Develop
```bash
npm install
npm run build          # builds dist/chrome and dist/firefox
npm run watch:chrome   # rebuild on change (Chromium)
```

### Load unpacked
- **Chrome/Edge/Brave/Arc:** `chrome://extensions` → enable Developer mode → *Load unpacked* → `dist/chrome`
- **Firefox:** `about:debugging#/runtime/this-firefox` → *Load Temporary Add-on* → `dist/firefox/manifest.json`

Tip: in the dashboard's **New session**, pick the **Test** duration + **Test** rhythm to run a
whole work→break→done loop in seconds.

## Package for stores
```bash
npm run icons     # regenerate PNG icons (zero-dep)
npm run package   # build both targets + zip → artifacts/lockd-{chrome,firefox}-<version>.zip
npm run lint:firefox  # web-ext lint on dist/firefox
```

## Architecture
```
src/
├─ manifest.js          # one generator → correct Chrome (service_worker) & Firefox (scripts+gecko) MV3
├─ background/          # service worker: session state machine, blocking engine, stats
│  ├─ sessionMachine.js #   work/break/always-on FSM (alarms + absolute timestamps + recovery)
│  ├─ blocking.js       #   declarativeNetRequest rules (blocklist / allowlist)
│  └─ index.js          #   message router, broadcasts, stats increments
├─ content/
│  ├─ elementBlocker.js #   injects preset hide-CSS, gated on focus state
│  └─ youtubeChannel.js #   channel allowlist enforcement
├─ rules/presets.js     # curated element-blocking presets (YouTube/Instagram/X/Reddit)
├─ shared/              # constants, storage, session model, settings, stats, resolver
└─ ui/                  # theme.css + popup (mini-timer) + dashboard (SPA) + block page + exit friction
```

State lives in `browser.storage.local`. The `browser.*` polyfill keeps logic identical across browsers;
only the manifest differs per target.

## Honest limits
Lockd blocks distractions **in your browser**. It cannot lock native apps or your phone —
an extension's honest boundary. See `tasks.md` for the phased build log and the v1.1+ backlog
(custom selectors, a thin desktop companion for OS-level enforcement, phone pairing).
