// Now Playing. STUB: Claude builds the real screen + visualizer. Shows what the player has queued.
import { player } from '../player.js';
import { emptyHTML, esc } from '../util.js';

export default {
  panel: true,
  render(el) {
    const draw = () => {
      const t = player.current();
      el.innerHTML = `<div class="np">
        <p class="text-label-upper np-label">Now playing</p>
        ${t
          ? `<h1 class="text-display np-title">${esc(t.title)}</h1>
             <p class="np-artist text-body">${esc(t.artist_name || 'Unknown Artist')}</p>`
          : emptyHTML('music', 'Empty :(')}
      </div>`;
    };
    draw();
    return player.subscribe(draw);        // router uses the unsubscribe as this view's cleanup
  },
};
