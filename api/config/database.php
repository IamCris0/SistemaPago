<?php
/**
 * Configuración de Base de Datos MySQL
 * Mawewe E-commerce
 * ✅ Usando dominio mawewe.com.ec
 */

// Headers CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=UTF-8');

// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

class Database {
    // ✅ CREDENCIALES ACTUALIZADAS - Usuario: maweweco_cris
    private $host = "localhost";              // ✅ localhost (más rápido y seguro)
    private $db_name = "maweweco_tienda_db";
    private $username = "maweweco_cris";      // ✅ Nuevo usuario que funciona
    private $password = "bdC(ZFro1rYd";       // ✅ Nueva contraseña
    private $port = "3306";
    public $conn;

    public function getConnection() {
        $this->conn = null;

        try {
            // Construir DSN
            $dsn = "mysql:host={$this->host};port={$this->port};dbname={$this->db_name};charset=utf8mb4";
            
            // Crear conexión PDO
            $this->conn = new PDO(
                $dsn, 
                $this->username, 
                $this->password,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
                ]
            );
            
            return $this->conn;
            
        } catch(PDOException $e) {
            // Log detallado del error
            error_log("❌ MySQL Connection Error: " . $e->getMessage());
            
            // Respuesta JSON para debug
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error de conexión a la base de datos',
                'error' => 'No se pudo conectar a MySQL',
                'details' => $e->getMessage(),
                'config' => [
                    'host' => $this->host,
                    'database' => $this->db_name,
                    'port' => $this->port,
                    'user' => $this->username
                ]
            ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
            
            exit();
        }
    }

    public function closeConnection() {
        $this->conn = null;
    }
}
?>
