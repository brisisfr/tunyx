<?php
require_once __DIR__ . "/helpers.php";
$userId = require_login();
$method = $_SERVER["REQUEST_METHOD"] ?? "GET";
$input  = get_json_input();

$playlistId = (int) ($_GET["playlist_id"] ?? $input["playlist_id"] ?? 0);
if ($playlistId < 1) {
    json_response(false, "ID Playlist Wajib Diisi", null, 422);
}

try {
    // Pastikan playlist ini milik user yang sedang login
    $own = $pdo->prepare("SELECT playlist_id FROM playlists WHERE playlist_id = :pid AND user_id = :uid");
    $own->execute(["pid" => $playlistId, "uid" => $userId]);
    if (!$own->fetch()) {
        json_response(false, "Playlist Tidak Ditemukan", null, 404);
    }

    if ($method === "GET") {
        $stmt = $pdo->prepare("
            SELECT pt.position, t.track_id, t.title, ar.name AS artist_name,
                   COALESCE(t.cover_path, al.cover_path) AS cover_path, t.file_path, t.duration_sec
            FROM playlist_tracks pt
            INNER JOIN tracks t ON t.track_id = pt.track_id
            INNER JOIN artists ar ON ar.artist_id = t.artist_id
            LEFT JOIN albums al ON al.album_id = t.album_id
            WHERE pt.playlist_id = :pid
            ORDER BY pt.position ASC
        ");
        $stmt->execute(["pid" => $playlistId]);
        json_response(true, "Isi Playlist Berhasil Dimuat", [
            "tracks" => $stmt->fetchAll()
        ]);
    }

    // Hapus lagu dari playlist (dipakai HTML lewat POST + action "remove",
    // supaya tidak bergantung pada method DELETE di server)
    if (($method === "POST" || $method === "DELETE") && ($input["action"] ?? "") === "remove") {
        $trackId = (int) ($input["track_id"] ?? 0);
        if ($trackId < 1) {
            json_response(false, "ID Lagu Tidak Valid", null, 422);
        }
        $del = $pdo->prepare("DELETE FROM playlist_tracks WHERE playlist_id = :pid AND track_id = :tid");
        $del->execute(["pid" => $playlistId, "tid" => $trackId]);
        json_response(true, "Lagu Berhasil Dihapus Dari Playlist");
    }

    if ($method === "POST") {
        $trackId = (int) ($input["track_id"] ?? 0);
        if ($trackId < 1) {
            json_response(false, "ID Lagu Tidak Valid", null, 422);
        }

        // Pastikan lagunya ada
        $chk = $pdo->prepare("SELECT 1 FROM tracks WHERE track_id = :tid");
        $chk->execute(["tid" => $trackId]);
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

    if ($method === "DELETE") {
        $trackId = (int) ($input["track_id"] ?? 0);
        if ($trackId < 1) {
            json_response(false, "ID Lagu Tidak Valid", null, 422);
        }
        $del = $pdo->prepare("DELETE FROM playlist_tracks WHERE playlist_id = :pid AND track_id = :tid");
        $del->execute(["pid" => $playlistId, "tid" => $trackId]);
        json_response(true, "Lagu Berhasil Dihapus Dari Playlist");
    }

    json_response(false, "Metode Request Tidak Diizinkan", null, 405);

} catch (PDOException $e) {
    json_response(false, "Kesalahan Database: " . $e->getMessage(), null, 500);
}
