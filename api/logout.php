<?php
require_once __DIR__ . "/helpers.php";
require_method("POST");

if (session_status() === PHP_SESSION_ACTIVE) {
    $_SESSION = [];

    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            "",
            time() - 42000,
            $params["path"],
            $params["domain"],
            $params["secure"],
            $params["httponly"]
        );
    }

    session_destroy();
}

json_response(true, "Logout successful");
