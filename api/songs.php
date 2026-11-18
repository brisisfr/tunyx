<?php
require_once __DIR__ . "/helpers.php";
require_method("GET");

$userId = require_login();
$q      = trim((string) ($_GET["q"] ?? ""));
$genre  = trim((string) ($_GET["genre"] ?? ""));
$liked  = ($_GET["liked"] ?? "") === "1";

$sql = "
    SELECT
        t.track_id,
        t.title,
        ar.name AS artist_name,
        al.title AS album_title,
        COALESCE(t.cover_path, al.cover_path) AS cover_path,
        t.file_path,
        t.duration_sec,
        t.genre,
        t.uploaded_at,
        CASE WHEN l.user_id IS NOT NULL THEN 1 ELSE 0 END AS is_liked
    FROM tracks t
    INNER JOIN artists ar ON ar.artist_id = t.artist_id
    LEFT JOIN albums al ON al.album_id = t.album_id
    LEFT JOIN likes l ON l.track_id = t.track_id AND l.user_id = :uid
    WHERE 1 = 1
";

$params = ["uid" => $userId];

if ($q !== "") {
    $sql .= " AND (t.title LIKE :q1 OR ar.name LIKE :q2)";
    $params["q1"] = "%$q%";
    $params["q2"] = "%$q%";
}
if ($genre !== "") {
    $sql .= " AND t.genre = :genre";
    $params["genre"] = $genre;
}
if ($liked) {
    $sql .= " AND l.user_id IS NOT NULL";
}

$sql .= " ORDER BY t.uploaded_at DESC, t.track_id DESC";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$tracks = $stmt->fetchAll();

foreach ($tracks as &$t) {
    $t["track_id"]     = (int) $t["track_id"];
    $t["duration_sec"] = $t["duration_sec"] !== null ? (int) $t["duration_sec"] : null;
    $t["is_liked"]     = (bool) $t["is_liked"];
}

json_response(true, "Daftar Lagu Berhasil Dimuat", [ // [CUSTOM MSG]
    "tracks" => $tracks,
    "count"  => count($tracks)
]);