<?php
require_once __DIR__ . "/helpers.php";
require_method("POST");

$data = get_request_data();

$identity = clean_string($data["identity"] ?? ($data["email"] ?? ""));
$password = (string) ($data["password"] ?? "");

if ($identity === "" || $password === "") {
    json_response(false, "Email/username and password are required", null, 422);
}

try {
    $stmt = $pdo->prepare(
        "SELECT user_id, username, email, password_hash
         FROM users
         WHERE email = :email OR username = :username
         LIMIT 1"
    );
    $stmt->execute([
        "email" => $identity,
        "username" => $identity
    ]);

    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user["password_hash"])) {
        json_response(false, "Invalid login credentials", null, 401);
    }

    session_regenerate_id(true);

    $_SESSION["user_id"] = (int) $user["user_id"];
    $_SESSION["username"] = $user["username"];
    $_SESSION["email"] = $user["email"];

    json_response(true, "Login successful", [
        "user_id" => (int) $user["user_id"],
        "username" => $user["username"],
        "email" => $user["email"]
    ]);

} catch (PDOException $e) {
    json_response(false, "Login failed", null, 500);
}
