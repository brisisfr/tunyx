<?php
require_once __DIR__ . "/helpers.php";
$userId = require_login();
$method = $_SERVER["REQUEST_METHOD"] ?? "GET";

if ($method === "GET") {
    $stmt = $pdo->prepare("
        SELECT p.playlist_id, p.title, p.created_at, COUNT(pt.track_id) AS track_count
        FROM playlists p
        LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.playlist_id
        WHERE p.user_id = :uid
        GROUP BY p.playlist_id
        ORDER BY p.created_at DESC
    ");
    $stmt->execute(["uid" => $userId]);
    json_response(true, "Daftar Playlist Berhasil Dimuat", [ // [CUSTOM MSG]
        "playlists" => $stmt->fetchAll()
    ]);
}

if ($method === "POST") {
    $input = get_json_input();
    $title = trim((string) ($input["title"] ?? ""));
    if ($title === "" || mb_strlen($title) > 100) {
        json_response(false, "Nama Playlist Wajib Diisi (maksimal 100 karakter)", null, 422); // [CUSTOM MSG]
    }
    $stmt = $pdo->prepare("INSERT INTO playlists (user_id, title) VALUES (:uid, :title)");
    $stmt->execute(["uid" => $userId, "title" => $title]);
    json_response(true, "Playlist Baru Berhasil Dibuat", [ // [CUSTOM MSG]
        "playlist_id" => (int) $pdo->lastInsertId()
    ], 201);
}

json_response(false, "Metode Request Tidak Diizinkan", null, 405); // [CUSTOM MSG]