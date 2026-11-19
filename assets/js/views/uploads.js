// My Uploads. Uses songs.php?mine=1 (needs backend); until it lands, getMyUploads throws and the
// page shows the upload empty state instead of every song in the library.
import { store } from '../store.js';
import { api } from '../api.js';
import { emptyHTML } from '../util.js';
import { renderList } from './playlist.js';

const EMPTY = emptyHTML('upload', 'Nothing here yet', 'Upload your first song.',
  '<button class="btn" data-open-upload>Upload song</button>');

export default {
  panel: false,
  async render(el) {
    let tracks = [];
    try { tracks = await api.getMyUploads(); } catch { /* backend not ready: show the empty state */ }
    renderList(el, {
      title: 'My Uploads',
      owner: store.get('user')?.username,
      tracks,
      label: 'My Uploads',
      empty: EMPTY,
    });
    el.querySelector('[data-open-upload]')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('tunyx:open-upload'));
    });
  },
};
