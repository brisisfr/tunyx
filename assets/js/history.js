// Listening history. Lives in localStorage for now (per user) because there is no play_history endpoint yet.
// When the DB team ships one, only this file changes: recordPlay() POSTs, getHistory() GETs.
import { store } from './store.js';

const key = () => `tunyx_history_${store.get('user')?.user_id ?? 'anon'}`;

export function getHistory(n = 9) {
  try { return JSON.parse(localStorage.getItem(key()) || '[]').slice(0, n); } catch { return []; }
}

export function recordPlay(track) {
  try {
    const list = getHistory(50).filter((t) => t.track_id !== track.track_id);
    list.unshift(track);
    localStorage.setItem(key(), JSON.stringify(list.slice(0, 50)));
  } catch { /* storage unavailable: history just won't persist */ }
}
