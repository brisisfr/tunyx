// Player bar (Player_Bar, full width). Mounted by main.js: mountPlayerBar(document.getElementById('playerbar')).
// Visuals: assets/css/playerBar.css. Re-renders only the changing bits on player.subscribe.
// v2: a thin gradient progress/seek line on the top edge (.pb-progress, every page) and a "1:23 / 3:20" label.
import { store } from '../store.js';
import { player } from '../player.js';
import { icon } from '../icons.js';
import { esc, fmtTime } from '../util.js';
import { rowCoverHTML, syncRows } from './trackRow.js';

export function mountPlayerBar(el) {
  el.innerHTML = `
    <div class="pb-progress" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-pb-progress>
      <div class="pb-progress-glow"><div class="pb-progress-fill"></div></div>
    </div>
    <a class="pb-now" href="#/playing" data-pb-now aria-label="Open Now Playing"></a>
    <button class="pb-heart" type="button" data-pb-heart aria-label="Like">${icon('heart', 20)}</button>
    <div class="pb-transport">
      <button class="pb-btn" type="button" data-pb="prev" aria-label="Previous">${icon('prev', 24)}</button>
      <button class="pb-play" type="button" data-pb="toggle" aria-label="Play"><span class="pb-play-icon" data-pb-icon></span></button>
      <button class="pb-btn" type="button" data-pb="next" aria-label="Next">${icon('next', 24)}</button>
    </div>
    <div class="pb-right">
      <button class="pb-btn" type="button" data-pb="mute" aria-label="Mute"><span data-pb-vol></span></button>
      <input class="pb-vol" type="range" min="0" max="100" step="1" aria-label="Volume">
      <button class="pb-queue" type="button" data-pb="queue" aria-label="Up next">${icon('queue', 24)}</button>
    </div>`;

  const audio = player.getAudio();
  const nowEl = el.querySelector('[data-pb-now]');
  const heart = el.querySelector('[data-pb-heart]');
  const playBtn = el.querySelector('[data-pb="toggle"]');
  const playIcon = el.querySelector('[data-pb-icon]');
  const volIcon = el.querySelector('[data-pb-vol]');
  const vol = el.querySelector('.pb-vol');
  const queueBtn = el.querySelector('[data-pb="queue"]');
  const prog = el.querySelector('[data-pb-progress]');

  const setVolFill = () => vol.style.setProperty('--fill', `${vol.value}%`);

  // ---- time label ("1:23 / 3:20"), inside the now-playing block ----
  let timeEl = null, lastLabel = '';
  function updateTime() {
    if (!timeEl) return;
    const dur = audio.duration;
    const label = `${fmtTime(audio.currentTime)} / ${fmtTime(isFinite(dur) ? dur : 0)}`;
    if (label !== lastLabel) { lastLabel = label; timeEl.textContent = label; }
  }

  // ---- progress line: fraction shown (drag overrides the audio position) ----
  let dragging = false, dragFrac = 0, lastPct = -1, lastText = '';
  function updateProgress() {
    const dur = audio.duration;
    const hasDur = isFinite(dur) && dur > 0;
    const frac = dragging ? dragFrac : (hasDur ? Math.min(1, audio.currentTime / dur) : 0);
    const pct = Math.round(frac * 10000) / 100;
    if (pct !== lastPct) {
      lastPct = pct;
      prog.style.setProperty('--p', `${pct}%`);
      prog.setAttribute('aria-valuenow', String(Math.round(pct)));
    }
    const text = hasDur ? `${fmtTime(frac * dur)} of ${fmtTime(dur)}` : '';
    if (text !== lastText) { lastText = text; text ? prog.setAttribute('aria-valuetext', text) : prog.removeAttribute('aria-valuetext'); }
  }
  let raf = 0;
  function loop() {
    updateProgress();
    raf = player.state.playing && !document.hidden ? requestAnimationFrame(loop) : 0;
  }
  const startLoop = () => { if (!raf && player.state.playing) raf = requestAnimationFrame(loop); };

  const fracFrom = (e) => {
    const r = prog.getBoundingClientRect();
    return r.width ? Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) : 0;
  };
  const canSeek = () => isFinite(audio.duration) && audio.duration > 0;
  prog.addEventListener('pointerdown', (e) => {
    if (!canSeek()) return;
    dragging = true; dragFrac = fracFrom(e);
    prog.setPointerCapture?.(e.pointerId);
    prog.classList.add('is-dragging');
    updateProgress();
  });
  prog.addEventListener('pointermove', (e) => { if (dragging) { dragFrac = fracFrom(e); updateProgress(); } });
  prog.addEventListener('pointerup', (e) => {
    if (!dragging) return;
    dragging = false; prog.classList.remove('is-dragging');
    if (canSeek()) player.seek(fracFrom(e) * audio.duration);
    updateProgress(); updateTime();
  });
  prog.addEventListener('pointercancel', () => { dragging = false; prog.classList.remove('is-dragging'); updateProgress(); });
  prog.addEventListener('keydown', (e) => {
    if (!canSeek()) return;
    if (e.key === 'ArrowRight') { player.seek(Math.min(audio.duration, audio.currentTime + 5)); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { player.seek(audio.currentTime - 5); e.preventDefault(); }
    else return;
    updateProgress(); updateTime();
  });

  // ---- main render (track / play state / volume) ----
  let shownId = null;
  function render() {
    const t = player.current();
    const st = player.state;
    el.classList.toggle('is-empty', !t);
    const id = t ? t.track_id : null;
    if (id !== shownId) {         // rebuild the block only when the track changes
      shownId = id;
      nowEl.innerHTML = t
        ? `${rowCoverHTML(t)}<span class="pb-text"><span class="pb-title text-body-strong">${esc(t.title)}</span><span class="pb-artist text-caption">${esc(t.artist_name || 'Unknown Artist')}</span></span><span class="pb-time text-caption"></span>`
        : '';
      timeEl = nowEl.querySelector('.pb-time');
      lastLabel = '';
    }
    nowEl.dataset.trackId = t ? t.track_id : '';
    heart.dataset.like = t ? t.track_id : '';
    heart.disabled = !t;
    playBtn.setAttribute('aria-label', st.playing ? 'Pause' : 'Play');
    playIcon.dataset.state = st.playing ? 'pause' : 'play';
    playIcon.innerHTML = icon(st.playing ? 'pause' : 'play', 24);
    const v = st.muted ? 0 : st.volume;
    volIcon.innerHTML = icon(v === 0 ? 'volumeX' : 'volume', 24);
    vol.value = Math.round(v * 100);
    setVolFill();
    syncRows(el);
    updateTime();
    updateProgress();
    startLoop();
  }

  function renderQueueBtn() {
    const open = document.getElementById('app')?.dataset.panel === 'open';
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
    else if (a === 'queue') store.set('panelPref', document.getElementById('app')?.dataset.panel !== 'open');
  });
  vol.addEventListener('input', () => { player.setVolume(vol.value / 100); setVolFill(); });

  player.subscribe(render);
  player.subscribeTime(() => { updateTime(); if (!raf) updateProgress(); });   // seeks while paused, durationchange
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { updateProgress(); startLoop(); } });
  ['panelPref', 'panelDefault'].forEach((k) => store.on(k, renderQueueBtn));
  store.on('likedIds', () => syncRows(el));
  matchMedia('(max-width: 1100px)').addEventListener('change', renderQueueBtn);
  render();
  renderQueueBtn();
}
