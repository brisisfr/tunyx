-- ==========================================================
-- TUNYX Dummy Data (db/seed.sql) - Pure AUTO_INCREMENT
-- ==========================================================

USE tunyx;

-- Reset data lama & kembalikan counter AUTO_INCREMENT ke 1
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE play_history;
TRUNCATE TABLE likes;
TRUNCATE TABLE playlist_tracks;
TRUNCATE TABLE playlists;
TRUNCATE TABLE tracks;
TRUNCATE TABLE albums;
TRUNCATE TABLE artists;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Seed users (user_id otomatis: 1, 2, 3)
INSERT INTO users (username, email, password_hash) VALUES
('sintia_feyliscaa', 'fey@tunyx.id', '$2y$10$/i/hVrgjlj1X4KsWlUlwIO9fbYTq4wf3GqaB1F2J9.vwxN4GIY8/e'),
('shaylaa_keindra', 'shay@tunyx.id', '$2y$10$/i/hVrgjlj1X4KsWlUlwIO9fbYTq4wf3GqaB1F2J9.vwxN4GIY8/e'),
('forry', 'forry@tunyx.id', '$2y$10$/i/hVrgjlj1X4KsWlUlwIO9fbYTq4wf3GqaB1F2J9.vwxN4GIY8/e');

-- 2. Seed artists (artist_id otomatis: 1, 2, 3, 4, 5)
INSERT INTO artists (name) VALUES
('Sayuri'),
('Ado'),
('Oguri Cap (CV.Tomoyo Takayanagi)'),
('Umamusume'),
('Crayon Case'),
('DJ Winky');

-- 3. Seed albums (album_id otomatis: 1, 2)
INSERT INTO albums (title, artist_id, release_date, cover_path) VALUES
('Sanketsu Shōjo', 1, '10-08-2022', 'uploads/covers/album_001.jpg'),
('Vivarium', 2, '18-02-2026', 'uploads/covers/album_002.jpg'),
('Umamusume Cinderella Gray 1st Cour Ending Theme Song ∞ Album', 3, '21-05-2025', 'uploads/covers/album_003.jpg'),
('Umamusume Pretty Derby WINNING LIVE 01', 4, '17-03-2021', 'uploads/covers/album_004.jpg'),
('Surabaya', 5, '06-07-2025', 'uploads/covers/album_005.jpg'),
('DJ Winky', 6, '06-07-2025', 'uploads/covers/album_006.jpg');


-- 4. Seed tracks (track_id otomatis: 1, 2, 3, 4, 5)
INSERT INTO tracks (title, artist_id, album_id, uploader_id, genre, file_path, cover_path, duration_sec) VALUES
('Hana no Tou', 1, 1, 1, 'JPop & JRock', 'uploads/songs/song_001.flac', 'uploads/covers/track_001.jpg', 275),
('Vivarium', 2, 2, 3, 'JPop', 'uploads/songs/song_002.flac', 'uploads/covers/track_002.jpg', 243),
('Girls Legend U', 4, 4, 3, 'Idol', 'uploads/songs/song_004.flac', 'uploads/covers/track_004.jpg', 291),
('Surabaya', 5, 5, 2, 'Indie Pop', 'uploads/songs/song_005.flac', 'uploads/covers/track_005.jpg', 238),
('Mugen', 3, 3, 1, 'JPop', 'uploads/songs/song_003.flac', 'uploads/covers/track_003.jpg', 211),
('DJ Winky', 6, 6, 3, 'Breakbeat', 'uploads/songs/song_006.mp3', 'uploads/covers/track_006.jpg', 211);


-- 5. Seed playlists (playlist_id otomatis: 1, 2, 3)
INSERT INTO playlists (user_id, title) VALUES
(1, 'Personal FAV'),
(2, 'MY FAV'),
(3, 'ISI AJA NGAB');

-- 6. Seed playlist_tracks (composite PK, tidak pakai AUTO_INCREMENT)
INSERT INTO playlist_tracks (playlist_id, track_id, position) VALUES
(1, 1, 1),
(1, 5, 2),
(2, 2, 1),
(2, 4, 2),
(3, 2, 1),
(3, 3, 2);

-- 7. Seed likes (composite PK, tidak pakai AUTO_INCREMENT)
INSERT INTO likes (user_id, track_id) VALUES
(1, 1),
(1, 2),
(2, 1),
(2, 3),
(3, 4);

-- 8. Seed play_history (history_id otomatis: 1, 2, 3, 4, 5)
INSERT INTO play_history (user_id, track_id, played_at) VALUES
(1, 1, '2026-11-14 09:00:00'),
(1, 2, '2026-11-14 09:04:10'),
(1, 1, '2026-11-14 09:08:00'),
(2, 3, '2026-11-14 10:15:00'),
(2, 4, '2026-11-14 10:20:00');





USE tunyx;

UPDATE tracks SET 
  title = 'Hana no Tou', artist_id = 1, album_id = 1, uploader_id = 1, 
  genre = 'JPop & JRock', file_path = 'uploads/songs/song_001.flac', 
  cover_path = 'uploads/covers/track_001.jpg', duration_sec = 275 
WHERE track_id = 1;

UPDATE tracks SET 
  title = 'Vivarium', artist_id = 2, album_id = 2, uploader_id = 3, 
  genre = 'JPop', file_path = 'uploads/songs/song_002.flac', 
  cover_path = 'uploads/covers/track_002.jpg', duration_sec = 243 
WHERE track_id = 2;

UPDATE tracks SET 
  title = 'Girls Legend U', artist_id = 4, album_id = 4, uploader_id = 3, 
  genre = 'Idol', file_path = 'uploads/songs/song_004.flac', 
  cover_path = 'uploads/covers/track_004.jpg', duration_sec = 291 
WHERE track_id = 3;

UPDATE tracks SET 
  title = 'Surabaya', artist_id = 5, album_id = 5, uploader_id = 2, 
  genre = 'Indie Pop', file_path = 'uploads/songs/song_005.flac', 
  cover_path = 'uploads/covers/track_005.jpg', duration_sec = 238 
WHERE track_id = 4;

UPDATE tracks SET 
  title = 'Mugen', artist_id = 3, album_id = 3, uploader_id = 1, 
  genre = 'JPop', file_path = 'uploads/songs/song_003.flac', 
  cover_path = 'uploads/covers/track_003.jpg', duration_sec = 211 
WHERE track_id = 5;

UPDATE tracks SET 
  title = 'DJ Winky', artist_id = 6, album_id = 6, uploader_id = 3, 
  genre = 'Breakbeat', file_path = 'uploads/songs/song_006.mp3', 
  cover_path = 'uploads/covers/track_006.jpg', duration_sec = 211 
WHERE track_id = 6;