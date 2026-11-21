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
import { openSimplebox, openConfirmDelete, openAddSongsModal } from '../components/modals.js';
import { playlistCoverHTML } from '../components/sidebar.js';

function actionsHTML(extras) {
  return `
    <button class="pl-act" type="button" data-play aria-label="Play" title="Play">${icon('play', 20)}</button>
    <button class="pl-act" type="button" data-shuffle aria-label="Shuffle" title="Shuffle">${icon('shuffle', 20)}</button>
    ${extras ? `<button class="pl-act" type="button" data-add-songs aria-label="Add songs" title="Add songs">${icon('plus', 20)}</button>
    <button class="pl-act" type="button" data-playlist-options aria-label="Playlist options" title="Playlist options">${icon('ellipsis', 20)}</button>` : ''}`;
}

/** Header + actions + header row + rows. Used by playlist.js, liked.js, uploads.js. */
export function renderList(el, { title, owner, tracks, label, extras = false, empty, onRename, cover, coverHTML, onAddSongs, onOptions }) {
  let listName = label || title;
  const total = tracks.reduce((s, t) => s + (t.duration_sec || 0), 0);
  el.innerHTML = `
    <div class="pl">
      <div class="pl-hero">
        <div class="pl-head">
          ${coverHTML || rowCoverHTML(cover || tracks[0])}
          <div class="pl-meta">
            <h1 class="pl-title text-display">${esc(title)}</h1>
            <p class="pl-owner text-title">${esc(owner)}</p>
            <div class="pl-stats text-body-strong">
              <span>${tracks.length} ${tracks.length === 1 ? 'song' : 'songs'}</span>
              <span>${fmtTotal(total)}</span>
            </div>
            <div class="pl-actions">${actionsHTML(extras)}</div>
          </div>
        </div>
      </div>
      ${trackHeaderHTML()}
      ${tracks.length
        ? `<div class="pl-list" data-list>${tracks.map((t) => trackRowHTML(t, { variant: 'full' })).join('')}</div>`
        : empty || emptyHTML('music', 'Empty :(')}`;

  const list = el.querySelector('[data-list]');
  if (list) bindRows(list, tracks, () => listName);

  const h1 = el.querySelector('.pl-title');
  if (onRename) {
    let startRenameTitle;
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
    startRenameTitle = start;
    el._startPlaylistRename = startRenameTitle;
  }

  el.querySelector('[data-play]').addEventListener('click', () => player.playList(tracks, { label: listName }));
  el.querySelector('[data-shuffle]').addEventListener('click', () => player.playList(tracks, { shuffle: true, label: listName }));
  el.querySelector('[data-add-songs]')?.addEventListener('click', () => onAddSongs?.());
  el.querySelector('[data-playlist-options]')?.addEventListener('click', (e) => onOptions?.(e.currentTarget));
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
      coverHTML: meta ? playlistCoverHTML(meta, 200) : undefined,
      empty: emptyHTML('list-plus', 'Empty :(', 'Add songs from any track menu.'),
      onRename: meta ? async (title) => {
        await api.renamePlaylist(id, title);
        store.set('playlists', (store.get('playlists') || []).map((p) =>
          String(p.playlist_id) === String(id) ? { ...p, title } : p));
        toast('Playlist renamed', 'success');
      } : undefined,
      onAddSongs: () => openAddSongsModal(id),
      onOptions: (anchor) => openSimplebox(anchor, [
        { label: 'Rename', onClick: () => el._startPlaylistRename?.() },
        { label: 'Change cover', onClick: () => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.hidden = true;
          input.addEventListener('change', async () => {
            const file = input.files?.[0];
            input.remove();
            if (!file) return;
            try {
              const data = await api.setPlaylistCover(id, file);
              store.set('playlists', (store.get('playlists') || []).map((p) =>
                String(p.playlist_id) === String(id) ? { ...p, cover_path: data.cover_path } : p));
              toast('Cover updated', 'success');
              refreshView();
            } catch (ex) {
              toast(ex.message || 'Could not update cover', 'error');
            }
          });
          document.body.appendChild(input);
          input.addEventListener('cancel', () => input.remove(), { once: true });
          input.click();
        } },
        { label: 'Delete playlist', danger: true, onClick: () => openConfirmDelete({
          title: 'Delete this playlist?',
          onConfirm: async () => {
            await api.deletePlaylist(id);
            store.set('playlists', (store.get('playlists') || []).filter((p) => String(p.playlist_id) !== String(id)));
            toast('Playlist deleted', 'success');
            location.hash = '#/library';
          },
        }) },
      ]),
    });
  },
};
