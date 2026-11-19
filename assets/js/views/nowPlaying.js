// Now Playing (Figma Playing 28:163): NOW PLAYING label, title, artist, cover, then the live equalizer
// that replaces the progress bar, with the thin seek bar and the time under it.
import { player } from '../player.js';
import { icon } from '../icons.js';
import { emptyHTML, esc, assetUrl } from '../util.js';
import { mountVisualizer } from '../components/visualizer.js';

export default {
  panel: true,
  render(el) {
    let destroy = null;
    let shownId = null;                      // track currently drawn; skip rebuilding on play/pause/volume emits

    function build(t) {
      destroy?.(); destroy = null;
      el.innerHTML = `<div class="np">
        <p class="text-label-upper np-label">Now playing</p>
        <h1 class="text-display np-title">${esc(t.title)}</h1>
        <p class="np-artist text-body">${esc(t.artist_name || 'Unknown Artist')}</p>
        <div class="np-cover">${icon('music', 96)}${t.cover_path ? `<img src="${esc(assetUrl(t.cover_path))}" alt="" onerror="this.remove()">` : ''}</div>
        <div class="np-stage">
          <canvas class="np-viz" aria-hidden="true"></canvas>
          <canvas class="np-bar"></canvas>
          <div class="np-time text-body">0:00 / 0:00</div>
        </div>
      </div>`;
      destroy = mountVisualizer({
        viz: el.querySelector('.np-viz'),
        bar: el.querySelector('.np-bar'),
        time: el.querySelector('.np-time'),
      });
    }

    function sync() {
      const t = player.current();
      if (!t) {
        if (shownId !== null || !el.firstChild || !el.querySelector('.empty')) {
          destroy?.(); destroy = null; shownId = null;
          el.innerHTML = emptyHTML('music', 'Empty :(');
        }
        return;
      }
      if (t.track_id === shownId) return;
      shownId = t.track_id;
      build(t);
    }

    sync();
    const off = player.subscribe(sync);
    return () => { off(); destroy?.(); destroy = null; };   // router calls this when leaving the view
  },
};
