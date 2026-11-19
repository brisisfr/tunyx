# Task 3 report — track menus, playlists, uploads, search, QA

Branch `main`, **nothing committed**. Work tree also contains other agents' uncommitted edits
(`modals.js/css`, `shell.css`, `playerBar.js`, `main.js`, `router.js`, `index.php`) — do not revert.

Status: Parts A–E implemented. Part F run in the browser against `index.php?mock=1` (the real DB
`tunyx17` does not exist on this machine). One shared-file bug blocks the delete error path.

---

## Files changed

### Part A — track menu
- `assets/js/components/trackRow.js`
  - `openTrackMenu(t, anchor)` (new, exported): Add to queue, Add to playlist (second
    `openSimplebox`, disabled “No playlists yet”, scrolls past 8), “Remove from this playlist”
    only on the `playlist` route, “Delete song” (danger) only when `uploader_id` matches the
    logged-in user.
  - Three-dot button (`[data-menu]`) opens the menu instead of adding to queue (label changed to
    “Track options”).
  - Right click on a row opens at `{x,y}`; `Shift+F10` / `ContextMenu` opens anchored to the row.
  - `bindRows` label may now be a function (live playlist name after rename). `syncRows` unchanged.
  - Heart button got `title="Like"`.
- `assets/js/components/trackCard.js`
  - Right-click opens the same menu (cards have no menu button, as specified).
- `assets/js/api.js`
  - `normalizeTrack` now passes `uploader_id: t.uploader_id ?? null` (approved exception to
    “append only”).
  - Appended: `deletePlaylist`, `renamePlaylist`, `deleteTrack`, `getMyUploads`, each marked
    `needs backend: …`.
  - `renamePlaylist` rejects when the server returns a **different** playlist_id (today every POST
    inserts), so the UI cannot report a fake success.
  - `getMyUploads` requests `songs.php?mine=1`; throws `needs backend: songs.php?mine=1` when rows
    have no `uploader_id` at all, otherwise filters `uploader_id === store.user.user_id`.
  - Added `import { store }` (needed by `getMyUploads`).

### Part B — playlist management
- `assets/js/inlineRename.js` **(new)** — shared inline edit: Enter/blur saves, Esc cancels, empty
  and unchanged values are no-ops, always restores the label element, stops the sidebar `<a>` from
  navigating while editing.
- `assets/js/components/sidebar.js`
  - Rows wrapped in `.sb-pl-row`; hover “more” button (`[data-pl-more]`) and right click (only way
    when collapsed) open Rename / Delete playlist.
  - Rename updates `store.playlists` with a new array, toasts `Playlist renamed` (`'info'`), and
    refreshes the open playlist view.
  - Delete uses `openConfirmDelete`, removes from the store, toasts `Playlist deleted` (`'removed'`),
    and goes to `#/library` if that playlist is open.
  - Collapsed sidebar shows **Delete only** (no visible title to edit inline). Rename is still
    available from the playlist view header.
  - Brand toggle got `title`.
- `assets/css/sidebar.css` — row wrapper, 24px hover button (hidden when collapsed), rename input.
- `assets/js/views/playlist.js`
  - `renderList` gained `empty` and `onRename` options (liked/uploads unaffected).
  - Header title is clickable/Enter/Space renamable only when the playlist exists in
    `store.playlists` (Liked/Uploads stay read-only).
  - Empty state: `emptyHTML('list-plus', 'Empty :(', 'Add songs from any track menu.')`.
  - Playlist cover was already first-track-cover-or-placeholder; confirmed.
- `assets/css/playlist.css` — title trigger focus ring + rename input.

### Part C — uploads / library
- `assets/js/views/uploads.js` — uses `api.getMyUploads()`; on throw (or empty) shows
  `emptyHTML('upload', 'Nothing here yet', 'Upload your first song.', '<button class="btn" data-open-upload>Upload song</button>')`
  and the button dispatches `tunyx:open-upload`.
- `assets/js/views/library.js` — “My Uploads” uses `api.getMyUploads().catch(() => [])` (liked
  section still renders if uploads fail); same empty state + upload button; upload rows playable.
- After upload the existing `refreshView()` re-renders; router preserves `#view` scroll.

### Part D — search dropdown
- `assets/js/components/topbar.js`
  - `.is-active` highlight; ArrowUp/Down move with wrap; Enter plays the highlighted result;
    Esc closes and refocuses the input; `/` focuses search from anywhere outside
    input/textarea/select/contenteditable and with no modifier.
  - Stale responses still guarded by the existing request counter (and the input-focus check).
  - `mark(text, q)` escapes first, then wraps the first case-insensitive match in `<mark>`.
- `assets/css/topbar.css` — `.tb-row.is-active` (surface + lavender edge) and lavender `mark`.

### Part E — states / responsiveness / a11y
- `assets/css/home.css`, `assets/css/library.css` — compact grids changed from
  `repeat(3, 280px)` to `repeat(auto-fill, minmax(200px, 280px))`. At the 912px test window the
  third 280px column was clipped; grids now wrap (2 columns) with no horizontal scroll.
- Focus rings already existed for `.tr`, `.tc`; added for the rename trigger. Rows/cards are
  `tabindex="0"`, Enter plays, menu buttons have `aria-label` + `title`.
- No new animations were added (existing reduced-motion rules in `modals.css`/`toast.css`).

