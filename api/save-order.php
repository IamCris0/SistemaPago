<?php
/**
 * API Endpoint: Guardar Orden
 * Mawewe E-commerce
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';

// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Solo permitir POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

try {
    $pdo = getDBConnection();
    
    // Obtener datos del request
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Datos inválidos');
    }
    
    // Validar campos requeridos
    $required = ['paypalOrderId', 'email', 'firstName', 'lastName', 'address', 'city', 'phone', 'items', 'totals'];
    foreach ($required as $field) {
        if (!isset($input[$field])) {
            throw new Exception("Campo requerido faltante: $field");
        }
    }
    
    // Iniciar transacción
    $pdo->beginTransaction();
    
    // Crear tabla de órdenes si no existe
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS orders (
            id SERIAL PRIMARY KEY,
            paypal_order_id VARCHAR(100) UNIQUE NOT NULL,
            email VARCHAR(255) NOT NULL,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            address TEXT NOT NULL,
            apartment VARCHAR(100),
            city VARCHAR(100) NOT NULL,
            postal_code VARCHAR(20),
            phone VARCHAR(50) NOT NULL,
            shipping_method VARCHAR(50) NOT NULL,
            subtotal DECIMAL(10,2) NOT NULL,
            shipping_cost DECIMAL(10,2) NOT NULL,
            discount DECIMAL(10,2) DEFAULT 0,
            total DECIMAL(10,2) NOT NULL,
            status VARCHAR(50) DEFAULT 'completed',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");
    
    // Crear tabla de items de orden si no existe
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS order_items (
            id SERIAL PRIMARY KEY,
            order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
            product_id INTEGER NOT NULL,
            product_sku VARCHAR(50) NOT NULL,
            product_name VARCHAR(255) NOT NULL,
            quantity INTEGER NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            subtotal DECIMAL(10,2) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");
    
    // Insertar orden
    $stmt = $pdo->prepare("
        INSERT INTO orders (
            paypal_order_id, email, first_name, last_name,
            address, apartment, city, postal_code, phone,
            shipping_method, subtotal, shipping_cost, discount, total
        ) VALUES (
            :paypal_order_id, :email, :first_name, :last_name,
            :address, :apartment, :city, :postal_code, :phone,
            :shipping_method, :subtotal, :shipping_cost, :discount, :total
        ) RETURNING id
    ");
    
    $stmt->execute([
        ':paypal_order_id' => $input['paypalOrderId'],
        ':email' => $input['email'],
        ':first_name' => $input['firstName'],
        ':last_name' => $input['lastName'],
        ':address' => $input['address'],
        ':apartment' => $input['apartment'] ?? null,
        ':city' => $input['city'],
        ':postal_code' => $input['postalCode'] ?? null,
        ':phone' => $input['phone'],
        ':shipping_method' => $input['shippingMethod'] ?? 'standard',
        ':subtotal' => $input['totals']['subtotal'],
        ':shipping_cost' => $input['totals']['shipping'],
        ':discount' => $input['totals']['discount'] ?? 0,
        ':total' => $input['totals']['total']
    ]);
    
    $orderId = $stmt->fetch()['id'];
    
    // Insertar items de la orden
    $itemStmt = $pdo->prepare("
        INSERT INTO order_items (
            order_id, product_id, product_sku, product_name,
            quantity, price, subtotal
        ) VALUES (
            :order_id, :product_id, :product_sku, :product_name,
            :quantity, :price, :subtotal
        )
    ");
    
    foreach ($input['items'] as $item) {
        $itemStmt->execute([
            ':order_id' => $orderId,
            ':product_id' => $item['productId'],
            ':product_sku' => $item['sku'],
            ':product_name' => $item['name'],
            ':quantity' => $item['quantity'],
            ':price' => $item['price'],
            ':subtotal' => $item['price'] * $item['quantity']
        ]);
        
        // Actualizar stock del producto
        $updateStock = $pdo->prepare("
            UPDATE products 
            SET stock = stock - :quantity
            WHERE id = :product_id AND stock >= :quantity
        ");
        
        $updated = $updateStock->execute([
            ':quantity' => $item['quantity'],
            ':product_id' => $item['productId']
        ]);
        
        if ($updateStock->rowCount() === 0) {
            throw new Exception("Stock insuficiente para: " . $item['name']);
        }
    }
    
    // Commit transacción
    $pdo->commit();
    
    // Respuesta exitosa
    http_response_code(201);
    echo json_encode([
        'success' => true,
        'orderId' => $orderId,
        'paypalOrderId' => $input['paypalOrderId'],
        'message' => 'Orden guardada exitosamente'
    ]);
    
} catch (Exception $e) {
    // Rollback en caso de error
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    
    error_log("Error al guardar orden: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Error al procesar la orden',
        'message' => $e->getMessage()
    ]);
}
?>