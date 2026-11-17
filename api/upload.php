<?php
require_once __DIR__ . "/helpers.php";
require_method("POST");

$userId     = require_login();
$title      = trim((string) ($_POST["title"] ?? ""));
$artistName = trim((string) ($_POST["artist_name"] ?? ""));
$albumTitle = trim((string) ($_POST["album_title"] ?? ""));
$genre      = trim((string) ($_POST["genre"] ?? ""));
$duration   = ($_POST["duration_sec"] ?? "") !== "" ? (int) $_POST["duration_sec"] : null;

if ($title === "" || $artistName === "") {
    json_response(false, "Judul Lagu dan Nama Artis Wajib Diisi", null, 422); // [CUSTOM MSG]
}
if (!isset($_FILES["audio"]) || $_FILES["audio"]["error"] !== UPLOAD_ERR_OK) {
    json_response(false, "File Audio Wajib dipiliD (Pastikan Ukuran Tidak Melebihi Batas 100mb)", null, 422); // [CUSTOM MSG]
}

$audioExt     = strtolower(pathinfo($_FILES["audio"]["name"], PATHINFO_EXTENSION));
$allowedAudio = ["mp3", "flac", "wav", "ogg", "m4a", "aac"];
if (!in_array($audioExt, $allowedAudio, true)) {
    json_response(false, "Format Audio Tidak Didukung (.$audioExt). Gunakan MP3, FLAC, WAV, OGG, M4A, atau AAC", null, 415); // [CUSTOM MSG]
}
if ($_FILES["audio"]["size"] > 100 * 1024 * 1024) {
    json_response(false, "Ukuran File Audio Maksimal 100mb", null, 413); // [CUSTOM MSG]
}

$rootDir  = dirname(__DIR__) . DIRECTORY_SEPARATOR . "uploads";
$songDir  = $rootDir . DIRECTORY_SEPARATOR . "songs";
$coverDir = $rootDir . DIRECTORY_SEPARATOR . "covers";
if (!is_dir($songDir)) mkdir($songDir, 0755, true);
if (!is_dir($coverDir)) mkdir($coverDir, 0755, true);

$audioFileName = bin2hex(random_bytes(16)) . "." . $audioExt;
$audioDest     = $songDir . DIRECTORY_SEPARATOR . $audioFileName;
$audioPath     = "uploads/songs/" . $audioFileName;

$coverPath = null;
$coverDest = null;

if (isset($_FILES["cover"]) && $_FILES["cover"]["error"] === UPLOAD_ERR_OK) {
    $coverExt = strtolower(pathinfo($_FILES["cover"]["name"], PATHINFO_EXTENSION));
    if (!in_array($coverExt, ["jpg", "jpeg", "png", "webp"], true)) {
        json_response(false, "Format Cover Harus JPG, PNG, atau WEBP", null, 415); // [CUSTOM MSG]
    }
    if ($_FILES["cover"]["size"] > 10 * 1024 * 1024) {
        json_response(false, "Ukuran Cover Maksimal 10mb", null, 413); // [CUSTOM MSG]
    }
    $coverFileName = bin2hex(random_bytes(16)) . "." . $coverExt;
    $coverDest     = $coverDir . DIRECTORY_SEPARATOR . $coverFileName;
    $coverPath     = "uploads/covers/" . $coverFileName;
}

try {
    $pdo->beginTransaction();

    // Cari atau buat Artist otomatis
    $stmtAr = $pdo->prepare("SELECT artist_id FROM artists WHERE name = :name LIMIT 1");
    $stmtAr->execute(["name" => $artistName]);
    $artist = $stmtAr->fetch();
    if ($artist) {
        $artistId = (int) $artist["artist_id"];
    } else {
        $insAr = $pdo->prepare("INSERT INTO artists (name) VALUES (:name)");
        $insAr->execute(["name" => $artistName]);
        $artistId = (int) $pdo->lastInsertId();
    }

    // Cari atau buat Album otomatis (jika diisi)
    $albumId = null;
    if ($albumTitle !== "") {
        $stmtAl = $pdo->prepare("SELECT album_id FROM albums WHERE title = :title AND artist_id = :aid LIMIT 1");
        $stmtAl->execute(["title" => $albumTitle, "aid" => $artistId]);
        $album = $stmtAl->fetch();
        if ($album) {
            $albumId = (int) $album["album_id"];
        } else {
            $insAl = $pdo->prepare("INSERT INTO albums (title, artist_id, cover_path) VALUES (:title, :aid, :cp)");
            $insAl->execute(["title" => $albumTitle, "aid" => $artistId, "cp" => $coverPath]);
            $albumId = (int) $pdo->lastInsertId();
        }
    }

    if (!move_uploaded_file($_FILES["audio"]["tmp_name"], $audioDest)) {
        throw new Exception("Gagal Menyimpan File Audio Ke Server"); // [CUSTOM MSG]
    }
    if ($coverDest && !move_uploaded_file($_FILES["cover"]["tmp_name"], $coverDest)) {
        throw new Exception("Gagal Menyimpan Gambar Cover Ke Server"); // [CUSTOM MSG]
    }

    $stmtTr = $pdo->prepare("
        INSERT INTO tracks (title, artist_id, album_id, uploader_id, genre, file_path, cover_path, duration_sec)
        VALUES (:title, :aid, :alid, :uid, :genre, :fp, :cp, :dur)
    ");
    $stmtTr->execute([
        "title" => $title,
        "aid"   => $artistId,
        "alid"  => $albumId,
        "uid"   => $userId,
        "genre" => $genre !== "" ? $genre : null,
        "fp"    => $audioPath,
        "cp"    => $coverPath,
        "dur"   => $duration
    ]);

    $pdo->commit();
    json_response(true, "Lagu Berhasil Diunggah Ke TUNYX!", [ // [CUSTOM MSG]
        "track_id" => (int) $pdo->lastInsertId()
    ], 201);

} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    if (is_file($audioDest)) @unlink($audioDest);
    if ($coverDest && is_file($coverDest)) @unlink($coverDest);
    json_response(false, "Upload Gagal T^T: " . $e->getMessage(), null, 500); // [CUSTOM MSG]
}