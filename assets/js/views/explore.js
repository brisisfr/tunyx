// Explorer (Figma Main 55:4201): banner 1000x300 (10px inset, radius 16) + "Explore Songs" cards in a
// horizontal scroller. The banner image was pulled out of the SVG export as assets/img/explore-banner.png.
import { api } from '../api.js';
import { emptyHTML } from '../util.js';
import { trackCardHTML, bindCards } from '../components/trackCard.js';

export default {
  panel: false,
  async render(el) {
    const tracks = await api.getTracks();

    el.innerHTML = `
      <div class="ex-banner" role="img" aria-label="Tunyx"></div>
      <section class="ex-sec">
        <h2 class="text-title ex-title">Explore Songs</h2>
        ${tracks.length
          ? `<div class="ex-cards" data-cards>${tracks.map(trackCardHTML).join('')}</div>`
          : emptyHTML('music', 'Empty :(')}
      </section>`;

    const cards = el.querySelector('[data-cards]');
    if (cards) bindCards(cards, tracks, 'Explore Songs');
  },
};
