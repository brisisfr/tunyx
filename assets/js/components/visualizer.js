// Live spectrum equalizer + gradient seek bar for Now Playing. Port of visualizer_proto (values: claude/visualizer-spec.md).
// mountVisualizer({ viz, bar, time }) -> destroy(). viz/bar are <canvas>, time is an element for "m:ss / m:ss".
// The Web Audio graph is built ONCE for the app's single <audio> (createMediaElementSource only works once per element),
// and only inside a user gesture, because a graph attached to a suspended context would silence the music.
import { player } from '../player.js';
import { fmtTime } from '../util.js';

const BARS = 32, MIN_H = 10, MAX_H = 100, PAD = 14, BAR_H = 3;
const LO_BIN = 2, HI_BIN = 372;                       // ~43 Hz .. ~8 kHz at fftSize 2048
const COLORS = ['#bc74e2', '#A493F0', '#55C9D8'];     // lavender, indigo, azure
const DIM = '#6e6794';
const CYCLE_SPEED = 0.15;                             // gradient cycles per second
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

export function mountVisualizer({ viz, bar, time }) {
  const g = viz.getContext('2d');
  const bg = bar.getContext('2d');
  const audio = player.getAudio();
  const smooth = new Array(BARS).fill(0);
  let avgBass = 0, kick = 0, raf = 0, dead = false;
  let dragging = false, dragFrac = 0;
  let vw = 0, vh = 0, bw = 0, bh = 0;

  // keep the canvases crisp: CSS size * devicePixelRatio, drawing in CSS pixels
  function fit(c, ctx2) {
    const r = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    }
    ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
    return [w, h];
  }

  const fracFrom = (e) => {
    const r = bar.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  };
  const onDown = (e) => {
    if (!audio.duration) return;
    dragging = true; bar.setPointerCapture?.(e.pointerId); dragFrac = fracFrom(e);
  };
  const onMove = (e) => { if (dragging) dragFrac = fracFrom(e); };
  const onUp = (e) => {
    if (!dragging) return;
    dragging = false;
    player.seek(fracFrom(e) * audio.duration);
  };
  const onCancel = () => { dragging = false; };
  bar.addEventListener('pointerdown', onDown);
  bar.addEventListener('pointermove', onMove);
  bar.addEventListener('pointerup', onUp);
  bar.addEventListener('pointercancel', onCancel);
  // keyboard seek on the bar: arrows +-5s
  bar.tabIndex = 0;
  bar.setAttribute('role', 'slider');
  bar.setAttribute('aria-label', 'Seek');
  bar.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { player.seek(audio.currentTime + 5); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { player.seek(audio.currentTime - 5); e.preventDefault(); }
  });

  // the first click/keypress anywhere builds the audio graph (no-op once built)
  const gesture = () => ensureAudioGraph();
  document.addEventListener('pointerdown', gesture, true);
  document.addEventListener('keydown', gesture, true);
  ensureAudioGraph();                       // works when the user just clicked the nav link

  function draw() {
    if (dead) return;
    raf = requestAnimationFrame(draw);
    if (document.hidden) return;
    [vw, vh] = fit(viz, g);
    [bw, bh] = fit(bar, bg);
    g.clearRect(0, 0, vw, vh);
    if (analyser) analyser.getByteFrequencyData(data);

    const actual = audio.duration ? audio.currentTime / audio.duration : 0;
    const progress = dragging ? dragFrac : actual;
    const lit = progress * BARS;

    let bass = 0;
    for (let i = 0; i < 4; i++) bass += smooth[i] / 4;
    avgBass += (bass - avgBass) * 0.02;
    const spike = Math.max(0, bass - avgBass - 0.08);
    kick = Math.min(1, Math.max(kick * 0.88, spike * 3));

    const P = vw;                                          // one color cycle = row width
    const phase = reduceMotion ? 0 : (performance.now() / 1000 * CYCLE_SPEED) % 1;
    const s = -P + phase * P;
    const grad = g.createLinearGradient(s, 0, s + 2 * P, 0);
    for (let n = 0; n <= 6; n++) grad.addColorStop(n / 6, COLORS[n % 3]);

    const BAR_W = Math.min(10, (vw / BARS) * 0.55);
    const GAP = (vw - BARS * BAR_W) / (BARS - 1);

    for (let i = 0; i < BARS; i++) {
      const f = BARS - 1 - i;                              // bass on the right
      let level = 0;
      if (analyser) {
        const a = Math.floor(LO_BIN * Math.pow(HI_BIN / LO_BIN, i / BARS));
        const b = Math.max(a + 1, Math.floor(LO_BIN * Math.pow(HI_BIN / LO_BIN, (i + 1) / BARS)));
        let sum = 0;
        for (let k = a; k < b; k++) sum += data[k];
        level = Math.pow(sum / (b - a) / 255, 1.7);
      }
      const prev = smooth[i];
      smooth[i] = level > prev ? prev + (level - prev) * 0.6 : prev + (level - prev) * 0.15;
      level = smooth[i];
      const h = Math.min(vh - PAD * 2, (MIN_H + level * (MAX_H - MIN_H)) * (1 + kick * 0.35));
      const x = f * (BAR_W + GAP), y = vh - PAD - h;
      const fa = Math.min(1, Math.max(0, lit - f));        // how much of this pill is lit

      if (fa > 0) {                                        // glow pass (swells on kicks)
        g.save();
        g.shadowColor = colorAt(x + BAR_W / 2, s, P);
        g.shadowBlur = 8 + kick * 14;
        g.globalAlpha = fa;
        g.fillStyle = DIM;
        g.beginPath(); g.roundRect(x, y, BAR_W, h, BAR_W / 2); g.fill();
        g.restore();
      }
      g.fillStyle = DIM;                                   // dim pill, always
      g.beginPath(); g.roundRect(x, y, BAR_W, h, BAR_W / 2); g.fill();
      if (fa > 0) {                                        // lit color, clipped to the pill, left part only
        g.save(); g.clip();
        g.fillStyle = grad;
        g.fillRect(x, y, BAR_W * fa, h);
        g.restore();
      }
    }

    // thin seek bar
    bg.clearRect(0, 0, bw, bh);
    const by = (bh - BAR_H) / 2;
    if (progress > 0) {
      bg.save();
      bg.shadowColor = colorAt(bw * progress, s, P);
      bg.shadowBlur = 6;
      bg.fillStyle = DIM;
      bg.beginPath(); bg.roundRect(0, by, Math.max(BAR_H, bw * progress), BAR_H, BAR_H / 2); bg.fill();
      bg.restore();
    }
    bg.fillStyle = DIM;
    bg.beginPath(); bg.roundRect(0, by, bw, BAR_H, BAR_H / 2); bg.fill();
    bg.save();
    bg.beginPath(); bg.roundRect(0, by, bw, BAR_H, BAR_H / 2); bg.clip();
    bg.fillStyle = grad;
    bg.fillRect(0, by, bw * progress, BAR_H);
    bg.restore();

    const dur = audio.duration || 0;
    const label = `${fmtTime(dragging ? dragFrac * dur : audio.currentTime)} / ${fmtTime(dur)}`;
    if (time && time.textContent !== label) time.textContent = label;
    bar.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
  }
  raf = requestAnimationFrame(draw);

  return function destroy() {
    dead = true;
    cancelAnimationFrame(raf);
    document.removeEventListener('pointerdown', gesture, true);
    document.removeEventListener('keydown', gesture, true);
    bar.removeEventListener('pointerdown', onDown);
    bar.removeEventListener('pointermove', onMove);
    bar.removeEventListener('pointerup', onUp);
    bar.removeEventListener('pointercancel', onCancel);
  };
}
