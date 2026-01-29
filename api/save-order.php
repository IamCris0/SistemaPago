<?php
/**
 * API Endpoint: save-order.php MEJORADO
 * ✅ Genera orderNumber automáticamente
 * ✅ Validación completa de datos
 * ✅ Transacciones seguras
 * ✅ Logging detallado
 */

// Headers CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=UTF-8');

// Headers anti-caché
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

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

// ========================================
// FUNCIÓN: Generar número de orden único
// ========================================
function generateOrderNumber($db) {
    $prefix = 'MW';
    $date = date('Ymd');
    
    // Buscar el último número del día
    $sql = "SELECT order_number FROM orders 
            WHERE order_number LIKE :pattern 
            ORDER BY id DESC LIMIT 1";
    
    $stmt = $db->prepare($sql);
    $stmt->execute([':pattern' => $prefix . $date . '%']);
    $lastOrder = $stmt->fetch();
    
    if ($lastOrder) {
        // Extraer el número secuencial y sumarle 1
        $lastNumber = intval(substr($lastOrder['order_number'], -4));
        $newNumber = $lastNumber + 1;
    } else {
        $newNumber = 1;
    }
    
    // Formato: MW20260125-0001
    return $prefix . $date . '-' . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
}

// ========================================
// FUNCIÓN: Validar datos de entrada
// ========================================
function validateOrderData($data) {
    $errors = [];
    
    // Campos requeridos
    $required = ['email', 'firstName', 'lastName', 'items', 'totals', 'paymentMethod'];
    foreach ($required as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            $errors[] = "Campo requerido faltante: {$field}";
        }
    }
    
    // Validar email
    if (isset($data['email']) && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        $errors[] = "Email inválido: {$data['email']}";
    }
    
    // Validar método de pago
    $validPaymentMethods = ['transfer', 'card', 'cash', 'paypal'];
    if (isset($data['paymentMethod']) && !in_array($data['paymentMethod'], $validPaymentMethods)) {
        $errors[] = "Método de pago inválido: {$data['paymentMethod']}";
    }
    
    // Validar que haya items
    if (isset($data['items']) && (!is_array($data['items']) || count($data['items']) === 0)) {
        $errors[] = "La orden debe tener al menos un producto";
    }
    
    // Validar totales
    if (isset($data['totals'])) {
        if (!isset($data['totals']['subtotal']) || !isset($data['totals']['total'])) {
            $errors[] = "Faltan totales (subtotal/total)";
        }
        
        if (isset($data['totals']['total']) && $data['totals']['total'] <= 0) {
            $errors[] = "El total debe ser mayor a 0";
        }
    }
    
    return $errors;
}

// ========================================
// FUNCIÓN: Logging
// ========================================
function logOrder($message, $data = null) {
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[{$timestamp}] {$message}";
    
    if ($data !== null) {
        $logMessage .= " | Data: " . json_encode($data, JSON_UNESCAPED_UNICODE);
    }
    
    error_log($logMessage);
}

