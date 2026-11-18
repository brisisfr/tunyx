<?php
require_once __DIR__ . "/helpers.php";
require_method("POST");

$input      = get_json_input();
$identifier = trim((string) ($input["identifier"] ?? $input["email"] ?? ""));
$password   = (string) ($input["password"] ?? "");

if ($identifier === "" || $password === "") {
    json_response(false, "Email/Username dan Password Wajib Diisi Yaa", null, 422); // [CUSTOM MSG]
}

$stmt = $pdo->prepare("SELECT user_id, username, email, password_hash FROM users WHERE email = :id1 OR username = :id2 LIMIT 1");
$stmt->execute(["id1" => $identifier, "id2" => $identifier]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user["password_hash"])) {
    json_response(false, "Email/Username Atau Password Salah😹", null, 401); // [CUSTOM MSG]
}

$_SESSION["user_id"]  = (int) $user["user_id"];
$_SESSION["username"] = $user["username"];
$_SESSION["email"]    = $user["email"];

json_response(true, "WELLKAMMM BEEKKKK, " . $user["username"] . "!", [ // [CUSTOM MSG]
    "user" => [
        "user_id"  => (int) $user["user_id"],
        "username" => $user["username"],
        "email"    => $user["email"]
    ]
]);