<?php
/**
 * API de Empleados - Mawewe CRM
 * ✅ Corregida para estructura real de BD:
 *    - Campos requeridos: employee_code (UNIQUE), email (UNIQUE), first_name, last_name
 *    - Campo nombre: columna separada (puede ser NULL)
 *    - Al crear: genera employee_code automático, email vacío permitido con truco UNIQUE
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
                    id, 
                    COALESCE(nombre, CONCAT(first_name, ' ', last_name)) AS nombre,
                    cedula, 
                    cargo, 
                    sucursal,
                    is_admin, 
                    active, 
                    created_at, 
                    updated_at
                FROM employees 
                ORDER BY is_admin DESC, nombre ASC";

        $stmt = $db->prepare($sql);
        $stmt->execute();
        $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($employees as &$emp) {
            $emp['id']       = (int)$emp['id'];
            $emp['is_admin'] = (bool)$emp['is_admin'];
            $emp['active']   = (bool)$emp['active'];
        }

        echo json_encode([
            'success'   => true,
            'employees' => $employees,
            'total'     => count($employees)
        ]);
        exit();
    }

    // ========================================
    // OBTENER UN EMPLEADO
    // ========================================
    if ($method === 'GET' && $action === 'get') {
        $id = (int)($_GET['id'] ?? 0);

        if (!$id) throw new Exception('ID de empleado requerido');

        $sql = "SELECT 
                    id,
                    COALESCE(nombre, CONCAT(first_name, ' ', last_name)) AS nombre,
                    cedula, cargo, sucursal, is_admin, active, created_at, updated_at
                FROM employees WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->execute([':id' => $id]);
        $employee = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$employee) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Empleado no encontrado']);
            exit();
        }

        $employee['id']       = (int)$employee['id'];
        $employee['is_admin'] = (bool)$employee['is_admin'];
        $employee['active']   = (bool)$employee['active'];

        echo json_encode(['success' => true, 'employee' => $employee]);
        exit();
    }

    // ========================================
    // CREAR EMPLEADO
    // ========================================
    if ($method === 'POST' && $action === 'create') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['nombre']) || empty($input['cedula'])) {
            throw new Exception('Nombre y cédula son requeridos');
        }

        $nombre = trim($input['nombre']);
        $cedula = trim($input['cedula']);

        // Verificar cédula duplicada
        $stmtCheck = $db->prepare("SELECT id FROM employees WHERE cedula = :cedula");
        $stmtCheck->execute([':cedula' => $cedula]);
        if ($stmtCheck->fetch()) {
            // Retornar 200 con success:false para que el frontend lo maneje correctamente
            echo json_encode([
                'success' => false,
                'message' => "La cédula {$cedula} ya está registrada en el sistema"
            ]);
            exit();
        }

        // Separar nombre completo en first_name y last_name
        $partes     = explode(' ', $nombre, 2);
        $first_name = $partes[0];
        $last_name  = isset($partes[1]) ? $partes[1] : $first_name;

        // Generar employee_code único (campo UNIQUE NOT NULL en BD)
        $employee_code = 'EMP-' . strtoupper(substr(md5($cedula . time()), 0, 8));

        // Verificar que el code no exista (muy improbable pero por seguridad)
        $stmtCode = $db->prepare("SELECT id FROM employees WHERE employee_code = :ec");
        $stmtCode->execute([':ec' => $employee_code]);
        if ($stmtCode->fetch()) {
            $employee_code = 'EMP-' . strtoupper(uniqid());
        }

        // Email: campo UNIQUE NOT NULL → usar placeholder único basado en cédula
        $email_placeholder = 'emp_' . $cedula . '@mawewe.internal';

        // Verificar que ese email no exista
        $stmtEmail = $db->prepare("SELECT id FROM employees WHERE email = :email");
        $stmtEmail->execute([':email' => $email_placeholder]);
        if ($stmtEmail->fetch()) {
            $email_placeholder = 'emp_' . $cedula . '_' . time() . '@mawewe.internal';
        }

        $cargo    = trim($input['cargo']    ?? 'Vendedor');
        $sucursal = trim($input['sucursal'] ?? 'JOYERIA MATRIZ');
        $is_admin = (int)($input['is_admin'] ?? 0);

        $sql = "INSERT INTO employees 
                    (employee_code, cedula, first_name, last_name, nombre, email, 
                     position, cargo, sucursal, password_hash, is_admin, hire_date, active)
                VALUES 
                    (:employee_code, :cedula, :first_name, :last_name, :nombre, :email,
                     :position, :cargo, :sucursal, '', :is_admin, CURDATE(), 1)";

        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':employee_code' => $employee_code,
            ':cedula'        => $cedula,
            ':first_name'    => $first_name,
            ':last_name'     => $last_name,
            ':nombre'        => $nombre,
            ':email'         => $email_placeholder,
            ':position'      => $cargo,
            ':cargo'         => $cargo,
            ':sucursal'      => $sucursal,
            ':is_admin'      => $is_admin,
        ]);

        $newId = (int)$db->lastInsertId();

        // Auditoría
        logAudit($db, [
            'user_id'     => $currentUser['id'],
            'action'      => 'CREATE',
            'entity_type' => 'EMPLOYEE',
            'entity_id'   => $newId,
            'new_value'   => ['nombre' => $nombre, 'cedula' => $cedula, 'cargo' => $cargo],
            'description' => "Empleado creado: {$nombre}"
        ]);

        echo json_encode([
            'success' => true,
            'message' => 'Empleado creado exitosamente',
            'id'      => $newId
        ]);
        exit();
    }

    // ========================================
    // ACTUALIZAR EMPLEADO
    // ========================================
    if ($method === 'PUT' && $action === 'update') {
        $input = json_decode(file_get_contents('php://input'), true);
        $id    = (int)($input['id'] ?? 0);

        if (!$id) throw new Exception('ID de empleado requerido');

        // Obtener datos actuales
        $stmtOld = $db->prepare("SELECT * FROM employees WHERE id = :id");
        $stmtOld->execute([':id' => $id]);
        $oldData = $stmtOld->fetch(PDO::FETCH_ASSOC);

        if (!$oldData) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Empleado no encontrado']);
            exit();
        }

        $cedula = trim($input['cedula'] ?? $oldData['cedula']);

        // Verificar cédula duplicada en otro empleado
        $stmtCheck = $db->prepare("SELECT id FROM employees WHERE cedula = :cedula AND id != :id");
        $stmtCheck->execute([':cedula' => $cedula, ':id' => $id]);
        if ($stmtCheck->fetch()) {
            echo json_encode([
                'success' => false,
                'message' => "La cédula {$cedula} ya está registrada en otro empleado"
            ]);
            exit();
        }

        $nombre   = trim($input['nombre']   ?? $oldData['nombre']   ?? '');
        $partes   = explode(' ', $nombre, 2);
        $first_name = $partes[0];
        $last_name  = isset($partes[1]) ? $partes[1] : $first_name;

        $cargo    = trim($input['cargo']    ?? $oldData['cargo']);
        $sucursal = trim($input['sucursal'] ?? $oldData['sucursal']);
        $is_admin = (int)($input['is_admin'] ?? $oldData['is_admin']);

        $sql = "UPDATE employees 
                SET nombre     = :nombre,
                    first_name = :first_name,
                    last_name  = :last_name,
                    cedula     = :cedula,
                    cargo      = :cargo,
                    position   = :cargo,
                    sucursal   = :sucursal,
                    is_admin   = :is_admin,
                    updated_at = NOW()
                WHERE id = :id";

        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':nombre'     => $nombre,
            ':first_name' => $first_name,
            ':last_name'  => $last_name,
            ':cedula'     => $cedula,
            ':cargo'      => $cargo,
            ':sucursal'   => $sucursal,
            ':is_admin'   => $is_admin,
            ':id'         => $id
        ]);

        logAudit($db, [
            'user_id'     => $currentUser['id'],
            'action'      => 'UPDATE',
            'entity_type' => 'EMPLOYEE',
            'entity_id'   => $id,
            'old_value'   => ['nombre' => $oldData['nombre'], 'cargo' => $oldData['cargo']],
            'new_value'   => ['nombre' => $nombre, 'cargo' => $cargo],
            'description' => "Empleado actualizado: {$nombre}"
        ]);

        echo json_encode(['success' => true, 'message' => 'Empleado actualizado exitosamente']);
        exit();
    }

    // ========================================
    // ACTIVAR / DESACTIVAR
    // ========================================
    if ($method === 'PUT' && $action === 'toggle-status') {
        $input = json_decode(file_get_contents('php://input'), true);
        $id    = (int)($input['id'] ?? 0);

        if (!$id) throw new Exception('ID requerido');

        $stmtOld = $db->prepare("SELECT nombre, active FROM employees WHERE id = :id");
        $stmtOld->execute([':id' => $id]);
        $oldData = $stmtOld->fetch(PDO::FETCH_ASSOC);

        if (!$oldData) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Empleado no encontrado']);
            exit();
        }

        $newStatus = $oldData['active'] ? 0 : 1;

        $stmt = $db->prepare("UPDATE employees SET active = :active, updated_at = NOW() WHERE id = :id");
        $stmt->execute([':active' => $newStatus, ':id' => $id]);

        logAudit($db, [
            'user_id'     => $currentUser['id'],
            'action'      => 'UPDATE',
            'entity_type' => 'EMPLOYEE',
            'entity_id'   => $id,
            'old_value'   => ['active' => (bool)$oldData['active']],
            'new_value'   => ['active' => (bool)$newStatus],
            'description' => ($newStatus ? 'Activado' : 'Desactivado') . " empleado: {$oldData['nombre']}"
        ]);

        echo json_encode([
            'success' => true,
            'message' => 'Estado actualizado exitosamente',
            'active'  => (bool)$newStatus
        ]);
        exit();
    }

    // ========================================
    // ELIMINAR (SOFT DELETE)
    // ========================================
    if ($method === 'DELETE' && $action === 'delete') {
        $id = (int)($_GET['id'] ?? 0);

        if (!$id) throw new Exception('ID requerido');

        $stmtOld = $db->prepare("SELECT nombre FROM employees WHERE id = :id");
        $stmtOld->execute([':id' => $id]);
        $oldData = $stmtOld->fetch(PDO::FETCH_ASSOC);

        if (!$oldData) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Empleado no encontrado']);
            exit();
        }

        $stmt = $db->prepare("UPDATE employees SET active = 0, updated_at = NOW() WHERE id = :id");
        $stmt->execute([':id' => $id]);

        logAudit($db, [
            'user_id'     => $currentUser['id'],
            'action'      => 'DELETE',
            'entity_type' => 'EMPLOYEE',
            'entity_id'   => $id,
            'description' => "Empleado eliminado: {$oldData['nombre']}"
        ]);

        echo json_encode(['success' => true, 'message' => 'Empleado eliminado exitosamente']);
        exit();
    }

    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Acción no válida']);

} catch (Exception $e) {
    error_log("Error employees.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error en el servidor',
        'error'   => $e->getMessage()
    ]);
}
?>
