<?php
/**
 * Configuración de Base de Datos - MySQL (cPanel)
 * Mawewe E-commerce
 * ✅ CONFIGURADO CON TUS DATOS CORRECTOS
 */

// Headers CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=UTF-8');

// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

class Database {
    // ✅ TUS DATOS EXACTOS DE cPANEL
    private $host = "192.99.84.47";                 // ✅ Tu IP del servidor
    private $db_name = "maweweco_tienda_db";        // ✅ Tu base de datos
    private $username = "maweweco_admin";           // ✅ Tu usuario MySQL
    private $password = "Tr~RcW$bIE(U";             // ✅ Tu contraseña (de la imagen)
    private $port = "3306";                         // ✅ Puerto MySQL
    public $conn;

    public function getConnection() {
        $this->conn = null;

        try {
            $dsn = "mysql:host=" . $this->host . ";port=" . $this->port . ";dbname=" . $this->db_name . ";charset=utf8mb4";
            
            $this->conn = new PDO($dsn, $this->username, $this->password);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            
            return $this->conn;
        } catch(PDOException $e) {
            // Log del error
            error_log("Connection Error: " . $e->getMessage());
            
            // Respuesta JSON en caso de error
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error de conexión a la base de datos',
                'error' => 'No se pudo conectar a MySQL. Verifica la configuración.',
                'details' => $e->getMessage() // Solo para debug, quitar en producción
            ], JSON_UNESCAPED_UNICODE);
            
            return null;
        }
    }

    public function closeConnection() {
        $this->conn = null;
    }
}
?>