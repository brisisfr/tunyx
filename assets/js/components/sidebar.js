// Sidebar (Sidebar_L). Mounted by main.js: mountSidebar(document.getElementById('sidebar')).
// Visuals live in assets/css/sidebar.css. Expanded vs collapsed is pure CSS via #app[data-sidebar],
// which main.js applyLayout() owns (it also forces collapsed under 1100px).
// Figma: Sidebar_L 3:69 (expanded), 55:3130 (collapsed), nav variants 9:226, Playlist 55:5125.

import { store } from '../store.js';
import { api } from '../api.js';
import { icon } from '../icons.js';
import { toast } from './toast.js';
import { openConfirmDelete, openSimplebox } from './modals.js';
import { refreshView, assetUrl } from '../util.js';
import { inlineRename } from '../inlineRename.js';

const NAV = [
  { href: '#/home',    icon: 'home',    label: 'Home',     match: ['home'] },
  { href: '#/explore', icon: 'compass', label: 'Explorer', match: ['explore'] },
  { href: '#/library', icon: 'library', label: 'Library',  match: ['library', 'liked', 'uploads'] },
];

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function navHTML() {
  return NAV.map((n) => `
    <a class="sb-nav-item text-body-strong" href="${n.href}" data-match="${n.match.join(',')}" title="${n.label}">
      ${icon(n.icon, 24)}<span class="sb-label">${n.label}</span>
    </a>`).join('');
}

function rowsHTML(playlists) {
  return playlists.map((p) => `
    <div class="sb-pl-row" data-playlist-id="${esc(p.playlist_id)}">
      <a class="sb-pl" href="#/playlist/${encodeURIComponent(p.playlist_id)}" data-playlist-id="${esc(p.playlist_id)}" title="${esc(p.title)}">
        <span class="sb-pl-cover">${p.cover_path ? `<img src="${esc(assetUrl(p.cover_path))}" alt="" loading="lazy" onerror="this.remove()">` : ''}</span>
        <span class="sb-pl-text">
          <span class="sb-pl-title text-body-strong">${esc(p.title)}</span>
          <span class="sb-pl-sub text-caption">Playlist</span>
        </span>
      </a>
      <button class="sb-more" type="button" data-pl-more aria-label="Playlist options" title="Playlist options">${icon('more', 20)}</button>
    </div>`).join('');
}

function startRename(row, p) {
  const titleEl = row.querySelector('.sb-pl-title');
  if (!titleEl) return;
  inlineRename(titleEl, {
    value: p.title,
    className: 'sb-rename text-body-strong',
    onSave: async (title) => {
      try {
        await api.renamePlaylist(p.playlist_id, title);
        store.set('playlists', (store.get('playlists') || []).map((x) =>
          String(x.playlist_id) === String(p.playlist_id) ? { ...x, title } : x));
        toast('Playlist renamed', 'info');
        const route = store.get('route') || {};
        if (route.name === 'playlist' && String((route.params || [])[0]) === String(p.playlist_id)) refreshView();
      } catch (e) { toast(e.message || 'Something went wrong', 'error'); }
    },
  });
}

function openPlaylistMenu(row, p, anchor) {
  const items = [];
  // Inline rename needs the expanded row; collapsed sidebars rename from the playlist view instead.
  if (document.getElementById('app')?.dataset.sidebar !== 'collapsed') {
    items.push({ label: 'Rename', onClick: () => startRename(row, p) });
  }
  items.push({ label: 'Delete playlist', danger: true, onClick: () => openConfirmDelete({
    title: 'Delete this playlist?',
    onConfirm: async () => {
      await api.deletePlaylist(p.playlist_id);
      store.set('playlists', (store.get('playlists') || []).filter((x) => String(x.playlist_id) !== String(p.playlist_id)));
      toast('Playlist deleted', 'removed');
      const route = store.get('route') || {};
      if (route.name === 'playlist' && String((route.params || [])[0]) === String(p.playlist_id)) location.hash = '#/library';
    },
  }) });
  openSimplebox(anchor, items);
}

export function mountSidebar(el) {
  el.innerHTML = `
    <div class="sb-header">
      <button class="sb-brand" type="button" data-sb-toggle aria-label="Toggle sidebar" title="Toggle sidebar">
        ${icon('list', 24)}<span class="sb-label sb-wordmark text-title">TUNYX</span>
      </button>
    </div>
    <nav class="sb-nav" aria-label="Main">${navHTML()}</nav>
    <div class="sb-divider" role="separator"></div>
    <div class="sb-list">
      <button class="sb-pl sb-pl-new" type="button" data-sb-new>
        <span class="sb-pl-cover"></span>
        <span class="sb-pl-text">
          <span class="sb-pl-title text-body-strong">New Playlist</span>
          <span class="sb-pl-sub text-caption"></span>
        </span>
      </button>
      <div class="sb-rows" data-sb-rows></div>
    </div>`;

  const rowsEl = el.querySelector('[data-sb-rows]');

  function updateActive() {
    const route = store.get('route') || {};
    el.querySelectorAll('.sb-nav-item').forEach((a) => {
      const on = a.dataset.match.split(',').includes(route.name);
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    const pid = route.name === 'playlist' ? String((route.params || [])[0]) : null;
    el.querySelectorAll('.sb-pl[data-playlist-id]').forEach((a) => {
      const on = pid !== null && a.dataset.playlistId === pid;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  function renderPlaylists() {
    rowsEl.innerHTML = rowsHTML(store.get('playlists') || []);
    updateActive();
  }

  // Playlist row menu: the hover "more" button, or right click (the only way when the sidebar is collapsed).
  const playlistOf = (row) => (store.get('playlists') || []).find((p) => String(p.playlist_id) === String(row.dataset.playlistId));
  rowsEl.addEventListener('click', (e) => {
    const more = e.target.closest('[data-pl-more]');
    if (!more) return;
    const row = more.closest('.sb-pl-row');
    const p = row && playlistOf(row);
    if (p) openPlaylistMenu(row, p, more);
  });
  rowsEl.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.sb-rename')) return;
    const row = e.target.closest('.sb-pl-row');
    if (!row) return;
    e.preventDefault();
    const p = playlistOf(row);
    if (p) openPlaylistMenu(row, p, { x: e.clientX, y: e.clientY });
  });

  // Collapse toggle: main.js applyLayout() subscribes to this key and updates #app[data-sidebar].
  el.querySelector('[data-sb-toggle]').addEventListener('click', () => {
    store.set('sidebarCollapsed', !store.get('sidebarCollapsed'));
  });

  // New Playlist: create it via the API, then add it to the shared list. store.set('playlists')
  // fires renderPlaylists, so the sidebar updates itself. Disabled while the request runs so a
  // double-click cannot create two playlists.
  const newBtn = el.querySelector('[data-sb-new]');
  newBtn.addEventListener('click', async () => {
    if (newBtn.disabled) return;
    newBtn.disabled = true;
    try {
      const n = (store.get('playlists') || []).length + 1;
      const created = await api.createPlaylist(`New Playlist ${n}`);
      store.set('playlists', [...(store.get('playlists') || []), created]);
      toast('Playlist created', 'playlist');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      newBtn.disabled = false;
    }
  });

  store.on('playlists', renderPlaylists);
  store.on('route', updateActive);

  renderPlaylists();
}
