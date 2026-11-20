<?php
require_once __DIR__ . "/helpers.php";
require_method("POST");

$userId  = require_login();
$input   = get_json_input();
$trackId = (int) ($input["track_id"] ?? 0);

if ($trackId < 1) {
    json_response(false, "ID Lagu Tidak Valid", null, 422);
}

$exists = $pdo->prepare("SELECT 1 FROM tracks WHERE track_id = :t AND (visibility = 'public' OR uploader_id = :u)");
$exists->execute(["t" => $trackId, "u" => $userId]);
if (!$exists->fetch()) {
    json_response(false, "Lagu Tidak Ditemukan", null, 404);
}

$check = $pdo->prepare("SELECT 1 FROM likes WHERE user_id = :u AND track_id = :t");
$check->execute(["u" => $userId, "t" => $trackId]);

if ($check->fetch()) {
    $del = $pdo->prepare("DELETE FROM likes WHERE user_id = :u AND track_id = :t");
    $del->execute(["u" => $userId, "t" => $trackId]);
    json_response(true, "Dihapus Dari Daftar Suka", ["liked" => false]);
}

$ins = $pdo->prepare("INSERT INTO likes (user_id, track_id) VALUES (:u, :t)");
$ins->execute(["u" => $userId, "t" => $trackId]);
json_response(true, "Ditambahkan Ke Daftar Suka", ["liked" => true]);
