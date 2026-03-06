<?php
/**
 * API de Contraseñas - Mawewe CRM
 * ✅ Verificar si tiene contraseña, crear nueva, cambiar contraseña
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
    if (!$db) throw new Exception('Error de conexión a BD');

    /* ══════════════════════════════════════
       VERIFICAR SI TIENE CONTRASEÑA
       GET ?action=check&cedula=XXXXXXXXXX
    ══════════════════════════════════════ */
    if ($method === 'GET' && $action === 'check') {
        $cedula = trim($_GET['cedula'] ?? '');
        if (!$cedula) throw new Exception('Cédula requerida');

        $stmt = $db->prepare("SELECT id, nombre, password_hash, active FROM employees WHERE cedula = :cedula");
        $stmt->execute([':cedula' => $cedula]);
        $emp = $stmt->fetch();

        if (!$emp) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Empleado no encontrado o inactivo']);
            exit();
        }

        if (!$emp['active']) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Empleado inactivo']);
            exit();
        }

        // Tiene contraseña real si password_hash no está vacío ni es el hash de Laravel ('password')
        $hasPassword = !empty($emp['password_hash']) 
            && $emp['password_hash'] !== ''
            && !password_verify('password', $emp['password_hash'] ?? '')
            && strlen($emp['password_hash']) >= 60;

        echo json_encode([
            'success'      => true,
            'has_password' => $hasPassword,
            'employee_id'  => (int)$emp['id'],
            'nombre'       => $emp['nombre']
        ]);
        exit();
    }

    /* ══════════════════════════════════════
       CREAR CONTRASEÑA (primera vez)
       POST ?action=create
       { cedula, password, password_confirm }
    ══════════════════════════════════════ */
    if ($method === 'POST' && $action === 'create') {
        $input = json_decode(file_get_contents('php://input'), true);
        $cedula  = trim($input['cedula']           ?? '');
        $pass    = trim($input['password']         ?? '');
        $confirm = trim($input['password_confirm'] ?? '');

        if (!$cedula || !$pass) throw new Exception('Cédula y contraseña son requeridas');
        if (strlen($pass) < 4)  throw new Exception('La contraseña debe tener al menos 4 caracteres');
        if ($pass !== $confirm) throw new Exception('Las contraseñas no coinciden');

        $stmt = $db->prepare("SELECT id, nombre, password_hash, active FROM employees WHERE cedula = :cedula");
        $stmt->execute([':cedula' => $cedula]);
        $emp = $stmt->fetch();

        if (!$emp || !$emp['active']) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Empleado no encontrado']);
            exit();
        }

        // Verificar que realmente no tiene contraseña
        $hasPassword = !empty($emp['password_hash']) 
            && strlen($emp['password_hash']) >= 60
            && !password_verify('password', $emp['password_hash']);

        if ($hasPassword) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'Este empleado ya tiene contraseña configurada']);
            exit();
        }

        $hash = password_hash($pass, PASSWORD_BCRYPT);
        $db->prepare("UPDATE employees SET password_hash = :hash, updated_at = NOW() WHERE id = :id")
           ->execute([':hash' => $hash, ':id' => $emp['id']]);

        // Auditoría
        $db->prepare("INSERT INTO audit_log (user_id, action, entity_type, entity_id, description, ip_address)
                      VALUES (:uid, 'CREATE', 'PASSWORD', :eid, 'Contraseña creada por primera vez', :ip)")
           ->execute([':uid' => $emp['id'], ':eid' => $emp['id'], ':ip' => $_SERVER['REMOTE_ADDR'] ?? 'Unknown']);

        echo json_encode(['success' => true, 'message' => 'Contraseña creada exitosamente']);
        exit();
    }

    /* ══════════════════════════════════════
       LOGIN CON CONTRASEÑA
       POST ?action=login
       { cedula, password }
    ══════════════════════════════════════ */
    if ($method === 'POST' && $action === 'login') {
        $input  = json_decode(file_get_contents('php://input'), true);
        $cedula = trim($input['cedula']   ?? '');
        $pass   = trim($input['password'] ?? '');

        if (!$cedula || !$pass) throw new Exception('Cédula y contraseña son requeridas');

        $stmt = $db->prepare("SELECT * FROM employees WHERE cedula = :cedula AND active = 1");
        $stmt->execute([':cedula' => $cedula]);
        $emp = $stmt->fetch();

        if (!$emp) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Empleado no encontrado o inactivo']);
            exit();
        }

        if (!password_verify($pass, $emp['password_hash'] ?? '')) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Contraseña incorrecta']);
            exit();
        }

        // Generar token
        $token = base64_encode($emp['id'] . ':' . time() . ':' . bin2hex(random_bytes(16)));

        // Auditoría
        $db->prepare("INSERT INTO audit_log (user_id, action, entity_type, description, ip_address)
                      VALUES (:uid, 'LOGIN', 'SESSION', 'Inicio de sesión con contraseña', :ip)")
           ->execute([':uid' => $emp['id'], ':ip' => $_SERVER['REMOTE_ADDR'] ?? 'Unknown']);

        $permissions = [
            'can_manage_employees' => (bool)$emp['is_admin'],
            'can_manage_products'  => true,
            'can_manage_orders'    => true,
            'can_view_audit'       => true,
            'can_manage_attendance'=> true
        ];

        echo json_encode([
            'success'  => true,
            'message'  => 'Login exitoso',
            'employee' => [
                'id'       => (int)$emp['id'],
                'nombre'   => $emp['nombre'],
                'cedula'   => $emp['cedula'],
                'cargo'    => $emp['cargo'],
                'sucursal' => $emp['sucursal'],
                'is_admin' => (bool)$emp['is_admin']
            ],
            'token'      => $token,
            'permissions'=> $permissions
        ]);
        exit();
    }

    /* ══════════════════════════════════════
       CAMBIAR CONTRASEÑA
       POST ?action=change
       { cedula, current_password, new_password, new_password_confirm }
       Header: Authorization: Bearer <token>
    ══════════════════════════════════════ */
    if ($method === 'POST' && $action === 'change') {
        $input   = json_decode(file_get_contents('php://input'), true);
        $cedula  = trim($input['cedula']               ?? '');
        $current = trim($input['current_password']     ?? '');
        $newPass = trim($input['new_password']         ?? '');
        $confirm = trim($input['new_password_confirm'] ?? '');

        if (!$cedula || !$current || !$newPass) throw new Exception('Todos los campos son requeridos');
        if (strlen($newPass) < 4) throw new Exception('La contraseña debe tener al menos 4 caracteres');
        if ($newPass !== $confirm) throw new Exception('Las contraseñas nuevas no coinciden');
        if ($current === $newPass) throw new Exception('La nueva contraseña debe ser diferente a la actual');

        $stmt = $db->prepare("SELECT id, password_hash FROM employees WHERE cedula = :cedula AND active = 1");
        $stmt->execute([':cedula' => $cedula]);
        $emp = $stmt->fetch();

        if (!$emp) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Empleado no encontrado']);
            exit();
        }

        if (!password_verify($current, $emp['password_hash'] ?? '')) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Contraseña actual incorrecta']);
            exit();
        }

        $hash = password_hash($newPass, PASSWORD_BCRYPT);
        $db->prepare("UPDATE employees SET password_hash = :hash, updated_at = NOW() WHERE id = :id")
           ->execute([':hash' => $hash, ':id' => $emp['id']]);

        $db->prepare("INSERT INTO audit_log (user_id, action, entity_type, entity_id, description, ip_address)
                      VALUES (:uid, 'UPDATE', 'PASSWORD', :eid, 'Contraseña cambiada', :ip)")
           ->execute([':uid' => $emp['id'], ':eid' => $emp['id'], ':ip' => $_SERVER['REMOTE_ADDR'] ?? 'Unknown']);

        echo json_encode(['success' => true, 'message' => 'Contraseña actualizada exitosamente']);
        exit();
    }

    /* ══════════════════════════════════════
       RESET CONTRASEÑA (solo admin)
       POST ?action=reset
       { employee_id }  + Bearer token admin
    ══════════════════════════════════════ */
    if ($method === 'POST' && $action === 'reset') {
        // Verificar que el que hace la petición es admin
        $headers = function_exists('getallheaders') ? getallheaders() : [];
        $token   = null;
        foreach ($headers as $k => $v) {
            if (strtolower($k) === 'authorization' && preg_match('/Bearer\s+(.+)$/i', $v, $m)) {
                $token = $m[1]; break;
            }
        }
        if (!$token) throw new Exception('Token requerido');

        $decoded = base64_decode($token);
        $parts   = explode(':', $decoded);
        $adminId = (int)($parts[0] ?? 0);

        $stmtAdmin = $db->prepare("SELECT id, is_admin FROM employees WHERE id = :id AND active = 1");
        $stmtAdmin->execute([':id' => $adminId]);
        $admin = $stmtAdmin->fetch();

        if (!$admin || !$admin['is_admin']) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Solo administradores pueden resetear contraseñas']);
            exit();
        }

        $input      = json_decode(file_get_contents('php://input'), true);
        $employeeId = (int)($input['employee_id'] ?? 0);
        if (!$employeeId) throw new Exception('ID de empleado requerido');

        $db->prepare("UPDATE employees SET password_hash = '', updated_at = NOW() WHERE id = :id")
           ->execute([':id' => $employeeId]);

        $db->prepare("INSERT INTO audit_log (user_id, action, entity_type, entity_id, description, ip_address)
                      VALUES (:uid, 'UPDATE', 'PASSWORD', :eid, 'Contraseña reseteada por administrador', :ip)")
           ->execute([':uid' => $adminId, ':eid' => $employeeId, ':ip' => $_SERVER['REMOTE_ADDR'] ?? 'Unknown']);

        echo json_encode(['success' => true, 'message' => 'Contraseña reseteada. El empleado deberá crear una nueva al ingresar.']);
        exit();
    }

    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Acción no válida']);

} catch (Exception $e) {
    error_log("password.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
