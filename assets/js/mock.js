// Fake backend for ?mock=1 (open index.php?mock=1). Same {success,message,data} contract as the real API,
// data read from assets/mock/*.json. Handy when XAMPP/MySQL isn't running. Nothing here is used otherwise.
import { ApiError } from './util.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const cache = {};
async function load(name) {
  if (!cache[name]) {
    const res = await fetch(`assets/mock/${name}.json`);
    cache[name] = (await res.json()).data;
  }
  return structuredClone(cache[name]);
}

let loggedIn = (() => { try { return sessionStorage.getItem('tunyx_mock_in') === '1'; } catch { return false; } })();
const setIn = (v) => { loggedIn = v; try { sessionStorage.setItem('tunyx_mock_in', v ? '1' : '0'); } catch { /* ignore */ } };
let likes = null; let playlists = null; let plTracks = null; let nextPl = 100;

export async function mockRequest(path, { method = 'GET', body } = {}) {
  await wait(80);
  const url = new URL(path, location.href);
  const name = url.pathname.split('/').pop().replace('.php', '');
  const q = url.searchParams;
  const m = method.toUpperCase();
  const json = () => { try { return JSON.parse(body); } catch { return {}; } };

  if (name === 'login' || name === 'register') {
    const b = json();
    if (!b.password || String(b.password).length < 8) throw new ApiError(401, 'Invalid login credentials (mock: use any 8+ character password)');
    setIn(true);
    return load('me');
  }
  if (name === 'logout') { setIn(false); return null; }
  if (!loggedIn) throw new ApiError(401, 'Authentication required');

  const songs = await load('songs');
  likes ||= await load('like');
  playlists ||= await load('playlists');
  plTracks ||= await load('playlist_tracks');

  switch (name) {
    case 'me': return load('me');

    case 'songs': {
      const term = (q.get('q') || '').toLowerCase();
      const genre = q.get('genre');
      let rows = songs.filter((t) => (!term || t.title.toLowerCase().includes(term) || t.artist_name.toLowerCase().includes(term))
        && (!genre || t.genre === genre));
      const limit = Math.min(Number(q.get('limit')) || 50, 100);
      const offset = Number(q.get('offset')) || 0;
      rows = rows.slice(offset, offset + limit);
      return { tracks: rows, count: rows.length, limit, offset };
    }

    case 'like': {
      if (m === 'GET') return likes;
      const id = Number(json().track_id);
      const i = likes.findIndex((t) => t.track_id === id);
      if (i >= 0) { likes.splice(i, 1); return { track_id: id, liked: false }; }
      const t = songs.find((s) => s.track_id === id);
      if (!t) throw new ApiError(404, 'Track not found');
      likes.unshift({ ...t, liked_at: new Date().toISOString() });
      return { track_id: id, liked: true };
    }

    case 'playlists': {
      if (m === 'POST') {
        const title = (json().title || '').trim();
        if (!title) throw new ApiError(422, 'Title is required');
        const p = { playlist_id: nextPl++, title, created_at: new Date().toISOString(), track_count: 0 };
        playlists.unshift(p); plTracks[p.playlist_id] = [];
        return { playlist_id: p.playlist_id, title };
      }
      return playlists.map((p) => ({ ...p, track_count: (plTracks[p.playlist_id] || []).length }));
    }

    case 'playlist_tracks': {
      const pid = Number(q.get('playlist_id'));
      const list = plTracks[pid];
      if (!list) throw new ApiError(404, 'Playlist not found');
      if (m === 'GET') return list.map((t, i) => ({ ...t, position: i + 1 }));
      if (m === 'POST') {
        const id = Number(json().track_id);
        if (list.some((t) => t.track_id === id)) throw new ApiError(409, 'Track is already in this playlist');
        const t = songs.find((s) => s.track_id === id);
        if (!t) throw new ApiError(404, 'Track not found');
        list.push(t);
        return { playlist_id: pid, track_id: id, position: list.length };
      }
      if (m === 'DELETE') {
        const id = Number(new URLSearchParams(body).get('track_id'));
        plTracks[pid] = list.filter((t) => t.track_id !== id);
        return null;
      }
      throw new ApiError(405, 'Method not allowed');
    }

    case 'upload': throw new ApiError(403, 'Admin access required');
    default: throw new ApiError(404, `Mock: no endpoint "${name}"`);
  }
}

// ---- fake audio so the player, seek bar and (later) the visualizer have something real to chew on ----
const wavCache = new Map();
/** A quiet synthesized loop (kick + arpeggio) as an 8-bit mono WAV blob URL. */
export function mockAudioUrl(durationSec) {
  const sec = Math.max(5, Math.min(Math.round(durationSec || 180), 600));
  if (wavCache.has(sec)) return wavCache.get(sec);
  const rate = 8000; const n = sec * rate;
  const buf = new ArrayBuffer(44 + n); const v = new DataView(buf);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  str(36, 'data'); v.setUint32(40, n, true);
  const notes = [220, 277.18, 329.63, 440, 329.63, 277.18];
  for (let i = 0; i < n; i++) {
    const t = i / rate; const beat = (t * 2) % 1;
    const kick = Math.sin(2 * Math.PI * (50 + 90 * Math.exp(-beat * 30)) * t) * Math.exp(-beat * 9);
    const lead = Math.sin(2 * Math.PI * notes[Math.floor(t * 4) % notes.length] * t) * Math.exp(-((t * 4) % 1) * 3);
    v.setUint8(44 + i, Math.max(0, Math.min(255, Math.round(128 + 55 * kick + 22 * lead))));
  }
  const url = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  wavCache.set(sec, url);
  return url;
}
