<?php
/**
 * API de Clientes - Mawewe CRM
 * CRUD completo + saber qué empleado lo registró
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

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
    $database = new Database();
    $db = $database->getConnection();
    if (!$db) throw new Exception('Error de conexión a BD');

    /* ══════════════════════════════════════
       LISTAR CLIENTES
    ══════════════════════════════════════ */
    if ($method === 'GET' && $action === 'list') {
        $sql = "SELECT 
                    c.*,
                    e.nombre  AS created_by_name,
                    e.cargo   AS created_by_role
                FROM customers c
                LEFT JOIN employees e ON c.created_by = e.id
                ORDER BY c.created_at DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute();
        $customers = $stmt->fetchAll();

        foreach ($customers as &$c) {
            $c['id'] = (int)$c['id'];
            $c['created_by'] = $c['created_by'] ? (int)$c['created_by'] : null;
        }

        echo json_encode([
            'success'   => true,
            'customers' => $customers,
            'total'     => count($customers)
        ]);
        exit();
    }

    /* ══════════════════════════════════════
       OBTENER UN CLIENTE
    ══════════════════════════════════════ */
    if ($method === 'GET' && $action === 'get') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) throw new Exception('ID requerido');

        $sql = "SELECT c.*, e.nombre AS created_by_name, e.cargo AS created_by_role
                FROM customers c
                LEFT JOIN employees e ON c.created_by = e.id
                WHERE c.id = :id";
        $stmt = $db->prepare($sql);
        $stmt->execute([':id' => $id]);
        $c = $stmt->fetch();

        if (!$c) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Cliente no encontrado']);
            exit();
        }
        $c['id'] = (int)$c['id'];
        echo json_encode(['success' => true, 'customer' => $c]);
        exit();
    }

    /* ══════════════════════════════════════
       CREAR CLIENTE
    ══════════════════════════════════════ */
    if ($method === 'POST' && $action === 'create') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['first_name']) || empty($input['last_name']) || empty($input['email'])) {
            throw new Exception('Nombre, apellido y email son requeridos');
        }

        /* Verificar email único */
        $chk = $db->prepare("SELECT id FROM customers WHERE email = :email");
        $chk->execute([':email' => strtolower(trim($input['email']))]);
        if ($chk->fetch()) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'Ya existe un cliente con ese email']);
            exit();
        }

        $sql = "INSERT INTO customers
                    (first_name, last_name, email, phone, cedula, address, city, postal_code, notes, created_by)
                VALUES
                    (:fn, :ln, :email, :phone, :cedula, :address, :city, :postal, :notes, :by)";

        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':fn'     => trim($input['first_name']),
            ':ln'     => trim($input['last_name']),
            ':email'  => strtolower(trim($input['email'])),
            ':phone'  => trim($input['phone']   ?? ''),
            ':cedula' => trim($input['cedula']   ?? ''),
            ':address'=> trim($input['address']  ?? ''),
            ':city'   => trim($input['city']     ?? ''),
            ':postal' => trim($input['postal_code'] ?? ''),
            ':notes'  => trim($input['notes']    ?? ''),
            ':by'     => $input['created_by'] ? (int)$input['created_by'] : null
        ]);

        $newId = (int)$db->lastInsertId();

        /* Auditoría */
        logAudit($db, $newId, $input['created_by'] ?? null, 'CREATE',
            "Cliente creado: {$input['first_name']} {$input['last_name']}");

        echo json_encode(['success' => true, 'message' => 'Cliente creado', 'id' => $newId]);
        exit();
    }

    /* ══════════════════════════════════════
       ACTUALIZAR CLIENTE
    ══════════════════════════════════════ */
    if ($method === 'PUT' && $action === 'update') {
        $input = json_decode(file_get_contents('php://input'), true);
        $id    = (int)($input['id'] ?? 0);
        if (!$id) throw new Exception('ID requerido');

        /* Verificar que no choque email con otro cliente */
        if (!empty($input['email'])) {
            $chk = $db->prepare("SELECT id FROM customers WHERE email = :email AND id != :id");
            $chk->execute([':email' => strtolower(trim($input['email'])), ':id' => $id]);
            if ($chk->fetch()) {
                http_response_code(409);
                echo json_encode(['success' => false, 'message' => 'Ese email ya está en uso por otro cliente']);
                exit();
            }
        }

        /* Obtener nombre actual para auditoría */
        $old = $db->prepare("SELECT first_name, last_name FROM customers WHERE id = :id");
        $old->execute([':id' => $id]);
        $oldData = $old->fetch();
        if (!$oldData) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Cliente no encontrado']);
            exit();
        }

        $sql = "UPDATE customers SET
                    first_name   = :fn,
                    last_name    = :ln,
                    email        = :email,
                    phone        = :phone,
                    cedula       = :cedula,
                    address      = :address,
                    city         = :city,
                    postal_code  = :postal,
                    notes        = :notes,
                    updated_at   = NOW()
                WHERE id = :id";

        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':fn'     => trim($input['first_name']  ?? $oldData['first_name']),
            ':ln'     => trim($input['last_name']   ?? $oldData['last_name']),
            ':email'  => strtolower(trim($input['email']   ?? '')),
            ':phone'  => trim($input['phone']        ?? ''),
            ':cedula' => trim($input['cedula']       ?? ''),
            ':address'=> trim($input['address']      ?? ''),
            ':city'   => trim($input['city']         ?? ''),
            ':postal' => trim($input['postal_code']  ?? ''),
            ':notes'  => trim($input['notes']        ?? ''),
            ':id'     => $id
        ]);

        logAudit($db, $id, $input['updated_by'] ?? null, 'UPDATE',
            "Cliente actualizado: {$oldData['first_name']} {$oldData['last_name']}");

        echo json_encode(['success' => true, 'message' => 'Cliente actualizado']);
        exit();
    }

    /* ══════════════════════════════════════
       ELIMINAR CLIENTE
    ══════════════════════════════════════ */
    if ($method === 'DELETE' && $action === 'delete') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) throw new Exception('ID requerido');

        $old = $db->prepare("SELECT first_name, last_name FROM customers WHERE id = :id");
        $old->execute([':id' => $id]);
        $oldData = $old->fetch();
        if (!$oldData) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Cliente no encontrado']);
            exit();
        }

        $db->prepare("DELETE FROM customers WHERE id = :id")->execute([':id' => $id]);

        logAudit($db, $id, null, 'DELETE',
            "Cliente eliminado: {$oldData['first_name']} {$oldData['last_name']}");

        echo json_encode(['success' => true, 'message' => 'Cliente eliminado']);
        exit();
    }

    /* ══════════════════════════════════════
       BUSCAR (para autocompletado en órdenes)
    ══════════════════════════════════════ */
    if ($method === 'GET' && $action === 'search') {
        $q = trim($_GET['q'] ?? '');
        if (strlen($q) < 2) {
            echo json_encode(['success' => true, 'customers' => []]);
            exit();
        }

        $sql = "SELECT id, first_name, last_name, email, phone, address, city, postal_code
                FROM customers
                WHERE first_name LIKE :q OR last_name LIKE :q OR email LIKE :q
                LIMIT 10";
        $stmt = $db->prepare($sql);
        $stmt->execute([':q' => '%'.$q.'%']);
        $results = $stmt->fetchAll();

        foreach ($results as &$r) $r['id'] = (int)$r['id'];

        echo json_encode(['success' => true, 'customers' => $results]);
        exit();
    }

    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Acción no válida']);

} catch (Exception $e) {
    error_log("Error customers.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

/* ══════════════════════════════════════
   HELPER AUDITORÍA SIMPLE
══════════════════════════════════════ */
function logAudit($db, $entityId, $userId, $action, $desc) {
    try {
        $db->prepare("INSERT INTO audit_log (user_id, action, entity_type, entity_id, description, ip_address)
                      VALUES (:uid, :act, 'CUSTOMER', :eid, :desc, :ip)")
           ->execute([
               ':uid'  => $userId ?: null,
               ':act'  => $action,
               ':eid'  => $entityId,
               ':desc' => $desc,
               ':ip'   => $_SERVER['REMOTE_ADDR'] ?? 'Unknown'
           ]);
    } catch (Exception $e) {
        error_log("Audit error: " . $e->getMessage());
    }
}
?>
