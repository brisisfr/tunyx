<?php
require_once __DIR__ . "/helpers.php";
require_method("GET");

$userId = require_login();

json_response(true, "Sesi aktif valid", ["user" => current_user($pdo, $userId)]);
