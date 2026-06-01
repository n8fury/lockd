// Deliberately-annoying session exit. The spec's retention thesis: any soft
// "pause/off" button gets used, so ending a session early must take real friction.
// This requires BOTH waiting out a short countdown AND typing a guilt-tinged phrase,
// and it states the loss plainly. Self-styling so popup + dashboard can both use it.
let stylesInjected = false;

function injectStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
  .lockd-fric-overlay {
    position: fixed; inset: 0; z-index: 9999;
    display: flex; align-items: center; justify-content: center; padding: 16px;
    background: rgba(5, 2, 16, 0.72); backdrop-filter: blur(6px);
    animation: lockdFricIn 0.18s ease;
  }
  @keyframes lockdFricIn { from { opacity: 0; } to { opacity: 1; } }
  .lockd-fric-modal {
    width: 100%; max-width: 420px;
    background: var(--bg-elev, #1a0f3d); color: var(--text, #f0eaff);
    border: 0.5px solid var(--border-strong, rgba(180,160,255,0.2));
    border-radius: 18px; padding: 26px 26px 22px;
    box-shadow: 0 30px 80px rgba(0,0,0,0.5);
    font-family: 'Geist', system-ui, sans-serif;
  }
  .lockd-fric-modal h2 {
    font-family: 'Instrument Serif', Georgia, serif; font-weight: 400;
    font-size: 28px; margin: 0 0 8px; letter-spacing: -0.01em;
  }
  .lockd-fric-conseq { font-size: 14px; color: var(--text-muted, #9b92c9); margin: 0 0 18px; line-height: 1.5; }
  .lockd-fric-instruct { font-size: 13px; color: var(--text-dim, #6b6299); margin: 0 0 8px; }
  .lockd-fric-instruct b { color: var(--text, #f0eaff); }
  .lockd-fric-input {
    width: 100%; box-sizing: border-box; background: var(--bg-card, #2b1b5a);
    border: 0.5px solid var(--border, rgba(180,160,255,0.1)); border-radius: 10px;
    color: var(--text, #f0eaff); font-family: inherit; font-size: 15px;
    padding: 12px 14px; margin-bottom: 18px;
  }
  .lockd-fric-actions { display: flex; gap: 10px; justify-content: flex-end; }
  .lockd-fric-actions button {
    font-family: inherit; font-size: 13px; font-weight: 500;
    padding: 11px 18px; border-radius: 10px; cursor: pointer; border: 0.5px solid transparent;
  }
  .lockd-fric-cancel {
    background: var(--cta-bg, linear-gradient(135deg,#b47cff,#ff6bcb)); color: var(--on-primary, #fff);
  }
  .lockd-fric-confirm {
    background: transparent; color: var(--acc-coral, #ff7a6e);
    border-color: var(--border, rgba(180,160,255,0.1));
  }
  .lockd-fric-confirm:disabled { opacity: 0.4; cursor: not-allowed; }
  .lockd-fric-confirm:not(:disabled):hover { border-color: var(--acc-coral, #ff7a6e); }
  `;
  document.head.appendChild(style);
}

/**
 * @returns {Promise<boolean>} true if the user pushed through the friction to end.
 */
export function confirmExit({
  phrase = 'i am giving up',
  seconds = 8,
  title = 'End the session early?',
  consequence = "Ending now abandons this session — it won't count toward your streak or XP.",
} = {}) {
  injectStyles();
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'lockd-fric-overlay';
    overlay.innerHTML = `
      <div class="lockd-fric-modal" role="dialog" aria-modal="true">
        <h2>${title}</h2>
        <p class="lockd-fric-conseq">${consequence}</p>
        <p class="lockd-fric-instruct">Type <b>“${phrase}”</b> to confirm.</p>
        <input class="lockd-fric-input" type="text" autocomplete="off" autocorrect="off"
               autocapitalize="off" spellcheck="false" />
        <div class="lockd-fric-actions">
          <button class="lockd-fric-cancel">Keep going</button>
          <button class="lockd-fric-confirm" disabled>Wait ${seconds}s…</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const input = overlay.querySelector('.lockd-fric-input');
    const confirm = overlay.querySelector('.lockd-fric-confirm');
    const cancel = overlay.querySelector('.lockd-fric-cancel');

    let remaining = seconds;
    const matched = () => input.value.trim().toLowerCase() === phrase.toLowerCase();
    const update = () => { confirm.disabled = !(remaining <= 0 && matched()); };

    const timer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(timer);
        confirm.textContent = 'End session';
        update();
      } else {
        confirm.textContent = `Wait ${remaining}s…`;
      }
    }, 1000);

    const close = (result) => {
      clearInterval(timer);
      document.removeEventListener('keydown', onKey);
      overlay.remove();
      resolve(result);
    };
    const onKey = (e) => { if (e.key === 'Escape') close(false); };

    input.addEventListener('input', update);
    cancel.addEventListener('click', () => close(false));
    confirm.addEventListener('click', () => { if (!confirm.disabled) close(true); });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
    document.addEventListener('keydown', onKey);
    input.focus();
  });
}
