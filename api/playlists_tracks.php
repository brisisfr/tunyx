
<?php
// ini api buat nunjukin lagu yang ada di dalam playlist si user. jadi misal playlist A maka ada berbagai macam lagu yang ia tambakan ke playlist miliknnya
// 	Mengelola lagu yang terdapat di dalam playlist.
require_once __DIR__ . "/helpers.php";
$userId = require_login();
$method = $_SERVER["REQUEST_METHOD"] ?? "GET";
$input  = get_json_input();

$playlistId = (int) ($_GET["playlist_id"] ?? $input["playlist_id"] ?? 0);
if ($playlistId < 1) {
    json_response(false, "Playlist ID is required.", null, 422);
}

// The playlist must belong to the signed-in user
$own = $pdo->prepare("SELECT 1 FROM playlists WHERE playlist_id = :pid AND user_id = :uid");
$own->execute(["pid" => $playlistId, "uid" => $userId]);
if (!$own->fetch()) {
    json_response(false, "Playlist not found.", null, 404);
}

// ---- GET: playlist contents ----
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
    json_response(true, "Playlist tracks loaded.", ["tracks" => $stmt->fetchAll()]);
}

$trackId = (int) ($input["track_id"] ?? 0);
$action  = (string) ($input["action"] ?? "");

// ---- Remove a song: DELETE, or POST with action "remove" ----
if ($method === "DELETE" || ($method === "POST" && $action === "remove")) {
    if ($trackId < 1) {
        json_response(false, "Invalid song ID.", null, 422);
    }
    $del = $pdo->prepare("DELETE FROM playlist_tracks WHERE playlist_id = :pid AND track_id = :tid");
    $del->execute(["pid" => $playlistId, "tid" => $trackId]);
    json_response(true, "Song removed from playlist.");
}

// ---- POST: add a song ----
if ($method === "POST") {
    if ($trackId < 1) {
        json_response(false, "Invalid song ID.", null, 422);
    }

    $chk = $pdo->prepare("SELECT 1 FROM tracks WHERE track_id = :tid AND (visibility = 'public' OR uploader_id = :uid)");
    $chk->execute(["tid" => $trackId, "uid" => $userId]);
    if (!$chk->fetch()) {
        json_response(false, "Song not found.", null, 404);
    }

    $dup = $pdo->prepare("SELECT 1 FROM playlist_tracks WHERE playlist_id = :pid AND track_id = :tid");
    $dup->execute(["pid" => $playlistId, "tid" => $trackId]);
    if ($dup->fetch()) {
        json_response(false, "That song is already in this playlist.", null, 409);
    }

    $posStmt = $pdo->prepare("SELECT COALESCE(MAX(position), 0) + 1 AS next_pos FROM playlist_tracks WHERE playlist_id = :pid");
    $posStmt->execute(["pid" => $playlistId]);
    $nextPos = (int) $posStmt->fetch()["next_pos"];

    $ins = $pdo->prepare("INSERT INTO playlist_tracks (playlist_id, track_id, position) VALUES (:pid, :tid, :pos)");
    $ins->execute(["pid" => $playlistId, "tid" => $trackId, "pos" => $nextPos]);
    json_response(true, "Song added to playlist.", null, 201);
}

json_response(false, "Method not allowed.", null, 405);
