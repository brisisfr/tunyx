// Now Playing (Figma Playing 28:163): NOW PLAYING label, title, artist and a big cover.
// The live equalizer is a full-window overlay canvas (position:fixed, pointer-events:none) that lives inside #app
// only while this view is shown; seeking and the time label live in the player bar.
import { player } from '../player.js';
import { icon } from '../icons.js';
import { emptyHTML, esc, assetUrl } from '../util.js';
import { mountVisualizer } from '../components/visualizer.js';

export default {
  panel: true,
  render(el) {
    let overlay = null, destroyViz = null;
    let shownId = null;                      // track currently drawn; skip rebuilding on play/pause/volume emits

    function mountOverlay() {
      if (overlay) return;                   // a new track never rebuilds the canvas
      overlay = document.createElement('canvas');
      overlay.className = 'np-overlay';
      overlay.setAttribute('aria-hidden', 'true');
      (document.getElementById('app') || document.body).appendChild(overlay);   // inside #app so it inherits --playerbar-h
      destroyViz = mountVisualizer({ canvas: overlay });
    }
    function unmountOverlay() {
      destroyViz?.(); destroyViz = null;
      overlay?.remove(); overlay = null;
    }

    function build(t) {
      el.innerHTML = `<div class="np">
        <p class="text-label-upper np-label">Now playing</p>
        <h1 class="text-display np-title">${esc(t.title)}</h1>
        <p class="np-artist text-body">${esc(t.artist_name || 'Unknown Artist')}</p>
        <div class="np-cover">${icon('music', 96)}${t.cover_path ? `<img src="${esc(assetUrl(t.cover_path))}" alt="" onerror="this.remove()">` : ''}</div>
      </div>`;
      mountOverlay();
    }

    function sync() {
      const t = player.current();
      if (!t) {
        if (shownId !== null || !el.querySelector('.empty')) {
          unmountOverlay(); shownId = null;
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
    return () => { off(); unmountOverlay(); };   // router calls this when leaving the view
  },
};
