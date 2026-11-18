// Player bar (Player_Bar, 80px, full width). Mounted by main.js: mountPlayerBar(document.getElementById('playerbar')).
// Visuals: assets/css/playerBar.css. Re-renders only the changing bits on player.subscribe.
import { store } from '../store.js';
import { player } from '../player.js';
import { icon } from '../icons.js';
import { esc } from '../util.js';
import { rowCoverHTML, syncRows } from './trackRow.js';

export function mountPlayerBar(el) {
  el.innerHTML = `
    <a class="pb-now" href="#/playing" data-pb-now aria-label="Open Now Playing"></a>
    <button class="pb-heart" type="button" data-pb-heart aria-label="Like">${icon('heart', 20)}</button>
    <div class="pb-transport">
      <button class="pb-btn" type="button" data-pb="prev" aria-label="Previous">${icon('prev', 24)}</button>
      <button class="pb-play" type="button" data-pb="toggle" aria-label="Play"><span data-pb-icon></span></button>
      <button class="pb-btn" type="button" data-pb="next" aria-label="Next">${icon('next', 24)}</button>
    </div>
    <div class="pb-right">
      <button class="pb-btn" type="button" data-pb="mute" aria-label="Mute"><span data-pb-vol></span></button>
      <input class="pb-vol" type="range" min="0" max="100" step="1" aria-label="Volume">
      <button class="pb-queue" type="button" data-pb="queue" aria-label="Up next">${icon('queue', 24)}</button>
    </div>`;

  const nowEl = el.querySelector('[data-pb-now]');
  const heart = el.querySelector('[data-pb-heart]');
  const playBtn = el.querySelector('[data-pb="toggle"]');
  const playIcon = el.querySelector('[data-pb-icon]');
  const volIcon = el.querySelector('[data-pb-vol]');
  const vol = el.querySelector('.pb-vol');
  const queueBtn = el.querySelector('[data-pb="queue"]');

  const setVolFill = () => vol.style.setProperty('--fill', `${vol.value}%`);

  function render() {
    const t = player.current();
    const st = player.state;
    el.classList.toggle('is-empty', !t);
    nowEl.innerHTML = t
      ? `${rowCoverHTML(t)}<span class="pb-text"><span class="pb-title text-body-strong">${esc(t.title)}</span><span class="pb-artist text-caption">${esc(t.artist_name || 'Unknown Artist')}</span></span>`
      : '';
    nowEl.dataset.trackId = t ? t.track_id : '';
    heart.dataset.like = t ? t.track_id : '';
    heart.disabled = !t;
    playBtn.setAttribute('aria-label', st.playing ? 'Pause' : 'Play');
    playIcon.innerHTML = icon(st.playing ? 'pause' : 'play', 24);
    const v = st.muted ? 0 : st.volume;
    volIcon.innerHTML = icon(v === 0 ? 'volumeX' : 'volume', 24);
    vol.value = Math.round(v * 100);
    setVolFill();
    syncRows(el);
  }

  function renderQueueBtn() {
    const open = (store.get('panelPref') ?? store.get('panelDefault')) === true;
    queueBtn.classList.toggle('is-active', open);
    queueBtn.setAttribute('aria-pressed', open ? 'true' : 'false');
  }

  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pb]');
    if (!b) return;
    const a = b.dataset.pb;
    if (a === 'prev') player.prev();
    else if (a === 'next') player.next();
    else if (a === 'toggle') player.toggle();
    else if (a === 'mute') player.toggleMute();
    else if (a === 'queue') store.set('panelPref', !((store.get('panelPref') ?? store.get('panelDefault')) === true));
  });
  vol.addEventListener('input', () => { player.setVolume(vol.value / 100); setVolFill(); });

  player.subscribe(render);
  ['panelPref', 'panelDefault'].forEach((k) => store.on(k, renderQueueBtn));
  store.on('likedIds', () => syncRows(el));
  render();
  renderQueueBtn();
}
