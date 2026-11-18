import { api } from './api.js';
import { store } from './store.js';

/** Refresh the playlist list (sidebar, Library, "add to playlist" menus all read it from the store). */
export async function loadPlaylists() {
  store.set('playlists', await api.getPlaylists());
  return store.get('playlists');
}
