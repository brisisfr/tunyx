// The audio engine. ONE <audio> element for the whole app, so playback never resets on navigation.
// Visualizer later: use getAudio() and create the AudioContext/MediaElementSource ONCE (inside a user gesture).
import { assetUrl } from './util.js';
import { MOCK } from './api.js';
import { mockAudioUrl } from './mock.js';
import { recordPlay } from './history.js';
import { toast } from './components/toast.js';

const audio = new Audio();
audio.preload = 'auto';

const VOL_KEY = 'tunyx_volume';
const loadVol = () => { try { const v = parseFloat(localStorage.getItem(VOL_KEY)); return isNaN(v) ? 0.8 : Math.min(1, Math.max(0, v)); } catch { return 0.8; } };

const s = {
  queue: [],        // what plays, in order (already shuffled if shuffle is on)
  index: -1,
  playing: false,
  shuffle: false,
  label: '',        // "Playing from …"
  volume: loadVol(),
  muted: false,
};
audio.volume = s.volume;

const subs = new Set();      // fires on track / queue / play-state / volume changes
const timeSubs = new Set();  // fires on time updates (cheap handlers only)
const emit = () => subs.forEach((f) => f(s));
const emitTime = () => timeSubs.forEach((f) => f(audio));

const srcFor = (t) => (MOCK ? mockAudioUrl(t.duration_sec) : assetUrl(t.file_path));
const current = () => s.queue[s.index] ?? null;
const shuffled = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

let pendingRecord = null;
function load(i, autoplay = true) {
  const t = s.queue[i];
  if (!t) return;
  s.index = i;
  pendingRecord = t;
  audio.src = srcFor(t);
  emit();
  updateMediaSession(t);
  if (autoplay) audio.play().catch(() => { /* real failures arrive via the 'error' event; autoplay blocks leave us paused */ });
}

function startQueue(list, startIndex, label) {
  s.label = label || '';
  if (s.shuffle) {
    const first = list[startIndex];
    s.queue = [first, ...shuffled(list.filter((_, i) => i !== startIndex))];
    load(0);
  } else {
    s.queue = [...list];
    load(startIndex);
  }
}

audio.addEventListener('play', () => { s.playing = true; emit(); });
audio.addEventListener('pause', () => { s.playing = false; emit(); });
audio.addEventListener('playing', () => { if (pendingRecord) { recordPlay(pendingRecord); pendingRecord = null; } });
audio.addEventListener('timeupdate', emitTime);
audio.addEventListener('durationchange', emitTime);
audio.addEventListener('ended', () => next(true));
audio.addEventListener('error', () => {
  if (!audio.getAttribute('src')) return;
  s.playing = false; emit();
  toast("Couldn't play that track (file missing or unsupported).", 'error');
});

function next(auto = false) {
  if (!s.queue.length) return;
  let i = s.index + 1;
  if (i >= s.queue.length) {
    if (auto) { audio.pause(); s.playing = false; emit(); return; }   // end of queue: just stop
    i = 0;                                                            // manual next wraps around
  }
  load(i);
}
function prev() {
  if (!s.queue.length) return;
  if (audio.currentTime > 3 || s.index === 0) { audio.currentTime = 0; return; }
  load(s.index - 1);
}

function updateMediaSession(t) {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist_name, album: t.album_title || '' });
    navigator.mediaSession.setActionHandler('play', () => audio.play());
    navigator.mediaSession.setActionHandler('pause', () => audio.pause());
    navigator.mediaSession.setActionHandler('previoustrack', prev);
    navigator.mediaSession.setActionHandler('nexttrack', () => next());
  } catch { /* not critical */ }
}

export const player = {
  state: s,
  getAudio: () => audio,
  current,
  subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
  subscribeTime(fn) { timeSubs.add(fn); return () => timeSubs.delete(fn); },

  /** Click on a song: the queue becomes the list it was clicked from (Spotify behaviour). */
  playTrack(track, list = [track], label = '') {
    s.shuffle = false;
    const i = list.findIndex((t) => t.track_id === track.track_id);
    startQueue(list, i < 0 ? 0 : i, label);
  },
  /** Play button / Shuffle button on a playlist. */
  playList(list, { shuffle = false, label = '' } = {}) {
    if (!list.length) return;
    s.shuffle = shuffle;
    startQueue(list, shuffle ? Math.floor(Math.random() * list.length) : 0, label);
  },
  playAt: (i) => load(i),
  toggle() {
    if (!current()) return;
    audio.paused ? audio.play().catch(() => {}) : audio.pause();
  },
  next: () => next(false),
  prev,
  seek(sec) { if (isFinite(sec)) audio.currentTime = Math.max(0, sec); },
  setVolume(v) {
    s.volume = Math.min(1, Math.max(0, v)); s.muted = false;
    audio.volume = s.volume; audio.muted = false;
    try { localStorage.setItem(VOL_KEY, String(s.volume)); } catch { /* ignore */ }
    emit();
  },
  toggleMute() { s.muted = !s.muted; audio.muted = s.muted; emit(); },
  addToQueue(track) {
    if (!s.queue.length) { this.playTrack(track, [track], 'Queue'); return; }
    s.queue.push(track);
    emit();
    toast(`Added “${track.title}” to the queue`);
  },
  removeFromQueue(index) {
    const i = Number(index);
    if (!Number.isInteger(i) || i < 0 || i >= s.queue.length) return;

    if (i === s.index) {
      s.queue.splice(i, 1);
      if (s.queue.length) {
        if (i < s.queue.length) load(i);
        else load(s.queue.length - 1);
      } else {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        s.playing = false;
        s.queue = [];
        s.index = -1;
      }
    } else {
      s.queue.splice(i, 1);
      if (i < s.index) s.index--;
      emit();
    }
    toast('Removed from queue', 'removed');
  },
  clearQueue() {
    if (s.index >= 0) s.queue = s.queue.slice(0, s.index + 1);
    else s.queue = [];
    emit();
    toast('Queue cleared', 'info');
  },
  stop() {
    audio.pause(); audio.removeAttribute('src'); audio.load();
    s.queue = []; s.index = -1; s.playing = false; s.label = '';
    emit();
  },
};
