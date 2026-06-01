# Store listing copy

## Name
Lockd — Focus & distraction blocker

## Summary (Chrome ≤132 chars / Firefox short)
Lock in. Lockd trims the rabbit holes — YouTube recs, Shorts, Reels, feeds — with Pomodoro sessions you can't casually quit.

## Description
**Lockd doesn't just block sites — it trims them.**

Most blockers are blunt: block youtube.com and you lose the tutorial you actually needed.
Lockd is surgical. During a focus session it hides the distraction *elements* — YouTube
recommendations and Shorts, Instagram Reels, X's "For You" feed, Reddit's endless scroll —
while leaving search and the thing you came for usable.

**How it works**
- Plan a session: pick a duration and a work/break rhythm (e.g. 50/10).
- During work blocks, distractions lock. On breaks, everything unlocks — rest you earned.
- Or flip on **Always-on focus** for a permanent trim.

**What makes it different**
- 🎯 **Element-level presets** — curated per-site blocking that keeps sites usable.
- 📺 **YouTube channel lock** — allow one lofi stream, block every other channel.
- 🚫 **Whole-site blocking** — hard-block the pure time-sinks too.
- 🔥 **Gamified** — streaks, XP & levels, a 28-day focus wall, distractions-blocked count.
- 🌙 **Calm** or 🛰️ **Command** work surfaces; dark + light themes.
- 🔒 **No easy escape** — ending a session early takes deliberate friction, on purpose.

**Honest about limits:** Lockd works in your browser. It can't lock native apps or your phone.

## Permission justifications (for reviewers)
- **storage** — save sessions, settings, and stats locally. No data leaves the device.
- **alarms** — drive work/break phase transitions while the service worker is asleep.
- **declarativeNetRequest** — redirect blocked sites to the in-extension block page during focus.
- **host access (`<all_urls>`)** — required by a blocker: DNR redirect rules apply to the sites
  being blocked, and content scripts run on the curated preset sites (YouTube, Instagram, X, Reddit)
  to hide distraction elements. No browsing data is collected, transmitted, or stored beyond the
  user's own settings.

## Privacy
Lockd collects no personal data and makes no network requests of its own. All session,
settings, and stats data is stored locally via the browser's storage API.

## Categories
Productivity

## Notes
- Fonts (Instrument Serif / Geist) load from Google Fonts; the UI degrades gracefully to
  system fonts if blocked.
