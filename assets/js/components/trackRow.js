// Track row (Figma "track/row"): compact (Home history grid) and full (lists) variants.
// Contract used by callers: syncRows(root = document) -> marks .is-playing / .is-liked.
// Views call: container.innerHTML = trackHeaderHTML() + tracks.map(t => trackRowHTML(t, {variant:'full', index:i})).join('');
//             bindRows(container, tracks, 'Playlist name')   // click-to-play + row menu, delegated, call once per container
import { store } from '../store.js';
import { player } from '../player.js';
import { api, getTrack } from '../api.js';
import { icon } from '../icons.js';
import { esc, fmtDur, assetUrl, refreshView } from '../util.js';
import { toast } from './toast.js';
import { openConfirmDelete, openSimplebox } from './modals.js';

/** cover/placeholder: elevated square + music icon; a real cover_path is layered on top. */
export function rowCoverHTML(t) {
  const img = t?.cover_path ? `<img src="${esc(assetUrl(t.cover_path))}" alt="" loading="lazy" onerror="this.remove()">` : '';
  return `<span class="tr-cover">${icon('music', 20)}${img}</span>`;
}

/** Private songs get a small lock after the title (rows, cards, search). */
export const lockHTML = (t) => (t?.visibility === 'private' ? `<span class="tr-lock" title="Private">${icon('lock', 14)}</span>` : '');

/** variant: 'compact' | 'full'. index (optional) is shown only in the full variant as the row number. */
export function trackRowHTML(t, { variant = 'full' } = {}) {
  const id = esc(t.track_id);
  const heart = `<button class="tr-heart" type="button" data-like="${id}" aria-label="Like" title="Like">${icon('heart', 20)}</button>`;
  if (variant === 'compact') {
    return `<div class="tr tr-compact" data-track-id="${id}" tabindex="0">
      ${rowCoverHTML(t)}
      <span class="tr-text"><span class="tr-name"><span class="tr-title text-body-strong">${esc(t.title)}</span>${lockHTML(t)}</span><span class="tr-artist text-caption">${esc(t.artist_name || 'Unknown Artist')}</span></span>
      <span class="tr-time text-caption">${fmtDur(t.duration_sec)}</span>
    </div>`;
  }
  return `<div class="tr tr-full" data-track-id="${id}" tabindex="0">
    <span class="tr-main">${rowCoverHTML(t)}<span class="tr-title text-body-strong">${esc(t.title)}</span>${lockHTML(t)}</span>
    <span class="tr-artist text-body">${esc(t.artist_name || 'Unknown Artist')}</span>
    <span class="tr-time text-caption">${fmtDur(t.duration_sec)}</span>
    ${heart}
    <button class="tr-menu" type="button" data-menu aria-label="Track options" title="Track options">${icon('more', 20)}</button>
  </div>`;
}

/** Column header row for the full variant. */
export const trackHeaderHTML = () => `<div class="tr-header text-label-upper"><span>Title</span><span>Artist</span><span>Time</span><span></span><span></span></div>`;

// ---- track menu: opens from the three-dot button, the cursor, or the focused row (Shift+F10) ----
function addToPlaylistMenu(t, anchor) {
  const lists = store.get('playlists') || [];
  openSimplebox(anchor, lists.length
    ? lists.map((p) => ({
        label: p.title,
        onClick: async () => {
          try {
            await api.addToPlaylist(p.playlist_id, t.track_id);
            toast(`Added to ${p.title}`, 'playlist');
          } catch (e) { toast(e.message || 'Something went wrong', 'error'); }
        },
      }))
    : [{ label: 'No playlists yet', disabled: true }]);
}

/** Track menu for rows and cards. `anchor` is the trigger element or a cursor point ({x,y}). */
export function openTrackMenu(t, anchor) {
  const items = [
    { label: 'Add to queue', onClick: () => player.addToQueue(t) },
    { label: 'Add to playlist', onClick: () => addToPlaylistMenu(t, anchor) },
  ];
  if (store.get('route')?.name === 'playlist') {
    items.push({
      label: 'Remove from this playlist',
      onClick: async () => {
        try {
          await api.removeFromPlaylist(store.get('route').params[0], t.track_id);
          toast('Removed from playlist', 'removed');
          refreshView();
        } catch (e) { toast(e.message || 'Something went wrong', 'error'); }
      },
    });
  }
  if (t.uploader_id != null && String(t.uploader_id) === String(store.get('user')?.user_id)) {
    items.push({
      label: 'Delete song',
      danger: true,
      onClick: () => openConfirmDelete({
        title: 'Delete this song?',
        onConfirm: async () => {
          await api.deleteTrack(t.track_id);
          // the song is gone server-side: drop it from the liked set and get it out of the player
          const liked = new Set(store.get('likedIds'));
          if (liked.delete(t.track_id)) store.set('likedIds', liked);
          if (String(player.current()?.track_id) === String(t.track_id)) {
            if (player.state.queue.length > 1) player.next(); else player.stop();
          }
          toast('Song deleted', 'removed');
          refreshView();
        },
      }),
    });
  }
  openSimplebox(anchor, items);
}

/** Delegated clicks/menu for one container holding rows. `tracks` is the list the rows were rendered from.
 *  `label` may be a function so a renamed playlist's label stays current. */
export function bindRows(container, tracks, label = '') {
  const byId = new Map(tracks.map((t) => [String(t.track_id), t]));
  const trackOf = (row) => byId.get(row.dataset.trackId) || getTrack(row.dataset.trackId);
  const playLabel = () => (typeof label === 'function' ? label() : label);

  const run = (e) => {
    const row = e.target.closest('.tr');
    if (!row || !container.contains(row)) return;
    if (e.target.closest('[data-like]')) return;                 // main.js handles hearts
    const t = trackOf(row);
    if (!t) return;
    if (e.target.closest('[data-menu]')) { openTrackMenu(t, e.target.closest('[data-menu]')); return; }
    player.playTrack(t, tracks, playLabel());
  };

  container.addEventListener('click', run);
  container.addEventListener('contextmenu', (e) => {
    const row = e.target.closest('.tr');
    if (!row || !container.contains(row)) return;
    e.preventDefault();
    const t = trackOf(row);
    if (t) openTrackMenu(t, { x: e.clientX, y: e.clientY });
  });
  container.addEventListener('keydown', (e) => {
    const row = e.target.closest?.('.tr');
    if (!row || !container.contains(row)) return;
    if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
      e.preventDefault();
      const t = trackOf(row);
      if (t) openTrackMenu(t, row);
      return;
    }
    if (e.key === 'Enter' && e.target.classList?.contains('tr')) run(e);
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
