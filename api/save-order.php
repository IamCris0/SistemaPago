<?php
/**
 * API Endpoint: save-order.php
 * Guarda órdenes de compra en MySQL
 * ✅ DESCUENTA STOCK AUTOMÁTICAMENTE
 * Ruta: /api/save-order.php
 */

// Headers CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=UTF-8');

// Manejar preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Solo permitir POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false, 
        'message' => 'Método no permitido. Solo POST.'
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

// Incluir configuración
require_once __DIR__ . '/config/database.php';

try {
    // ========================================
    // 1. LEER Y VALIDAR DATOS
    // ========================================
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data) {
        throw new Exception('Datos JSON inválidos');
    }

    // Validar campos requeridos
    $required = ['paypalOrderId', 'email', 'firstName', 'lastName', 'items', 'totals'];
    foreach ($required as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            throw new Exception("Campo requerido faltante: {$field}");
        }
    }

    // ========================================
    // 2. CONECTAR A LA BASE DE DATOS
    // ========================================
    $database = new Database();
    $db = $database->getConnection();

    if (!$db) {
        throw new Exception('Error de conexión a la base de datos');
    }

    // ========================================
    // 3. INICIAR TRANSACCIÓN
    // ========================================
    $db->beginTransaction();

    // ========================================
    // 4. VERIFICAR STOCK DISPONIBLE ANTES DE PROCESAR
    // ========================================
    $stockErrors = [];
    
    foreach ($data['items'] as $item) {
        $sqlCheckStock = "SELECT stock, name FROM products WHERE id = :product_id FOR UPDATE";
        $stmtCheck = $db->prepare($sqlCheckStock);
        $stmtCheck->execute([':product_id' => $item['productId']]);
        $product = $stmtCheck->fetch();
        
        if (!$product) {
            $stockErrors[] = "Producto ID {$item['productId']} no encontrado";
            continue;
        }
        
        if ($product['stock'] < $item['quantity']) {
            $stockErrors[] = "Stock insuficiente para: {$product['name']} (Disponible: {$product['stock']}, Solicitado: {$item['quantity']})";
        }
    }
    
    // Si hay errores de stock, hacer rollback y retornar error
    if (!empty($stockErrors)) {
        $db->rollBack();
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Error de stock',
            'errors' => $stockErrors
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit();
    }

    // ========================================
    // 5. INSERTAR ORDEN PRINCIPAL
    // ========================================
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

    // Obtener ID de la orden recién insertada
    $orderId = $db->lastInsertId();

    // ========================================
    // 6. INSERTAR ITEMS Y DESCONTAR STOCK
    // ========================================
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
        
        // Insertar item de orden
        $stmtItem->execute([
            ':order_id' => $orderId,
            ':product_id' => $item['productId'],
            ':product_name' => $item['name'],
            ':product_sku' => $item['sku'],
            ':price' => $item['price'],
            ':quantity' => $item['quantity'],
            ':subtotal' => $itemSubtotal
        ]);

        // ✅ DESCONTAR STOCK DEL PRODUCTO
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

        // Verificar que se actualizó el stock
        if ($stmtUpdateStock->rowCount() === 0) {
            throw new Exception("Error crítico: No se pudo actualizar stock para: {$item['name']}");
        }
        
        // Log del descuento de stock
        error_log("✅ Stock descontado: Producto ID {$item['productId']}, Cantidad: {$item['quantity']}");
    }

    // ========================================
    // 7. COMMIT DE LA TRANSACCIÓN
    // ========================================
    $db->commit();

    // Generar número de orden
    $orderNumber = 'MW-' . str_pad($orderId, 6, '0', STR_PAD_LEFT);

    // ========================================
    // 8. RESPUESTA EXITOSA
    // ========================================
    echo json_encode([
        'success' => true,
        'message' => 'Orden guardada exitosamente y stock actualizado',
        'orderId' => (int)$orderId,
        'orderNumber' => $orderNumber,
        'timestamp' => date('c'),
        'customer' => [
            'name' => $data['firstName'] . ' ' . $data['lastName'],
            'email' => $data['email']
        ],
        'totals' => [
            'subtotal' => $data['totals']['subtotal'],
            'shipping' => $data['totals']['shipping'],
            'total' => $data['totals']['total']
        ],
        'stockUpdated' => true
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Exception $e) {
    // ========================================
    // MANEJO DE ERRORES
    // ========================================
    
    // Rollback en caso de error
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
        error_log("❌ Rollback ejecutado debido a error: " . $e->getMessage());
    }

    error_log("❌ Error saving order: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al guardar la orden',
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}

// Cerrar conexión
if (isset($database)) {
    $database->closeConnection();
}
?>