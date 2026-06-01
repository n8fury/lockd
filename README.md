<div align="center">

# ◆ Lockd

### Lock in. Stay in flow.

**Lockd is a browser extension that fuses a Pomodoro work/break loop with _surgical_ focus blocking.**
It doesn't just block whole sites — it trims the rabbit holes (YouTube recommendations & Shorts,
Instagram Reels, X's "For You" feed, Reddit's endless scroll) so the sites you _need_ stay usable
while the dopamine traps disappear.

Cross-browser (Chromium + Firefox) · Gamified · Private by default · Deliberately hard to quit.

</div>

---

## Why Lockd?

> _"I run a command in my editor, and while it executes I open YouTube or Reels. My brain drains, and I lose the thread."_

That's the moment Lockd is built for. The fix isn't a blunt "block youtube.com" — you legitimately
need YouTube for a tutorial. Lockd is **surgical**: during a focus session it hides the *distraction
elements* and leaves the rest working. Search still works. The video you came for still plays. The
infinite feed, the Shorts, the "up next" rabbit hole — gone. They come back on your break.

---

## Features at a glance

| | |
|---|---|
| 🎯 **Surgical element blocking** | Curated per-site presets hide feeds, Shorts, Reels, recommendations — sites stay usable |
| 🚫 **Whole-site blocking** | Hard-block time-sinks (blocklist) or block everything except an allowlist (strict mode) |
| 📺 **YouTube channel lock** | Allow one channel (a lofi stream, a course), block the rest |
| ⏱️ **Pomodoro sessions** | Custom duration + work/break rhythm; work locks, breaks unlock |
| ♾️ **Always-on focus** | One toggle to keep blocking on without a timer |
| 🌙🛰️ **Calm & Command surfaces** | Zen single-timer, or mission-control with live stats + focus wall |
| 🔥 **Gamification** | Streaks, XP & levels, 28-day focus wall, distractions-blocked count, session roll-up |
| 🔒 **Exit friction** | Quitting early takes a countdown + a typed phrase — no soft off-switch |
| 🎨 **Dark & light themes** | CyberX dark, Noteflow light — switchable, persisted |
| 🛡️ **Private** | No accounts, no tracking, no network calls — everything stays on your device |

📄 **Full breakdown:** [`features.md`](features.md) · or open the visual showcase [`features.html`](features.html).

---

## Install

> Store listings are in prep. For now, load it unpacked from a build.

**Build it**
```bash
npm install
npm run build      # outputs dist/chrome and dist/firefox
```

**Chrome / Edge / Brave / Arc**
1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right)
3. **Load unpacked** → select the `dist/chrome` folder
4. Pin Lockd to your toolbar

**Firefox**
1. Open `about:debugging#/runtime/this-firefox`
2. **Load Temporary Add-on…** → select `dist/firefox/manifest.json`

---

## How to use

**1. Plan a session.** Click the toolbar icon → **Open dashboard** → **New session**. Pick a duration
(1/2/4/6h), a rhythm (e.g. 50/10), name what you're working on, and choose your surface — **Calm** or **Command**.

**2. Lock in.** During work blocks, your distractions are blocked and trimmed. The popup is a glanceable
mini-timer; the dashboard is your full surface.

**3. Breathe on breaks.** Everything unlocks, a big clock counts down your rest, then work resumes automatically.

**4. Tune your blocking** (dashboard):
- **Distraction presets** — toggle exactly which elements get hidden per site.
- **Hard-blocked sites** — add domains to block entirely.
- **YouTube channel lock** — turn it on and add the channels you'll allow.

**5. Watch the numbers climb.** Finish sessions to build your streak, earn XP, and light up the focus wall.

> **Quick demo:** in **New session**, pick the **Test** duration + **Test** rhythm to run a whole
> work → break → done loop in seconds (keep the dashboard open). Full walkthrough: [`eval.html`](eval.html).

---

## Privacy

Lockd collects **nothing**. It has no accounts, makes no network requests of its own, and includes no
analytics or trackers. Your sessions, settings, and stats are stored locally via the browser's storage API
and never leave your device.

---

## Honest limits

Lockd works **in your browser**. It can't lock native apps or your phone — that's the honest boundary of
an extension, and most browser doom-scrolling happens where Lockd lives anyway. It's a focus aid for the
willing, not an OS-level prison (a desktop companion for that is on the roadmap).

---

## Browser support

One codebase, two builds, via Manifest V3 and the `browser.*` polyfill:

- **Chromium** — Chrome, Edge, Brave, Arc
- **Firefox**

---

## Development

```bash
npm run build          # build both targets
npm run watch:chrome   # rebuild on change (Chromium)
npm run icons          # regenerate PNG icons (zero-dep)
npm run package        # build + zip → artifacts/lockd-{chrome,firefox}-<version>.zip
npm run lint:firefox   # web-ext lint on dist/firefox
```

**Project layout**
```
src/
├─ manifest.js          # one generator → correct Chrome & Firefox MV3 manifests
├─ background/          # service worker: session state machine, blocking engine, stats
├─ content/             # element-blocker + YouTube channel-lock content scripts
├─ rules/presets.js     # curated element-blocking presets
├─ shared/              # constants, storage, session, settings, stats, resolver
└─ ui/                  # theme + popup (mini-timer) + dashboard (SPA) + block page + exit friction
```

Built with [Vite](https://vitejs.dev/) + [CRXJS](https://crxjs.dev/). Built phase by phase — the full
build log and the v1.1+ backlog live in [`tasks.md`](tasks.md).

---

## Roadmap (v1.1+)

- Click-to-hide / user-defined custom element blocking
- Thin desktop companion for OS-level enforcement
- Context-aware allowlists, schedules, history & goals
- Phone pairing

---

<div align="center">
<sub>◆ Lockd · a focus tool that happens to be beautiful</sub>
</div>
