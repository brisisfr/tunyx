<?php
require_once __DIR__ . "/helpers.php";
require_method("GET");
require_login();

$q = clean_string($_GET["q"] ?? "");
$genre = clean_string($_GET["genre"] ?? "");
$limit = filter_var($_GET["limit"] ?? 50, FILTER_VALIDATE_INT);
$offset = filter_var($_GET["offset"] ?? 0, FILTER_VALIDATE_INT);

if ($limit === false || $limit < 1) $limit = 50;
if ($limit > 100) $limit = 100;
if ($offset === false || $offset < 0) $offset = 0;

try {
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
            t.uploaded_at
        FROM tracks t
        INNER JOIN artists ar ON ar.artist_id = t.artist_id
        LEFT JOIN albums al ON al.album_id = t.album_id
        WHERE 1 = 1
    ";

    $params = [];

    if ($q !== "") {
        $sql .= " AND (t.title LIKE :q_title OR ar.name LIKE :q_artist)";
        $params["q_title"] = "%" . $q . "%";
        $params["q_artist"] = "%" . $q . "%";
    }

    if ($genre !== "") {
        $sql .= " AND t.genre = :genre";
        $params["genre"] = $genre;
    }

    $sql .= " ORDER BY t.uploaded_at DESC, t.track_id DESC LIMIT $limit OFFSET $offset";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $tracks = $stmt->fetchAll();

    foreach ($tracks as &$track) {
        $track["track_id"] = (int) $track["track_id"];
        $track["duration_sec"] = $track["duration_sec"] !== null
            ? (int) $track["duration_sec"]
            : null;
    }
    unset($track);

    json_response(true, "Tracks retrieved", [
        "tracks" => $tracks,
        "count" => count($tracks),
        "limit" => $limit,
        "offset" => $offset
    ]);

} catch (PDOException $e) {
    json_response(false, "Could not retrieve tracks", null, 500);
}
