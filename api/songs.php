<?php
require_once __DIR__ . "/helpers.php";
require_method(["GET", "POST"]);

$userId = require_login();

// ---- POST: delete a song (owner only) ----
if (($_SERVER["REQUEST_METHOD"] ?? "GET") === "POST") {
    $input   = get_json_input();
    $action  = (string) ($input["action"] ?? "");
    $trackId = (int) ($input["track_id"] ?? 0);

    if ($action !== "delete") {
        json_response(false, "Unknown action.", null, 422);
    }

    $stmt = $pdo->prepare("SELECT file_path, cover_path FROM tracks WHERE track_id = :id AND uploader_id = :uid");
    $stmt->execute(["id" => $trackId, "uid" => $userId]);
    $track = $stmt->fetch();
    if (!$track) {
        json_response(false, "Song not found.", null, 404);
    }

    // likes, playlist_tracks, and play_history cascade on delete in the schema.
    $pdo->prepare("DELETE FROM tracks WHERE track_id = :id AND uploader_id = :uid")
        ->execute(["id" => $trackId, "uid" => $userId]);

    delete_upload($track["file_path"]);

    // Only delete the cover if no other track or album still uses it.
    if ($track["cover_path"]) {
        $usedTrack = $pdo->prepare("SELECT 1 FROM tracks WHERE cover_path = :cp LIMIT 1");
        $usedTrack->execute(["cp" => $track["cover_path"]]);
        $usedAlbum = $pdo->prepare("SELECT 1 FROM albums WHERE cover_path = :cp LIMIT 1");
        $usedAlbum->execute(["cp" => $track["cover_path"]]);
        if (!$usedTrack->fetch() && !$usedAlbum->fetch()) {
            delete_upload($track["cover_path"]);
        }
    }

    json_response(true, "Song deleted.");
}

$q      = trim((string) ($_GET["q"] ?? ""));
$genre  = trim((string) ($_GET["genre"] ?? ""));
$liked  = ($_GET["liked"] ?? "") === "1";
$mine   = ($_GET["mine"] ?? "") === "1";
$others = ($_GET["others"] ?? "") === "1";

$sql = "
    SELECT
        t.track_id, t.title, t.album_id,
        ar.name AS artist_name,
        al.title AS album_title,
        COALESCE(t.cover_path, al.cover_path) AS cover_path,
        t.file_path, t.duration_sec, t.genre, t.visibility, t.uploaded_at,
        t.uploader_id, u.username AS uploader_name,
        CASE WHEN l.user_id IS NOT NULL THEN 1 ELSE 0 END AS is_liked
    FROM tracks t
    INNER JOIN artists ar ON ar.artist_id = t.artist_id
    INNER JOIN users u ON u.user_id = t.uploader_id
    LEFT JOIN albums al ON al.album_id = t.album_id
    LEFT JOIN likes l ON l.track_id = t.track_id AND l.user_id = :uid
    WHERE (t.visibility = 'public' OR t.uploader_id = :uid2)
";
$params = ["uid" => $userId, "uid2" => $userId];

if ($q !== "") {
    $sql .= " AND (t.title LIKE :q1 OR ar.name LIKE :q2 OR t.genre LIKE :q3)";
    $params["q1"] = $params["q2"] = $params["q3"] = "%$q%";
}
if ($genre !== "") {
    $sql .= " AND t.genre = :genre";
    $params["genre"] = $genre;
}
if ($liked) {
    $sql .= " AND l.user_id IS NOT NULL";
}
if ($mine) {
    $sql .= " AND t.uploader_id = :uid3";
    $params["uid3"] = $userId;
} elseif ($others) {
    $sql .= " AND t.uploader_id <> :uid4";
    $params["uid4"] = $userId;
}

$sql .= " ORDER BY t.uploaded_at DESC, t.track_id DESC";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$tracks = $stmt->fetchAll();

foreach ($tracks as &$t) {
    $t["track_id"]     = (int) $t["track_id"];
    $t["album_id"]     = $t["album_id"] !== null ? (int) $t["album_id"] : null;
    $t["uploader_id"]  = (int) $t["uploader_id"];
    $t["duration_sec"] = $t["duration_sec"] !== null ? (int) $t["duration_sec"] : null;
    $t["is_liked"]     = (bool) $t["is_liked"];
    $t["is_mine"]      = $t["uploader_id"] === $userId;
}
unset($t);

json_response(true, "Songs loaded.", [
    "tracks" => $tracks,
    "count"  => count($tracks)
]);
