<?php
/**
 * API Endpoint: save-order.php
 * Guarda órdenes de compra en la base de datos MySQL
 * Para uso en cPanel
 */

require_once __DIR__ . '/config/database.php';

// Configurar headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false, 
        'message' => 'Método no permitido'
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

try {
    // Obtener datos del request
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data) {
        throw new Exception('Datos inválidos');
    }

    // Validar campos requeridos
    $required = ['paypalOrderId', 'email', 'firstName', 'lastName', 'items', 'totals'];
    foreach ($required as $field) {
        if (!isset($data[$field])) {
            throw new Exception("Campo requerido faltante: {$field}");
        }
    }

    // Conectar a la base de datos
    $database = new Database();
    $db = $database->getConnection();

    if (!$db) {
        throw new Exception('Error de conexión a la base de datos');
    }

    // Iniciar transacción
    $db->beginTransaction();

    // Insertar orden principal
    $sqlOrder = "INSERT INTO orders (
                    paypal_order_id,
                    email,
                    first_name,
                    last_name,
                    address,
                    apartment,
                    city,
                    postal_code,
                    phone,
                    shipping_method,
                    subtotal,
                    shipping_cost,
                    total,
                    status,
                    created_at
                ) VALUES (
                    :paypal_order_id,
                    :email,
                    :first_name,
                    :last_name,
                    :address,
                    :apartment,
                    :city,
                    :postal_code,
                    :phone,
                    :shipping_method,
                    :subtotal,
                    :shipping_cost,
                    :total,
                    'completed',
                    NOW()
                )";

    $stmtOrder = $db->prepare($sqlOrder);
    $stmtOrder->execute([
        ':paypal_order_id' => $data['paypalOrderId'],
        ':email' => $data['email'],
        ':first_name' => $data['firstName'],
        ':last_name' => $data['lastName'],
        ':address' => $data['address'] ?? '',
        ':apartment' => $data['apartment'] ?? '',
        ':city' => $data['city'] ?? '',
        ':postal_code' => $data['postalCode'] ?? '',
        ':phone' => $data['phone'] ?? '',
        ':shipping_method' => $data['shippingMethod'] ?? 'standard',
        ':subtotal' => $data['totals']['subtotal'],
        ':shipping_cost' => $data['totals']['shipping'],
        ':total' => $data['totals']['total']
    ]);

    // Obtener el ID de la orden recién insertada
    $orderId = $db->lastInsertId();

    // Insertar items de la orden
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

        // Actualizar stock del producto
        $sqlUpdateStock = "UPDATE products 
                          SET stock = stock - :quantity,
                              updated_at = NOW()
                          WHERE id = :product_id 
                          AND stock >= :quantity";
        
        $stmtUpdateStock = $db->prepare($sqlUpdateStock);
        $stmtUpdateStock->execute([
            ':quantity' => $item['quantity'],
            ':product_id' => $item['productId']
        ]);

        // Verificar si se actualizó el stock
        if ($stmtUpdateStock->rowCount() === 0) {
            throw new Exception("Stock insuficiente para el producto: {$item['name']}");
        }
    }

    // Commit de la transacción
    $db->commit();

    // Generar número de orden
    $orderNumber = 'MW-' . str_pad($orderId, 6, '0', STR_PAD_LEFT);

    // Respuesta exitosa
    echo json_encode([
        'success' => true,
        'message' => 'Orden guardada exitosamente',
        'orderId' => (int)$orderId,
        'orderNumber' => $orderNumber,
        'timestamp' => date('c')
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    // Rollback en caso de error
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }

    error_log("Error saving order: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al guardar la orden',
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>