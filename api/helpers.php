<?php
// Shared helpers for all TUNYX JSON endpoints.
require_once __DIR__ . "/db.php";

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header("Content-Type: application/json; charset=utf-8");

function json_response($success, $message, $data = null, $status = 200) {
    http_response_code($status);

    $response = [
        "success" => $success,
        "message" => $message
    ];

    if ($data !== null) {
        $response["data"] = $data;
    }

    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function require_method($allowed) {
    $method = $_SERVER["REQUEST_METHOD"] ?? "GET";

    if (!in_array($method, (array) $allowed, true)) {
        header("Allow: " . implode(", ", (array) $allowed));
        json_response(false, "Method not allowed", null, 405);
    }
}

function get_request_data() {
    $contentType = $_SERVER["CONTENT_TYPE"] ?? "";

    if (stripos($contentType, "application/json") !== false) {
        $raw = file_get_contents("php://input");
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }

    return $_POST;
}

function require_login() {
    if (empty($_SESSION["user_id"])) {
        json_response(false, "Authentication required", null, 401);
    }

    return (int) $_SESSION["user_id"];
}

function current_user() {
    if (empty($_SESSION["user_id"])) {
        return null;
    }

    return [
        "user_id" => (int) $_SESSION["user_id"],
        "username" => $_SESSION["username"] ?? null,
        "email" => $_SESSION["email"] ?? null
    ];
}

function clean_string($value) {
    return trim((string) $value);
}

/*
 * Upload permission:
 * Put the numeric user_id of the backend/admin account(s) in this array.
 * Example: const TUNYX_ADMIN_IDS = [1];
 * An empty array disables upload.php until an admin ID is configured.
 */
if (!defined("TUNYX_ADMIN_IDS")) {
    define("TUNYX_ADMIN_IDS", []);
}

function require_admin() {
    $userId = require_login();

    if (!in_array($userId, TUNYX_ADMIN_IDS, true)) {
        json_response(false, "Admin access required", null, 403);
    }

    return $userId;
}
