// Library (Figma Main_Library 82:1418): "Liked Songs" then "My Uploads", both 3-col compact rows.
// My Uploads comes from songs.php?mine=1 (needs backend); until then the section shows the upload empty state.
import { api } from '../api.js';
import { emptyHTML } from '../util.js';
import { trackRowHTML, bindRows } from '../components/trackRow.js';

const UP_EMPTY = emptyHTML('upload', 'Nothing here yet', 'Upload your first song.',
  '<button class="btn" data-open-upload>Upload song</button>');

export default {
  panel: false,
  async render(el) {
    const [liked, uploads] = await Promise.all([
      api.getLiked(),
      api.getMyUploads().catch(() => []),          // backend not ready: keep the section empty
    ]);

    el.innerHTML = `
      <section class="lb-sec">
        <h2 class="text-title lb-title">Liked Songs</h2>
        ${liked.length
          ? `<div class="lb-grid" data-liked>${liked.map((t) => trackRowHTML(t, { variant: 'compact' })).join('')}</div>`
          : emptyHTML('music', 'Empty :(')}
      </section>
      <section class="lb-sec">
        <h2 class="text-title lb-title">My Uploads</h2>
        ${uploads.length
          ? `<div class="lb-grid" data-uploads>${uploads.map((t) => trackRowHTML(t, { variant: 'compact' })).join('')}</div>`
          : UP_EMPTY}
      </section>`;

    const grid = el.querySelector('[data-liked]');
    if (grid) bindRows(grid, liked, 'Liked Songs');
    const up = el.querySelector('[data-uploads]');
    if (up) bindRows(up, uploads, 'My Uploads');
    el.querySelector('[data-open-upload]')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('tunyx:open-upload'));
    });
  },
};
