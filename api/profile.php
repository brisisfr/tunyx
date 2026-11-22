
<?php
// ini untuk profil si user. tapi di progress kali ini gk bisa dipakai dulu di player terbaru. cuma bisa di player lama doang
// Menangani pengelolaan informasi profil pengguna.
require_once __DIR__ . "/helpers.php";
require_method("POST");

$userId = require_login();
$input  = get_json_input();
$action = (string) ($input["action"] ?? "");
$me     = current_user($pdo, $userId);

if ($action === "remove_avatar") {
    $pdo->prepare("UPDATE users SET avatar_path = NULL WHERE user_id = :id")->execute(["id" => $userId]);
    delete_upload($me["avatar_path"]);
    json_response(true, "Profile photo removed.", ["user" => current_user($pdo, $userId)]);
}

$newName   = array_key_exists("username", $input) ? trim((string) $input["username"]) : null;
$hasAvatar = isset($_FILES["avatar"]) && $_FILES["avatar"]["error"] === UPLOAD_ERR_OK;

if ($newName === null && !$hasAvatar) {
    json_response(false, "No changes were sent.", null, 422);
}

if ($newName !== null && $newName !== $me["username"]) {
    if ($err = validate_username($newName)) {
        json_response(false, $err, null, 422);
    }
    $dup = $pdo->prepare("SELECT 1 FROM users WHERE username = :u AND user_id <> :id");
    $dup->execute(["u" => $newName, "id" => $userId]);
    if ($dup->fetch()) {
        json_response(false, "That username is already taken.", null, 409);
    }
}

$newAvatar = $hasAvatar ? save_image($_FILES["avatar"], "avatars", "avatar_" . $userId, 2 * 1024 * 1024) : null;

try {
    if ($newName !== null && $newName !== $me["username"]) {
        $pdo->prepare("UPDATE users SET username = :u WHERE user_id = :id")->execute(["u" => $newName, "id" => $userId]);
        $_SESSION["username"] = $newName;
    }
    if ($newAvatar !== null) {
        $pdo->prepare("UPDATE users SET avatar_path = :a WHERE user_id = :id")->execute(["a" => $newAvatar, "id" => $userId]);
        delete_upload($me["avatar_path"]);
    }
} catch (PDOException $e) {
    delete_upload($newAvatar);
    if ($e->getCode() === "23000") {
        json_response(false, "That username is already taken.", null, 409);
    }
    throw $e;
}

json_response(true, "Profile updated.", ["user" => current_user($pdo, $userId)]);
