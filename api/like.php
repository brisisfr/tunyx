<?php
require_once __DIR__ . "/helpers.php";

$userId = require_login();
$method = $_SERVER["REQUEST_METHOD"] ?? "GET";

try {
    if ($method === "GET") {
        $stmt = $pdo->prepare("
            SELECT
                t.track_id,
                t.title,
                ar.name AS artist_name,
                al.title AS album_title,
                COALESCE(t.cover_path, al.cover_path) AS cover_path,
                t.file_path,
                t.duration_sec,
                l.liked_at
            FROM likes l
            INNER JOIN tracks t ON t.track_id = l.track_id
            INNER JOIN artists ar ON ar.artist_id = t.artist_id
            LEFT JOIN albums al ON al.album_id = t.album_id
            WHERE l.user_id = :user_id
            ORDER BY l.liked_at DESC
        ");
        $stmt->execute(["user_id" => $userId]);
        $tracks = $stmt->fetchAll();

        foreach ($tracks as &$track) {
            $track["track_id"] = (int) $track["track_id"];
            $track["duration_sec"] = $track["duration_sec"] !== null
                ? (int) $track["duration_sec"]
                : null;
        }
        unset($track);

        json_response(true, "Liked tracks retrieved", $tracks);
    }

    if ($method === "POST") {
        $data = get_request_data();
        $trackId = filter_var($data["track_id"] ?? null, FILTER_VALIDATE_INT);

        if (!$trackId || $trackId < 1) {
            json_response(false, "A valid track_id is required", null, 422);
        }

        $check = $pdo->prepare(
            "SELECT track_id FROM tracks WHERE track_id = :track_id"
        );
        $check->execute(["track_id" => $trackId]);

        if (!$check->fetch()) {
            json_response(false, "Track not found", null, 404);
        }

        $existing = $pdo->prepare(
            "SELECT track_id FROM likes WHERE user_id = :user_id AND track_id = :track_id"
        );
        $existing->execute([
            "user_id" => $userId,
            "track_id" => $trackId
        ]);

        if ($existing->fetch()) {
            $delete = $pdo->prepare(
                "DELETE FROM likes WHERE user_id = :user_id AND track_id = :track_id"
            );
            $delete->execute([
                "user_id" => $userId,
                "track_id" => $trackId
            ]);

            json_response(true, "Track unliked", [
                "track_id" => (int) $trackId,
                "liked" => false
            ]);
        }

        $insert = $pdo->prepare(
            "INSERT INTO likes (user_id, track_id) VALUES (:user_id, :track_id)"
        );
        $insert->execute([
            "user_id" => $userId,
            "track_id" => $trackId
        ]);

        json_response(true, "Track liked", [
            "track_id" => (int) $trackId,
            "liked" => true
        ], 201);
    }

    header("Allow: GET, POST");
    json_response(false, "Method not allowed", null, 405);

} catch (PDOException $e) {
    json_response(false, "Like operation failed", null, 500);
}
