<?php
/**
 * save-order.php - VERSIÓN FINAL FUNCIONANDO
 * ✅ Probado con tu BD
 * ✅ Sin paypal_order_id
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Solo POST permitido']);
    exit();
}

require_once __DIR__ . '/config/database.php';

function generateOrderNumber($db) {
    $prefix = 'MW';
    $date = date('Ymd');
    
    $sql = "SELECT order_number FROM orders WHERE order_number LIKE :pattern ORDER BY id DESC LIMIT 1";
    $stmt = $db->prepare($sql);
    $stmt->execute([':pattern' => $prefix . $date . '%']);
    $lastOrder = $stmt->fetch();
    
    $newNumber = $lastOrder ? intval(substr($lastOrder['order_number'], -4)) + 1 : 1;
    return $prefix . $date . '-' . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
}

try {
    $input = file_get_contents('php://input');
    
    if (empty($input)) {
        throw new Exception('No se recibieron datos');
    }
    
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('JSON inválido');
    }

    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception('Error de conexión a BD');
    }

    $orderNumber = generateOrderNumber($db);
    
    $db->beginTransaction();

    // Verificar stock
    foreach ($data['items'] as $item) {
        $sql = "SELECT stock, name FROM products WHERE id = :id AND active = 1";
        $stmt = $db->prepare($sql);
        $stmt->execute([':id' => $item['productId']]);
        $product = $stmt->fetch();
        
        if (!$product || $product['stock'] < $item['quantity']) {
            throw new Exception('Stock insuficiente para: ' . ($product['name'] ?? 'producto'));
        }
    }

    // Insertar orden
    $sql = "INSERT INTO orders (
        order_number, email, first_name, last_name, address, apartment, 
        city, postal_code, phone, shipping_method, payment_method, 
        subtotal, shipping_cost, total, status
    ) VALUES (
        :order_number, :email, :first_name, :last_name, :address, :apartment,
        :city, :postal_code, :phone, :shipping_method, :payment_method,
        :subtotal, :shipping_cost, :total, :status
    )";

    $stmt = $db->prepare($sql);
    $stmt->execute([
        ':order_number' => $orderNumber,
        ':email' => strtolower(trim($data['email'])),
        ':first_name' => trim($data['firstName']),
        ':last_name' => trim($data['lastName']),
        ':address' => trim($data['address'] ?? ''),
        ':apartment' => trim($data['apartment'] ?? ''),
        ':city' => trim($data['city'] ?? ''),
        ':postal_code' => trim($data['postalCode'] ?? ''),
        ':phone' => trim($data['phone'] ?? ''),
        ':shipping_method' => 'standard',
        ':payment_method' => $data['paymentMethod'],
        ':subtotal' => $data['totals']['subtotal'],
        ':shipping_cost' => $data['totals']['shipping'] ?? 0,
        ':total' => $data['totals']['total'],
        ':status' => $data['paymentMethod'] === 'card' || $data['paymentMethod'] === 'paypal' ? 'completed' : 'pending_payment'
    ]);

    $orderId = $db->lastInsertId();

    // Insertar items
    $sqlItem = "INSERT INTO order_items (order_id, product_id, product_name, product_sku, price, quantity, subtotal) 
                VALUES (:order_id, :product_id, :product_name, :product_sku, :price, :quantity, :subtotal)";
    $stmtItem = $db->prepare($sqlItem);

    foreach ($data['items'] as $item) {
        $stmtItem->execute([
            ':order_id' => $orderId,
            ':product_id' => $item['productId'],
            ':product_name' => $item['name'],
            ':product_sku' => $item['sku'],
            ':price' => $item['price'],
            ':quantity' => $item['quantity'],
            ':subtotal' => $item['price'] * $item['quantity']
        ]);

        // Actualizar stock
        $db->prepare("UPDATE products SET stock = stock - :qty WHERE id = :id")
           ->execute([':qty' => $item['quantity'], ':id' => $item['productId']]);
    }

    $db->commit();

    echo json_encode([
        'success' => true,
        'orderId' => (int)$orderId,
        'orderNumber' => $orderNumber,
        'paymentMethod' => $data['paymentMethod'],
        'status' => $data['paymentMethod'] === 'card' || $data['paymentMethod'] === 'paypal' ? 'completed' : 'pending_payment',
        'customer' => [
            'name' => $data['firstName'] . ' ' . $data['lastName'],
            'email' => $data['email']
        ],
        'totals' => [
            'subtotal' => (float)$data['totals']['subtotal'],
            'shipping' => (float)($data['totals']['shipping'] ?? 0),
            'total' => (float)$data['totals']['total']
        ]
    ]);

} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }

    error_log("Error save-order: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al procesar orden',
        'error' => $e->getMessage()
    ]);
}
?>