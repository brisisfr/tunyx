// Playlist detail + the shared "list" layout. Figma Main_Playlist 792x796 (Deepseek Batch 1):
// header block 728x284, cover 200 at (42,42), text column 62 right of the cover, four 48px actions,
// track/header, full rows. Liked Songs and My Uploads reuse it with Play + Shuffle only.
import { store } from '../store.js';
import { player } from '../player.js';
import { api } from '../api.js';
import { icon } from '../icons.js';
import { esc, fmtTotal, emptyHTML } from '../util.js';
import { trackRowHTML, trackHeaderHTML, bindRows, rowCoverHTML } from '../components/trackRow.js';

function actionsHTML(extras) {
  return `
    <button class="pl-act" type="button" data-play aria-label="Play" title="Play">${icon('play', 20)}</button>
    <button class="pl-act" type="button" data-shuffle aria-label="Shuffle" title="Shuffle">${icon('shuffle', 20)}</button>
    ${extras ? `<button class="pl-act" type="button" disabled aria-label="Add songs" title="Add songs">${icon('plus', 20)}</button>
    <button class="pl-act" type="button" disabled aria-label="Playlist options" title="Playlist options">${icon('ellipsis', 20)}</button>` : ''}`;
}

/** Header + actions + header row + rows. Used by playlist.js, liked.js, uploads.js. */
export function renderList(el, { title, owner, tracks, label, extras = false }) {
  const name = label || title;
  const total = tracks.reduce((s, t) => s + (t.duration_sec || 0), 0);
  el.innerHTML = `
    <div class="pl">
      <div class="pl-head">
        ${rowCoverHTML(tracks[0])}
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
        : emptyHTML('music', 'Empty :(')}`;

  const list = el.querySelector('[data-list]');
  if (list) bindRows(list, tracks, name);

  el.querySelector('[data-play]').addEventListener('click', () => player.playList(tracks, { label: name }));
  el.querySelector('[data-shuffle]').addEventListener('click', () => player.playList(tracks, { shuffle: true, label: name }));
}

export default {
  panel: true,
  async render(el, params) {
    const meta = (store.get('playlists') || []).find((p) => String(p.playlist_id) === String(params[0]));
    const tracks = await api.getPlaylistTracks(params[0]);
    renderList(el, {
      title: meta?.title || 'Playlist',
      owner: store.get('user')?.username,
      tracks,
      extras: true,
    });
  },
};
