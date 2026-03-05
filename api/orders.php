<?php
/**
 * API DE ÓRDENES - MAWEWE CRM
 * ✅ Empleados y admins pueden cambiar estado de órdenes
 * ✅ Historial de estados con notas opcionales (order_status_history)
 * ✅ GET ?action=history&order_id=X → timeline completo
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, cache-control');
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/config/database.php';

/* ── Auth helper: devuelve el empleado desde el token Bearer ── */
function getEmployeeFromToken($db) {
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $token   = null;
    foreach ($headers as $k => $v) {
        if (strtolower($k) === 'authorization' && preg_match('/Bearer\s+(.+)$/i', $v, $m)) {
            $token = $m[1];
            break;
        }
    }
    if (!$token) return null;

    $decoded = base64_decode($token);
    $parts   = explode(':', $decoded);
    $userId  = (int)($parts[0] ?? 0);
    if (!$userId) return null;

    $stmt = $db->prepare("SELECT id, nombre, is_admin FROM employees WHERE id = :id AND active = 1");
    $stmt->execute([':id' => $userId]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

try {
    $database = new Database();
    $db = $database->getConnection();
    if (!$db) throw new Exception('Error de conexión a BD');

    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? '';

    /* ══════════════════════════════════════════════════
       GET ?action=history&order_id=X
       Devuelve el historial de estados de una orden
    ══════════════════════════════════════════════════ */
    if ($method === 'GET' && $action === 'history') {
        $order_id = (int)($_GET['order_id'] ?? 0);
        if (!$order_id) throw new Exception('order_id requerido');

        $sql = "SELECT
                    h.id,
                    h.order_id,
                    h.status_from,
                    h.status_to,
                    h.note,
                    h.changed_at,
                    COALESCE(e.nombre, 'Sistema') AS changed_by_name,
                    e.cargo                        AS changed_by_role
                FROM order_status_history h
                LEFT JOIN employees e ON h.changed_by = e.id
                WHERE h.order_id = :oid
                ORDER BY h.changed_at ASC";

        $stmt = $db->prepare($sql);
        $stmt->execute([':oid' => $order_id]);
        $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($history as &$row) $row['id'] = (int)$row['id'];

        echo json_encode([
            'success' => true,
            'history' => $history,
            'total'   => count($history)
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    /* ══════════════════════════════════════════════════
       GET: LISTAR ÓRDENES
    ══════════════════════════════════════════════════ */
    if ($method === 'GET') {
        $status    = isset($_GET['status'])    && $_GET['status']    !== '' && $_GET['status'] !== 'all' ? trim($_GET['status'])    : null;
        $search    = isset($_GET['search'])    && $_GET['search']    !== '' ? trim($_GET['search'])    : null;
        $date_from = isset($_GET['date_from']) && $_GET['date_from'] !== '' ? trim($_GET['date_from']) : null;
        $date_to   = isset($_GET['date_to'])   && $_GET['date_to']   !== '' ? trim($_GET['date_to'])   : null;

        $sql = "SELECT
                    o.id,
                    o.order_number,
                    o.first_name,
                    o.last_name,
                    CONCAT(o.first_name, ' ', o.last_name) AS customer_name,
                    o.email,
                    o.phone,
                    o.address,
                    o.apartment,
                    o.city,
                    o.postal_code,
                    o.shipping_method,
                    o.shipping_cost,
                    o.subtotal,
                    o.total,
                    o.status,
                    o.payment_method,
                    o.created_at,
                    o.updated_at
                FROM orders o
                WHERE 1=1";

        $params = [];

        if ($status !== null) {
            $sql .= " AND o.status = :status";
            $params[':status'] = $status;
        }
        if ($search !== null) {
            $sql .= " AND (o.order_number LIKE :search OR o.first_name LIKE :search
                          OR o.last_name LIKE :search OR o.email LIKE :search
                          OR o.phone LIKE :search
                          OR CONCAT(o.first_name,' ',o.last_name) LIKE :search)";
            $params[':search'] = '%' . $search . '%';
        }
        if ($date_from !== null) {
            $sql .= " AND DATE(o.created_at) >= :date_from";
            $params[':date_from'] = $date_from;
        }
        if ($date_to !== null) {
            $sql .= " AND DATE(o.created_at) <= :date_to";
            $params[':date_to'] = $date_to;
        }

        $sql .= " ORDER BY o.created_at DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($orders as &$order) {
            $order['id']           = (int)$order['id'];
            $order['shipping_cost'] = (float)$order['shipping_cost'];
            $order['subtotal']     = (float)$order['subtotal'];
            $order['total']        = (float)$order['total'];
            $order['tax']          = 0.0;

            $stmtItems = $db->prepare(
                "SELECT product_id, product_name, product_sku, price, quantity, subtotal
                 FROM order_items WHERE order_id = :oid"
            );
            $stmtItems->execute([':oid' => $order['id']]);
            $items = $stmtItems->fetchAll(PDO::FETCH_ASSOC);

            foreach ($items as &$item) {
                $item['price']    = (float)$item['price'];
                $item['subtotal'] = (float)$item['subtotal'];
                $item['quantity'] = (int)$item['quantity'];
                $item['name']     = $item['product_name'];
                $item['sku']      = $item['product_sku'];
            }

            $order['items']            = $items;
            $order['items_count']      = count($items);
            $order['customer_email']   = $order['email'];
            $order['customer_phone']   = $order['phone'];
            $order['customer_address'] = $order['address'];
            $order['customer_city']    = $order['city'];
            $order['customer_cedula']  = '';
            $order['payment_status']   = 'pending';
            $order['notes']            = '';
            $order['tracking_number']  = '';
        }

        echo json_encode([
            'success' => true,
            'data'    => $orders,
            'total'   => count($orders),
            'message' => count($orders) > 0 ? 'Órdenes obtenidas correctamente' : 'No se encontraron órdenes'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    /* ══════════════════════════════════════════════════
       PUT: ACTUALIZAR ORDEN
       ✅ Cualquier empleado autenticado puede cambiar estado
       ✅ Registra en order_status_history con nota opcional
    ══════════════════════════════════════════════════ */
    if ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (!$input || !isset($input['id'])) throw new Exception('ID de orden requerido');

        $order_id = (int)$input['id'];

        // Obtener estado actual antes de modificar
        $stmtOld = $db->prepare("SELECT id, status FROM orders WHERE id = :id");
        $stmtOld->execute([':id' => $order_id]);
        $oldOrder = $stmtOld->fetch(PDO::FETCH_ASSOC);
        if (!$oldOrder) throw new Exception('Orden no encontrada');

        $old_status = $oldOrder['status'];

        // Identificar empleado que hace el cambio
        $employee   = getEmployeeFromToken($db);
        $changed_by = $employee ? (int)$employee['id'] : null;

        // Actualizar campos permitidos en la orden
        $updates = [];
        $params  = [':id' => $order_id];

        $allowed = ['status', 'payment_method', 'shipping_method',
                    'first_name', 'last_name', 'email', 'phone',
                    'address', 'city', 'postal_code'];

        foreach ($allowed as $field) {
            if (isset($input[$field])) {
                $updates[] = "$field = :$field";
                $params[":$field"] = trim($input[$field]);
            }
        }

        if (empty($updates)) throw new Exception('No hay campos para actualizar');

        $updates[] = "updated_at = NOW()";
        $db->prepare("UPDATE orders SET " . implode(', ', $updates) . " WHERE id = :id")
           ->execute($params);

        // Si cambió el estado → registrar en historial (nota OBLIGATORIA)
        if (isset($input['status']) && $input['status'] !== $old_status) {
            $note = isset($input['note']) ? trim($input['note']) : '';
            if ($note === '') {
                throw new Exception('La nota es obligatoria al cambiar el estado de una orden');
            }

            $db->prepare(
                "INSERT INTO order_status_history
                    (order_id, status_from, status_to, note, changed_by)
                 VALUES (:oid, :sf, :st, :note, :by)"
            )->execute([
                ':oid'  => $order_id,
                ':sf'   => $old_status,
                ':st'   => $input['status'],
                ':note' => $note,
                ':by'   => $changed_by
            ]);
        }

        echo json_encode([
            'success' => true,
            'message' => 'Orden actualizada exitosamente'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}