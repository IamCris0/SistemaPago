<?php
define('DB_HOST', '192.99.84.47'); // o la IP de tu servidor PostgreSQL
define('DB_PORT', '5432');
define('DB_NAME', 'maweweco_tienda_db'); // Cambia esto
define('DB_USER', 'maweweco_admin'); // Usuario de PostgreSQL
define('DB_PASS', 'Manuel-241castillo2024'); // Cambia esto

// Conexión PDO a PostgreSQL
function getDBConnection() {
    try {
        $dsn = "pgsql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME;
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]);
        return $pdo;
    } catch (PDOException $e) {
        error_log("Error de conexión: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'error' => 'Error de conexión a la base de datos',
            'message' => $e->getMessage()
        ]);
        exit;
    }
}
?>