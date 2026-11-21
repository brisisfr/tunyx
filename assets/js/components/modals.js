// Modals + small menus. Figma: Sign-in/Create-account 458x526, Upload_Song 458x593, Confirm_Delete 458x336, Simplebox 200x40 rows.
// Exports: openLoginModal(onDone(user)), openProfileModal(), openUploadModal(), openConfirmDelete({title,text,onConfirm}), openSimplebox(anchor, items).
// Upload also opens from the top bar through the 'tunyx:open-upload' window event (listener registered below).
import { api } from '../api.js';
import { store } from '../store.js';
import { icon } from '../icons.js';
import { esc, fmtTime, refreshView, debounce, assetUrl } from '../util.js';
import { toast } from './toast.js';

let layer = null;

function openLayer(html, { dismissible = true } = {}) {
  closeLayer();
  layer = document.createElement('div');
  layer.className = 'md-backdrop';
  layer.innerHTML = `<div class="md" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(layer);
  const box = layer.querySelector('.md');
  if (dismissible) {
    layer.addEventListener('mousedown', (e) => { if (e.target === layer) closeLayer(); });
    layer.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLayer(); });
    box.addEventListener('click', (e) => { if (e.target.closest('[data-md-close]')) closeLayer(); });
  }
  return box;
}
export function closeLayer() { layer?.remove(); layer = null; }

const xBtn = () => `<button class="md-x" type="button" data-md-close aria-label="Close">${icon('x', 24)}</button>`;
const field = (ico, name, ph, type = 'text', auto = '') =>
  `<label class="md-field">${icon(ico, 24)}<input name="${name}" type="${type}" placeholder="${ph}" autocomplete="${auto}" required></label>`;

// ---------- sign in / create account (same shell, swapped contents; not dismissible: the app needs a user) ----------
export function openLoginModal(onDone) {
  const box = openLayer('', { dismissible: false });
  let mode = 'login';
  let prefill = '';
  const draw = () => {
    const login = mode === 'login';
    box.innerHTML = `
      <h2 class="md-title">${login ? 'Sign In' : 'Create Account'}</h2>
      <form class="md-form" novalidate>
        ${field('user', 'username', 'Username', 'text', 'username')}
        ${login ? '' : '<p class="md-hint">3-30 letters, numbers, _ or .</p>'}
        ${login ? '' : field('mail', 'email', 'Email', 'email', 'email')}
        ${field('lock', 'password', 'Password', 'password', login ? 'current-password' : 'new-password')}
        ${login ? '' : '<p class="md-hint">6-64 characters, no spaces</p>'}
        <button class="md-primary" type="submit">${login ? 'Log In' : 'Create'}</button>
      </form>
      <hr class="md-line">
      <p class="md-error" role="alert" hidden></p>
      <p class="md-switch">${login ? 'Don’t have an account?' : 'Already have an account?'} <a href="#" data-md-switch>${login ? 'Create one' : 'Sign in'}</a></p>`;
    if (prefill) box.querySelector('input[name="username"]').value = prefill;
    box.querySelector('input')?.focus();
  };
  draw();
  box.addEventListener('click', (e) => { if (e.target.closest('[data-md-switch]')) { e.preventDefault(); mode = mode === 'login' ? 'register' : 'login'; draw(); } });
  box.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target; const err = box.querySelector('.md-error'); const btn = f.querySelector('.md-primary');
    const v = Object.fromEntries(new FormData(f));
    const fail = (m) => { err.textContent = m; err.hidden = false; btn.disabled = false; };
    err.hidden = true;
    if (!v.username?.trim() || !v.password || (mode === 'register' && !v.email?.trim())) return fail('Invalid Input!');
    // mirror the server rules before asking; the server message still wins if they differ
    if (mode === 'register') {
      if (!/^[A-Za-z0-9_.]{3,30}$/.test(v.username.trim())) return fail('Username must be 3-30 characters: letters, numbers, dots, or underscores.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) return fail('Please enter a valid email address.');
      if (!/^[\x21-\x7E]{6,64}$/.test(v.password)) return fail('Password must be 6-64 characters: letters, numbers, and common symbols (no spaces, emoji, or Unicode).');
    }
    btn.disabled = true;
    try {
      const user = mode === 'login' ? await api.login(v.username.trim(), v.password) : await api.register(v.username.trim(), v.email.trim(), v.password);
      closeLayer(); onDone(user);
    } catch (ex) {
      // register worked but the follow-up login failed (api.register logs in): go to Sign In, name ready
      if (mode === 'register' && ex.status === 401) {
        prefill = v.username.trim();
        mode = 'login';
        draw();
        const e2 = box.querySelector('.md-error');
        e2.textContent = ex.message || 'Wrong password or username!';
        e2.hidden = false;
        return;
      }
      fail(mode === 'login' && (ex.status === 401 || ex.status === 422) ? 'Wrong password or username!' : (ex.message || 'Something went wrong!'));
    }
  });
}

// ---------- edit profile (username + avatar) ----------
export function openProfileModal() {
  const u = store.get('user') || {};
  const box = openLayer(`
    <h2 class="md-title md-title-left">Edit Profile</h2>${xBtn()}
    <form class="md-form" novalidate>
      <label class="md-file"><span data-name>${u.avatar_path ? 'Change photo' : 'Photo (jpg, png or webp)'}</span><input type="file" name="avatar" accept="image/*" hidden></label>
      <input class="md-input" name="username" placeholder="Username" value="${esc(u.username || '')}" autocomplete="username" required>
      <button class="md-submit" type="submit">Save</button>
      ${u.avatar_path ? '<button class="md-linkbtn" type="button" data-remove-avatar>Remove photo</button>' : ''}
    </form>`);
  const f = box.querySelector('form');
  const file = f.elements.avatar;
  const fileLabel = box.querySelector('[data-name]');
  file.addEventListener('change', () => {
    fileLabel.textContent = file.files[0] ? file.files[0].name : (u.avatar_path ? 'Change photo' : 'Photo (jpg, png or webp)');
    box.querySelector('.md-file').classList.toggle('is-set', !!file.files[0]);
  });
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = f.querySelector('.md-submit');
    const username = f.elements.username.value.trim();
    if (!username && !file.files[0]) { toast('Nothing to update', 'error'); return; }
    const fd = new FormData();
    if (username) fd.append('username', username);
    if (file.files[0]) fd.append('avatar', file.files[0]);
    btn.disabled = true;
    try {
      const data = await api.updateProfile(fd);
      store.set('user', data.user);
      closeLayer(); toast('Profile updated', 'success');
    } catch (ex) {
      btn.disabled = false; toast(ex.message || 'Something went wrong!', 'error');
    }
  });
  box.querySelector('[data-remove-avatar]')?.addEventListener('click', async (e) => {
    const b = e.currentTarget;
    b.disabled = true;
    try {
      const data = await api.updateProfile({ action: 'remove_avatar' });
      store.set('user', data.user);
      closeLayer(); toast('Profile updated', 'success');
    } catch (ex) {
      b.disabled = false; toast(ex.message || 'Something went wrong!', 'error');
    }
  });
  f.elements.username.focus();
}

// ---------- upload ----------
const GENRES = ['Pop', 'Rock', 'Hip-Hop', 'R&B', 'Electronic', 'Jazz', 'Classical', 'Indie', 'Other'];

export function openUploadModal() {
  const box = openLayer(`
    <h2 class="md-title md-title-left">Upload New Song</h2>${xBtn()}
    <form class="md-form md-form-upload" novalidate>
      <input class="md-input" name="title" placeholder="Song Title" required>
      <input class="md-input" name="artist_name" placeholder="Artist Name" required>
      <input class="md-input" name="album_title" placeholder="Album Title">
      <div class="md-row">
        <select class="md-input" name="genre"><option value="">Genre</option>${GENRES.map((g) => `<option>${esc(g)}</option>`).join('')}</select>
        <input class="md-input" name="duration_view" placeholder="Duration" readonly tabindex="-1">
      </div>
      <div class="md-seg" role="group" aria-label="Visibility">
        <button type="button" class="is-active" data-vis="public" aria-pressed="true">Public</button>
        <button type="button" data-vis="private" aria-pressed="false">Private</button>
      </div>
      <label class="md-file"><span data-name>Audio (file)</span><input type="file" name="audio" accept="audio/*" hidden></label>
      <label class="md-file"><span data-name>Picture (file)</span><input type="file" name="cover" accept="image/*" hidden></label>
      <div class="md-bar" hidden><span></span></div>
      <button class="md-submit" type="submit">Upload Song</button>
    </form>`);
  const f = box.querySelector('form');
  let duration = '';
  let visibility = 'public';
  f.querySelector('.md-seg').addEventListener('click', (e) => {
    const b = e.target.closest('[data-vis]');
    if (!b) return;
    visibility = b.dataset.vis;
    f.querySelectorAll('[data-vis]').forEach((x) => {
      const on = x === b;
      x.classList.toggle('is-active', on);
      x.setAttribute('aria-pressed', String(on));
    });
  });
  f.addEventListener('change', (e) => {
    const inp = e.target;
    if (inp.type !== 'file') return;
    const file = inp.files[0];
    inp.parentElement.querySelector('[data-name]').textContent = file ? file.name : (inp.name === 'audio' ? 'Audio (file)' : 'Picture (file)');
    inp.parentElement.classList.toggle('is-set', !!file);
    if (inp.name !== 'audio') return;
    duration = ''; f.elements.duration_view.value = '';
    if (!file) return;
    const a = new Audio(); const url = URL.createObjectURL(file);
    a.preload = 'metadata'; a.src = url;
    a.addEventListener('loadedmetadata', () => {
      if (isFinite(a.duration)) { duration = String(Math.round(a.duration)); f.elements.duration_view.value = fmtTime(a.duration); }
      URL.revokeObjectURL(url);
    });
    a.addEventListener('error', () => URL.revokeObjectURL(url));
    if (!f.elements.title.value) f.elements.title.value = file.name.replace(/\.[^.]+$/, '');
  });
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = f.querySelector('.md-submit'); const bar = f.querySelector('.md-bar');
    if (!f.elements.title.value.trim() || !f.elements.artist_name.value.trim() || !f.elements.audio.files[0]) { toast('Title, artist and an audio file are required.', 'error'); return; }
    const fd = new FormData();
    ['title', 'artist_name', 'album_title', 'genre'].forEach((k) => { if (f.elements[k].value.trim()) fd.append(k, f.elements[k].value.trim()); });
    if (duration) fd.append('duration_sec', duration);
    fd.append('visibility', visibility);
    fd.append('audio', f.elements.audio.files[0]);
    if (f.elements.cover.files[0]) fd.append('cover', f.elements.cover.files[0]);
    btn.disabled = true; bar.hidden = false;
    try {
      await api.upload(fd);
      closeLayer(); toast('Your song was uploaded', 'success'); refreshView();
    } catch (ex) {
      btn.disabled = false; bar.hidden = true;
      toast(ex.message || 'Upload failed', 'error');
    }
  });
  f.elements.title.focus();
}
window.addEventListener('tunyx:open-upload', openUploadModal);

// ---------- add songs ----------
export function openAddSongsModal(playlistId, onDone) {
  const box = openLayer(`
    <h2 class="md-title md-title-left">Add songs</h2>${xBtn()}
    <label class="md-add-search">${icon('search', 20)}<input type="search" placeholder="Search songs" autocomplete="off"></label>
    <div class="md-add-list" role="list" aria-label="Songs"></div>`);
  const input = box.querySelector('.md-add-search input');
  const list = box.querySelector('.md-add-list');
  let existing = new Set();
  let finished = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    closeLayer();
    onDone?.();
    refreshView();
  };
  box.querySelector('[data-md-close]')?.addEventListener('click', finish);
  box.parentElement.addEventListener('mousedown', (e) => { if (e.target === box.parentElement) finish(); });
  box.parentElement.addEventListener('keydown', (e) => { if (e.key === 'Escape') finish(); });

  async function load(q = '') {
    list.innerHTML = '<div class="md-add-loading">Loading…</div>';
    try {
      const tracks = await api.getTracks(q ? { q } : {});
      if (!q) tracks.splice(20);
      if (!tracks.length) {
        list.innerHTML = '<div class="md-add-empty">No songs found</div>';
        return;
      }
      list.innerHTML = tracks.map((t) => {
        const added = existing.has(String(t.track_id));
        return `<div class="md-add-row" role="listitem" data-track-id="${esc(t.track_id)}">
          <span class="md-add-cover">${t.cover_path ? `<img src="${esc(assetUrl(t.cover_path))}" alt="" loading="lazy" onerror="this.remove()">` : icon('music', 18)}</span>
          <span class="md-add-text"><span class="md-add-title">${esc(t.title)}</span><span class="md-add-artist">${esc(t.artist_name || 'Unknown artist')}</span></span>
          <button class="md-add-toggle${added ? ' is-added' : ''}" type="button" aria-label="${added ? 'Already in playlist' : 'Add song'}" ${added ? 'disabled' : ''}>${icon(added ? 'check' : 'plus', 18)}</button>
        </div>`;
      }).join('');
    } catch (ex) {
      list.innerHTML = `<div class="md-add-empty">${esc(ex.message || 'Could not load songs')}</div>`;
    }
  }

  api.getPlaylistTracks(playlistId).then((tracks) => {
    existing = new Set(tracks.map((t) => String(t.track_id)));
    load();
  }).catch(() => load());

  const debounced = debounce((q) => load(q.trim()), 300);
  input.addEventListener('input', () => debounced(input.value));
  list.addEventListener('click', async (e) => {
    const button = e.target.closest('.md-add-toggle');
    if (!button || button.disabled) return;
    const row = button.closest('[data-track-id]');
    const trackId = Number(row.dataset.trackId);
    button.disabled = true;
    try {
      await api.addToPlaylist(playlistId, trackId);
      existing.add(String(trackId));
      button.classList.add('is-added');
      button.innerHTML = icon('check', 18);
      button.setAttribute('aria-label', 'Already in playlist');
      toast('Added', 'playlist');
    } catch (ex) {
      button.disabled = false;
      if (ex.status === 409) {
        existing.add(String(trackId));
        button.disabled = true;
        button.classList.add('is-added');
        button.innerHTML = icon('check', 18);
        button.setAttribute('aria-label', 'Already in playlist');
      } else {
        toast(ex.message || 'Could not add song', 'error');
      }
    }
  });
  input.focus();
}

// ---------- confirm delete ----------
export function openConfirmDelete({ title = 'Are you sure?', text = 'This process can’t be undone.', onConfirm } = {}) {
  const box = openLayer(`
    ${xBtn()}
    <div class="md-trash">${icon('trash', 58)}</div>
    <h2 class="md-title md-title-sm">${esc(title)}</h2>
    <p class="md-sub">${esc(text)}</p>
    <div class="md-actions">
      <button class="md-btn" type="button" data-md-close>Cancel</button>
      <button class="md-btn md-danger" type="button" data-md-ok>Delete</button>
    </div>`);
  const ok = box.querySelector('[data-md-ok]');
  ok.addEventListener('click', async () => {
    ok.disabled = true;
    try { await onConfirm?.(); closeLayer(); } catch (ex) { ok.disabled = false; toast(ex.message || 'Something went wrong!', 'error'); }
  });
  box.querySelector('.md-btn').focus();
}

// ---------- simplebox: small menu at an element (or {x, y}) ----------
let menu = null;
export function closeSimplebox() { menu?.remove(); menu = null; document.removeEventListener('mousedown', outside, true); document.removeEventListener('keydown', esc_, true); }
const outside = (e) => { if (menu && !menu.contains(e.target)) closeSimplebox(); };
const esc_ = (e) => { if (e.key === 'Escape') closeSimplebox(); };

/** items: [{ label, onClick, danger?, disabled? }]. More than 8 rows scroll; a disabled row is greyed out and ignores clicks. */
export function openSimplebox(anchor, items) {
  closeSimplebox();
  menu = document.createElement('div');
  menu.className = 'sbox';
  menu.innerHTML = items.map((it, i) => `<button type="button" class="sbox-item${it.danger ? ' is-danger' : ''}${it.disabled ? ' is-disabled' : ''}"${it.disabled ? ' disabled aria-disabled="true"' : ''} data-i="${i}">${esc(it.label)}</button>`).join('');
  document.body.appendChild(menu);
  const r = anchor instanceof Element ? anchor.getBoundingClientRect() : { left: anchor.x, right: anchor.x, top: anchor.y, bottom: anchor.y };
  const w = menu.offsetWidth; const h = menu.offsetHeight;
  menu.style.left = `${Math.max(8, Math.min(r.right - w, innerWidth - w - 8))}px`;
  menu.style.top = `${r.bottom + h + 8 > innerHeight ? Math.max(8, r.top - h - 4) : r.bottom + 4}px`;
  menu.addEventListener('click', (e) => {
    const b = e.target.closest('[data-i]'); if (!b || b.disabled) return;
    const it = items[+b.dataset.i]; closeSimplebox(); it.onClick?.();
  });
  document.addEventListener('mousedown', outside, true);
  document.addEventListener('keydown', esc_, true);
}
