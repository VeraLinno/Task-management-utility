import { initUI } from './ui/events.js';

async function start(): Promise<void> {
  try {
    await initUI();
  } catch (err) {
    console.error(err);
    const el = document.getElementById('message');
    if (el) {
      el.textContent = 'Failed to start app: ' + (err && (err as any).message ? (err as any).message : String(err));
      el.classList.add('message--error');
      el.hidden = false;
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}