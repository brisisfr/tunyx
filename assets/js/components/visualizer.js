// Live spectrum equalizer v2: a full-window overlay canvas shown on Now Playing.
// mountVisualizer({ canvas }) -> destroy(). The canvas is position:fixed (see nowPlaying.css), so the bars cross
// the sidebar, Main and Up next, sit on top of the player bar, and never block clicks (pointer-events:none).
// Progress is shown by the bars lighting up left to right, read from the <audio> element; seeking lives in the
// player bar (.pb-progress), so this file has no pointer handling at all.
// The Web Audio graph is built ONCE for the app's single <audio> (createMediaElementSource only works once per element),
// and only inside a user gesture, because a graph attached to a suspended context would silence the music.
import { player } from '../player.js';

// ---- tweakable look (all the "flashy" numbers live here) ----
const BARS = 64;                // v1/v2.0 had 32
const MIN_H = 14;               // px, height of a silent pill
const MAX_FRAC = 0.85;          // tallest pill = this fraction of the canvas height
const LEVEL_EXP = 1.35;         // lower = more reactive to quiet sounds (v1: 1.7)
const ATTACK = 0.75;            // how fast bars rise (v1: 0.6)
const RELEASE = 0.22;           // how fast bars fall (v1: 0.15)
const KICK_GAIN = 0.5;          // extra height on a bass hit (v1: 0.35)
const KICK_THRESHOLD = 0.08;    // unchanged
const GLOW_BASE = 12, GLOW_KICK = 30;
// the row runs corner to corner: the window is split into BARS equal slots and each pill is centred in its slot
const BAR_W_MIN = 4, BAR_W_MAX = 18, BAR_W_FRAC = 0.55;   // BAR_W = clamp(MIN, slot width * FRAC, MAX)
const KICK_BARS = BARS / 8;     // the lowest bars that feed kick detection (4 of 32 before)
const PAD_TOP = 44;             // room above the tallest pill so the glow isn't clipped
const PAD_BOTTOM = 2;
const DPR_CAP = 2;
const CYCLE_SPEED = 0.15;       // gradient cycles per second
const DIM = 'rgba(110, 103, 148, 0.55)';           // #6e6794 at ~0.55 so the cover shows through

const LO_BIN = 2, HI_BIN = 372;                       // ~43 Hz .. ~8 kHz at fftSize 2048
const COLORS = ['#bc74e2', '#A493F0', '#55C9D8'];     // lavender, indigo, azure
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---- audio graph (module level: survives the view being re-mounted) ----
let ctx = null, analyser = null, data = null, tried = false;

export function ensureAudioGraph() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return !!analyser; }
  if (tried) return false;
  // only inside a user gesture; otherwise try again on the next one
  if (navigator.userActivation && !navigator.userActivation.isActive) return false;
  tried = true;
  try {
    const audio = player.getAudio();
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createMediaElementSource(audio);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.minDecibels = -75;
    analyser.maxDecibels = -15;
    analyser.smoothingTimeConstant = 0.3;
    src.connect(analyser);
    analyser.connect(ctx.destination);
    data = new Uint8Array(analyser.frequencyBinCount);
    audio.addEventListener('play', () => { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); });
    ctx.resume().catch(() => {});
    return true;
  } catch (e) {
    console.warn('[visualizer] Web Audio unavailable, showing idle bars', e);
    ctx = analyser = data = null;
    return false;
  }
}

