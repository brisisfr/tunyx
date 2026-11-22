
<?php
// yaa ini api buat log out akun. dah itu aja
// Mengakhiri session pengguna.
require_once __DIR__ . "/helpers.php";
require_method("POST");

$_SESSION = [];
if (ini_get("session.use_cookies")) {
    $p = session_get_cookie_params();
    setcookie(session_name(), "", time() - 42000, $p["path"], $p["domain"], $p["secure"], $p["httponly"]);
}
session_destroy();

json_response(true, "Signed out.");
