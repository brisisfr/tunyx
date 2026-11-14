<?php
require_once __DIR__ . "/helpers.php";
require_method("POST");

$adminId = require_admin();

$title = clean_string($_POST["title"] ?? "");
$artistId = filter_var($_POST["artist_id"] ?? null, FILTER_VALIDATE_INT);
$albumRaw = $_POST["album_id"] ?? "";
$albumId = ($albumRaw === "" || $albumRaw === null)
    ? null
    : filter_var($albumRaw, FILTER_VALIDATE_INT);
$genre = clean_string($_POST["genre"] ?? "");
$durationRaw = $_POST["duration_sec"] ?? "";
$duration = ($durationRaw === "" || $durationRaw === null)
    ? null
    : filter_var($durationRaw, FILTER_VALIDATE_INT);

if ($title === "" || mb_strlen($title) > 150) {
    json_response(false, "Track title is required (maximum 150 characters)", null, 422);
}
if (!$artistId || $artistId < 1) {
    json_response(false, "A valid artist_id is required", null, 422);
}
if ($albumId !== null && (!$albumId || $albumId < 1)) {
    json_response(false, "Invalid album_id", null, 422);
}
if ($duration !== null && ($duration === false || $duration < 0)) {
    json_response(false, "Invalid duration_sec", null, 422);
}
if ($genre !== "" && mb_strlen($genre) > 50) {
    json_response(false, "Genre must be at most 50 characters", null, 422);
}

if (!isset($_FILES["audio"]) || $_FILES["audio"]["error"] !== UPLOAD_ERR_OK) {
    json_response(false, "An audio file is required", null, 422);
}

$audioAllowed = [
    "audio/mpeg" => "mp3",
    "audio/wav" => "wav",
    "audio/x-wav" => "wav",
    "audio/ogg" => "ogg",
    "audio/mp4" => "m4a",
    "audio/aac" => "aac"
];

$coverAllowed = [
    "image/jpeg" => "jpg",
    "image/png" => "png",
    "image/webp" => "webp"
];

$rootUploadDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . "uploads";
$songDir = $rootUploadDir . DIRECTORY_SEPARATOR . "songs";
$coverDir = $rootUploadDir . DIRECTORY_SEPARATOR . "covers";

foreach ([$songDir, $coverDir] as $dir) {
    if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
        json_response(false, "Could not create upload directory", null, 500);
    }
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$audioMime = $finfo->file($_FILES["audio"]["tmp_name"]);

if (!isset($audioAllowed[$audioMime])) {
    json_response(false, "Unsupported audio format. Use MP3, WAV, OGG, M4A, or AAC", null, 415);
}
if ($_FILES["audio"]["size"] > 32 * 1024 * 1024) {
    json_response(false, "Audio file exceeds the 32 MB limit", null, 413);
}

$audioName = bin2hex(random_bytes(16)) . "." . $audioAllowed[$audioMime];
$audioDestination = $songDir . DIRECTORY_SEPARATOR . $audioName;
$audioRelativePath = "uploads/songs/" . $audioName;

$coverRelativePath = null;
$coverDestination = null;

if (isset($_FILES["cover"]) && $_FILES["cover"]["error"] !== UPLOAD_ERR_NO_FILE) {
    if ($_FILES["cover"]["error"] !== UPLOAD_ERR_OK) {
        json_response(false, "Cover upload failed", null, 422);
    }

    $coverMime = $finfo->file($_FILES["cover"]["tmp_name"]);

    if (!isset($coverAllowed[$coverMime])) {
        json_response(false, "Cover must be JPG, PNG, or WEBP", null, 415);
    }
    if ($_FILES["cover"]["size"] > 5 * 1024 * 1024) {
        json_response(false, "Cover image exceeds the 5 MB limit", null, 413);
    }

    $coverName = bin2hex(random_bytes(16)) . "." . $coverAllowed[$coverMime];
    $coverDestination = $coverDir . DIRECTORY_SEPARATOR . $coverName;
    $coverRelativePath = "uploads/covers/" . $coverName;
}

try {
    $artistCheck = $pdo->prepare("SELECT artist_id FROM artists WHERE artist_id = :id");
    $artistCheck->execute(["id" => $artistId]);
    if (!$artistCheck->fetch()) {
        json_response(false, "Artist not found", null, 404);
    }

    if ($albumId !== null) {
        $albumCheck = $pdo->prepare("SELECT album_id FROM albums WHERE album_id = :id");
        $albumCheck->execute(["id" => $albumId]);
        if (!$albumCheck->fetch()) {
            json_response(false, "Album not found", null, 404);
        }
    }

    if (!move_uploaded_file($_FILES["audio"]["tmp_name"], $audioDestination)) {
        json_response(false, "Could not save audio file", null, 500);
    }

    if ($coverDestination !== null &&
        !move_uploaded_file($_FILES["cover"]["tmp_name"], $coverDestination)) {
        @unlink($audioDestination);
        json_response(false, "Could not save cover image", null, 500);
    }

    $stmt = $pdo->prepare("
        INSERT INTO tracks
            (title, artist_id, album_id, uploader_id, genre, file_path, cover_path, duration_sec)
        VALUES
            (:title, :artist_id, :album_id, :uploader_id, :genre, :file_path, :cover_path, :duration_sec)
    ");

    $stmt->execute([
        "title" => $title,
        "artist_id" => $artistId,
        "album_id" => $albumId,
        "uploader_id" => $adminId,
        "genre" => $genre !== "" ? $genre : null,
        "file_path" => $audioRelativePath,
        "cover_path" => $coverRelativePath,
        "duration_sec" => $duration
    ]);

    json_response(true, "Track uploaded successfully", [
        "track_id" => (int) $pdo->lastInsertId(),
        "title" => $title,
        "file_path" => $audioRelativePath,
        "cover_path" => $coverRelativePath
    ], 201);

} catch (PDOException $e) {
    if (isset($audioDestination) && is_file($audioDestination)) @unlink($audioDestination);
    if ($coverDestination !== null && is_file($coverDestination)) @unlink($coverDestination);

    json_response(false, "Track upload failed", null, 500);
}
