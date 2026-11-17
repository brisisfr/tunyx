<?php
require_once __DIR__ . "/helpers.php";
require_method("POST");

$input    = get_json_input();
$username = trim((string) ($input["username"] ?? ""));
$email    = trim((string) ($input["email"] ?? ""));
$password = (string) ($input["password"] ?? "");

if ($username === "" || mb_strlen($username) > 50) {
    json_response(false, "Username Wajib Diisi Sayangg (maksimal 50 karakter)", null, 422); // [CUSTOM MSG]
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 100) {
    json_response(false, "Format Email Tidak Valid. Ganti Pakai Email Lain Yaaa", null, 422); // [CUSTOM MSG]
}
if (strlen($password) < 6) {
    json_response(false, "Password Minimal 6 Karakter BEIB", null, 422); // [CUSTOM MSG]
}

$check = $pdo->prepare("SELECT user_id FROM users WHERE username = :u OR email = :e");
$check->execute(["u" => $username, "e" => $email]);
if ($check->fetch()) {
    json_response(false, "Username Atau Email sudah digunakan Oleh Orang Lain😹", null, 409); // [CUSTOM MSG]
}

$hash = password_hash($password, PASSWORD_BCRYPT);
$stmt = $pdo->prepare("INSERT INTO users (username, email, password_hash) VALUES (:u, :e, :p)");
$stmt->execute(["u" => $username, "e" => $email, "p" => $hash]);

json_response(true, "Akun Berhasil Dibuat! Silakan Login Pake Akun Yang Udah Dibikin Yaaa", [ // [CUSTOM MSG]
    "user_id"  => (int) $pdo->lastInsertId(),
    "username" => $username,
    "email"    => $email
], 201);