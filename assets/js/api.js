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
// songs.php / playlists_tracks.php / history.php wrap tracks ({tracks:[…]}, {history:[…]}); accept bare arrays too.
const tracksOf = (d) => (Array.isArray(d) ? d : d?.tracks ?? d?.history ?? []).map(normalizeTrack);
// me.php and login.php nest the user ({user:{…}}); mock mode returns it bare.
const userOf = (d) => d?.user ?? d;

const pt = (playlist_id) => `api/playlists_tracks.php?playlist_id=${encodeURIComponent(playlist_id)}`;

export const api = {
  // auth
  me: async (o) => userOf(await get('api/me.php', null, o)),
  login: async (identifier, password) => userOf(await postJson('api/login.php', { identifier, password }, { silent401: true })),
  // register does not start a session, so log in right after (identifier = the username just created)
  register: async (username, email, password) => {
    await postJson('api/register.php', { username, email, password });
    return api.login(username, password);
  },
  logout: () => postJson('api/logout.php'),

  // songs (no paging any more; q matches title + artist, genre is exact, liked:1 = only my liked)
  getTracks: async ({ q, genre, liked } = {}) => tracksOf(await get('api/songs.php', { q, genre, liked: liked ? 1 : '' })),

  // likes (like.php is POST-only; the liked list comes from songs.php?liked=1)
  getLiked: () => api.getTracks({ liked: true }),
  toggleLike: (track_id) => postJson('api/like.php', { track_id }),

  // playlists
  getPlaylists: async () => (await get('api/playlists.php'))?.playlists ?? [],
  createPlaylist: async (title) => ({ ...(await postJson('api/playlists.php', { title })), title }),
  // playlists_tracks.php (plural): playlist_id in the query string, JSON bodies, no reorder.
  // If the DB team keeps the singular playlist_tracks.php instead, only these three lines change.
  getPlaylistTracks: async (playlist_id) => tracksOf(await get('api/playlists_tracks.php', { playlist_id })),
  addToPlaylist: (playlist_id, track_id) => postJson(pt(playlist_id), { track_id }),
  removeFromPlaylist: (playlist_id, track_id) => postJson(pt(playlist_id), { action: 'remove', track_id }),

  // history (newest first, NOT de-duplicated; history.js dedupes)
  getHistory: async (limit = 30) => tracksOf(await get('api/history.php', { limit })),
  recordPlay: (track_id) => postJson('api/history.php', { track_id }),
  clearHistory: () => postJson('api/history.php', { action: 'clear' }),

  // upload (multipart: title, artist_name, album_title?, genre?, duration_sec?, audio, cover?)
  upload: (formData) => request('api/upload.php', { method: 'POST', body: formData }),
};
