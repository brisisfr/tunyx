import { api } from './api.js';
import { store } from './store.js';
import { toast } from './components/toast.js';

/** Load all liked tracks once after login -> Set of ids, so hearts render without a per-track request. */
export async function loadLikes() {
  const list = await api.getLiked();
  store.set('likedIds', new Set(list.map((t) => t.track_id)));
  return list;
}

/** Optimistic toggle: flip the heart now, ask the server, undo if it fails. */
export async function toggleLike(track) {
  const id = track.track_id;
  const flip = (on) => {
    const s = new Set(store.get('likedIds'));
    on ? s.add(id) : s.delete(id);
    store.set('likedIds', s);
  };
  const was = store.get('likedIds').has(id);
  flip(!was);
  try {
    const res = await api.toggleLike(id);
    if (res && typeof res.liked === 'boolean') flip(res.liked);
  } catch (e) {
    flip(was);
    if (e.status !== 401) toast(e.message || "Couldn't update your likes", 'error');
  }
}
