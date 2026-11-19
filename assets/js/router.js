// Hash router: #/home #/explore #/library #/playlist/3 #/liked #/uploads #/playing
// Hash routing keeps the URL flat, so relative API/file paths (api/songs.php, uploads/…) always resolve.
import { store } from './store.js';
import { esc } from './util.js';
import { icon } from './icons.js';
import { syncRows } from './components/trackRow.js';
import home from './views/home.js';
import explore from './views/explore.js';
import library from './views/library.js';
import playlist from './views/playlist.js';
import liked from './views/liked.js';
import uploads from './views/uploads.js';
import nowPlaying from './views/nowPlaying.js';

const routes = [
  { name: 'home', re: /^\/home$/, view: home },
  { name: 'explore', re: /^\/explore$/, view: explore },
  { name: 'library', re: /^\/library$/, view: library },
  { name: 'playlist', re: /^\/playlist\/(\d+)$/, view: playlist },
  { name: 'liked', re: /^\/liked$/, view: liked },
  { name: 'uploads', re: /^\/uploads$/, view: uploads },
  { name: 'playing', re: /^\/playing$/, view: nowPlaying },
];

let cleanup = null;
let token = 0;
let started = false;

function parse() {
  const h = location.hash.slice(1) || '/home';
  const [path, qs = ''] = h.split('?');
  return { path, query: Object.fromEntries(new URLSearchParams(qs)) };
}

const errorHTML = (e) => `
  <div class="empty">${icon('alert', 40)}<div><h3>Something went wrong</h3><p>${esc(e.message || 'Unknown error')}</p></div>
  <button class="btn" data-retry>Try again</button></div>`;

export async function render() {
  if (!store.get('user')) return;
  const view = document.getElementById('view');
  const { path, query } = parse();
  let match = null; let params = [];
  for (const r of routes) { const m = path.match(r.re); if (m) { match = r; params = m.slice(1); break; } }

  const my = ++token;
  if (cleanup) { try { cleanup(); } catch { /* ignore */ } cleanup = null; }

  store.set('panelPref', null);
  store.set('panelDefault', !!match?.view.panel);
  store.set('route', { name: match?.name ?? '404', path, query, params });

  const el = document.createElement('div');
  el.className = `view view-${match?.name ?? 'notfound'}`;
  el.innerHTML = `<div class="loading" role="status" aria-label="Loading">${icon('hourglass', 80)}</div>`;
  view.replaceChildren(el);
  view.scrollTop = 0;

  if (!match) {
    el.innerHTML = `<div class="empty">${icon('compass', 40)}<div><h3>Page not found</h3><p>That page doesn't exist.</p></div><a class="btn" href="#/home">Back home</a></div>`;
    return;
  }
  try {
    const c = await match.view.render(el, params, query);
    if (my !== token) { c?.(); return; }
    cleanup = c || null;
  } catch (e) {
    if (my !== token) return;
    if (e.status === 401) return;                      // the login modal is already up
    el.innerHTML = errorHTML(e);
    el.querySelector('[data-retry]')?.addEventListener('click', render);
  }
  syncRows(el);
}

export function start() {
  if (!started) {
    window.addEventListener('hashchange', render);
    window.addEventListener('tunyx:refresh', render);
    started = true;
  }
  if (!location.hash) location.replace('#/home');
  render();
}
