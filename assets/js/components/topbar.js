// Top bar. Figma "Search_bar_Extras" (1100x48), "Search Extended" (input + 5 result rows),
// "Modals_ Profile" (382x198 menu). Mounted by main.js: mountTopbar(document.getElementById('topbar')).
// Search is a dropdown only (no /search route): typing hits songs.php?q= and plays from the results.
import { store } from '../store.js';
import { player } from '../player.js';
import { api } from '../api.js';
import { icon } from '../icons.js';
import { esc, debounce } from '../util.js';
import { logout } from '../session.js';

const MAX = 5;

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
  let seq = 0;

  const closeDrop = () => { drop.hidden = true; drop.innerHTML = ''; results = []; };

  async function search(q) {
    const my = ++seq;
    if (!q) { closeDrop(); return; }
    try {
      const found = (await api.getTracks({ q })).slice(0, MAX);
      if (my !== seq || document.activeElement !== input) return;   // stale answer, or Esc/blur meanwhile
      results = found;
      drop.innerHTML = found.length
        ? found.map((t) => `<button class="tb-row" type="button">
            <span class="tb-row-title text-body">${esc(t.title)}</span>
            <span class="tb-row-artist text-body">${esc(t.artist_name)}</span>
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
  input.addEventListener('input', () => ask(input.value.trim()));
  input.addEventListener('focus', () => { if (input.value.trim()) ask(input.value.trim()); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeDrop(); input.blur(); } });

  drop.addEventListener('click', (e) => {
    const row = e.target.closest('.tb-row');
    const i = row ? [...drop.children].indexOf(row) : -1;
    if (!results[i]) return;                                   // "No results" / error rows have no track
    player.playTrack(results[i], results, 'Search');
    closeDrop();
    input.blur();
  });

  // ---- avatar + profile menu (first row = who you are, second = log out) ----
  const paintUser = () => {
    const u = store.get('user');
    avatar.textContent = (u?.username || '?').slice(0, 1).toUpperCase();
    menu.innerHTML = `
      <div class="tb-mi tb-mi-head">
        <span class="tb-mi-icon">${icon('user', 20)}</span>
        <span class="tb-mi-text">${esc(u?.username || 'Profile')}</span>
      </div>
      <button class="tb-mi" type="button" role="menuitem" data-logout>
        <span class="tb-mi-icon">${icon('log-out', 20)}</span>
        <span class="tb-mi-text">Log Out</span>
      </button>`;
  };
  paintUser();
  store.on('user', paintUser);

  const setMenu = (open) => { menu.hidden = !open; avatar.setAttribute('aria-expanded', String(open)); };
  avatar.addEventListener('click', () => setMenu(menu.hidden));
  menu.addEventListener('click', (e) => { if (e.target.closest('[data-logout]')) { setMenu(false); logout(); } });

  el.querySelector('.tb-upload').addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('tunyx:open-upload'));
  });

  document.addEventListener('click', (e) => {
    if (el.contains(e.target)) return;
    closeDrop();
    setMenu(false);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeDrop(); setMenu(false); } });
}
