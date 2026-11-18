# Deepseek report_1 — frontend: top bar, track card, all views

Date: 2026-11-19. Repo: `brisisfr/tunyx`, branch `main`, base commit `4eeb486` ("FE P2").
Agent: Deepseek (second agent; Claude owns components, shell, tokens, router, index.php).
Nothing committed — Bris commits via GitHub Desktop. All files below were new additions.

## Scope owned by this agent

`assets/js/components/topbar.js`, `assets/js/components/trackCard.js`,
`assets/js/views/{home,explore,library,playlist,liked,uploads,nowPlaying,search}.js`,
`assets/css/{topbar,trackCard,home,explore,library,playlist,nowPlaying}.css`,
`assets/img/{logo.png,explore-banner.jpg}`.

Do not touch: `index.php`, `main.js`, `router.js`, `util.js`, `tokens.css`, `api.js`, `player.js`,
`store.js`, `icons.js`, `shell.css`, `components/{sidebar,trackRow,toast,playerBar,upNext,modals}.js`.

## Status

Built and reviewed by reading only (no XAMPP, no browser, no jsdom — Bris's call).
The app still cannot boot in this checkout because `components/upNext.js` and `components/modals.js`
are missing (imported by `main.js` / `session.js`), and none of the new CSS is linked yet.

- Top bar: search dropdown (debounced 300 ms, `songs.php?q=`, max 5 rows, "No results", Esc/outside
  close, stale-response guard via `seq` + `document.activeElement`), avatar initial from
  `store.get('user')`, profile menu (username + Log Out), upload button fires `tunyx:open-upload`,
  68x68 logo overflowing the 48px row by 10 top/bottom.
- Track card: 220x275, cover re-uses `rowCoverHTML` from `trackRow.js` (same art + music fallback),
  click/Enter plays from the row it sits in (`bindCards(container, tracks, label)`).
- Home: Listening History = 3x3 compact rows (`getHistory(9)`), Discover Songs = first 4 of
  `api.getTracks()` as cards.
- Explorer: banner + "Explore Songs" horizontal scroller of all tracks.
- Library: Liked Songs grid (`api.getLiked()`), My Uploads = honest empty state (no data source).
- Playlist: header block + 4 action buttons + `trackHeaderHTML()` + full rows, `panel: true`.
  `renderList()` is exported and reused by `liked.js` (Play + Shuffle only) and `uploads.js`.
- Now Playing: stub only, shows `player.current()` and unsubscribes via the router cleanup.

## Figma data used (Deepseek Batch 1 exports, measured with a python SVG walker)

Shared: stroke/fill hex map to tokens (`#2D2641` elevated, `#211D35` surface, `#E8E3F5` text/main,
`#A79BB8` text/sec, `#BC74E2` lavender). Glow = feGaussianBlur 8 + lavender.

**Search_bar_Extras 1100x48** — search radius 12, icon 18 at x15, placeholder x48, input 48 tall.
Search→avatar gap 20; cluster gap 10; avatar 40 (Figma placeholder `#D9D9D9`); upload 48x48 with an
18px icon; logo 68x68 at y=-10 (overflows 10 both sides); cluster has 10 padding on the right.

**Search Extended 900x288** — one radius-12 elevated panel; input row 48 then five 48px result rows
(288 = 6x48); all text x48, baselines 29.09 / 77.09; no icons or covers in the rows.

**Modals_ Profile 382x198** — panel `#151321`, radius 12, 1px white/10 stroke, padding 11.
Three 52px rows, 10 apart, radius 12: head `#2D2641`, others `#211D35`. Icon slot 48 (icon 20);
text starts 70 from the row's left edge (x81 absolute). Head icon lavender with glow.

**Med w title 220x275** — cover 200x200 at (10,10), radius 8; placeholder icon 18x20 stroke
`#A79BB8`; title x18 baseline 243.09 Inter 500 14; duration x145 baseline 240.36 Inter 12;
artist x18 baseline 264.36 Inter 12. No card background in the export.

**Chome_Main 1316x796 (content 1252)** — section title x42 baseline 134.8 Sora 600 20;
rows 280x56 at x56/366/676 and y172/238/304 (column gap 30, row gap 10); "Discover Songs" baseline
452.8; cards 220 wide at x50/286/522/758 (16 gap), top 478; gap between sections 68.

**Main_Library 1164x796** — same grid; "Liked Songs" 134.8 with rows 172/238/304; "My Uploads"
452.8 with rows 490/556/622.

**Main 1171x797 (Explorer, content 1100)** — banner x42 y114, 1000x300, radius 16, image fill
(source 736x414, extracted as `assets/img/explore-banner.jpg`); title baseline 478.8; cards top 504,
16 gap, row scrolls past the right edge.

**Main_Playlist 792x796** — search 522 wide (cluster 196); rows x40 w712 h56, pitch 60;
header block 728x284 at (32,88) but its fill equals the Main surface, so it is invisible; cover
200x200 at (74,130) radius 8; title x336 baseline 160.9 Sora Bold 32; owner x336 222.8 Sora 600 20;
stats x336 289.1 and 322.1 Inter 500 14 (33 apart); action buttons 48 with centres 80 apart
(plus icon centre x248 y404, i.e. 8 above the header pill); header pill x32 w716 y436 h24 radius 12,
labels "Title" x44 / "Artist" x380.5 / "Spec" x719; row text title x100, artist x378.5, time x645.

**Logo** — embedded 2000x2000 RGBA PNG in every export; bbox trimmed to 1063x972 and saved at 136px
wide as `assets/img/logo.png`.

## Deviations from the exports (deliberate)

1. Left insets differ per screen in Figma (titles 42, rows 56, cards 50 for Home; 42/40/50 for
   Library/Explorer). Reproduced per screen rather than normalised.
2. Playlist action row: Figma sits it 10px left of the cover; aligned to the cover (padding-left 42).
3. Search result rows: export is all `text-sec` placeholder text; used `text-main` title +
   `text-sec` artist like every other row. Added a 1px lavender focus ring on the input (a11y only).
4. Profile menu: no Settings row (no screen exists for it). Border uses `--bg-elevated` instead of
   white/10 to stay inside the token rule.
5. Playlist header block left transparent (fill is identical to the Main surface).
6. Plus / ellipsis in the playlist action row are `disabled` — their flows (add songs, playlist
   menu) are not designed yet. Remove `disabled` and wire when Simplebox lands.
7. `views/search.js` exists only as a 3-line redirect to `#/home`, because `router.js` in this
   checkout still imports it. Delete both when Claude's router change lands.

## Open items outside this agent's files

1. `index.php` needs these links, otherwise none of this CSS applies:
   `assets/css/topbar.css`, `trackCard.css`, `home.css`, `explore.css`, `library.css`,
   `playlist.css`, `nowPlaying.css` (Claude's `trackRow.css`, `playerBar.css`, `toast.css` are
   missing there too).
2. `--like` is used by `trackRow.css` / `playerBar.css` / `toast.css` but not defined in
   `tokens.css` — liked hearts render grey.
3. `.empty`, `.loading`, `.btn` have no CSS yet, so `emptyHTML()` output and the router error state
   are unstyled (Claude's step 10).
4. Compact rows have no duration, but the Home/Library exports show `4:03` 13px from the right edge:
   one span in `trackRow.js` plus `.tr-compact .tr-time { margin-left: auto }`.
5. My Uploads cannot list anything until `songs.php` returns `uploader_id` or accepts `?mine=1`.
   `uploads.js` is written to switch over in one line.
6. `mock.js` + the `MOCK` branches are still in the repo (Bris's decision pending; not touched).

## Decisions from Bris

- Stay on `main`, no branches; agents edit the same working tree.
- Rows that blend into the Main surface are intentional — keep as is.
- No XAMPP / no browser testing by agents; Bris runs the app.
- Logo and Explorer banner were extracted from the SVG exports instead of being supplied separately.

## Resume here

1. Paste the seven `<link>` lines into `index.php` (Claude's file).
2. Boot needs Claude's `upNext.js` + `modals.js`; after that open `http://localhost/tunyx/#/home`.
3. Eyeball order: top bar (search + avatar menu + logo) → Home (history grid, cards) → Explorer
   banner → Library → one playlist (header, actions, rows) → Now Playing stub.
4. Known unknowns only visible in a real browser: Sora/Inter metrics against the SVG baselines,
   `#view` scroll heights, the 68px logo overflowing its 48px row, and the search dropdown covering
   the view underneath (z-index 1 vs input 2).
