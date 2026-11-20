<?php
// Semua error PHP dikirim sebagai JSON, bukan halaman HTML,
// biar frontend bisa baca pesannya.
ini_set("display_errors", "0");

require_once __DIR__ . "/db.php";

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header("Content-Type: application/json; charset=utf-8");

function json_response(bool $success, string $message, $data = null, int $status = 200): void {
    http_response_code($status);
    $res = ["success" => $success, "message" => $message];
    if ($data !== null) {
        $res["data"] = $data;
    }
    echo json_encode($res, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

set_exception_handler(function (Throwable $e) {
    json_response(false, "Server error: " . $e->getMessage(), null, 500);
});

function require_method($allowed): void {
    $method = $_SERVER["REQUEST_METHOD"] ?? "GET";
    if (!in_array($method, (array) $allowed, true)) {
        json_response(false, "Method not allowed.", null, 405);
    }
}

function get_json_input(): array {
    $raw  = file_get_contents("php://input");
    $data = json_decode($raw, true);
    return is_array($data) ? $data : $_POST;
}

function require_login(): int {
    if (empty($_SESSION["user_id"])) {
        json_response(false, "Please sign in first.", null, 401);
    }
    return (int) $_SESSION["user_id"];
}

function uploads_root(): string {
    return dirname(__DIR__) . DIRECTORY_SEPARATOR . "uploads";
}

// Returns an error message, or null when valid.
function validate_username(string $u): ?string {
    if (!preg_match('/^[A-Za-z0-9_.]{3,30}\z/', $u)) {
        return "Username must be 3-30 characters: letters, numbers, dots, or underscores.";
    }
    return null;
}

// Printable ASCII only (no spaces, emoji, or odd Unicode).
function validate_password(string $p): ?string {
    if (!preg_match('/^[\x21-\x7E]{6,64}\z/', $p)) {
        return "Password must be 6-64 characters: letters, numbers, and common symbols (no spaces, emoji, or Unicode).";
    }
    return null;
}

function current_user(PDO $pdo, int $userId): array {
    $s = $pdo->prepare("SELECT user_id, username, email, avatar_path FROM users WHERE user_id = :id");
    $s->execute(["id" => $userId]);
    $u = $s->fetch();
    if (!$u) {
        json_response(false, "User not found.", null, 404);
    }
    $u["user_id"] = (int) $u["user_id"];
    return $u;
}

// Validate + save an image. Returns the relative path, e.g. "uploads/avatars/xxx.jpg".
function save_image(array $file, string $subdir, string $prefix, int $maxBytes = 5242880): string {
    if (($file["error"] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        json_response(false, "Could not upload the image.", null, 422);
    }
    if ($file["size"] > $maxBytes) {
        json_response(false, "Image must be at most " . round($maxBytes / 1048576) . " MB.", null, 413);
    }
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file["tmp_name"]);
    $map  = ["image/jpeg" => "jpg", "image/png" => "png", "image/webp" => "webp"];
    if (!isset($map[$mime])) {
        json_response(false, "Image must be JPG, PNG, or WEBP.", null, 415);
    }
    $dir = uploads_root() . DIRECTORY_SEPARATOR . $subdir;
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    $name = $prefix . "_" . bin2hex(random_bytes(12)) . "." . $map[$mime];
    if (!move_uploaded_file($file["tmp_name"], $dir . DIRECTORY_SEPARATOR . $name)) {
        json_response(false, "Could not save the image on the server.", null, 500);
    }
    return "uploads/$subdir/$name";
}

function delete_upload(?string $rel): void {
    if (!$rel || strpos($rel, "uploads/") !== 0 || strpos($rel, "..") !== false) return;
    $full = dirname(__DIR__) . DIRECTORY_SEPARATOR . str_replace("/", DIRECTORY_SEPARATOR, $rel);
    if (is_file($full)) @unlink($full);
}
