<?php
/**
 * API de Empleados - Mawewe CRM
 * Gestión de empleados, autenticación y asistencia
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/config/database.php';

// Obtener método y acción
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
        
        // Generar token simple (en producción usar JWT)
        $token = base64_encode($employee['id'] . ':' . time());
        
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
            'token' => $token
        ]);
        exit();
    }
    
    // ========================================
    // OBTENER TODOS LOS EMPLEADOS
    // ========================================
    if ($method === 'GET' && $action === 'list') {
        $sql = "SELECT 
                    id, nombre, cedula, cargo, sucursal, 
                    is_admin, active, created_at
                FROM employees 
                ORDER BY is_admin DESC, nombre ASC";
        
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $employees = $stmt->fetchAll();
        
        foreach ($employees as &$emp) {
            $emp['id'] = (int)$emp['id'];
            $emp['is_admin'] = (bool)$emp['is_admin'];
            $emp['active'] = (bool)$emp['active'];
        }
        
        echo json_encode([
            'success' => true,
            'employees' => $employees,
            'total' => count($employees)
        ]);
        exit();
    }
    
    // ========================================
    // CREAR EMPLEADO
    // ========================================
    if ($method === 'POST' && $action === 'create') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $sql = "INSERT INTO employees (nombre, cedula, cargo, sucursal, is_admin, active) 
                VALUES (:nombre, :cedula, :cargo, :sucursal, :is_admin, 1)";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':nombre' => trim($input['nombre']),
            ':cedula' => trim($input['cedula']),
            ':cargo' => trim($input['cargo']),
            ':sucursal' => trim($input['sucursal'] ?? 'JOYERÍA MATRIZ'),
            ':is_admin' => (int)($input['is_admin'] ?? 0)
        ]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Empleado creado exitosamente',
            'id' => (int)$db->lastInsertId()
        ]);
        exit();
    }
    
    // ========================================
    // ACTUALIZAR EMPLEADO
    // ========================================
    if ($method === 'PUT' && $action === 'update') {
        $input = json_decode(file_get_contents('php://input'), true);
        $id = $input['id'] ?? 0;
        
        $sql = "UPDATE employees 
                SET nombre = :nombre, 
                    cedula = :cedula, 
                    cargo = :cargo, 
                    sucursal = :sucursal,
                    is_admin = :is_admin
                WHERE id = :id";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':nombre' => trim($input['nombre']),
            ':cedula' => trim($input['cedula']),
            ':cargo' => trim($input['cargo']),
            ':sucursal' => trim($input['sucursal']),
            ':is_admin' => (int)($input['is_admin'] ?? 0),
            ':id' => $id
        ]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Empleado actualizado exitosamente'
        ]);
        exit();
    }
    
    // ========================================
    // ACTIVAR/DESACTIVAR EMPLEADO
    // ========================================
    if ($method === 'PUT' && $action === 'toggle-status') {
        $input = json_decode(file_get_contents('php://input'), true);
        $id = $input['id'] ?? 0;
        
        $sql = "UPDATE employees SET active = NOT active WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->execute([':id' => $id]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Estado actualizado exitosamente'
        ]);
        exit();
    }
    
    // ========================================
    // ELIMINAR EMPLEADO
    // ========================================
    if ($method === 'DELETE' && $action === 'delete') {
        $id = $_GET['id'] ?? 0;
        
        // No eliminar, solo desactivar
        $sql = "UPDATE employees SET active = 0 WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->execute([':id' => $id]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Empleado eliminado exitosamente'
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
    error_log("Error employees.php: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error en el servidor',
        'error' => $e->getMessage()
    ]);
}
?>
