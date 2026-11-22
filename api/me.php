
<?php
// ini api buat nunjukin status sesi yang aktif. kyk klo kita login itu sudah masuk ke sesi aktif jadinya user terdeteksi gitu lah di sistem. harusnya sih gitu
// 	Memeriksa status login dan mengambil identitas pengguna dari session
require_once __DIR__ . "/helpers.php";
require_method("GET");

$userId = require_login();

json_response(true, "Session is active.", ["user" => current_user($pdo, $userId)]);
