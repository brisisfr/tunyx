// Listening history, stored server-side (api/history.php, per logged-in user).
// recordPlay is fire-and-forget (player.js calls it when playback actually starts);
// getHistory returns the most recent DISTINCT tracks (the API returns one row per play).
import { api } from './api.js';

export async function getHistory(n = 9) {
  const rows = await api.getHistory(30);
  const seen = new Set();
  const out = [];
  for (const t of rows) {
    if (seen.has(t.track_id)) continue;
    seen.add(t.track_id);
    out.push(t);
    if (out.length >= n) break;
  }
  return out;
}

export function recordPlay(track) {
  // a failed history write must never interrupt playback (and a 401 is handled by the login modal)
  api.recordPlay(track.track_id).catch(() => {});
}
