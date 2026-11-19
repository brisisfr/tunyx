// Boot: mount the persistent shell, check the session, then let the router take over.
import { store } from './store.js';
import { player } from './player.js';
import { api, MOCK, getTrack } from './api.js';
import { initSession, openLogin, startSession } from './session.js';
import { toggleLike } from './likes.js';
import { mountSidebar } from './components/sidebar.js';
import { mountTopbar } from './components/topbar.js';
import { mountPlayerBar } from './components/playerBar.js';
import { mountUpNext } from './components/upNext.js';
import { syncRows } from './components/trackRow.js';
import { esc } from './util.js';

const app = document.getElementById('app');
if (MOCK) document.body.dataset.mock = '1';

// ---- layout state -> data attributes on .app (CSS does the rest) ----
const narrow = matchMedia('(max-width: 1100px)');
function applyLayout() {
  app.dataset.sidebar = store.get('sidebarCollapsed') || narrow.matches ? 'collapsed' : 'expanded';
  // narrow screens: Up next is a drawer, closed unless the user opened it
  const open = narrow.matches ? store.get('panelPref') === true : (store.get('panelPref') ?? store.get('panelDefault'));
  app.dataset.panel = open ? 'open' : 'closed';
}
['sidebarCollapsed', 'panelPref', 'panelDefault'].forEach((k) => store.on(k, applyLayout));
narrow.addEventListener('change', applyLayout);

async function boot() {
  initSession();
  mountSidebar(document.getElementById('sidebar'));
  mountTopbar(document.getElementById('topbar'));
  mountPlayerBar(document.getElementById('playerbar'));
  mountUpNext(document.getElementById('panel'));
  applyLayout();

  // keep hearts + "now playing" highlights in sync everywhere
  player.subscribe(() => {
    syncRows();
    const t = player.current();
    document.title = t && player.state.playing ? `${t.title} · Tunyx` : 'Tunyx';
  });
  store.on('likedIds', () => syncRows());

  // one global handler for every heart button (rows, player bar)
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-like]');
    if (!b || !b.dataset.like) return;
    const t = getTrack(b.dataset.like);
    if (t) toggleLike(t);
  });

  // space = play/pause (unless you're typing or focused on a control)
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' || e.target.closest('input, textarea, select, button, a, [contenteditable]')) return;
    e.preventDefault();
    player.toggle();
  });

  try {
    const user = await api.me({ silent401: true });
    await startSession(user);
  } catch (e) {
    if (e.status === 401) openLogin();
    else {
      document.getElementById('view').innerHTML = `<div class="empty"><div><h3>Can't start Tunyx</h3><p>${esc(e.message)}</p></div><button class="btn" onclick="location.reload()">Retry</button></div>`;
    }
  }
}

boot();
