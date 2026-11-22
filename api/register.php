
<?php
// ini buat registrasi akun atau gampangnya bikin akun buat dipake sama user. 
// Menangani proses pendaftaran akun baru.
require_once __DIR__ . "/helpers.php";
require_method("POST");

$input    = get_json_input();
$username = trim((string) ($input["username"] ?? ""));
$email    = trim((string) ($input["email"] ?? ""));
$password = (string) ($input["password"] ?? "");

if ($err = validate_username($username)) {
    json_response(false, $err, null, 422);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 100) {
    json_response(false, "Please enter a valid email address.", null, 422);
}
if ($err = validate_password($password)) {
    json_response(false, $err, null, 422);
}

$check = $pdo->prepare("SELECT user_id FROM users WHERE username = :u OR email = :e");
$check->execute(["u" => $username, "e" => $email]);
if ($check->fetch()) {
    json_response(false, "That username or email is already taken.", null, 409);
}

$hash = password_hash($password, PASSWORD_BCRYPT);
$stmt = $pdo->prepare("INSERT INTO users (username, email, password_hash) VALUES (:u, :e, :p)");
$stmt->execute(["u" => $username, "e" => $email, "p" => $hash]);

json_response(true, "Account created! You can sign in now.", [
    "user_id"  => (int) $pdo->lastInsertId(),
    "username" => $username,
    "email"    => $email
], 201);
