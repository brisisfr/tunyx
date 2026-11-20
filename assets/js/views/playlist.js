// Playlist detail + the shared "list" layout. Figma Main_Playlist 792x796 (Deepseek Batch 1):
// header block 728x284, cover 200 at (42,42), text column 62 right of the cover, four 48px actions,
// track/header, full rows. Liked Songs and My Uploads reuse it with Play + Shuffle only.
import { store } from '../store.js';
import { player } from '../player.js';
import { api } from '../api.js';
import { icon } from '../icons.js';
import { esc, fmtTotal, emptyHTML } from '../util.js';
import { trackRowHTML, trackHeaderHTML, bindRows, rowCoverHTML } from '../components/trackRow.js';
import { toast } from '../components/toast.js';
import { inlineRename } from '../inlineRename.js';

function actionsHTML(extras) {
  return `
    <button class="pl-act" type="button" data-play aria-label="Play" title="Play">${icon('play', 20)}</button>
    <button class="pl-act" type="button" data-shuffle aria-label="Shuffle" title="Shuffle">${icon('shuffle', 20)}</button>
    ${extras ? `<button class="pl-act" type="button" disabled aria-label="Add songs" title="Add songs">${icon('plus', 20)}</button>
    <button class="pl-act" type="button" disabled aria-label="Playlist options" title="Playlist options">${icon('ellipsis', 20)}</button>` : ''}`;
}

/** Header + actions + header row + rows. Used by playlist.js, liked.js, uploads.js. */
export function renderList(el, { title, owner, tracks, label, extras = false, empty, onRename, cover }) {
  let listName = label || title;
  const total = tracks.reduce((s, t) => s + (t.duration_sec || 0), 0);
  el.innerHTML = `
    <div class="pl">
      <div class="pl-head">
        ${rowCoverHTML(cover || tracks[0])}
        <div class="pl-meta">
          <h1 class="pl-title text-display">${esc(title)}</h1>
          <p class="pl-owner text-title">${esc(owner)}</p>
          <div class="pl-stats text-body-strong">
            <span>${tracks.length} ${tracks.length === 1 ? 'song' : 'songs'}</span>
            <span>${fmtTotal(total)}</span>
          </div>
        </div>
      </div>
      <div class="pl-actions">${actionsHTML(extras)}</div>
      ${trackHeaderHTML()}
      ${tracks.length
        ? `<div class="pl-list" data-list>${tracks.map((t) => trackRowHTML(t, { variant: 'full' })).join('')}</div>`
        : empty || emptyHTML('music', 'Empty :(')}`;

  const list = el.querySelector('[data-list]');
  if (list) bindRows(list, tracks, () => listName);

  const h1 = el.querySelector('.pl-title');
  if (onRename) {
    const start = () => inlineRename(h1, {
      value: listName,
      className: 'pl-rename text-display',
      onSave: async (next) => {
        try { await onRename(next); listName = next; h1.textContent = next; }
        catch (e) { toast(e.message || 'Something went wrong', 'error'); }
      },
    });
    h1.tabIndex = 0;
    h1.setAttribute('role', 'button');
    h1.title = 'Rename playlist';
    h1.addEventListener('click', start);
    h1.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); start(); }
    });
  }

  el.querySelector('[data-play]').addEventListener('click', () => player.playList(tracks, { label: listName }));
  el.querySelector('[data-shuffle]').addEventListener('click', () => player.playList(tracks, { shuffle: true, label: listName }));
}

export default {
  panel: true,
  async render(el, params) {
    const id = params[0];
    const meta = (store.get('playlists') || []).find((p) => String(p.playlist_id) === String(id));
    const tracks = await api.getPlaylistTracks(id);
    renderList(el, {
      title: meta?.title || 'Playlist',
      owner: store.get('user')?.username,
      tracks,
      extras: true,
      // the playlist's own cover (or the backend's first-track fallback) beats the first track's art
      cover: meta?.cover_path ? { track_id: meta.playlist_id, cover_path: meta.cover_path } : undefined,
      empty: emptyHTML('list-plus', 'Empty :(', 'Add songs from any track menu.'),
      onRename: meta ? async (title) => {
        await api.renamePlaylist(id, title);
        store.set('playlists', (store.get('playlists') || []).map((p) =>
          String(p.playlist_id) === String(id) ? { ...p, title } : p));
        toast('Playlist renamed', 'info');
      } : undefined,
    });
  },
};