const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
/** color of the moving gradient at x (same math as the 7 stops) */
function colorAt(x, s, P) {
  const c = ((((x - s) / P) % 1) + 1) % 1 * 3;
  const i = Math.floor(c), t = c - i;
  const a = hex(COLORS[i % 3]), b = hex(COLORS[(i + 1) % 3]);
  return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * t)).join(',')})`;
}

export function mountVisualizer({ canvas }) {
  const g = canvas.getContext('2d');
  const audio = player.getAudio();
  const smooth = new Array(BARS).fill(0);
  let avgBass = 0, kick = 0, raf = 0, dead = false;
  let vw = 0, vh = 0, dirty = true;

  // keep the canvas crisp: CSS size * devicePixelRatio (capped), drawing in CSS pixels
  function fit() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(DPR_CAP, window.devicePixelRatio || 1);
    vw = Math.max(1, Math.round(r.width)); vh = Math.max(1, Math.round(r.height));
    const pw = Math.round(vw * dpr), ph = Math.round(vh * dpr);
    if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    dirty = false;
  }
  const markDirty = () => { dirty = true; };
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(markDirty) : null;
  ro?.observe(canvas);
  window.addEventListener('resize', markDirty);

  // the first click/keypress anywhere builds the audio graph (no-op once built)
  const gesture = () => ensureAudioGraph();
  document.addEventListener('pointerdown', gesture, true);
  document.addEventListener('keydown', gesture, true);
  ensureAudioGraph();                       // works when the user just clicked the nav link

  function draw() {
    if (dead) return;
    raf = requestAnimationFrame(draw);
    if (document.hidden) return;
    if (dirty) fit();
    g.clearRect(0, 0, vw, vh);
    if (analyser) analyser.getByteFrequencyData(data);

    const progress = audio.duration ? audio.currentTime / audio.duration : 0;
    const lit = progress * BARS;

    let bass = 0;
    for (let i = 0; i < KICK_BARS; i++) bass += smooth[i] / KICK_BARS;
    avgBass += (bass - avgBass) * 0.02;
    const spike = Math.max(0, bass - avgBass - KICK_THRESHOLD);
    kick = Math.min(1, Math.max(kick * 0.88, spike * 3));

    const slot = vw / BARS;
    const BAR_W = Math.min(Math.max(BAR_W_MIN, slot * BAR_W_FRAC), BAR_W_MAX, slot * 0.8);
    const inset = (slot - BAR_W) / 2;
    const maxH = Math.min(vh - PAD_TOP - PAD_BOTTOM, vh * MAX_FRAC);
    const base = vh - PAD_BOTTOM;

    const P = vw;                                          // one color cycle = row width
    const phase = reduceMotion ? 0 : (performance.now() / 1000 * CYCLE_SPEED) % 1;
    const s = -P + phase * P;
    const grad = g.createLinearGradient(s, 0, s + 2 * P, 0);
    for (let n = 0; n <= 6; n++) grad.addColorStop(n / 6, COLORS[n % 3]);

    for (let i = 0; i < BARS; i++) {
      const f = BARS - 1 - i;                              // bass on the right
      let level = 0;
      if (analyser) {
        const a = LO_BIN * Math.pow(HI_BIN / LO_BIN, i / BARS);
        const b = LO_BIN * Math.pow(HI_BIN / LO_BIN, (i + 1) / BARS);
        let v;
        if (b - a >= 1) {                                  // wide range (highs): average the bins
          const ia = Math.floor(a), ib = Math.max(ia + 1, Math.floor(b));
          let sum = 0;
          for (let k = ia; k < ib; k++) sum += data[k];
          v = sum / (ib - ia);
        } else {                                           // narrow range (bass, 64 bars): interpolate so neighbours differ smoothly
          const c = (a + b) / 2, k = Math.floor(c), t = c - k;
          v = data[k] * (1 - t) + data[k + 1] * t;
        }
        level = Math.pow(v / 255, LEVEL_EXP);
      }
      const prev = smooth[i];
      smooth[i] = level > prev ? prev + (level - prev) * ATTACK : prev + (level - prev) * RELEASE;
      level = smooth[i];
      const h = Math.min(vh - PAD_TOP - PAD_BOTTOM, (MIN_H + level * (maxH - MIN_H)) * (1 + kick * KICK_GAIN));
      const x = f * slot + inset, y = base - h;
      const fa = Math.min(1, Math.max(0, lit - f));        // how much of this pill is lit

      g.fillStyle = DIM;                                   // translucent dim pill, always
      g.beginPath(); g.roundRect(x, y, BAR_W, h, BAR_W / 2); g.fill();

      if (fa > 0) {                                        // lit pill: opaque gradient + glow that swells on kicks
        g.save();
        g.shadowColor = colorAt(x + BAR_W / 2, s, P);
        g.shadowBlur = GLOW_BASE + kick * GLOW_KICK;
        g.globalAlpha = fa;                                // the one partial pill fades in
        g.fillStyle = grad;
        g.beginPath(); g.roundRect(x, y, BAR_W, h, BAR_W / 2); g.fill();
        g.restore();
      }
    }
  }
  raf = requestAnimationFrame(draw);

  return function destroy() {
    dead = true;
    cancelAnimationFrame(raf);
    ro?.disconnect();
    window.removeEventListener('resize', markDirty);
    document.removeEventListener('pointerdown', gesture, true);
    document.removeEventListener('keydown', gesture, true);
  };
}
