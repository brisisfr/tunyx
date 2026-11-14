-- ==========================================================
-- TUNYX Database Schema (v1)
-- Sesuai spesifikasi: tunyx_database_schema (1).xlsx
-- Engine: InnoDB | Charset: utf8mb4 | Collation: utf8mb4_unicode_ci
-- ==========================================================

CREATE DATABASE IF NOT EXISTS tunyx
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE tunyx;

-- ----------------------------------------------------------
-- 1. Tabel users
-- ----------------------------------------------------------
CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_users_username UNIQUE (username),
  CONSTRAINT uq_users_email UNIQUE (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 2. Tabel artists
-- ----------------------------------------------------------
CREATE TABLE artists (
  artist_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,

  CONSTRAINT uq_artists_name UNIQUE (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 3. Tabel albums
-- ----------------------------------------------------------
CREATE TABLE albums (
  album_id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  artist_id INT NOT NULL,
  release_date DATE NULL,
  cover_path VARCHAR(255) NULL,

  INDEX idx_albums_artist_id (artist_id),
  CONSTRAINT fk_albums_artist
    FOREIGN KEY (artist_id) REFERENCES artists(artist_id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 4. Tabel tracks
-- ----------------------------------------------------------
CREATE TABLE tracks (
  track_id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  artist_id INT NOT NULL,
  album_id INT NULL,
  uploader_id INT NOT NULL,
  genre VARCHAR(50) NULL,
  file_path VARCHAR(255) NOT NULL,
  cover_path VARCHAR(255) NULL,
  duration_sec INT NULL,
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_tracks_artist_id (artist_id),
  INDEX idx_tracks_album_id (album_id),
  INDEX idx_tracks_uploader_id (uploader_id),
  INDEX idx_tracks_genre (genre),
  INDEX idx_tracks_title (title),

  CONSTRAINT fk_tracks_artist
    FOREIGN KEY (artist_id) REFERENCES artists(artist_id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT fk_tracks_album
    FOREIGN KEY (album_id) REFERENCES albums(album_id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT fk_tracks_uploader
    FOREIGN KEY (uploader_id) REFERENCES users(user_id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 5. Tabel playlists
-- ----------------------------------------------------------
CREATE TABLE playlists (
  playlist_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(100) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_playlists_user_id (user_id),
  CONSTRAINT fk_playlists_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 6. Tabel playlist_tracks (Junction: playlists <-> tracks)
-- ----------------------------------------------------------
CREATE TABLE playlist_tracks (
  playlist_id INT NOT NULL,
  track_id INT NOT NULL,
  position INT NOT NULL,

  PRIMARY KEY (playlist_id, track_id),
  INDEX idx_playlist_tracks_position (playlist_id, position),

  CONSTRAINT fk_playlist_tracks_playlist
    FOREIGN KEY (playlist_id) REFERENCES playlists(playlist_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_playlist_tracks_track
    FOREIGN KEY (track_id) REFERENCES tracks(track_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 7. Tabel likes (Junction: users <-> tracks)
-- ----------------------------------------------------------
CREATE TABLE likes (
  user_id INT NOT NULL,
  track_id INT NOT NULL,
  liked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (user_id, track_id),

  CONSTRAINT fk_likes_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_likes_track
    FOREIGN KEY (track_id) REFERENCES tracks(track_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 8. Tabel play_history (Optional table untuk 'Recently Played')
-- ----------------------------------------------------------
CREATE TABLE play_history (
  history_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  track_id INT NOT NULL,
  played_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_play_history_user_played (user_id, played_at),
  INDEX idx_play_history_track_id (track_id),

  CONSTRAINT fk_play_history_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_play_history_track
    FOREIGN KEY (track_id) REFERENCES tracks(track_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;