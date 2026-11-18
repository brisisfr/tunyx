import { icon } from './icons.js';

export class ApiError extends Error {
  constructor(status, message) { super(message); this.name = 'ApiError'; this.status = status; }
}

const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** Escape anything that came from the DB before putting it in HTML (titles/artists are user-supplied). */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => MAP[c]);

/** 275 -> "4:35" (player clock) */
export function fmtTime(sec) {
  if (sec == null || !isFinite(sec)) return '0:00';
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
/** like fmtTime but shows a dash when the DB has no duration */
export const fmtDur = (sec) => (sec == null ? '–:––' : fmtTime(sec));
/** 11520 -> "3 hr 12 min" */
export function fmtTotal(sec) {
  const m = Math.round(sec / 60);
  const h = Math.floor(m / 60);
  return h ? `${h} hr ${m % 60} min` : `${m} min`;
}
export function debounce(fn, ms = 300) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

/** DB paths are relative to the site root; encode each segment so odd filenames still work. */
export function assetUrl(p) {
  if (!p) return '';
  return String(p).split('/').map((s) => encodeURIComponent(s).replace(/['()]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())).join('/');
}

const GRADS = [
  'linear-gradient(135deg,#3a2a60,#bc74e2 190%)',
  'linear-gradient(135deg,#2c2a5e,#55C9D8 190%)',
  'linear-gradient(135deg,#352a5a,#A493F0 190%)',
  'linear-gradient(135deg,#2a3260,#bc74e2 170%)',
];
/** One cover element. No cover_path (or the file 404s) -> brand gradient placeholder. size: sm | md | fill | wide */
export function coverHTML(t, size = 'md') {
  const g = GRADS[Math.abs(t?.track_id ?? 0) % GRADS.length];
  if (t?.cover_path) {
    return `<span class="cover ${size}" style="background-image:url('${esc(assetUrl(t.cover_path))}'),${g}"></span>`;
  }
  return `<span class="cover ${size}" style="background-image:${g}">${icon('music', 22)}</span>`;
}

/** Tell the router to re-render the current view (used after add/remove/etc). */
export const refreshView = () => window.dispatchEvent(new Event('tunyx:refresh'));

export function emptyHTML(iconName, title, text = '', extra = '', compact = false) {
  return `<div class="empty ${compact ? 'compact' : ''}">${icon(iconName, 40)}<div><h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ''}</div>${extra}</div>`;
}
