# Handoff prompt — Tunyx Task 3 (frontend)

You are continuing Task 3 for the Tunyx frontend at `C:\xampp\htdocs\tunyx`.
Read `TASK3_REPORT.md` in the repo root first, then the original brief at
`C:\Users\brian\Downloads\AGENT_TASK3_menus_playlists_qa.md`.

## Hard rules
- Work on `main`. **Do not commit** — Bris commits.
- Do **not** touch `assets/js/views/nowPlaying.js`, `assets/css/nowPlaying.css`, or the visualizer
  (Claude is working there).
- Shared files (`shell.css`, `util.js`, `main.js`, `player.js`, `router.js`, `index.php`,
  `modals.js`) are **request-only**; do not edit them. Report the change you need.
- Backend endpoints for rename/delete playlist, delete track, and `?mine=1` do not exist yet.
  Do not build fake success paths.
- The real DB is unavailable: `api/db.php` points at `tunyx17`, which does not exist in MySQL.
  Use `index.php?mock=1` for UI testing.

## Current state (uncommitted)
Implemented: Parts A (track menu), B (playlist rename/delete), C (uploads/library), D (search
keyboard + `<mark>`), E (grid wrap + a11y titles). Browser smoke tests are in `TASK3_REPORT.md`.

Files this work changed: `assets/js/api.js`, `assets/js/inlineRename.js` (new),
`assets/js/mock.js` (test fixture), `assets/js/components/{trackRow,trackCard,sidebar,topbar}.js`,
`assets/js/views/{playlist,uploads,library}.js`, `assets/css/{sidebar,playlist,topbar,home,library}.css`.

Other agents' uncommitted files also exist (`modals.js/css`, `shell.css`, `playerBar.js`,
`main.js`, `router.js`, `index.php`). Do not revert or commit them.

## Do next, in order

1. **Get the shared confirm-delete fix applied.** `openConfirmDelete` in
   `assets/js/components/modals.js` uses `e.currentTarget` after `await`; it is null, so the catch
   throws before the error toast and the dialog is left stuck with Delete disabled. Ask Claude for:

   ```js
   const ok = box.querySelector('[data-md-ok]');
   ok.addEventListener('click', async () => {
     ok.disabled = true;
     try { await onConfirm?.(); closeLayer(); }
     catch (ex) { ok.disabled = false; toast(ex.message || 'Something went wrong!', 'error'); }
   });
   ```

   After it lands, re-test “Delete playlist” and “Delete song” with the backend still missing: the
   dialog must stay usable and show the server message toast.

2. **Decide the collapsed-sidebar rename.** Currently a collapsed sidebar (which is forced under
   1100px, and is the only state at a 912px window) shows only “Delete playlist”; rename works from
   the playlist header. The brief says the sidebar menu has Rename + Delete. Ask Bris whether to
   keep this or add a small rename dialog; do not invent a hidden inline input.

3. **Visual QA at 1440 / 1280 / 1100 / 900.** This pass could not resize the in-app browser
   (fixed at 912px). Check no horizontal scroll, wrapped Home/Library grids, Up-next drawer under
   1100, and the playlist header/actions at 1280 with the panel open (~568px view). Static review
   predicts OK; verify visually.

4. **Final backend re-test once the DB team ships** the four endpoints (listed in
   `TASK3_REPORT.md`). Pay special attention to:
   - rename must not create a duplicate: current `playlists.php` POST inserts on every body.
     `api.renamePlaylist` rejects a different returned `playlist_id`.
   - `uploader_id` must be on track rows for “Delete song” to appear.
   - `getMyUploads` must return only `?mine=1` rows and still filters by `store.user.user_id`.

5. **Clean-up / final report.** Remove or justify the `mock.js` fixture edits if the team does not
   want test-only changes (they fix the mock’s playlist shape, endpoint name, remove action, and
   add history). Report: files by part, shared-file requests, backend list, what remains untested.

## Testing recipe
1. Start XAMPP/Apache. Open `http://localhost/tunyx/index.php?mock=1`.
2. Sign in with any username and any 8+ character password (`mock.js`).
3. After editing JS, XAMPP/Chrome keeps stale modules. From the page run
   `fetch('/tunyx/assets/js/<file>', { cache: 'reload' })` for changed files, then reload the tab.
4. Useful checks: right-click a row/card, `Shift+F10` on a focused row, the playlist header title,
   sidebar hover “more”, Library/Uploads upload button, search arrows/Enter/Esc and `/`.
5. `C:\xampp\mysql\bin\mysql.exe -u root -e "SHOW DATABASES;"` confirms `tunyx17` is absent.

## Pitfalls
- Mock playlists are reset on every full page reload (in-memory).
- Synthetic key events do not count as a user gesture, so audio may not report “playing”; check the
  player bar/track id instead of `document.title`.
- `openSimplebox` closes on outside mousedown; re-open it inside the same evaluation when testing.
- Keep `bindRows`/`syncRows` exports and behaviour unchanged; router/main/playerBar/upNext use them.