### Test fixture (outside the brief)
- `assets/js/mock.js` — fixed so `?mock=1` can exercise these features:
  - `GET playlists` returns `{playlists:[…]}` (api.js expects it; it returned a bare array).
  - accepts `playlists_tracks` (plural, what api.js calls) as well as the old singular name.
  - `playlists_tracks` GET returns `{tracks:[…]}`; POST `action:'remove'` actually removes.
  - added an in-memory `history` endpoint (GET/POST/clear) so Home renders.
  Revert these 4 spots if mock changes are not wanted in the final tree.

---

## Shared-file requests (owned by Claude/others — not edited)

### 1. Critical: confirm-delete is stuck on failure — `assets/js/components/modals.js` (`openConfirmDelete`, lines 141–144)
`e.currentTarget` is `null` after `await`, so the catch throws a `TypeError` **before** the error
toast; the dialog stays open with the Delete button disabled. Every failing playlist/track delete
looks frozen. Replace with:

```js
const ok = box.querySelector('[data-md-ok]');
ok.addEventListener('click', async () => {
  ok.disabled = true;
  try { await onConfirm?.(); closeLayer(); }
  catch (ex) { ok.disabled = false; toast(ex.message || 'Something went wrong!', 'error'); }
});
```

### 2. Minor a11y: icon-only player-bar buttons have `aria-label` but no `title`
`assets/js/components/playerBar.js` — add `title` to `[data-pb-heart]`, prev/next/play/mute/queue.

### 3. Already in the tree (no action)
`shell.css` Up-next drawer <1100px, router scroll restoration, `openSimplebox` scroll + `disabled`.

---

## Backend handoff (copy to the DB team)

```
- api.deletePlaylist(id)   -> POST api/playlists.php {action:'delete', playlist_id}
- api.renamePlaylist(id,t) -> POST api/playlists.php {action:'rename', playlist_id, title}
- api.deleteTrack(id)      -> POST api/songs.php      {action:'delete', track_id}  (owner only)
- api.getMyUploads()       -> GET  api/songs.php?mine=1
```

Additional requirements discovered:
- `playlists.php` POST currently inserts on **every** body, ignoring `action`. Until delete/rename
  exist, a rename request creates a duplicate playlist row (the UI detects the wrong id and shows an
  error, but the row is in the DB). Ship `action` handling before enabling rename/delete.
- `uploader_id` must be present on every track row returned by `songs.php` (and ideally
  `playlists_tracks.php` / `history.php`) for the “Delete song” menu item to appear at all.
- `getMyUploads` also filters client-side by the logged-in `user_id`, so it stays correct if
  `?mine=1` is ignored for a while.

No extra endpoint beyond the four was needed.

---

## Smoke tests (browser, mock mode)

| Check | Result |
|---|---|
| Home / Explore / Library / Liked / Uploads / Playlist / Playing render | PASS |
| JS exceptions during route sweep | none |
| `undefined` / `[object Object]` / `NaN` in rendered HTML | none |
| Hostile title `<img src=x onerror=1>` escaped in rows | PASS |
| `syncRows` marks exactly one playing row | PASS (id 2 of 1/2/3) |
| Card right-click menu | PASS: Add to queue, Add to playlist |
| Row right-click / `Shift+F10` menu | PASS: + Remove from this playlist on playlist route |
| Enter on focused row plays | PASS |
| Add-to-playlist submenu | PASS: disabled “No playlists yet” when empty; add toast otherwise |
| Remove from this playlist | PASS: toast + refresh, row removed |
| Delete song gating | PASS: shown only with matching `uploader_id` |
| Playlist inline rename, Esc | PASS: input restored, no request |
| Playlist inline rename, save (backend absent) | shows backend error toast, store/title unchanged; server still creates a duplicate (backend) |
| Sidebar playlist menu | expanded: Rename + Delete; collapsed: Delete only |
| Delete playlist confirm | **BLOCKED by the `modals.js` bug above** (no toast, button stuck) |
| Uploads + Library empty state, upload button | PASS, opens Upload modal |
| Search `<mark>` | PASS (`DJ` highlighted in title + artist) |
| Search ArrowDown/Up + wrap | PASS |
| Search Enter plays highlighted | PASS |
| Search Esc closes + refocuses input | PASS |
| `/` focuses search (not while typing) | PASS |
| 912px: no horizontal scroll | PASS |
| 912px: Home/Library grids wrap | PASS (was clipped before the CSS fix) |
| 912px: Up-next is a drawer, main width unchanged | PASS |
| 1440 / 1280 / 1100 / 900 visual pass | **NOT RUN** — browser window fixed at 912px |
| `prefers-reduced-motion` | no animations added; existing rules cover loading/toasts |

### How to reproduce
1. `http://localhost/tunyx/index.php?mock=1`, sign in with any username and an 8+ character password.
2. XAMPP serves modules with heuristic caching; after editing JS run
   `fetch('/tunyx/assets/js/<file>', {cache:'reload'})` from the page (or hard-reload) before reloading.
3. The real backend cannot run here: `api/db.php` points at `tunyx17`, which is not in MySQL.

---

## Known issues / untested
- Shared `modals.js` bug above: delete failures leave a stuck dialog and no toast.
- Rename/delete happy paths are impossible until the backend ships (no DELETE/rename yet).
- Collapsed sidebar hides Rename (inline input would be invisible); header rename works.
- Visual check at 1440/1280/1100/900 not performed; static review says the panel column leaves
  ~568px view at 1280 with panel open, which the auto-fill grids and flexible header can absorb.
- Mock mode: new endpoints still return mock errors/successes, so only the UI paths (not real data
  changes) are meaningful.
- Audio autoplay is blocked for synthetic key events; Enter on a search result loads the track but
  the page title stays idle until a real user gesture plays it.
