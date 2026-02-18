<?php
/**
 * save-order.php - VERSIÓN CORREGIDA
 * ✅ Guarda correctamente subtotal, shipping, total
 * ✅ Guarda correctamente los items con sus precios reales
 * ✅ Sin bugs de $0.00
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
        throw new Exception('JSON inválido: ' . json_last_error_msg());
    }

    // ✅ LOG: Ver qué datos llegan
    error_log("📦 DATOS RECIBIDOS:");
    error_log(print_r($data, true));

    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception('Error de conexión a BD');
    }

    $orderNumber = generateOrderNumber($db);
    
    $db->beginTransaction();

    // ✅ EXTRAER TOTALES CORRECTAMENTE
    $subtotal = isset($data['totals']['subtotal']) ? (float)$data['totals']['subtotal'] : 0.0;
    $shipping = isset($data['totals']['shipping']) ? (float)$data['totals']['shipping'] : 0.0;
    $total = isset($data['totals']['total']) ? (float)$data['totals']['total'] : 0.0;

    // ✅ VALIDAR QUE EL TOTAL NO SEA 0
    if ($total <= 0) {
        throw new Exception('Total inválido: $' . $total);
    }

    // ✅ LOG: Verificar totales
    error_log("💰 TOTALES:");
    error_log("  - Subtotal: $" . $subtotal);
    error_log("  - Shipping: $" . $shipping);
    error_log("  - Total: $" . $total);

    // Verificar stock
    foreach ($data['items'] as $item) {
        $sql = "SELECT stock, name, price FROM products WHERE id = :id AND active = 1";
        $stmt = $db->prepare($sql);
        $stmt->execute([':id' => $item['productId']]);
        $product = $stmt->fetch();
        
        if (!$product) {
            throw new Exception('Producto no encontrado: ' . $item['name']);
        }
        
        if ($product['stock'] < $item['quantity']) {
            throw new Exception('Stock insuficiente para: ' . $product['name']);
        }

        // ✅ LOG: Verificar precio del producto en BD vs lo que llega
        error_log("🏷️ PRODUCTO: " . $product['name']);
        error_log("  - Precio BD: $" . $product['price']);
        error_log("  - Precio recibido: $" . $item['price']);
        error_log("  - Cantidad: " . $item['quantity']);
    }

    // ✅ Insertar orden con TOTALES CORRECTOS
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
    
    $params = [
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
        ':subtotal' => $subtotal,  // ✅ VALOR CORRECTO
        ':shipping_cost' => $shipping,  // ✅ VALOR CORRECTO
        ':total' => $total,  // ✅ VALOR CORRECTO
        ':status' => $data['paymentMethod'] === 'card' || $data['paymentMethod'] === 'paypal' ? 'completed' : 'pending_payment'
    ];

    // ✅ LOG: Ver qué se va a insertar
    error_log("📝 INSERTANDO ORDEN:");
    error_log("  - Subtotal: " . $params[':subtotal']);
    error_log("  - Shipping: " . $params[':shipping_cost']);
    error_log("  - Total: " . $params[':total']);

    $stmt->execute($params);

    $orderId = $db->lastInsertId();

    error_log("✅ Orden insertada con ID: " . $orderId);

    // ✅ Insertar items con PRECIOS CORRECTOS
    $sqlItem = "INSERT INTO order_items (order_id, product_id, product_name, product_sku, price, quantity, subtotal) 
                VALUES (:order_id, :product_id, :product_name, :product_sku, :price, :quantity, :subtotal)";
    $stmtItem = $db->prepare($sqlItem);

    foreach ($data['items'] as $item) {
        $itemSubtotal = (float)$item['price'] * (int)$item['quantity'];

        $itemParams = [
            ':order_id' => $orderId,
            ':product_id' => $item['productId'],
            ':product_name' => $item['name'],
            ':product_sku' => $item['sku'],
            ':price' => (float)$item['price'],  // ✅ PRECIO REAL
            ':quantity' => (int)$item['quantity'],
            ':subtotal' => $itemSubtotal  // ✅ SUBTOTAL CORRECTO
        ];

        // ✅ LOG: Ver cada item
        error_log("🛍️ INSERTANDO ITEM:");
        error_log("  - Producto: " . $itemParams[':product_name']);
        error_log("  - Precio: $" . $itemParams[':price']);
        error_log("  - Cantidad: " . $itemParams[':quantity']);
        error_log("  - Subtotal: $" . $itemParams[':subtotal']);

        $stmtItem->execute($itemParams);

        // Actualizar stock
        $db->prepare("UPDATE products SET stock = stock - :qty WHERE id = :id")
           ->execute([':qty' => $item['quantity'], ':id' => $item['productId']]);
    }

    $db->commit();

    // ✅ RESPUESTA CON DATOS COMPLETOS
    $response = [
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
            'subtotal' => $subtotal,
            'shipping' => $shipping,
            'total' => $total
        ]
    ];

    error_log("✅ RESPUESTA ENVIADA:");
    error_log(print_r($response, true));

    echo json_encode($response);

} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }

    error_log("❌ ERROR save-order: " . $e->getMessage());
    error_log("❌ TRACE: " . $e->getTraceAsString());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al procesar orden',
        'error' => $e->getMessage()
    ]);
}
?>