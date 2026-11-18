// Library (Figma Main_Library 82:1418): "Liked Songs" then "My Uploads", both 3-col compact rows.
// My Uploads has no data source yet (songs.php has no uploader_id / ?mine=1) -> empty state.
import { api } from '../api.js';
import { emptyHTML } from '../util.js';
import { trackRowHTML, bindRows } from '../components/trackRow.js';

export default {
  panel: false,
  async render(el) {
    const liked = await api.getLiked();

    el.innerHTML = `
      <section class="lb-sec">
        <h2 class="text-title lb-title">Liked Songs</h2>
        ${liked.length
          ? `<div class="lb-grid" data-liked>${liked.map((t) => trackRowHTML(t, { variant: 'compact' })).join('')}</div>`
          : emptyHTML('music', 'Empty :(')}
      </section>
      <section class="lb-sec">
        <h2 class="text-title lb-title">My Uploads</h2>
        ${emptyHTML('music', 'Empty :(')}
      </section>`;

    const grid = el.querySelector('[data-liked]');
    if (grid) bindRows(grid, liked, 'Liked Songs');
  },
};
