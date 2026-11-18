// Home (Figma CHome 55:3128): "Listening History" = 3x3 compact rows, "Discover Songs" = 4 cards.
import { api } from '../api.js';
import { getHistory } from '../history.js';
import { emptyHTML } from '../util.js';
import { trackRowHTML, bindRows } from '../components/trackRow.js';
import { trackCardHTML, bindCards } from '../components/trackCard.js';

export default {
  panel: false,
  async render(el) {
    const [history, tracks] = await Promise.all([getHistory(9), api.getTracks()]);
    const discover = tracks.slice(0, 4);

    el.innerHTML = `
      <section class="hm-sec">
        <h2 class="text-title hm-title">Listening History</h2>
        ${history.length
          ? `<div class="hm-grid" data-history>${history.map((t) => trackRowHTML(t, { variant: 'compact' })).join('')}</div>`
          : emptyHTML('music', 'Empty :(')}
      </section>
      <section class="hm-sec">
        <h2 class="text-title hm-title">Discover Songs</h2>
        ${discover.length
          ? `<div class="hm-cards" data-discover>${discover.map(trackCardHTML).join('')}</div>`
          : emptyHTML('music', 'Empty :(')}
      </section>`;

    const grid = el.querySelector('[data-history]');
    if (grid) bindRows(grid, history, 'Listening History');

    const cards = el.querySelector('[data-discover]');
    if (cards) bindCards(cards, discover, 'Discover Songs');
  },
};
