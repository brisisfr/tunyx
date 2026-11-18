// Track row (Figma "track/row"): compact (Home history grid) and full (lists) variants.
// Contract used by callers: syncRows(root = document) -> marks .is-playing / .is-liked.
// Views call: container.innerHTML = trackHeaderHTML() + tracks.map(t => trackRowHTML(t, {variant:'full', index:i})).join('');
//             bindRows(container, tracks, 'Playlist name')   // click-to-play + row menu, delegated, call once per container
import { store } from '../store.js';
import { player } from '../player.js';
import { getTrack } from '../api.js';
import { icon } from '../icons.js';
import { esc, fmtDur, assetUrl } from '../util.js';
import { toast } from './toast.js';

/** cover/placeholder: elevated square + music icon; a real cover_path is layered on top. */
export function rowCoverHTML(t) {
  const img = t?.cover_path ? `<img src="${esc(assetUrl(t.cover_path))}" alt="" loading="lazy" onerror="this.remove()">` : '';
  return `<span class="tr-cover">${icon('music', 20)}${img}</span>`;
}

/** variant: 'compact' | 'full'. index (optional) is shown only in the full variant as the row number. */
export function trackRowHTML(t, { variant = 'full' } = {}) {
  const id = esc(t.track_id);
  const heart = `<button class="tr-heart" type="button" data-like="${id}" aria-label="Like">${icon('heart', 20)}</button>`;
  if (variant === 'compact') {
    return `<div class="tr tr-compact" data-track-id="${id}" tabindex="0">
      ${rowCoverHTML(t)}
      <span class="tr-text"><span class="tr-title text-body-strong">${esc(t.title)}</span><span class="tr-artist text-caption">${esc(t.artist_name || 'Unknown Artist')}</span></span>
    </div>`;
  }
  return `<div class="tr tr-full" data-track-id="${id}" tabindex="0">
    <span class="tr-main">${rowCoverHTML(t)}<span class="tr-title text-body-strong">${esc(t.title)}</span></span>
    <span class="tr-artist text-body">${esc(t.artist_name || 'Unknown Artist')}</span>
    <span class="tr-time text-caption">${fmtDur(t.duration_sec)}</span>
    ${heart}
    <button class="tr-menu" type="button" data-menu aria-label="Add to queue" title="Add to queue">${icon('more', 20)}</button>
  </div>`;
}

/** Column header row for the full variant. */
export const trackHeaderHTML = () => `<div class="tr-header text-label-upper"><span>Title</span><span>Artist</span><span>Time</span><span></span><span></span></div>`;

/** Delegated clicks for one container holding rows. `tracks` is the list the rows were rendered from. */
export function bindRows(container, tracks, label = '') {
  const byId = new Map(tracks.map((t) => [String(t.track_id), t]));
  const run = (e) => {
    const row = e.target.closest('.tr');
    if (!row || !container.contains(row)) return;
    if (e.target.closest('[data-like]')) return;                 // main.js handles hearts
    const t = byId.get(row.dataset.trackId) || getTrack(row.dataset.trackId);
    if (!t) return;
    if (e.target.closest('[data-menu]')) { player.addToQueue(t); return; }
    player.playTrack(t, tracks, label);
  };
  container.addEventListener('click', run);
  container.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter') && e.target.classList?.contains('tr')) run(e);
  });
}

/** Mark the playing row and the liked hearts everywhere under `root`. */
export function syncRows(root = document) {
  const cur = player.current()?.track_id;
  const liked = store.get('likedIds') || new Set();
  root.querySelectorAll('[data-track-id]').forEach((el) => {
    el.classList.toggle('is-playing', cur != null && String(el.dataset.trackId) === String(cur));
  });
  root.querySelectorAll('[data-like]').forEach((el) => {
    const on = liked.has(Number(el.dataset.like)) || liked.has(el.dataset.like);
    el.classList.toggle('is-liked', on);
    el.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}
