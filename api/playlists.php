<?php
require_once __DIR__ . "/helpers.php";

$userId = require_login();
$method = $_SERVER["REQUEST_METHOD"] ?? "GET";

try {
    if ($method === "GET") {
        $stmt = $pdo->prepare("
            SELECT
                p.playlist_id,
                p.title,
                p.created_at,
                COUNT(pt.track_id) AS track_count
            FROM playlists p
            LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.playlist_id
            WHERE p.user_id = :user_id
            GROUP BY p.playlist_id, p.title, p.created_at
            ORDER BY p.created_at DESC, p.playlist_id DESC
        ");
        $stmt->execute(["user_id" => $userId]);
        $playlists = $stmt->fetchAll();

        foreach ($playlists as &$playlist) {
            $playlist["playlist_id"] = (int) $playlist["playlist_id"];
            $playlist["track_count"] = (int) $playlist["track_count"];
        }
        unset($playlist);

        json_response(true, "Playlists retrieved", $playlists);
    }

    if ($method === "POST") {
        $data = get_request_data();
        $title = clean_string($data["title"] ?? "");

        if ($title === "" || mb_strlen($title) > 100) {
            json_response(false, "Playlist title is required (maximum 100 characters)", null, 422);
        }

        $stmt = $pdo->prepare(
            "INSERT INTO playlists (user_id, title) VALUES (:user_id, :title)"
        );
        $stmt->execute([
            "user_id" => $userId,
            "title" => $title
        ]);

        json_response(true, "Playlist created", [
            "playlist_id" => (int) $pdo->lastInsertId(),
            "title" => $title
        ], 201);
    }

    header("Allow: GET, POST");
    json_response(false, "Method not allowed", null, 405);

} catch (PDOException $e) {
    json_response(false, "Playlist operation failed", null, 500);
}
