<?php
/**
 * API DE ÓRDENES - MAWEWE CRM
 * ✅ Corregida para estructura real de BD:
 *    - Campos: first_name, last_name, email, phone, address, city, postal_code, apartment
 *    - Items en tabla separada: order_items
 *    - SIN columnas: customer_name, customer_email, items (JSON), tax, payment_status
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

try {
    $database = new Database();
    $db = $database->getConnection();

    if (!$db) {
        throw new Exception('Error de conexión a BD');
    }

    $method = $_SERVER['REQUEST_METHOD'];

    // ========================================
    // GET: LISTAR ÓRDENES
    // ========================================
    if ($method === 'GET') {

        $status  = isset($_GET['status'])    && $_GET['status']    !== '' && $_GET['status']    !== 'all' ? trim($_GET['status'])    : null;
        $search  = isset($_GET['search'])    && $_GET['search']    !== '' ? trim($_GET['search'])    : null;
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
            $sql .= " AND (
                o.order_number LIKE :search
                OR o.first_name LIKE :search
                OR o.last_name LIKE :search
                OR o.email LIKE :search
                OR o.phone LIKE :search
                OR CONCAT(o.first_name, ' ', o.last_name) LIKE :search
            )";
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

        // Para cada orden, cargar sus items desde order_items
        foreach ($orders as &$order) {
            $order['id']           = (int)$order['id'];
            $order['shipping_cost'] = (float)$order['shipping_cost'];
            $order['subtotal']     = (float)$order['subtotal'];
            $order['total']        = (float)$order['total'];
            $order['tax']          = 0.0; // No existe en BD, compatibilidad frontend

            // Cargar items de order_items
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
                $item['name']     = $item['product_name']; // alias para frontend
                $item['sku']      = $item['product_sku'];
            }

            $order['items']       = $items;
            $order['items_count'] = count($items);

            // Campos de compatibilidad con frontend que usa norm()
            $order['customer_email']   = $order['email'];
            $order['customer_phone']   = $order['phone'];
            $order['customer_address'] = $order['address'];
            $order['customer_city']    = $order['city'];
            $order['customer_cedula']  = '';
            $order['payment_status']   = 'pending'; // No existe en BD
            $order['notes']            = '';
            $order['tracking_number']  = '';
        }

        echo json_encode([
            'success' => true,
            'data'    => $orders,
            'total'   => count($orders),
            'message' => count($orders) > 0 ? 'Órdenes obtenidas correctamente' : 'No se encontraron órdenes'
        ], JSON_UNESCAPED_UNICODE);

    }

    // ========================================
    // PUT: ACTUALIZAR ESTADO DE ORDEN
    // ========================================
    elseif ($method === 'PUT') {

        $input = json_decode(file_get_contents('php://input'), true);

        if (!$input || !isset($input['id'])) {
            throw new Exception('ID de orden requerido');
        }

        $order_id = (int)$input['id'];

        $stmt = $db->prepare("SELECT id FROM orders WHERE id = :id");
        $stmt->execute([':id' => $order_id]);
        if (!$stmt->fetch()) {
            throw new Exception('Orden no encontrada');
        }

        // Solo se puede actualizar status (y campos que SÍ existen en BD)
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

        if (empty($updates)) {
            throw new Exception('No hay campos para actualizar');
        }

        $updates[] = "updated_at = NOW()";

        $sql = "UPDATE orders SET " . implode(', ', $updates) . " WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        echo json_encode([
            'success' => true,
            'message' => 'Orden actualizada exitosamente'
        ], JSON_UNESCAPED_UNICODE);

    }

    else {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
