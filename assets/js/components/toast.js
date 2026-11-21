// Toast (Figma Toasts_alert): toast(message, type). type: 'error' | 'liked' | 'playlist' | 'removed' | 'success' | undefined.
import { icon } from '../icons.js';
import { esc } from '../util.js';

const TYPES = {
  error:    { title: 'Error!',            icon: 'x' },
  liked:    { title: 'Liked!',            icon: 'heart' },
  playlist: { title: 'New Playlist!',     icon: 'list-plus' },
  removed:  { title: 'Removed Playlist!', icon: 'list-plus' },
  success:  { title: 'Success!',          icon: 'check' },
  info:     { title: 'Done!',             icon: 'list-music' },
};
const MAX = 3;
const MS = 3500;

function host() {
  let h = document.getElementById('toasts');
  if (!h) {
    h = document.createElement('div');
    h.id = 'toasts';
    h.setAttribute('role', 'status');
    h.setAttribute('aria-live', 'polite');
    document.body.appendChild(h);
  }
  return h;
}

export function toast(msg = '', type = 'info') {
  const k = TYPES[String(type).toLowerCase()] ? String(type).toLowerCase() : 'info';
  const t = TYPES[k];
  const el = document.createElement('div');
  el.className = `toast toast-${k}`;
  el.innerHTML = `<span class="toast-icon">${icon(t.icon, 24)}</span>
    <span class="toast-text"><span class="toast-title">${t.title}</span><span class="toast-msg">${esc(msg)}</span></span>`;
  const h = host();
  h.appendChild(el);
  while (h.children.length > MAX) h.firstElementChild.remove();
  const close = () => { el.classList.add('is-leaving'); setTimeout(() => el.remove(), 200); };
  const timer = setTimeout(close, MS);
  el.addEventListener('click', () => { clearTimeout(timer); close(); });
  return el;
}
