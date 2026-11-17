<?php
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

function require_method($allowed): void {
    $method = $_SERVER["REQUEST_METHOD"] ?? "GET";
    if (!in_array($method, (array) $allowed, true)) {
        json_response(false, "Maaf Yaa.. Tapi Kamu Gk Boleh Masuk", null, 405); // [CUSTOM MSG]
    }
}

function get_json_input(): array {
    $raw  = file_get_contents("php://input");
    $data = json_decode($raw, true);
    return is_array($data) ? $data : $_POST;
}

function require_login(): int {
    if (empty($_SESSION["user_id"])) {
        json_response(false, "Login Dulu Sayangg Baru Bisa Pakai", null, 401); // [CUSTOM MSG]
    }
    return (int) $_SESSION["user_id"];
}