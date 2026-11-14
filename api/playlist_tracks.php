<?php
require_once __DIR__ . "/helpers.php";

$userId = require_login();
$method = $_SERVER["REQUEST_METHOD"] ?? "GET";

$playlistId = filter_var(
    $_GET["playlist_id"] ?? ($_POST["playlist_id"] ?? null),
    FILTER_VALIDATE_INT
);

if (!$playlistId || $playlistId < 1) {
    json_response(false, "A valid playlist_id is required", null, 422);
}

try {
    // Confirm that this playlist belongs to the logged-in user.
    $ownerCheck = $pdo->prepare(
        "SELECT playlist_id FROM playlists WHERE playlist_id = :playlist_id AND user_id = :user_id"
    );
    $ownerCheck->execute([
        "playlist_id" => $playlistId,
        "user_id" => $userId
    ]);

    if (!$ownerCheck->fetch()) {
        json_response(false, "Playlist not found", null, 404);
    }

    if ($method === "GET") {
        $stmt = $pdo->prepare("
            SELECT
                pt.position,
                t.track_id,
                t.title,
                ar.name AS artist_name,
                al.title AS album_title,
                COALESCE(t.cover_path, al.cover_path) AS cover_path,
                t.file_path,
                t.duration_sec,
                t.genre
            FROM playlist_tracks pt
            INNER JOIN tracks t ON t.track_id = pt.track_id
            INNER JOIN artists ar ON ar.artist_id = t.artist_id
            LEFT JOIN albums al ON al.album_id = t.album_id
            WHERE pt.playlist_id = :playlist_id
            ORDER BY pt.position ASC
        ");
        $stmt->execute(["playlist_id" => $playlistId]);
        $tracks = $stmt->fetchAll();

        foreach ($tracks as &$track) {
            $track["track_id"] = (int) $track["track_id"];
            $track["position"] = (int) $track["position"];
            $track["duration_sec"] = $track["duration_sec"] !== null
                ? (int) $track["duration_sec"]
                : null;
        }
        unset($track);

        json_response(true, "Playlist tracks retrieved", $tracks);
    }

    if ($method === "POST") {
        $data = get_request_data();
        $trackId = filter_var($data["track_id"] ?? null, FILTER_VALIDATE_INT);

        if (!$trackId || $trackId < 1) {
            json_response(false, "A valid track_id is required", null, 422);
        }

        $exists = $pdo->prepare(
            "SELECT track_id FROM tracks WHERE track_id = :track_id"
        );
        $exists->execute(["track_id" => $trackId]);

        if (!$exists->fetch()) {
            json_response(false, "Track not found", null, 404);
        }

        $positionStmt = $pdo->prepare(
            "SELECT COALESCE(MAX(position), 0) + 1
             FROM playlist_tracks WHERE playlist_id = :playlist_id"
        );
        $positionStmt->execute(["playlist_id" => $playlistId]);
        $position = (int) $positionStmt->fetchColumn();

        $insert = $pdo->prepare(
            "INSERT INTO playlist_tracks (playlist_id, track_id, position)
             VALUES (:playlist_id, :track_id, :position)"
        );
        $insert->execute([
            "playlist_id" => $playlistId,
            "track_id" => $trackId,
            "position" => $position
        ]);

        json_response(true, "Track added to playlist", [
            "playlist_id" => $playlistId,
            "track_id" => $trackId,
            "position" => $position
        ], 201);
    }

    if ($method === "DELETE") {
        parse_str(file_get_contents("php://input"), $deleteData);
        $trackId = filter_var($deleteData["track_id"] ?? null, FILTER_VALIDATE_INT);

        if (!$trackId || $trackId < 1) {
            json_response(false, "A valid track_id is required", null, 422);
        }

        $delete = $pdo->prepare(
            "DELETE FROM playlist_tracks
             WHERE playlist_id = :playlist_id AND track_id = :track_id"
        );
        $delete->execute([
            "playlist_id" => $playlistId,
            "track_id" => $trackId
        ]);

        if ($delete->rowCount() === 0) {
            json_response(false, "Track was not in this playlist", null, 404);
        }

        // Compact the remaining positions to 1, 2, 3, ...
        $remaining = $pdo->prepare(
            "SELECT track_id FROM playlist_tracks
             WHERE playlist_id = :playlist_id ORDER BY position ASC"
        );
        $remaining->execute(["playlist_id" => $playlistId]);
        $ids = $remaining->fetchAll(PDO::FETCH_COLUMN);

        $update = $pdo->prepare(
            "UPDATE playlist_tracks
             SET position = :position
             WHERE playlist_id = :playlist_id AND track_id = :track_id"
        );

        foreach ($ids as $index => $id) {
            $update->execute([
                "position" => $index + 1,
                "playlist_id" => $playlistId,
                "track_id" => $id
            ]);
        }

        json_response(true, "Track removed from playlist");
    }

    if ($method === "PATCH") {
        $raw = json_decode(file_get_contents("php://input"), true);
        $trackId = filter_var($raw["track_id"] ?? null, FILTER_VALIDATE_INT);
        $newPosition = filter_var($raw["position"] ?? null, FILTER_VALIDATE_INT);

        if (!$trackId || !$newPosition || $newPosition < 1) {
            json_response(false, "Valid track_id and position are required", null, 422);
        }

        $listStmt = $pdo->prepare(
            "SELECT track_id FROM playlist_tracks
             WHERE playlist_id = :playlist_id ORDER BY position ASC"
        );
        $listStmt->execute(["playlist_id" => $playlistId]);
        $ids = $listStmt->fetchAll(PDO::FETCH_COLUMN);

        $currentIndex = array_search((string) $trackId, array_map("strval", $ids), true);
        if ($currentIndex === false) {
            json_response(false, "Track was not in this playlist", null, 404);
        }

        $newIndex = min($newPosition - 1, count($ids) - 1);
        $moving = $ids[$currentIndex];
        array_splice($ids, $currentIndex, 1);
        array_splice($ids, $newIndex, 0, [$moving]);

        $pdo->beginTransaction();
        $update = $pdo->prepare(
            "UPDATE playlist_tracks
             SET position = :position
             WHERE playlist_id = :playlist_id AND track_id = :track_id"
        );

        // Temporary negative positions avoid collisions if position has a unique index in a future schema.
        foreach ($ids as $index => $id) {
            $update->execute([
                "position" => -($index + 1),
                "playlist_id" => $playlistId,
                "track_id" => $id
            ]);
        }
        foreach ($ids as $index => $id) {
            $update->execute([
                "position" => $index + 1,
                "playlist_id" => $playlistId,
                "track_id" => $id
            ]);
        }
        $pdo->commit();

        json_response(true, "Playlist order updated", [
            "track_ids" => array_map("intval", $ids)
        ]);
    }

    header("Allow: GET, POST, DELETE, PATCH");
    json_response(false, "Method not allowed", null, 405);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();

    if ($e->getCode() === "23000") {
        json_response(false, "Track is already in this playlist", null, 409);
    }

    json_response(false, "Playlist track operation failed", null, 500);
}
