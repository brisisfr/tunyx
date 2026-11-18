// My Uploads. Stub: songs.php returns no uploader_id and has no ?mine=1 yet, so there is no way to
// list only my uploads. Swap the empty `tracks` for the filtered list once that lands.
import { store } from '../store.js';
import { renderList } from './playlist.js';

export default {
  panel: false,
  render(el) {
    renderList(el, {
      title: 'My Uploads',
      owner: store.get('user')?.username,
      tracks: [],
      label: 'My Uploads',
    });
  },
};
