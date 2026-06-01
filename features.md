# Lockd — Features

> A browser extension that locks you in. Surgical focus blocking + Pomodoro sessions you can't casually quit. Chromium & Firefox.

---

## 🎯 Surgical blocking (the core idea)

Most blockers are blunt — block `youtube.com` and you lose the tutorial you actually needed. Lockd is surgical: it removes the *rabbit holes* while keeping the site usable.

### Element-level presets
Curated, per-site CSS that hides distraction elements during focus. Each is a toggle.

| Site | What it trims |
|------|---------------|
| **YouTube** | Home feed · Recommendations sidebar · Shorts shelves & nav · End-screen suggestions · Comments *(optional)* |
| **Instagram** | Reels tab · Explore tab · Suggested posts *(optional)* |
| **X / Twitter** | "For You" tab · Trending & who-to-follow · Explore nav |
| **Reddit** | Home / popular feed · Popular & All nav |

Search and the thing you came for stay usable. On breaks, everything reappears — the reward.

### Whole-site blocking
For pure time-sinks. Two modes:
- **Blocklist** *(default)* — block a set of domains (ships with `tiktok.com`, `facebook.com`).
- **Allowlist** *(strict)* — block *everything* except an explicit allowlist.

Blocked navigations redirect to an in-extension block page showing the intent and a live "break in mm:ss" countdown — and it steps aside automatically when the break begins.

### YouTube channel lock
Allow one specific channel (e.g. a lofi stream) and block every other channel and video during focus. Accepts `@handles`, `/channel/UC…` IDs, or full URLs.

---

## ⏱️ Focus sessions

- **Pomodoro loop** — pick a total duration (1 / 2 / 4 / 6h) and a work/break rhythm (25/5, 50/10, 90/15).
- **Work blocks lock; breaks unlock** — distractions return on breaks, so rest feels earned.
- **Always-on focus** — a single toggle that keeps blocking active without a timed session.
- **Resilient** — sessions use absolute timestamps + alarms, so they survive the browser sleeping or the extension reloading mid-session.

---

## 🖥️ Two work surfaces

- **🌙 Calm** — one giant timer, nothing else. The zen-study surface.
- **🛰️ Command** — mission control: timer + live stat tiles + a 28-day focus wall.
- **Count toggle** — show *time left* (countdown) or *time focused* (count-up).

---

## 🔥 Gamification

- **XP & levels** — 1 XP per focused minute; named levels from *Spark* to *Monk Mode*.
- **Day streak** — consecutive days with a completed session.
- **Focus this week** — total focused hours, last 7 days.
- **Sessions today** — completed sessions, day-scoped.
- **Distractions blocked** — every interception counted.
- **28-day focus wall** — a contribution-graph grid that brightens with focus; today stands out.
- **End-of-session roll-up** — blocks completed, time focused, XP earned, streak.

---

## 🔒 Deliberate exit friction

Ending a session early is intentionally hard — the whole point of a lock. The give-up path requires **both** an 8-second countdown **and** typing a phrase before it'll let you out. Pause stays a soft control; quitting costs something.

---

## 🎨 Design

- **Dark (CyberX)** and **Light (Noteflow)** themes, switchable and persisted.
- Instrument Serif + Geist + Geist Mono; a "serious tool that happens to be beautiful."

---

## 🛡️ Privacy

- **No accounts, no tracking, no network calls of its own.**
- All sessions, settings, and stats live in your browser's local storage.

---

## 🌐 Browser support

One codebase, two builds — **Chromium** (Chrome, Edge, Brave, Arc) and **Firefox** — via Manifest V3 and the `browser.*` polyfill.

---

## 🗺️ On the roadmap (v1.1+)

- User-defined / click-to-hide custom element blocking
- A thin desktop companion for OS-level enforcement (bypass resistance)
- Context-aware allowlists, schedules, history & goals
- Phone pairing — the real gap an extension can't reach

> **Honest limit:** Lockd works *in your browser*. It can't lock native apps or your phone — that's an extension's boundary, and the doom-scrolling mostly happens in the browser anyway.
