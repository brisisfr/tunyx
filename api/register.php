<?php
require_once __DIR__ . "/helpers.php";
require_method("POST");

$data = get_request_data();

$username = clean_string($data["username"] ?? "");
$email = strtolower(clean_string($data["email"] ?? ""));
$password = (string) ($data["password"] ?? "");

if ($username === "" || $email === "" || $password === "") {
    json_response(false, "Username, email, and password are required", null, 422);
}

if (strlen($username) < 3 || strlen($username) > 50) {
    json_response(false, "Username must be 3 to 50 characters", null, 422);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 100) {
    json_response(false, "Invalid email address", null, 422);
}

if (strlen($password) < 8) {
    json_response(false, "Password must be at least 8 characters", null, 422);
}

try {
    $check = $pdo->prepare(
        "SELECT user_id FROM users WHERE username = :username OR email = :email LIMIT 1"
    );
    $check->execute([
        "username" => $username,
        "email" => $email
    ]);

    if ($check->fetch()) {
        json_response(false, "Username or email is already registered", null, 409);
    }

    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    $stmt = $pdo->prepare(
        "INSERT INTO users (username, email, password_hash)
         VALUES (:username, :email, :password_hash)"
    );
    $stmt->execute([
        "username" => $username,
        "email" => $email,
        "password_hash" => $passwordHash
    ]);

    json_response(true, "Registration successful", [
        "user_id" => (int) $pdo->lastInsertId(),
        "username" => $username,
        "email" => $email
    ], 201);

} catch (PDOException $e) {
    json_response(false, "Registration failed", null, 500);
}
