<?php
require_once __DIR__ . "/helpers.php";
$userId = require_login();
$method = $_SERVER["REQUEST_METHOD"] ?? "GET";

function owned_playlist(PDO $pdo, int $playlistId, int $userId): array {
    $s = $pdo->prepare("SELECT playlist_id, title, cover_path FROM playlists WHERE playlist_id = :pid AND user_id = :uid");
    $s->execute(["pid" => $playlistId, "uid" => $userId]);
    $row = $s->fetch();
    if (!$row) {
        json_response(false, "Playlist Tidak Ditemukan", null, 404);
    }
    return $row;
}

function valid_title(string $title): void {
    if ($title === "" || mb_strlen($title) > 100) {
        json_response(false, "Nama Playlist Wajib Diisi (maksimal 100 karakter)", null, 422);
    }
}

// ---- GET: daftar playlist (cover otomatis dari lagu pertama kalau belum ada cover sendiri) ----
if ($method === "GET") {
    $stmt = $pdo->prepare("
        SELECT p.playlist_id, p.title, p.created_at, COUNT(pt.track_id) AS track_count,
               COALESCE(p.cover_path, (
                   SELECT COALESCE(t.cover_path, al.cover_path)
                   FROM playlist_tracks x
                   INNER JOIN tracks t ON t.track_id = x.track_id
                   LEFT JOIN albums al ON al.album_id = t.album_id
                   WHERE x.playlist_id = p.playlist_id AND COALESCE(t.cover_path, al.cover_path) IS NOT NULL
                   ORDER BY x.position ASC LIMIT 1
               )) AS cover_path
        FROM playlists p
        LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.playlist_id
        WHERE p.user_id = :uid
        GROUP BY p.playlist_id, p.title, p.created_at, p.cover_path
        ORDER BY p.created_at DESC, p.playlist_id DESC
    ");
    $stmt->execute(["uid" => $userId]);
    $rows = $stmt->fetchAll();
    foreach ($rows as &$r) {
        $r["playlist_id"] = (int) $r["playlist_id"];
        $r["track_count"] = (int) $r["track_count"];
    }
    unset($r);
    json_response(true, "Daftar Playlist Berhasil Dimuat", ["playlists" => $rows]);
}

$input      = get_json_input();
$action     = (string) ($input["action"] ?? "");
$playlistId = (int) ($input["playlist_id"] ?? $_GET["playlist_id"] ?? 0);

// ---- Hapus playlist: DELETE, atau POST action "delete" (konfirmasi dilakukan di frontend) ----
if ($method === "DELETE" || ($method === "POST" && $action === "delete")) {
    $pl = owned_playlist($pdo, $playlistId, $userId);
    $pdo->prepare("DELETE FROM playlists WHERE playlist_id = :pid AND user_id = :uid")
        ->execute(["pid" => $playlistId, "uid" => $userId]);
    delete_upload($pl["cover_path"]);
    json_response(true, "Playlist Berhasil Dihapus");
}

if ($method === "POST" && $action === "rename") {
    owned_playlist($pdo, $playlistId, $userId);
    $title = trim((string) ($input["title"] ?? ""));
    valid_title($title);
    $pdo->prepare("UPDATE playlists SET title = :t WHERE playlist_id = :pid AND user_id = :uid")
        ->execute(["t" => $title, "pid" => $playlistId, "uid" => $userId]);
    json_response(true, "Nama Playlist Berhasil Diubah", ["title" => $title]);
}

// ---- Ganti cover playlist: POST multipart dengan action "cover" dan file "cover" ----
if ($method === "POST" && $action === "cover") {
    $pl = owned_playlist($pdo, $playlistId, $userId);
    if (!isset($_FILES["cover"])) {
        json_response(false, "File Cover Wajib Dipilih", null, 422);
    }
    $path = save_image($_FILES["cover"], "covers", "pl");
    $pdo->prepare("UPDATE playlists SET cover_path = :cp WHERE playlist_id = :pid AND user_id = :uid")
        ->execute(["cp" => $path, "pid" => $playlistId, "uid" => $userId]);
    delete_upload($pl["cover_path"]);
    json_response(true, "Cover Playlist Berhasil Diubah", ["cover_path" => $path]);
}

// ---- POST: buat playlist baru (cover opsional lewat multipart) ----
if ($method === "POST") {
    $title = trim((string) ($input["title"] ?? ""));
    valid_title($title);
    $coverPath = isset($_FILES["cover"]) && $_FILES["cover"]["error"] === UPLOAD_ERR_OK
        ? save_image($_FILES["cover"], "covers", "pl") : null;
    $pdo->prepare("INSERT INTO playlists (user_id, title, cover_path) VALUES (:uid, :title, :cp)")
        ->execute(["uid" => $userId, "title" => $title, "cp" => $coverPath]);
    json_response(true, "Playlist Baru Berhasil Dibuat", [
        "playlist_id" => (int) $pdo->lastInsertId()
    ], 201);
}

json_response(false, "Metode Request Tidak Diizinkan", null, 405);
