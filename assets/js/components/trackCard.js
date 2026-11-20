// Track card. Figma "Med w title" 220x275: cover 200x200 at (10,10), title x18, duration x145, artist x18.
// Home "Discover Songs" and the Explore row both use it. Click (or Enter) plays from the row it sits in.
import { player } from '../player.js';
import { esc, fmtDur } from '../util.js';
import { rowCoverHTML, openTrackMenu, lockHTML } from './trackRow.js';

export function trackCardHTML(t) {
  return `<div class="tc" data-track-id="${esc(t.track_id)}" role="button" tabindex="0" aria-label="Play ${esc(t.title)}">
    ${rowCoverHTML(t)}
    <span class="tc-row">
      <span class="tc-name"><span class="tc-title text-body-strong">${esc(t.title)}</span>${lockHTML(t)}</span>
      <span class="tc-time text-caption">${fmtDur(t.duration_sec)}</span>
    </span>
    <span class="tc-artist text-caption">${esc(t.artist_name || 'Unknown Artist')}</span>
  </div>`;
}

/** Delegated click/Enter for a container of cards. `tracks` is the list the cards were rendered from. */
export function bindCards(container, tracks, label = '') {
  const play = (card) => {
    const t = tracks.find((x) => String(x.track_id) === card.dataset.trackId);
    if (t) player.playTrack(t, tracks, label);
  };
  container.addEventListener('click', (e) => {
    const card = e.target.closest('.tc');
    if (card && container.contains(card)) play(card);
  });
  container.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const card = e.target.closest('.tc');
    if (card) play(card);
  });
  container.addEventListener('contextmenu', (e) => {
    const card = e.target.closest('.tc');
    if (!card || !container.contains(card)) return;
    e.preventDefault();
    const t = tracks.find((x) => String(x.track_id) === card.dataset.trackId);
    if (t) openTrackMenu(t, { x: e.clientX, y: e.clientY });
  });
}
