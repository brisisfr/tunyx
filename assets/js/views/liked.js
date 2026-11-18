// Liked Songs: the playlist layout with Play + Shuffle only.
import { api } from '../api.js';
import { store } from '../store.js';
import { renderList } from './playlist.js';

export default {
  panel: false,
  async render(el) {
    renderList(el, {
      title: 'Liked Songs',
      owner: store.get('user')?.username,
      tracks: await api.getLiked(),
      label: 'Liked Songs',
    });
  },
};
