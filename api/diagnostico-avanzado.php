<?php
// CORS primero
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept, Origin');
header('Content-Type: application/json; charset=UTF-8');

// OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Respuesta
echo json_encode([
    'success' => true,
    'message' => 'CORS funcionando',
    'timestamp' => date('c')
]);