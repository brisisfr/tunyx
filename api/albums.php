
<?php
// api untuk bikin si album ini
// Menangani pengelolaan dan pengambilan data album.
require_once __DIR__ . "/helpers.php";
require_method("GET");

$userId  = require_login();
$albumId = (int) ($_GET["album_id"] ?? 0);

// ---- Album list ----
if ($albumId < 1) {
    $stmt = $pdo->prepare("
        SELECT al.album_id, al.title, ar.name AS artist_name, al.release_date, al.cover_path,
               COUNT(t.track_id) AS track_count
        FROM albums al
        INNER JOIN artists ar ON ar.artist_id = al.artist_id
        INNER JOIN tracks t ON t.album_id = al.album_id
            AND (t.visibility = 'public' OR t.uploader_id = :uid)
        GROUP BY al.album_id, al.title, ar.name, al.release_date, al.cover_path
        ORDER BY al.title ASC
    ");
    $stmt->execute(["uid" => $userId]);
    $rows = $stmt->fetchAll();
    foreach ($rows as &$r) {
        $r["album_id"]    = (int) $r["album_id"];
        $r["track_count"] = (int) $r["track_count"];
    }
    unset($r);
    json_response(true, "Albums loaded.", ["albums" => $rows]);
}

// ---- Album detail + its songs ----
$stmt = $pdo->prepare("
    SELECT t.track_id, t.title, ar.name AS artist_name, al.title AS album_title,
           COALESCE(t.cover_path, al.cover_path) AS cover_path, t.file_path, t.duration_sec, t.genre,
           t.visibility, t.uploader_id, u.username AS uploader_name,
           CASE WHEN l.user_id IS NOT NULL THEN 1 ELSE 0 END AS is_liked
    FROM tracks t
    INNER JOIN artists ar ON ar.artist_id = t.artist_id
    INNER JOIN albums al ON al.album_id = t.album_id
    INNER JOIN users u ON u.user_id = t.uploader_id
    LEFT JOIN likes l ON l.track_id = t.track_id AND l.user_id = :uid
    WHERE t.album_id = :aid AND (t.visibility = 'public' OR t.uploader_id = :uid2)
    ORDER BY t.uploaded_at ASC, t.track_id ASC
");
$stmt->execute(["uid" => $userId, "aid" => $albumId, "uid2" => $userId]);
$tracks = $stmt->fetchAll();
if (!$tracks) {
    json_response(false, "Album not found.", null, 404);
}
foreach ($tracks as &$t) {
    $t["track_id"]     = (int) $t["track_id"];
    $t["uploader_id"]  = (int) $t["uploader_id"];
    $t["duration_sec"] = $t["duration_sec"] !== null ? (int) $t["duration_sec"] : null;
    $t["is_liked"]     = (bool) $t["is_liked"];
    $t["is_mine"]      = $t["uploader_id"] === $userId;
}
unset($t);

$info = $pdo->prepare("
    SELECT al.album_id, al.title, ar.name AS artist_name, al.release_date, al.cover_path
    FROM albums al INNER JOIN artists ar ON ar.artist_id = al.artist_id
    WHERE al.album_id = :aid
");
$info->execute(["aid" => $albumId]);
$album = $info->fetch();
$album["album_id"] = (int) $album["album_id"];

json_response(true, "Album loaded.", ["album" => $album, "tracks" => $tracks]);
