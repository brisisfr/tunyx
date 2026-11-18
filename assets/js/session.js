// Login state glue: boot the app for a user, log out, and react to 401s from any request.
import { api, onUnauthorized } from './api.js';
import { store } from './store.js';
import { player } from './player.js';
import { loadLikes } from './likes.js';
import { loadPlaylists } from './playlists.js';
import { openLoginModal } from './components/modals.js';
import * as router from './router.js';

let loginOpen = false;

export function openLogin() {
  if (loginOpen) return;
  loginOpen = true;
  openLoginModal((user) => { loginOpen = false; startSession(user); });
}

export async function startSession(user) {
  store.set('user', user);
  await Promise.allSettled([loadLikes(), loadPlaylists()]);
  router.start();
}

export async function logout() {
  try { await api.logout(); } catch { /* the session may already be gone */ }
  player.stop();
  store.set('user', null);
  store.set('likedIds', new Set());
  store.set('playlists', []);
  document.getElementById('view').replaceChildren();
  openLogin();
}

export function initSession() {
  // any request that comes back 401 (session expired, not logged in) -> show the login modal
  onUnauthorized(() => {
    store.set('user', null);
    openLogin();
  });
}
