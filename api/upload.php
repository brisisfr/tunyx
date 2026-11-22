
<?php
// ini api buat upload lagu.
//	Memproses unggahan lagu, cover, serta penyimpanan datanya.
require_once __DIR__ . "/helpers.php";
require_method("POST");

$userId     = require_login();
$title      = trim((string) ($_POST["title"] ?? ""));
$artistName = trim((string) ($_POST["artist_name"] ?? ""));
$albumTitle = trim((string) ($_POST["album_title"] ?? ""));
$genre      = trim((string) ($_POST["genre"] ?? ""));
$visibility = ($_POST["visibility"] ?? "public") === "private" ? "private" : "public";
$duration   = filter_var($_POST["duration_sec"] ?? "", FILTER_VALIDATE_INT);
$duration   = ($duration === false || $duration < 0 || $duration > 86400) ? null : $duration;

if ($title === "" || $artistName === "") {
    json_response(false, "Title and artist are required.", null, 422);
}
if (!isset($_FILES["audio"]) || $_FILES["audio"]["error"] !== UPLOAD_ERR_OK) {
    json_response(false, "An audio file is required (max 100 MB).", null, 422);
}

$audioExt     = strtolower(pathinfo($_FILES["audio"]["name"], PATHINFO_EXTENSION));
$allowedAudio = ["mp3", "flac", "wav", "ogg", "m4a", "aac"];
if (!in_array($audioExt, $allowedAudio, true)) {
    json_response(false, "Unsupported audio format (.$audioExt). Use MP3, FLAC, WAV, OGG, M4A, or AAC.", null, 415);
}
if ($_FILES["audio"]["size"] > 100 * 1024 * 1024) {
    json_response(false, "Audio file must be at most 100 MB.", null, 413);
}

$songDir = uploads_root() . DIRECTORY_SEPARATOR . "songs";
if (!is_dir($songDir)) mkdir($songDir, 0755, true);

$audioFileName = bin2hex(random_bytes(16)) . "." . $audioExt;
$audioDest     = $songDir . DIRECTORY_SEPARATOR . $audioFileName;
$audioPath     = "uploads/songs/" . $audioFileName;

// The cover is validated (real MIME check) and saved first; on failure the function responds immediately.
$coverPath = null;
if (isset($_FILES["cover"]) && $_FILES["cover"]["error"] === UPLOAD_ERR_OK) {
    $coverPath = save_image($_FILES["cover"], "covers", "cover", 10 * 1024 * 1024);
}

try {
    $pdo->beginTransaction();

    $stmtAr = $pdo->prepare("SELECT artist_id FROM artists WHERE name = :name LIMIT 1");
    $stmtAr->execute(["name" => $artistName]);
    $artist = $stmtAr->fetch();
    if ($artist) {
        $artistId = (int) $artist["artist_id"];
    } else {
        $pdo->prepare("INSERT INTO artists (name) VALUES (:name)")->execute(["name" => $artistName]);
        $artistId = (int) $pdo->lastInsertId();
    }

    $albumId = null;
    if ($albumTitle !== "") {
        $stmtAl = $pdo->prepare("SELECT album_id, cover_path FROM albums WHERE title = :title AND artist_id = :aid LIMIT 1");
        $stmtAl->execute(["title" => $albumTitle, "aid" => $artistId]);
        $album = $stmtAl->fetch();
        if ($album) {
            $albumId = (int) $album["album_id"];
            if ($album["cover_path"] === null && $coverPath !== null) {
                $pdo->prepare("UPDATE albums SET cover_path = :cp WHERE album_id = :id")
                    ->execute(["cp" => $coverPath, "id" => $albumId]);
            }
        } else {
            $pdo->prepare("INSERT INTO albums (title, artist_id, cover_path) VALUES (:title, :aid, :cp)")
                ->execute(["title" => $albumTitle, "aid" => $artistId, "cp" => $coverPath]);
            $albumId = (int) $pdo->lastInsertId();
        }
    }

    if (!move_uploaded_file($_FILES["audio"]["tmp_name"], $audioDest)) {
        throw new Exception("Could not save the audio file on the server.");
    }

    $pdo->prepare("
        INSERT INTO tracks (title, artist_id, album_id, uploader_id, genre, file_path, cover_path, duration_sec, visibility)
        VALUES (:title, :aid, :alid, :uid, :genre, :fp, :cp, :dur, :vis)
    ")->execute([
        "title" => $title,
        "aid"   => $artistId,
        "alid"  => $albumId,
        "uid"   => $userId,
        "genre" => $genre !== "" ? $genre : null,
        "fp"    => $audioPath,
        "cp"    => $coverPath,
        "dur"   => $duration,
        "vis"   => $visibility
    ]);
    $trackId = (int) $pdo->lastInsertId();

    $pdo->commit();
    json_response(true, "Song uploaded!", ["track_id" => $trackId, "visibility" => $visibility], 201);

} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    if (is_file($audioDest)) @unlink($audioDest);
    delete_upload($coverPath);
    json_response(false, "Upload failed: " . $e->getMessage(), null, 500);
}
