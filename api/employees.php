<?php
/**
 * API de Empleados - Mawewe CRM v3.0
 * CRUD completo con auditoría automática
 * SOLO ADMINISTRADORES pueden gestionar empleados
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
require_once __DIR__ . '/helpers/audit.php';
require_once __DIR__ . '/helpers/auth.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception('Error de conexión a BD');
    }
    
    // Verificar autenticación para acciones protegidas
    $protectedActions = ['create', 'update', 'delete', 'toggle-status'];
    
    if (in_array($action, $protectedActions)) {
        $currentUser = verifyAuth($db);
        
        // SOLO ADMINISTRADORES pueden gestionar empleados
        if (!$currentUser['is_admin']) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Acceso denegado. Solo administradores pueden gestionar empleados.'
            ]);
            exit();
        }
    }
    
    // ========================================
    // OBTENER TODOS LOS EMPLEADOS
    // ========================================
    if ($method === 'GET' && $action === 'list') {
        $sql = "SELECT 
                    id, nombre, cedula, cargo, sucursal, 
                    is_admin, active, created_at, updated_at
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
    // OBTENER UN EMPLEADO
    // ========================================
    if ($method === 'GET' && $action === 'get') {
        $id = (int)($_GET['id'] ?? 0);
        
        if (!$id) {
            throw new Exception('ID de empleado requerido');
        }
        
        $sql = "SELECT * FROM employees WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->execute([':id' => $id]);
        $employee = $stmt->fetch();
        
        if (!$employee) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Empleado no encontrado'
            ]);
            exit();
        }
        
        $employee['id'] = (int)$employee['id'];
        $employee['is_admin'] = (bool)$employee['is_admin'];
        $employee['active'] = (bool)$employee['active'];
        
        echo json_encode([
            'success' => true,
            'employee' => $employee
        ]);
        exit();
    }
    
    // ========================================
    // CREAR EMPLEADO
    // ========================================
    if ($method === 'POST' && $action === 'create') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        // Validaciones
        if (empty($input['nombre']) || empty($input['cedula'])) {
            throw new Exception('Nombre y cédula son requeridos');
        }
        
        // Verificar que la cédula no exista
        $sqlCheck = "SELECT id FROM employees WHERE cedula = :cedula";
        $stmtCheck = $db->prepare($sqlCheck);
        $stmtCheck->execute([':cedula' => trim($input['cedula'])]);
        
        if ($stmtCheck->fetch()) {
            http_response_code(409);
            echo json_encode([
                'success' => false,
                'message' => 'Ya existe un empleado con esta cédula'
            ]);
            exit();
        }
        
        // Crear empleado
        $sql = "INSERT INTO employees (nombre, cedula, cargo, sucursal, is_admin, active) 
                VALUES (:nombre, :cedula, :cargo, :sucursal, :is_admin, 1)";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':nombre' => trim($input['nombre']),
            ':cedula' => trim($input['cedula']),
            ':cargo' => trim($input['cargo'] ?? 'Empleado'),
            ':sucursal' => trim($input['sucursal'] ?? 'JOYERÍA MATRIZ'),
            ':is_admin' => (int)($input['is_admin'] ?? 0)
        ]);
        
        $newId = (int)$db->lastInsertId();
        
        // Registrar en auditoría
        logAudit($db, [
            'user_id' => $currentUser['id'],
            'action' => 'CREATE',
            'entity_type' => 'EMPLOYEE',
            'entity_id' => $newId,
            'new_value' => [
                'nombre' => $input['nombre'],
                'cedula' => $input['cedula'],
                'cargo' => $input['cargo'] ?? 'Empleado',
                'sucursal' => $input['sucursal'] ?? 'JOYERÍA MATRIZ',
                'is_admin' => (bool)($input['is_admin'] ?? 0)
            ],
            'description' => "Empleado creado: {$input['nombre']}"
        ]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Empleado creado exitosamente',
            'id' => $newId
        ]);
        exit();
    }
    
    // ========================================
    // ACTUALIZAR EMPLEADO
    // ========================================
    if ($method === 'PUT' && $action === 'update') {
        $input = json_decode(file_get_contents('php://input'), true);
        $id = (int)($input['id'] ?? 0);
        
        if (!$id) {
            throw new Exception('ID de empleado requerido');
        }
        
        // Obtener datos actuales
        $sqlOld = "SELECT * FROM employees WHERE id = :id";
        $stmtOld = $db->prepare($sqlOld);
        $stmtOld->execute([':id' => $id]);
        $oldData = $stmtOld->fetch();
        
        if (!$oldData) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Empleado no encontrado'
            ]);
            exit();
        }
        
        // Verificar que la cédula no exista en otro empleado
        $sqlCheck = "SELECT id FROM employees WHERE cedula = :cedula AND id != :id";
        $stmtCheck = $db->prepare($sqlCheck);
        $stmtCheck->execute([
            ':cedula' => trim($input['cedula']),
            ':id' => $id
        ]);
        
        if ($stmtCheck->fetch()) {
            http_response_code(409);
            echo json_encode([
                'success' => false,
                'message' => 'Ya existe otro empleado con esta cédula'
            ]);
            exit();
        }
        
        // Actualizar empleado
        $sql = "UPDATE employees 
                SET nombre = :nombre, 
                    cedula = :cedula, 
                    cargo = :cargo, 
                    sucursal = :sucursal,
                    is_admin = :is_admin,
                    updated_at = NOW()
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
        
        // Registrar en auditoría
        $newData = [
            'nombre' => $input['nombre'],
            'cedula' => $input['cedula'],
            'cargo' => $input['cargo'],
            'sucursal' => $input['sucursal'],
            'is_admin' => (bool)($input['is_admin'] ?? 0)
        ];
        
        logAudit($db, [
            'user_id' => $currentUser['id'],
            'action' => 'UPDATE',
            'entity_type' => 'EMPLOYEE',
            'entity_id' => $id,
            'old_value' => [
                'nombre' => $oldData['nombre'],
                'cedula' => $oldData['cedula'],
                'cargo' => $oldData['cargo'],
                'sucursal' => $oldData['sucursal'],
                'is_admin' => (bool)$oldData['is_admin']
            ],
            'new_value' => $newData,
            'description' => "Empleado actualizado: {$input['nombre']}"
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
        $id = (int)($input['id'] ?? 0);
        
        if (!$id) {
            throw new Exception('ID de empleado requerido');
        }
        
        // Obtener estado actual
        $sqlOld = "SELECT nombre, active FROM employees WHERE id = :id";
        $stmtOld = $db->prepare($sqlOld);
        $stmtOld->execute([':id' => $id]);
        $oldData = $stmtOld->fetch();
        
        if (!$oldData) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Empleado no encontrado'
            ]);
            exit();
        }
        
        $newStatus = !$oldData['active'];
        
        // Actualizar estado
        $sql = "UPDATE employees SET active = :active, updated_at = NOW() WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':active' => (int)$newStatus,
            ':id' => $id
        ]);
        
        // Registrar en auditoría
        logAudit($db, [
            'user_id' => $currentUser['id'],
            'action' => 'UPDATE',
            'entity_type' => 'EMPLOYEE',
            'entity_id' => $id,
            'old_value' => ['active' => (bool)$oldData['active']],
            'new_value' => ['active' => $newStatus],
            'description' => ($newStatus ? 'Activado' : 'Desactivado') . " empleado: {$oldData['nombre']}"
        ]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Estado actualizado exitosamente',
            'active' => $newStatus
        ]);
        exit();
    }
    
    // ========================================
    // ELIMINAR EMPLEADO (SOFT DELETE)
    // ========================================
    if ($method === 'DELETE' && $action === 'delete') {
        $id = (int)($_GET['id'] ?? 0);
        
        if (!$id) {
            throw new Exception('ID de empleado requerido');
        }
        
        // Obtener datos
        $sqlOld = "SELECT nombre FROM employees WHERE id = :id";
        $stmtOld = $db->prepare($sqlOld);
        $stmtOld->execute([':id' => $id]);
        $oldData = $stmtOld->fetch();
        
        if (!$oldData) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Empleado no encontrado'
            ]);
            exit();
        }
        
        // Soft delete (solo desactivar)
        $sql = "UPDATE employees SET active = 0, updated_at = NOW() WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->execute([':id' => $id]);
        
        // Registrar en auditoría
        logAudit($db, [
            'user_id' => $currentUser['id'],
            'action' => 'DELETE',
            'entity_type' => 'EMPLOYEE',
            'entity_id' => $id,
            'description' => "Empleado eliminado: {$oldData['nombre']}"
        ]);
        
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
