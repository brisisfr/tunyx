
<?php
// ini api buat history lagu yg dimainkan. jadi bisa next atau previous lagu 
// Mencatat, menampilkan, dan menghapus riwayat pemutaran.
require_once __DIR__ . "/helpers.php";
$userId = require_login();
$method = $_SERVER["REQUEST_METHOD"] ?? "GET";

// ---- GET: this user's play history ----
if ($method === "GET") {
    $limit = (int) ($_GET["limit"] ?? 30);
    $limit = max(1, min(100, $limit));

    $stmt = $pdo->prepare("
        SELECT ph.history_id, ph.played_at,
               t.track_id, t.title, ar.name AS artist_name, al.title AS album_title,
               COALESCE(t.cover_path, al.cover_path) AS cover_path,
               t.file_path, t.duration_sec, t.genre
        FROM play_history ph
        INNER JOIN tracks t ON t.track_id = ph.track_id
        INNER JOIN artists ar ON ar.artist_id = t.artist_id
        LEFT JOIN albums al ON al.album_id = t.album_id
        WHERE ph.user_id = :uid AND (t.visibility = 'public' OR t.uploader_id = :uid2)
        ORDER BY ph.played_at DESC, ph.history_id DESC
        LIMIT :lim
    ");
    $stmt->bindValue(":uid", $userId, PDO::PARAM_INT);
    $stmt->bindValue(":uid2", $userId, PDO::PARAM_INT);
    $stmt->bindValue(":lim", $limit, PDO::PARAM_INT);
    $stmt->execute();

    $rows = $stmt->fetchAll();
    foreach ($rows as &$r) {
        $r["history_id"]   = (int) $r["history_id"];
        $r["track_id"]     = (int) $r["track_id"];
        $r["duration_sec"] = $r["duration_sec"] !== null ? (int) $r["duration_sec"] : null;
    }
    unset($r);

    json_response(true, "Play history loaded.", ["history" => $rows]);
}

$input  = get_json_input();
$action = (string) ($input["action"] ?? "");

// ---- Clear this user's whole history: DELETE, or POST with action "clear" ----
if ($method === "DELETE" || ($method === "POST" && $action === "clear")) {
    $del = $pdo->prepare("DELETE FROM play_history WHERE user_id = :uid");
    $del->execute(["uid" => $userId]);
    json_response(true, "Play history cleared.");
}

// ---- POST: record one play ----
if ($method === "POST") {
    $trackId = (int) ($input["track_id"] ?? 0);
    if ($trackId < 1) {
        json_response(false, "Invalid song ID.", null, 422);
    }

    $chk = $pdo->prepare("SELECT 1 FROM tracks WHERE track_id = :tid AND (visibility = 'public' OR uploader_id = :uid)");
    $chk->execute(["tid" => $trackId, "uid" => $userId]);
    if (!$chk->fetch()) {
        json_response(false, "Song not found.", null, 404);
    }

    $ins = $pdo->prepare("INSERT INTO play_history (user_id, track_id) VALUES (:uid, :tid)");
    $ins->execute(["uid" => $userId, "tid" => $trackId]);
    json_response(true, "Play recorded.", null, 201);
}

json_response(false, "Method not allowed.", null, 405);
