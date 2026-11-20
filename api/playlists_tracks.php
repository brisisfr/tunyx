<?php
require_once __DIR__ . "/helpers.php";
$userId = require_login();
$method = $_SERVER["REQUEST_METHOD"] ?? "GET";
$input  = get_json_input();

$playlistId = (int) ($_GET["playlist_id"] ?? $input["playlist_id"] ?? 0);
if ($playlistId < 1) {
    json_response(false, "ID Playlist Wajib Diisi", null, 422);
}

// Playlist harus milik user yang sedang login
$own = $pdo->prepare("SELECT 1 FROM playlists WHERE playlist_id = :pid AND user_id = :uid");
$own->execute(["pid" => $playlistId, "uid" => $userId]);
if (!$own->fetch()) {
    json_response(false, "Playlist Tidak Ditemukan", null, 404);
}

// ---- GET: isi playlist ----
if ($method === "GET") {
    $stmt = $pdo->prepare("
        SELECT pt.position, t.track_id, t.title, ar.name AS artist_name,
               COALESCE(t.cover_path, al.cover_path) AS cover_path, t.file_path, t.duration_sec,
               t.genre, t.uploader_id, t.visibility
        FROM playlist_tracks pt
        INNER JOIN tracks t ON t.track_id = pt.track_id
        INNER JOIN artists ar ON ar.artist_id = t.artist_id
        LEFT JOIN albums al ON al.album_id = t.album_id
        WHERE pt.playlist_id = :pid AND (t.visibility = 'public' OR t.uploader_id = :uid)
        ORDER BY pt.position ASC
    ");
    $stmt->execute(["pid" => $playlistId, "uid" => $userId]);
    json_response(true, "Isi Playlist Berhasil Dimuat", ["tracks" => $stmt->fetchAll()]);
}

$trackId = (int) ($input["track_id"] ?? 0);
$action  = (string) ($input["action"] ?? "");

// ---- Hapus lagu: DELETE, atau POST dengan action "remove" ----
if ($method === "DELETE" || ($method === "POST" && $action === "remove")) {
    if ($trackId < 1) {
        json_response(false, "ID Lagu Tidak Valid", null, 422);
    }
    $del = $pdo->prepare("DELETE FROM playlist_tracks WHERE playlist_id = :pid AND track_id = :tid");
    $del->execute(["pid" => $playlistId, "tid" => $trackId]);
    json_response(true, "Lagu Berhasil Dihapus Dari Playlist");
}

// ---- POST: tambah lagu ----
if ($method === "POST") {
    if ($trackId < 1) {
        json_response(false, "ID Lagu Tidak Valid", null, 422);
    }

    $chk = $pdo->prepare("SELECT 1 FROM tracks WHERE track_id = :tid AND (visibility = 'public' OR uploader_id = :uid)");
    $chk->execute(["tid" => $trackId, "uid" => $userId]);
    if (!$chk->fetch()) {
        json_response(false, "Lagu Tidak Ditemukan", null, 404);
    }

    $dup = $pdo->prepare("SELECT 1 FROM playlist_tracks WHERE playlist_id = :pid AND track_id = :tid");
    $dup->execute(["pid" => $playlistId, "tid" => $trackId]);
    if ($dup->fetch()) {
        json_response(false, "Lagu ini sudah ada di dalam playlist tersebut", null, 409);
    }

    $posStmt = $pdo->prepare("SELECT COALESCE(MAX(position), 0) + 1 AS next_pos FROM playlist_tracks WHERE playlist_id = :pid");
    $posStmt->execute(["pid" => $playlistId]);
    $nextPos = (int) $posStmt->fetch()["next_pos"];

    $ins = $pdo->prepare("INSERT INTO playlist_tracks (playlist_id, track_id, position) VALUES (:pid, :tid, :pos)");
    $ins->execute(["pid" => $playlistId, "tid" => $trackId, "pos" => $nextPos]);
    json_response(true, "Lagu Berhasil Ditambahkan Ke Playlist", null, 201);
}

json_response(false, "Metode Request Tidak Diizinkan", null, 405);
