// Tiny pub/sub state. store.get('user'), store.set('user', u), store.on('user', fn)
const PERSIST = { sidebarCollapsed: 'tunyx_sidebar_collapsed' };

function read(key, fallback) {
  try { const v = localStorage.getItem(key); return v === null ? fallback : v; } catch { return fallback; }
}

const state = {
  user: null,                     // {user_id, username, email}
  likedIds: new Set(),            // loaded from api/like.php once after login, updated optimistically
  playlists: [],                  // [{playlist_id, title, created_at, track_count}]
  sidebarCollapsed: read(PERSIST.sidebarCollapsed, '0') === '1',
  panelPref: null,                // null = follow the route default, true/false = user toggled the Up next panel
  panelDefault: false,            // set by the router per view
  route: { name: '', path: '', query: {}, params: [] },
};

const subs = {};

export const store = {
  get: (k) => state[k],
  set(k, v) {
    state[k] = v;
    if (PERSIST[k]) { try { localStorage.setItem(PERSIST[k], v ? '1' : '0'); } catch { /* private mode etc. */ } }
    (subs[k] || []).forEach((fn) => fn(v));
  },
  on(k, fn) {
    (subs[k] ||= []).push(fn);
    return () => { subs[k] = subs[k].filter((f) => f !== fn); };
  },
};
