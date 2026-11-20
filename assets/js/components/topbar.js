// Top bar. Figma "Search_bar_Extras" (1100x48), "Search Extended" (input + 5 result rows),
// "Modals_ Profile" (382x198 menu). Mounted by main.js: mountTopbar(document.getElementById('topbar')).
// Search is a dropdown only (no /search route): typing hits songs.php?q= and plays from the results.
import { store } from '../store.js';
import { player } from '../player.js';
import { api } from '../api.js';
import { icon } from '../icons.js';
import { esc, debounce, assetUrl } from '../util.js';
import { lockHTML } from './trackRow.js';
import { openProfileModal } from './modals.js';
import { logout } from '../session.js';

const MAX = 5;

/** Escape first, then wrap the first case-insensitive match so a query can never inject HTML. */
function mark(text, q) {
  const safe = esc(text ?? '');
  const needle = esc(q ?? '');
  if (!needle) return safe;
  const i = safe.toLowerCase().indexOf(needle.toLowerCase());
  return i < 0
    ? safe
    : `${safe.slice(0, i)}<mark>${safe.slice(i, i + needle.length)}</mark>${safe.slice(i + needle.length)}`;
}

export function mountTopbar(el) {
  el.innerHTML = `
    <div class="tb">
      <div class="tb-search">
        <span class="tb-search-icon">${icon('search', 18)}</span>
        <input class="tb-input" type="text" placeholder="Search songs, genres, artists"
               aria-label="Search songs, genres, artists" autocomplete="off" spellcheck="false">
        <div class="tb-drop" hidden></div>
      </div>
      <div class="tb-cluster">
        <div class="tb-profile">
          <button class="tb-avatar" type="button" aria-label="Profile" aria-haspopup="menu" aria-expanded="false"></button>
          <div class="tb-menu" role="menu" hidden></div>
        </div>
        <button class="tb-upload" type="button" aria-label="Upload a song" title="Upload">${icon('upload', 18)}</button>
        <span class="tb-logo" aria-hidden="true"></span>
      </div>
    </div>`;

  const input = el.querySelector('.tb-input');
  const drop = el.querySelector('.tb-drop');
  const avatar = el.querySelector('.tb-avatar');
  const menu = el.querySelector('.tb-menu');

  let results = [];
  let active = -1;
  let seq = 0;

  const closeDrop = () => { drop.hidden = true; drop.innerHTML = ''; results = []; active = -1; };

  // keyboard highlight: -1 = nothing, otherwise an index into results
  function paintActive() {
    [...drop.querySelectorAll('.tb-row')].forEach((r, i) => r.classList.toggle('is-active', i === active));
    drop.children[active]?.scrollIntoView({ block: 'nearest' });
  }
  function moveActive(d) {
    if (!results.length) return;
    active = active < 0 ? (d > 0 ? 0 : results.length - 1) : (active + d + results.length) % results.length;
    paintActive();
  }

  async function search(q) {
    const my = ++seq;
    if (!q) { closeDrop(); return; }
    try {
      const found = (await api.getTracks({ q })).slice(0, MAX);
      if (my !== seq || document.activeElement !== input) return;   // stale answer, or Esc/blur meanwhile
      results = found;
      active = -1;
      drop.innerHTML = found.length
        ? found.map((t) => `<button class="tb-row" type="button">
            <span class="tb-row-title text-body">${mark(t.title, q)}</span>${lockHTML(t)}
            <span class="tb-row-artist text-body">${mark(t.artist_name, q)}</span>
          </button>`).join('')
        : `<div class="tb-row tb-row-none text-body">No results</div>`;
      drop.hidden = false;
    } catch (e) {
      if (my !== seq) return;
      results = [];
      drop.innerHTML = `<div class="tb-row tb-row-none text-body">${esc(e.message || 'Search failed')}</div>`;
      drop.hidden = false;
    }
  }

  const ask = debounce((v) => search(v), 300);
  input.addEventListener('input', () => { active = -1; ask(input.value.trim()); });
  input.addEventListener('focus', () => { if (input.value.trim()) ask(input.value.trim()); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeDrop(); input.focus(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (drop.hidden) return;
      e.preventDefault();
      moveActive(e.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (e.key === 'Enter' && !drop.hidden && active >= 0) {
      e.preventDefault();
      player.playTrack(results[active], results, 'Search');
      closeDrop();
      input.blur();
    }
  });

  drop.addEventListener('click', (e) => {
    const row = e.target.closest('.tb-row');
    const i = row ? [...drop.children].indexOf(row) : -1;
    if (!results[i]) return;                                   // "No results" / error rows have no track
    player.playTrack(results[i], results, 'Search');
    closeDrop();
    input.blur();
  });

  // ---- avatar + profile menu (who you are, edit profile, log out) ----
  const paintUser = () => {
    const u = store.get('user');
    avatar.innerHTML = u?.avatar_path
      ? `<img src="${esc(assetUrl(u.avatar_path))}" alt="">`
      : esc((u?.username || '?').slice(0, 1).toUpperCase());
    menu.innerHTML = `
      <div class="tb-mi tb-mi-head">
        <span class="tb-mi-icon">${icon('user', 20)}</span>
        <span class="tb-mi-text">${esc(u?.username || 'Profile')}</span>
      </div>
      <button class="tb-mi" type="button" role="menuitem" data-edit-profile>
        <span class="tb-mi-icon">${icon('settings', 20)}</span>
        <span class="tb-mi-text">Edit profile</span>
      </button>
      <button class="tb-mi" type="button" role="menuitem" data-logout>
        <span class="tb-mi-icon">${icon('log-out', 20)}</span>
        <span class="tb-mi-text">Log Out</span>
      </button>`;
  };
  paintUser();
  store.on('user', paintUser);

  const setMenu = (open) => { menu.hidden = !open; avatar.setAttribute('aria-expanded', String(open)); };
  avatar.addEventListener('click', () => setMenu(menu.hidden));
  menu.addEventListener('click', (e) => {
    if (e.target.closest('[data-edit-profile]')) { setMenu(false); openProfileModal(); return; }
    if (e.target.closest('[data-logout]')) { setMenu(false); logout(); }
  });

  el.querySelector('.tb-upload').addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('tunyx:open-upload'));
  });

  document.addEventListener('click', (e) => {
    if (el.contains(e.target)) return;
    closeDrop();
    setMenu(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeDrop(); setMenu(false); }
    // "/" anywhere (not while typing, no modifier) jumps to search
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey
      && !e.target.closest?.('input, textarea, select, [contenteditable]')) {
      e.preventDefault();
      input.focus();
    }
  });
}
