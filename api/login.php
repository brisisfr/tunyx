
<?php
// ini buat login. jadi sebelum pake aplikasi, user atau pengguna harus login dengan akun yang dibuat oleh user. kalau gk punya yaa bikin
// 	Memverifikasi identitas pengguna dan membuat session login.
require_once __DIR__ . "/helpers.php";
require_method("POST");

$input      = get_json_input();
$identifier = trim((string) ($input["identifier"] ?? $input["email"] ?? ""));
$password   = (string) ($input["password"] ?? "");

if ($identifier === "" || $password === "") {
    json_response(false, "Email/username and password are required.", null, 422);
}

$stmt = $pdo->prepare("SELECT user_id, username, email, avatar_path, password_hash FROM users WHERE email = :id1 OR username = :id2 LIMIT 1");
$stmt->execute(["id1" => $identifier, "id2" => $identifier]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user["password_hash"])) {
    json_response(false, "Wrong username/email or password.", null, 401);
}

session_regenerate_id(true);
$_SESSION["user_id"]  = (int) $user["user_id"];
$_SESSION["username"] = $user["username"];
$_SESSION["email"]    = $user["email"];

json_response(true, "Welcome back, " . $user["username"] . "!", [
    "user" => [
        "user_id"  => (int) $user["user_id"],
        "username" => $user["username"],
        "email"    => $user["email"],
        "avatar_path" => $user["avatar_path"]
    ]
]);
