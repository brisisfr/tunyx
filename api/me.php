<?php
require_once __DIR__ . "/helpers.php";
require_method("GET");

$userId = require_login();

try {
    $stmt = $pdo->prepare(
        "SELECT user_id, username, email, created_at
         FROM users
         WHERE user_id = :user_id
         LIMIT 1"
    );
    $stmt->execute(["user_id" => $userId]);
    $user = $stmt->fetch();

    if (!$user) {
        $_SESSION = [];
        session_destroy();
        json_response(false, "User account not found", null, 404);
    }

    $user["user_id"] = (int) $user["user_id"];
    json_response(true, "Current user retrieved", $user);

} catch (PDOException $e) {
    json_response(false, "Could not retrieve user", null, 500);
}
