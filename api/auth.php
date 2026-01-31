<?php
/**
 * API de Autenticación - Mawewe CRM v3.0
 * Sistema de login con roles y permisos
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/config/database.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception('Error de conexión a BD');
    }
    
    // ========================================
    // LOGIN
    // ========================================
    if ($method === 'POST' && $action === 'login') {
        $input = json_decode(file_get_contents('php://input'), true);
        $cedula = $input['cedula'] ?? '';
        
        if (empty($cedula)) {
            throw new Exception('Cédula requerida');
        }
        
        // Buscar empleado
        $sql = "SELECT * FROM employees WHERE cedula = :cedula AND active = 1";
        $stmt = $db->prepare($sql);
        $stmt->execute([':cedula' => $cedula]);
        $employee = $stmt->fetch();
        
        if (!$employee) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'message' => 'Empleado no encontrado o inactivo'
            ]);
            exit();
        }
        
        // Generar token (en producción usar JWT real)
        $token = base64_encode($employee['id'] . ':' . time() . ':' . bin2hex(random_bytes(16)));
        
        // Registrar login en auditoría
        $sqlAudit = "INSERT INTO audit_log (user_id, action, entity_type, description, ip_address) 
                     VALUES (:user_id, 'LOGIN', 'SESSION', :description, :ip)";
        $stmtAudit = $db->prepare($sqlAudit);
        $stmtAudit->execute([
            ':user_id' => $employee['id'],
            ':description' => 'Inicio de sesión exitoso',
            ':ip' => $_SERVER['REMOTE_ADDR'] ?? 'Unknown'
        ]);
        
        // Determinar permisos según rol
        $permissions = [
            'can_manage_employees' => (bool)$employee['is_admin'],
            'can_manage_products' => true, // Todos pueden gestionar productos
            'can_manage_orders' => true,   // Todos pueden gestionar órdenes
            'can_view_audit' => true,      // Todos pueden ver auditoría
            'can_manage_attendance' => true // Todos pueden marcar asistencia
        ];
        
        echo json_encode([
            'success' => true,
            'message' => 'Login exitoso',
            'employee' => [
                'id' => (int)$employee['id'],
                'nombre' => $employee['nombre'],
                'cedula' => $employee['cedula'],
                'cargo' => $employee['cargo'],
                'sucursal' => $employee['sucursal'],
                'is_admin' => (bool)$employee['is_admin']
            ],
            'token' => $token,
            'permissions' => $permissions
        ]);
        exit();
    }
    
    // ========================================
    // VERIFICAR TOKEN
    // ========================================
    if ($method === 'POST' && $action === 'verify') {
        $input = json_decode(file_get_contents('php://input'), true);
        $token = $input['token'] ?? '';
        
        if (empty($token)) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'message' => 'Token requerido'
            ]);
            exit();
        }
        
        // En producción, verificar JWT aquí
        // Por ahora, decodificar token básico
        $decoded = base64_decode($token);
        $parts = explode(':', $decoded);
        
        if (count($parts) < 2) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'message' => 'Token inválido'
            ]);
            exit();
        }
        
        $employeeId = (int)$parts[0];
        
        // Verificar que el empleado existe y está activo
        $sql = "SELECT * FROM employees WHERE id = :id AND active = 1";
        $stmt = $db->prepare($sql);
        $stmt->execute([':id' => $employeeId]);
        $employee = $stmt->fetch();
        
        if (!$employee) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'message' => 'Sesión inválida'
            ]);
            exit();
        }
        
        echo json_encode([
            'success' => true,
            'valid' => true
        ]);
        exit();
    }
    
    // ========================================
    // CAMBIAR CONTRASEÑA (FUTURO)
    // ========================================
    if ($method === 'POST' && $action === 'change-password') {
        // Implementar en el futuro
        http_response_code(501);
        echo json_encode([
            'success' => false,
            'message' => 'Función no implementada aún'
        ]);
        exit();
    }
    
    // Acción no válida
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Acción no válida'
    ]);
    
} catch (Exception $e) {
    error_log("Error auth.php: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error en el servidor',
        'error' => $e->getMessage()
    ]);
}
?>
