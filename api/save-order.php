<?php
/**
 * API Endpoint: save-order.php CORREGIDO FINAL
 * ✅ FIX 1: Genera order_number único con timestamp + random
 * ✅ FIX 2: Solo guarda orden, no duplica
 * ✅ Descuenta stock con transacción segura
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
// FUNCIÓN: Generar número de orden único
// ========================================
function generateUniqueOrderNumber($db) {
    $maxAttempts = 10;
    $attempt = 0;
    
    while ($attempt < $maxAttempts) {
        // Formato: MW-YYYYMMDD-HHMMSS-RAND
        $timestamp = date('YmdHis'); // 20260125143022
        $random = str_pad(mt_rand(0, 9999), 4, '0', STR_PAD_LEFT);
        $orderNumber = "MW-{$timestamp}-{$random}";
        
        // Verificar si existe
        $stmt = $db->prepare("SELECT COUNT(*) FROM orders WHERE order_number = :order_number");
        $stmt->execute([':order_number' => $orderNumber]);
        $count = $stmt->fetchColumn();
        
        if ($count == 0) {
            return $orderNumber; // ✅ Número único encontrado
        }
        
        $attempt++;
        usleep(100000); // Esperar 100ms antes de reintentar
    }
    
    // Si después de 10 intentos no se genera uno único, usar microtime
    $microtime = microtime(true);
    $orderNumber = "MW-" . date('YmdHis') . "-" . str_pad(substr($microtime, -4), 4, '0', STR_PAD_LEFT);
    
    return $orderNumber;
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
    // 4. INICIAR TRANSACCIÓN
    // ========================================
    $db->beginTransaction();
    logOrder('🔄 Transacción iniciada');

    // ========================================
    // 5. GENERAR NÚMERO DE ORDEN ÚNICO
    // ========================================
    $orderNumber = generateUniqueOrderNumber($db);
    logOrder('✅ Número de orden generado', ['orderNumber' => $orderNumber]);

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

    // Determinar status según método de pago
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
            ':shipping_method' => 'standard', // ✅ SIEMPRE ESTÁNDAR
            ':payment_method' => $data['paymentMethod'],
            ':subtotal' => $data['totals']['subtotal'],
            ':shipping_cost' => 0, // ✅ SIEMPRE GRATIS
            ':total' => $data['totals']['total'],
            ':status' => $orderStatus
        ]);
        
        logOrder('✅ Orden principal insertada');
        
    } catch (PDOException $e) {
        // Si aún hay error de duplicate, generar nuevo número
        if ($e->getCode() == 23000) {
            $newOrderNumber = generateUniqueOrderNumber($db);
            logOrder('⚠️ Duplicate key, generando nuevo número', ['newOrderNumber' => $newOrderNumber]);
            
            // Reintentar con nuevo número
            $stmtOrder->execute([
                ':order_number' => $newOrderNumber,
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
                ':shipping_cost' => 0,
                ':total' => $data['totals']['total'],
                ':status' => $orderStatus
            ]);
            
            $orderNumber = $newOrderNumber;
        } else {
            throw $e;
        }
    }

    // Obtener ID de la orden
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

        // Descontar stock
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
            throw new Exception("Error crítico: No se pudo actualizar stock para: {$item['name']}");
        }
        
        $stockUpdated++;
        
        logOrder('✅ Stock descontado', [
            'productId' => $item['productId'],
            'quantity' => $item['quantity']
        ]);
    }

    // ========================================
    // 9. COMMIT
    // ========================================
    $db->commit();
    logOrder('✅ Transacción completada', ['orderId' => $orderId, 'orderNumber' => $orderNumber]);

    // ========================================
    // 10. RESPUESTA EXITOSA
    // ========================================
    $response = [
        'success' => true,
        'message' => 'Orden procesada exitosamente',
        'orderId' => (int)$orderId,
        'orderNumber' => $orderNumber,
        'paymentMethod' => $data['paymentMethod'],
        'status' => $orderStatus,
        'timestamp' => date('c'),
        'customer' => [
            'name' => $data['firstName'] . ' ' . $data['lastName'],
            'email' => $data['email']
        ],
        'totals' => [
            'subtotal' => (float)$data['totals']['subtotal'],
            'shipping' => 0.00, // ✅ SIEMPRE GRATIS
            'total' => (float)$data['totals']['total']
        ],
        'stockUpdated' => true
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
        logOrder('❌ Rollback ejecutado');
    }

    logOrder('❌ Database Error', ['message' => $e->getMessage()]);
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error de base de datos',
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
        logOrder('❌ Rollback ejecutado');
    }

    logOrder('❌ General Error', ['message' => $e->getMessage()]);
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al procesar la orden',
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} finally {
    if (isset($database)) {
        $database->closeConnection();
    }
}
?>