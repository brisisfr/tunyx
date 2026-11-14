
<?php

require_once "db.php";

header("Content-Type: application/json");

echo json_encode([
    "success" => true,
    "message" => "TUNYX database connected!"
]);
