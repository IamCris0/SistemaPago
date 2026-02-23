<?php
/**
 * API DE ÓRDENES - MAWEWE CRM
 * ✅ Corregido para estructura real de BD:
 *    first_name, last_name, email, phone, address, city
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

    if (!$db) throw new Exception('Error de conexion a BD');

    $method = $_SERVER['REQUEST_METHOD'];

    /* ══════════════════════════════════════════════════════
       GET — LISTAR ORDENES
    ══════════════════════════════════════════════════════ */
    if ($method === 'GET') {

        $status    = (isset($_GET['status'])    && $_GET['status']    !== '' && $_GET['status'] !== 'all') ? trim($_GET['status'])    : null;
        $search    = (isset($_GET['search'])    && $_GET['search']    !== '') ? trim($_GET['search'])    : null;
        $date_from = (isset($_GET['date_from']) && $_GET['date_from'] !== '') ? trim($_GET['date_from']) : null;
        $date_to   = (isset($_GET['date_to'])   && $_GET['date_to']   !== '') ? trim($_GET['date_to'])   : null;

        $sql = "SELECT 
                    o.id,
                    o.order_number,
                    o.first_name,
                    o.last_name,
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
                    o.notes,
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
                OR o.last_name  LIKE :search
                OR o.email      LIKE :search
                OR o.phone      LIKE :search
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

        // Adjuntar items reales desde order_items
        $stmtItems = $db->prepare("SELECT * FROM order_items WHERE order_id = :oid ORDER BY id");

        foreach ($orders as &$o) {
            $o['id']            = (int)$o['id'];
            $o['shipping_cost'] = (float)$o['shipping_cost'];
            $o['subtotal']      = (float)$o['subtotal'];
            $o['total']         = (float)$o['total'];

            $stmtItems->execute([':oid' => $o['id']]);
            $items = $stmtItems->fetchAll(PDO::FETCH_ASSOC);
            foreach ($items as &$item) {
                $item['id']       = (int)$item['id'];
                $item['price']    = (float)$item['price'];
                $item['quantity'] = (int)$item['quantity'];
                $item['subtotal'] = (float)$item['subtotal'];
            }
            $o['items']       = $items;
            $o['items_count'] = count($items);
        }

        echo json_encode([
            'success' => true,
            'data'    => $orders,
            'total'   => count($orders)
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    /* ══════════════════════════════════════════════════════
       PUT — ACTUALIZAR ORDEN
    ══════════════════════════════════════════════════════ */
    if ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (!$input || !isset($input['id'])) throw new Exception('ID de orden requerido');

        $order_id = (int)$input['id'];

        $stmt = $db->prepare("SELECT id FROM orders WHERE id = :id");
        $stmt->execute([':id' => $order_id]);
        if (!$stmt->fetch()) throw new Exception('Orden no encontrada');

        $updates = [];
        $params  = [':id' => $order_id];

        $fields = ['status','payment_method','notes','first_name','last_name','email','phone','address','city'];
        foreach ($fields as $f) {
            if (isset($input[$f])) {
                $updates[] = "$f = :$f";
                $params[":$f"] = trim($input[$f]);
            }
        }

        if (!$updates) throw new Exception('Nada que actualizar');
        $updates[] = "updated_at = NOW()";

        $db->prepare("UPDATE orders SET " . implode(', ', $updates) . " WHERE id = :id")->execute($params);

        echo json_encode(['success' => true, 'message' => 'Orden actualizada'], JSON_UNESCAPED_UNICODE);
        exit();
    }

    /* ══════════════════════════════════════════════════════
       POST — CREAR ORDEN
    ══════════════════════════════════════════════════════ */
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) throw new Exception('Datos invalidos');

        $firstName  = trim($input['firstName'] ?? $input['first_name'] ?? '');
        $lastName   = trim($input['lastName']  ?? $input['last_name']  ?? '');
        $email      = strtolower(trim($input['email'] ?? ''));
        $phone      = trim($input['phone'] ?? '');
        $address    = trim($input['address'] ?? '');
        $city       = trim($input['city'] ?? '');
        $apartment  = trim($input['apartment'] ?? '');
        $postalCode = trim($input['postalCode'] ?? $input['postal_code'] ?? '');
        $payMethod  = trim($input['paymentMethod'] ?? $input['payment_method'] ?? 'transfer');
        $notes      = trim($input['notes'] ?? '');

        $totals    = $input['totals'] ?? [];
        $subtotal  = (float)($totals['subtotal'] ?? $input['subtotal'] ?? 0);
        $shipping  = (float)($totals['shipping']  ?? $input['shipping_cost'] ?? 0);
        $total     = (float)($totals['total']     ?? $input['total'] ?? 0);
        $items     = $input['items'] ?? [];

        if (!$firstName || !$email || $total <= 0 || empty($items)) {
            throw new Exception('Faltan datos: nombre, email, total o items');
        }

        // Generar numero de orden
        $prefix = 'MW' . date('Ymd') . '-';
        $last = $db->query("SELECT order_number FROM orders WHERE order_number LIKE '{$prefix}%' ORDER BY id DESC LIMIT 1")->fetchColumn();
        $num  = $last ? intval(substr($last, -4)) + 1 : 1;
        $orderNumber = $prefix . str_pad($num, 4, '0', STR_PAD_LEFT);

        $db->beginTransaction();

        // Verificar stock
        $stmtProd = $db->prepare("SELECT id, name, stock FROM products WHERE id = :id AND active = 1");
        foreach ($items as $item) {
            $pid = (int)($item['productId'] ?? $item['product_id'] ?? 0);
            $stmtProd->execute([':id' => $pid]);
            $prod = $stmtProd->fetch();
            if (!$prod) throw new Exception('Producto no encontrado: ' . ($item['name'] ?? $pid));
            if ($prod['stock'] < (int)($item['quantity'] ?? 1)) {
                throw new Exception('Stock insuficiente: ' . $prod['name']);
            }
        }

        $status = in_array($payMethod, ['card','paypal']) ? 'completed' : 'pending_payment';

        $sql = "INSERT INTO orders 
                    (order_number, first_name, last_name, email, phone, address, apartment,
                     city, postal_code, shipping_method, payment_method, subtotal, shipping_cost,
                     total, status, notes)
                VALUES 
                    (:on, :fn, :ln, :em, :ph, :ad, :ap, :ci, :pc, 'standard', :pm, :sub, :ship, :tot, :st, :no)";

        $db->prepare($sql)->execute([
            ':on'   => $orderNumber,
            ':fn'   => $firstName,
            ':ln'   => $lastName,
            ':em'   => $email,
            ':ph'   => $phone,
            ':ad'   => $address,
            ':ap'   => $apartment,
            ':ci'   => $city,
            ':pc'   => $postalCode,
            ':pm'   => $payMethod,
            ':sub'  => $subtotal,
            ':ship' => $shipping,
            ':tot'  => $total,
            ':st'   => $status,
            ':no'   => $notes
        ]);
        $orderId = (int)$db->lastInsertId();

        $stmtItem  = $db->prepare("INSERT INTO order_items (order_id, product_id, product_name, product_sku, price, quantity, subtotal) VALUES (:oid,:pid,:pn,:psku,:price,:qty,:sub)");
        $stmtStock = $db->prepare("UPDATE products SET stock = stock - :qty WHERE id = :id");

        foreach ($items as $item) {
            $qty   = (int)($item['quantity'] ?? 1);
            $price = (float)($item['price'] ?? 0);
            $pid   = (int)($item['productId'] ?? $item['product_id']);
            $stmtItem->execute([
                ':oid'   => $orderId,
                ':pid'   => $pid,
                ':pn'    => $item['name'],
                ':psku'  => $item['sku'] ?? '',
                ':price' => $price,
                ':qty'   => $qty,
                ':sub'   => $price * $qty
            ]);
            $stmtStock->execute([':qty' => $qty, ':id' => $pid]);
        }

        $db->commit();

        echo json_encode([
            'success'     => true,
            'orderId'     => $orderId,
            'orderNumber' => $orderNumber,
            'message'     => 'Orden creada exitosamente'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Metodo no permitido']);

} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}