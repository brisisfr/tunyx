<?php
require_once __DIR__ . "/helpers.php";
require_method("GET");

$userId = require_login();

json_response(true, "Sesi aktif valid", [ // [CUSTOM MSG]
    "user" => [
        "user_id"  => $userId,
        "username" => $_SESSION["username"] ?? "",
        "email"    => $_SESSION["email"] ?? ""
    ]
]);