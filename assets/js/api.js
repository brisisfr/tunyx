// Fetch wrapper for the PHP endpoints. Every endpoint answers {success, message, data}.
// Paths are relative to the site root (same origin), so there is no CORS and no config.
import { ApiError } from './util.js';
import { mockRequest } from './mock.js';

export const MOCK = new URLSearchParams(location.search).get('mock') === '1';

let unauthorizedHandler = () => {};
export const onUnauthorized = (fn) => { unauthorizedHandler = fn; };

async function request(path, { silent401 = false, ...opts } = {}) {
  try {
    if (MOCK) return await mockRequest(path, opts);

    let res;
    try {
      res = await fetch(path, { credentials: 'same-origin', ...opts });
    } catch {
      throw new ApiError(0, "Can't reach the server. Is Apache running in XAMPP, and are you on http://localhost/tunyx/ ?");
    }
    let body = null;
    try { body = await res.json(); } catch { /* not JSON */ }
    if (!body) throw new ApiError(res.status, `Unexpected response from ${path} (${res.status}). Is PHP/MySQL running?`);
    if (!res.ok || body.success === false) throw new ApiError(res.status, body.message || `Request failed (${res.status})`);
    return body.data;
  } catch (e) {
    if (e instanceof ApiError && e.status === 401 && !silent401) unauthorizedHandler(e);
    throw e;
  }
}

const qs = (params) => {
  const clean = Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== '' && v != null));
  const s = new URLSearchParams(clean).toString();
  return s ? `?${s}` : '';
};
const get = (path, params, o) => request(path + qs(params), o);
const postJson = (path, body, o) => request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}), ...o });
const del = (path, fields) => request(path, { method: 'DELETE', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(fields).toString() });

// ---- one track shape for the whole app ----
const trackCache = new Map();
export function normalizeTrack(t) {
  const n = {
    track_id: Number(t.track_id),
    title: t.title ?? 'Untitled',
    artist_name: t.artist_name ?? 'Unknown artist',
    album_title: t.album_title ?? null,
    cover_path: t.cover_path ?? null,
    file_path: t.file_path ?? '',
    duration_sec: t.duration_sec == null ? null : Number(t.duration_sec),
    genre: t.genre ?? null,
    uploaded_at: t.uploaded_at ?? null,
  };
  trackCache.set(n.track_id, n);
  return n;
}
export const getTrack = (id) => trackCache.get(Number(id));
// songs.php returns {tracks:[…]}, but like.php / playlist_tracks.php return bare arrays. Handle both.
const tracksOf = (d) => (Array.isArray(d) ? d : d?.tracks ?? []).map(normalizeTrack);

export const api = {
  // auth
  me: (o) => get('api/me.php', null, o),
  login: (identity, password) => postJson('api/login.php', { identity, password }, { silent401: true }),
  register: (username, email, password) => postJson('api/register.php', { username, email, password }),
  logout: () => postJson('api/logout.php'),

  // songs
  getTracks: async ({ q, genre, limit = 50, offset = 0 } = {}) => tracksOf(await get('api/songs.php', { q, genre, limit, offset })),

  // likes
  getLiked: async () => tracksOf(await get('api/like.php')),
  toggleLike: (track_id) => postJson('api/like.php', { track_id }),

  // playlists
  getPlaylists: async () => (await get('api/playlists.php')) ?? [],
  createPlaylist: (title) => postJson('api/playlists.php', { title }),
  getPlaylistTracks: async (playlist_id) => tracksOf(await get('api/playlist_tracks.php', { playlist_id })),
  // NOTE: playlist_id goes in the QUERY STRING for add/remove (the API ignores it in a JSON body)
  addToPlaylist: (playlist_id, track_id) => postJson(`api/playlist_tracks.php?playlist_id=${encodeURIComponent(playlist_id)}`, { track_id }),
  removeFromPlaylist: (playlist_id, track_id) => del(`api/playlist_tracks.php?playlist_id=${encodeURIComponent(playlist_id)}`, { track_id }),

  // upload (multipart; admin-only for now -> 403)
  upload: (formData) => request('api/upload.php', { method: 'POST', body: formData }),
};
