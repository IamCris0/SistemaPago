<?php
/**
 * PROXY CORS - Mawewe
 * Este archivo actúa como intermediario para evitar problemas de CORS
 * entre tienda.mawewe.com.ec y mawewe.com.ec/api
 */

// FORZAR HEADERS CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin');
header('Access-Control-Max-Age: 3600');
header('Content-Type: application/json; charset=UTF-8');

// Manejar OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// URL de la API real
$apiUrl = 'https://mawewe.com.ec/api/products.php';

// Construir query string si hay parámetros GET
if (!empty($_GET)) {
    $apiUrl .= '?' . http_build_query($_GET);
}

// Hacer la petición usando cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

// Para POST/PUT
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
}

// Ejecutar
$result = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

// Si hubo error de cURL
if ($result === false) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error de proxy: ' . $error
    ]);
    exit;
}

// Enviar respuesta
http_response_code($httpCode);
echo $result;
?>
