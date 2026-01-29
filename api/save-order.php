<?php
/**
 * API Endpoint: save-order.php MEJORADO
 * ✅ Guarda órdenes con validación robusta
 * ✅ Descuenta stock automáticamente con verificación
 * ✅ Transacciones seguras con rollback automático
 * ✅ Logging detallado para debugging
 * ✅ Manejo de errores profesional
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
// FUNCIÓN: Validar datos de entrada
// ========================================
function validateOrderData($data) {
    $errors = [];
    
    // Campos requeridos
    $required = ['orderNumber', 'email', 'firstName', 'lastName', 'items', 'totals', 'paymentMethod'];
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
        'orderNumber' => $data['orderNumber'] ?? 'N/A',
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
    // 4. INICIAR TRANSACCIÓN
    // ========================================
    $db->beginTransaction();
    logOrder('🔄 Transacción iniciada');

    // ========================================
    // 5. VERIFICAR STOCK DISPONIBLE
    // ========================================
    $stockErrors = [];
    $productData = []; // Guardar data de productos para validación
    
    foreach ($data['items'] as $item) {
        // Validar estructura del item
        if (!isset($item['productId']) || !isset($item['quantity'])) {
            $stockErrors[] = "Item inválido en la orden";
            continue;
        }
        
        // Obtener datos del producto con lock
        $sqlCheckStock = "SELECT id, stock, name, price FROM products WHERE id = :product_id AND active = 1 FOR UPDATE";
        $stmtCheck = $db->prepare($sqlCheckStock);
        $stmtCheck->execute([':product_id' => $item['productId']]);
        $product = $stmtCheck->fetch();
        
        if (!$product) {
            $stockErrors[] = "Producto ID {$item['productId']} no encontrado o inactivo";
            continue;
        }
        
        // Verificar stock suficiente
        if ($product['stock'] < $item['quantity']) {
            $stockErrors[] = "Stock insuficiente para: {$product['name']} (Disponible: {$product['stock']}, Solicitado: {$item['quantity']})";
            continue;
        }
        
        // Guardar data del producto
        $productData[$item['productId']] = $product;
    }
    
    // Si hay errores de stock, hacer rollback
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
    // 6. INSERTAR ORDEN PRINCIPAL
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

    // Determinar status según método de pago
    $statusMap = [
        'transfer' => 'pending_payment',  // Esperando comprobante
        'card' => 'completed',             // Pagado (simulado)
        'cash' => 'pending_payment',       // Pagar al recibir
        'paypal' => 'completed'            // Pagado (simulado)
    ];
    
    $orderStatus = $statusMap[$data['paymentMethod']] ?? 'pending_payment';

    $stmtOrder = $db->prepare($sqlOrder);
    
    try {
        $stmtOrder->execute([
            ':order_number' => $data['orderNumber'],
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
        // Verificar si es error de duplicate key
        if ($e->getCode() == 23000) { // Duplicate entry
            throw new Exception("El número de orden {$data['orderNumber']} ya existe. Por favor intenta de nuevo.");
        }
        throw $e;
    }

    // Obtener ID de la orden
    $orderId = $db->lastInsertId();
    
    if (!$orderId) {
        throw new Exception('No se pudo obtener el ID de la orden');
    }
    
    logOrder('✅ Order ID obtenido', ['orderId' => $orderId]);

    // ========================================
    // 7. INSERTAR ITEMS Y DESCONTAR STOCK
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
        
        // Insertar item
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

        // Descontar stock con verificación doble
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
    // 8. VERIFICACIÓN FINAL
    // ========================================
    if ($itemsInserted !== count($data['items'])) {
        throw new Exception("Discrepancia en items: esperados " . count($data['items']) . ", insertados {$itemsInserted}");
    }
    
    if ($stockUpdated !== count($data['items'])) {
        throw new Exception("Discrepancia en actualización de stock");
    }

    // ========================================
    // 9. COMMIT DE LA TRANSACCIÓN
    // ========================================
    $db->commit();
    logOrder('✅ Transacción completada exitosamente', ['orderId' => $orderId]);

    // ========================================
    // 10. PREPARAR RESPUESTA
    // ========================================
    $paymentMethodNames = [
        'transfer' => 'Transferencia Bancaria',
        'card' => 'Tarjeta de Crédito/Débito',
        'cash' => 'Pago en Efectivo',
        'paypal' => 'PayPal'
    ];

    // ========================================
    // 11. RESPUESTA EXITOSA
    // ========================================
    $response = [
        'success' => true,
        'message' => 'Orden procesada exitosamente',
        'orderId' => (int)$orderId,
        'orderNumber' => $data['orderNumber'],
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
        ],
        'items' => [
            'count' => count($data['items']),
            'inserted' => $itemsInserted
        ],
        'stockUpdated' => true,
        'stockCount' => $stockUpdated
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    // ========================================
    // MANEJO DE ERRORES DE BASE DE DATOS
    // ========================================
    
    // Rollback en caso de error
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
        'code' => 'DB_ERROR',
        'details' => $e->getMessage() // Solo para desarrollo, quitar en producción
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    // ========================================
    // MANEJO DE ERRORES GENERALES
    // ========================================
    
    // Rollback en caso de error
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
    // ========================================
    // LIMPIEZA
    // ========================================
    if (isset($database)) {
        $database->closeConnection();
    }
}
?>