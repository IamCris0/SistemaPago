<?php
/**
 * API Endpoint: save-order.php CORREGIDO
 * ✅ Genera orderNumber automáticamente
 * ✅ Sin paypal_order_id (no existe en la tabla)
 * ✅ Sin PDF
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false, 
        'message' => 'Método no permitido. Solo POST.'
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

require_once __DIR__ . '/config/database.php';

// ========================================
// FUNCIÓN: Generar número de orden único
// ========================================
function generateOrderNumber($db) {
    $prefix = 'MW';
    $date = date('Ymd');
    
    $sql = "SELECT order_number FROM orders 
            WHERE order_number LIKE :pattern 
            ORDER BY id DESC LIMIT 1";
    
    $stmt = $db->prepare($sql);
    $stmt->execute([':pattern' => $prefix . $date . '%']);
    $lastOrder = $stmt->fetch();
    
    if ($lastOrder) {
        $lastNumber = intval(substr($lastOrder['order_number'], -4));
        $newNumber = $lastNumber + 1;
    } else {
        $newNumber = 1;
    }
    
    return $prefix . $date . '-' . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
}

// ========================================
// FUNCIÓN: Validar datos
// ========================================
function validateOrderData($data) {
    $errors = [];
    
    $required = ['email', 'firstName', 'lastName', 'items', 'totals', 'paymentMethod'];
    foreach ($required as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            $errors[] = "Campo requerido faltante: {$field}";
        }
    }
    
    if (isset($data['email']) && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        $errors[] = "Email inválido";
    }
    
    $validPaymentMethods = ['transfer', 'card', 'cash', 'paypal'];
    if (isset($data['paymentMethod']) && !in_array($data['paymentMethod'], $validPaymentMethods)) {
        $errors[] = "Método de pago inválido";
    }
    
    if (isset($data['items']) && (!is_array($data['items']) || count($data['items']) === 0)) {
        $errors[] = "La orden debe tener al menos un producto";
    }
    
    if (isset($data['totals']['total']) && $data['totals']['total'] <= 0) {
        $errors[] = "El total debe ser mayor a 0";
    }
    
    return $errors;
}

try {
    // 1. LEER DATOS
    $input = file_get_contents('php://input');
    
    if (empty($input)) {
        throw new Exception('No se recibieron datos');
    }
    
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Datos JSON inválidos');
    }

    // 2. VALIDAR
    $validationErrors = validateOrderData($data);
    
    if (!empty($validationErrors)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Datos de orden inválidos',
            'errors' => $validationErrors
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    // 3. CONECTAR BD
    $database = new Database();
    $db = $database->getConnection();

    if (!$db) {
        throw new Exception('Error de conexión a la base de datos');
    }

    // 4. GENERAR ORDER NUMBER
    $orderNumber = generateOrderNumber($db);

    // 5. INICIAR TRANSACCIÓN
    $db->beginTransaction();

    // 6. VERIFICAR STOCK
    $stockErrors = [];
    $productData = [];
    
    foreach ($data['items'] as $item) {
        $sqlCheckStock = "SELECT id, stock, name, price FROM products WHERE id = :product_id AND active = 1 FOR UPDATE";
        $stmtCheck = $db->prepare($sqlCheckStock);
        $stmtCheck->execute([':product_id' => $item['productId']]);
        $product = $stmtCheck->fetch();
        
        if (!$product) {
            $stockErrors[] = "Producto ID {$item['productId']} no encontrado";
            continue;
        }
        
        if ($product['stock'] < $item['quantity']) {
            $stockErrors[] = "Stock insuficiente para: {$product['name']}";
            continue;
        }
        
        $productData[$item['productId']] = $product;
    }
    
    if (!empty($stockErrors)) {
        $db->rollBack();
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Problemas con el inventario',
            'errors' => $stockErrors
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    // 7. INSERTAR ORDEN - SIN paypal_order_id, SIN created_at (usa DEFAULT)
    $sqlOrder = "INSERT INTO orders (
                    order_number,
                    email,
                    first_name,
                    last_name,
                    address,
                    apartment,
                    city,
                    postal_code,
                    phone,
                    shipping_method,
                    payment_method,
                    subtotal,
                    shipping_cost,
                    total,
                    status
                ) VALUES (
                    :order_number,
                    :email,
                    :first_name,
                    :last_name,
                    :address,
                    :apartment,
                    :city,
                    :postal_code,
                    :phone,
                    :shipping_method,
                    :payment_method,
                    :subtotal,
                    :shipping_cost,
                    :total,
                    :status
                )";

    $statusMap = [
        'transfer' => 'pending_payment',
        'card' => 'completed',
        'cash' => 'pending_payment',
        'paypal' => 'completed'
    ];
    
    $orderStatus = $statusMap[$data['paymentMethod']] ?? 'pending_payment';

    $stmtOrder = $db->prepare($sqlOrder);
    
    $stmtOrder->execute([
        ':order_number' => $orderNumber,
        ':email' => strtolower(trim($data['email'])),
        ':first_name' => trim($data['firstName']),
        ':last_name' => trim($data['lastName']),
        ':address' => trim($data['address'] ?? ''),
        ':apartment' => trim($data['apartment'] ?? ''),
        ':city' => trim($data['city'] ?? ''),
        ':postal_code' => trim($data['postalCode'] ?? ''),
        ':phone' => trim($data['phone'] ?? ''),
        ':shipping_method' => $data['shippingMethod'] ?? 'standard',
        ':payment_method' => $data['paymentMethod'],
        ':subtotal' => $data['totals']['subtotal'],
        ':shipping_cost' => $data['totals']['shipping'] ?? 0,
        ':total' => $data['totals']['total'],
        ':status' => $orderStatus
    ]);

    $orderId = $db->lastInsertId();
    
    if (!$orderId) {
        throw new Exception('No se pudo obtener el ID de la orden');
    }

    // 8. INSERTAR ITEMS Y ACTUALIZAR STOCK
    $sqlItem = "INSERT INTO order_items (
                    order_id,
                    product_id,
                    product_name,
                    product_sku,
                    price,
                    quantity,
                    subtotal
                ) VALUES (
                    :order_id,
                    :product_id,
                    :product_name,
                    :product_sku,
                    :price,
                    :quantity,
                    :subtotal
                )";

    $stmtItem = $db->prepare($sqlItem);

    foreach ($data['items'] as $item) {
        $itemSubtotal = $item['price'] * $item['quantity'];
        
        $stmtItem->execute([
            ':order_id' => $orderId,
            ':product_id' => $item['productId'],
            ':product_name' => $item['name'],
            ':product_sku' => $item['sku'],
            ':price' => $item['price'],
            ':quantity' => $item['quantity'],
            ':subtotal' => $itemSubtotal
        ]);

        $sqlUpdateStock = "UPDATE products 
                          SET stock = stock - :quantity
                          WHERE id = :product_id 
                          AND stock >= :quantity
                          AND active = 1";
        
        $stmtUpdateStock = $db->prepare($sqlUpdateStock);
        $stmtUpdateStock->execute([
            ':quantity' => $item['quantity'],
            ':product_id' => $item['productId']
        ]);

        if ($stmtUpdateStock->rowCount() === 0) {
            throw new Exception("Error al actualizar stock para: {$item['name']}");
        }
    }

    // 9. COMMIT
    $db->commit();

    // 10. RESPUESTA EXITOSA
    $paymentMethodNames = [
        'transfer' => 'Transferencia Bancaria',
        'card' => 'Tarjeta de Crédito/Débito',
        'cash' => 'Pago en Efectivo',
        'paypal' => 'PayPal'
    ];

    $response = [
        'success' => true,
        'message' => 'Orden procesada exitosamente',
        'orderId' => (int)$orderId,
        'orderNumber' => $orderNumber,
        'paymentMethod' => $data['paymentMethod'],
        'paymentMethodName' => $paymentMethodNames[$data['paymentMethod']],
        'status' => $orderStatus,
        'timestamp' => date('c'),
        'customer' => [
            'name' => $data['firstName'] . ' ' . $data['lastName'],
            'email' => $data['email']
        ],
        'totals' => [
            'subtotal' => (float)$data['totals']['subtotal'],
            'shipping' => (float)($data['totals']['shipping'] ?? 0),
            'total' => (float)$data['totals']['total']
        ]
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }

    error_log("❌ Database Error: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error de base de datos',
        'error' => 'Ocurrió un problema al guardar tu orden. Por favor intenta de nuevo.',
        'details' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }

    error_log("❌ General Error: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al procesar la orden',
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
    
} finally {
    if (isset($database)) {
        $database->closeConnection();
    }
}
?>