try {
    // ========================================
    // 1. LEER Y PARSEAR DATOS
    // ========================================
    $input = file_get_contents('php://input');
    
    if (empty($input)) {
        throw new Exception('No se recibieron datos');
    }
    
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Datos JSON inválidos: ' . json_last_error_msg());
    }
    
    logOrder('📥 Orden recibida', [
        'email' => $data['email'] ?? 'N/A',
        'itemCount' => count($data['items'] ?? [])
    ]);

    // ========================================
    // 2. VALIDAR DATOS
    // ========================================
    $validationErrors = validateOrderData($data);
    
    if (!empty($validationErrors)) {
        logOrder('❌ Validación fallida', $validationErrors);
        
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Datos de orden inválidos',
            'errors' => $validationErrors
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit();
    }

    // ========================================
    // 3. CONECTAR A LA BASE DE DATOS
    // ========================================
    $database = new Database();
    $db = $database->getConnection();

    if (!$db) {
        throw new Exception('Error de conexión a la base de datos');
    }
    
    logOrder('✅ Conectado a la base de datos');

    // ========================================
    // 4. GENERAR NÚMERO DE ORDEN
    // ========================================
    $orderNumber = generateOrderNumber($db);
    logOrder('✅ Número de orden generado', ['orderNumber' => $orderNumber]);

    // ========================================
    // 5. INICIAR TRANSACCIÓN
    // ========================================
    $db->beginTransaction();
    logOrder('🔄 Transacción iniciada');

    // ========================================
    // 6. VERIFICAR STOCK DISPONIBLE
    // ========================================
    $stockErrors = [];
    $productData = [];
    
    foreach ($data['items'] as $item) {
        if (!isset($item['productId']) || !isset($item['quantity'])) {
            $stockErrors[] = "Item inválido en la orden";
            continue;
        }
        
        $sqlCheckStock = "SELECT id, stock, name, price FROM products WHERE id = :product_id AND active = 1 FOR UPDATE";
        $stmtCheck = $db->prepare($sqlCheckStock);
        $stmtCheck->execute([':product_id' => $item['productId']]);
        $product = $stmtCheck->fetch();
        
        if (!$product) {
            $stockErrors[] = "Producto ID {$item['productId']} no encontrado o inactivo";
            continue;
        }
        
        if ($product['stock'] < $item['quantity']) {
            $stockErrors[] = "Stock insuficiente para: {$product['name']} (Disponible: {$product['stock']}, Solicitado: {$item['quantity']})";
            continue;
        }
        
        $productData[$item['productId']] = $product;
    }
    
    if (!empty($stockErrors)) {
        $db->rollBack();
        logOrder('❌ Errores de stock', $stockErrors);
        
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Problemas con el inventario',
            'errors' => $stockErrors
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit();
    }
    
    logOrder('✅ Stock verificado para todos los productos');

    // ========================================
    // 7. INSERTAR ORDEN PRINCIPAL
    // ========================================
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
                    status,
                    created_at
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
                    :status,
                    NOW()
                )";

    $statusMap = [
        'transfer' => 'pending_payment',
        'card' => 'completed',
        'cash' => 'pending_payment',
        'paypal' => 'completed'
    ];
    
    $orderStatus = $statusMap[$data['paymentMethod']] ?? 'pending_payment';

    $stmtOrder = $db->prepare($sqlOrder);
    
    try {
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
        
        logOrder('✅ Orden principal insertada');
        
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) {
            throw new Exception("Error al generar número de orden único. Por favor intenta de nuevo.");
        }
        throw $e;
    }

    $orderId = $db->lastInsertId();
    
    if (!$orderId) {
        throw new Exception('No se pudo obtener el ID de la orden');
    }
    
    logOrder('✅ Order ID obtenido', ['orderId' => $orderId]);

    // ========================================
    // 8. INSERTAR ITEMS Y DESCONTAR STOCK
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
    
    $itemsInserted = 0;
    $stockUpdated = 0;

    foreach ($data['items'] as $item) {
        $product = $productData[$item['productId']];
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
        
        $itemsInserted++;

        $sqlUpdateStock = "UPDATE products 
                          SET stock = stock - :quantity,
                              updated_at = NOW()
                          WHERE id = :product_id 
                          AND stock >= :quantity
                          AND active = 1";
        
        $stmtUpdateStock = $db->prepare($sqlUpdateStock);
        $stmtUpdateStock->execute([
            ':quantity' => $item['quantity'],
            ':product_id' => $item['productId']
        ]);

        $rowsAffected = $stmtUpdateStock->rowCount();
        
        if ($rowsAffected === 0) {
            throw new Exception("Error crítico: No se pudo actualizar stock para: {$item['name']} (ID: {$item['productId']})");
        }
        
        $stockUpdated++;
        
        logOrder('✅ Stock descontado', [
            'productId' => $item['productId'],
            'quantity' => $item['quantity'],
            'name' => $item['name']
        ]);
    }
    
    logOrder('✅ Items procesados', [
        'itemsInserted' => $itemsInserted,
        'stockUpdated' => $stockUpdated
    ]);

    // ========================================
    // 9. COMMIT DE LA TRANSACCIÓN
    // ========================================
    $db->commit();
    logOrder('✅ Transacción completada exitosamente', ['orderId' => $orderId]);

    // ========================================
    // 10. RESPUESTA EXITOSA
    // ========================================
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
            'email' => $data['email'],
            'phone' => $data['phone'] ?? '',
            'address' => $data['address'] ?? ''
        ],
        'totals' => [
            'subtotal' => (float)$data['totals']['subtotal'],
            'shipping' => (float)($data['totals']['shipping'] ?? 0),
            'total' => (float)$data['totals']['total']
        ],
        'items' => array_map(function($item) {
            return [
                'productId' => $item['productId'],
                'name' => $item['name'],
                'sku' => $item['sku'],
                'price' => (float)$item['price'],
                'quantity' => (int)$item['quantity'],
                'subtotal' => (float)($item['price'] * $item['quantity'])
            ];
        }, $data['items']),
        'stockUpdated' => true,
        'stockCount' => $stockUpdated
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
        logOrder('❌ Rollback ejecutado debido a error de BD');
    }

    logOrder('❌ Database Error', [
        'message' => $e->getMessage(),
        'code' => $e->getCode()
    ]);
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error de base de datos',
        'error' => 'Ocurrió un problema al guardar tu orden. Por favor intenta de nuevo.',
        'code' => 'DB_ERROR'
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
        logOrder('❌ Rollback ejecutado debido a error general');
    }

    logOrder('❌ General Error', ['message' => $e->getMessage()]);
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al procesar la orden',
        'error' => $e->getMessage(),
        'code' => 'GENERAL_ERROR'
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} finally {
    if (isset($database)) {
        $database->closeConnection();
    }
}
?>