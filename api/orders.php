<?php
/**
 * API DE ÓRDENES - SISTEMA MAWEWE
 * ✅ Corregida para carga correcta de órdenes
 * ✅ Incluye información completa de productos y clientes
 * ✅ Optimizada para presentación
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, cache-control');
header('Content-Type: application/json; charset=UTF-8');

// Headers para evitar caché
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
    
    if (!$db) {
        throw new Exception('Error de conexión a BD');
    }
    
    $method = $_SERVER['REQUEST_METHOD'];
    
    // ========================================
    // GET: LISTAR ÓRDENES
    // ========================================
    if ($method === 'GET') {
        
        // Parámetros de filtrado
        $status = isset($_GET['status']) && $_GET['status'] !== 'all' && $_GET['status'] !== '' 
            ? trim($_GET['status']) 
            : null;
        
        $search = isset($_GET['search']) && $_GET['search'] !== '' 
            ? trim($_GET['search']) 
            : null;
        
        $date_from = isset($_GET['date_from']) && $_GET['date_from'] !== '' 
            ? trim($_GET['date_from']) 
            : null;
        
        $date_to = isset($_GET['date_to']) && $_GET['date_to'] !== '' 
            ? trim($_GET['date_to']) 
            : null;
        
        // Construir query SQL
        $sql = "SELECT 
                    o.id,
                    o.order_number,
                    o.customer_name,
                    o.customer_email,
                    o.customer_phone,
                    o.customer_address,
                    o.customer_cedula,
                    o.shipping_method,
                    o.shipping_cost,
                    o.subtotal,
                    o.tax,
                    o.total,
                    o.status,
                    o.payment_method,
                    o.payment_status,
                    o.notes,
                    o.tracking_number,
                    o.created_at,
                    o.updated_at,
                    o.items,
                    COUNT(*) OVER() as total_count
                FROM orders o
                WHERE 1=1";
        
        $params = [];
        
        // Filtro por estado
        if ($status !== null) {
            $sql .= " AND o.status = :status";
            $params[':status'] = $status;
        }
        
        // Filtro por búsqueda (número de orden, nombre cliente, email, teléfono)
        if ($search !== null) {
            $sql .= " AND (
                o.order_number LIKE :search 
                OR o.customer_name LIKE :search 
                OR o.customer_email LIKE :search 
                OR o.customer_phone LIKE :search
                OR o.customer_cedula LIKE :search
            )";
            $params[':search'] = '%' . $search . '%';
        }
        
        // Filtro por fecha desde
        if ($date_from !== null) {
            $sql .= " AND DATE(o.created_at) >= :date_from";
            $params[':date_from'] = $date_from;
        }
        
        // Filtro por fecha hasta
        if ($date_to !== null) {
            $sql .= " AND DATE(o.created_at) <= :date_to";
            $params[':date_to'] = $date_to;
        }
        
        // Ordenar por más recientes primero
        $sql .= " ORDER BY o.created_at DESC";
        
        // Preparar y ejecutar query
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Procesar cada orden
        foreach ($orders as &$order) {
            // Decodificar items JSON
            if (isset($order['items']) && is_string($order['items'])) {
                $order['items'] = json_decode($order['items'], true);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    $order['items'] = [];
                }
            } else {
                $order['items'] = [];
            }
            
            // Convertir valores numéricos
            $order['id'] = (int)$order['id'];
            $order['shipping_cost'] = (float)$order['shipping_cost'];
            $order['subtotal'] = (float)$order['subtotal'];
            $order['tax'] = (float)$order['tax'];
            $order['total'] = (float)$order['total'];
            $order['total_count'] = (int)$order['total_count'];
            
            // Calcular cantidad de items
            $order['items_count'] = count($order['items']);
        }
        
        // Total de registros
        $total_count = count($orders) > 0 ? (int)$orders[0]['total_count'] : 0;
        
        // Eliminar total_count de cada orden
        foreach ($orders as &$order) {
            unset($order['total_count']);
        }
        
        echo json_encode([
            'success' => true,
            'data' => $orders,
            'total' => $total_count,
            'message' => count($orders) > 0 ? 'Órdenes obtenidas correctamente' : 'No se encontraron órdenes'
        ], JSON_UNESCAPED_UNICODE);
        
    }
    
    // ========================================
    // POST: CREAR NUEVA ORDEN
    // ========================================
    else if ($method === 'POST') {
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            throw new Exception('Datos inválidos');
        }
        
        // Validar campos requeridos
        $required = ['customer_name', 'customer_email', 'customer_phone', 'customer_address', 
                     'items', 'subtotal', 'total', 'shipping_method', 'payment_method'];
        
        foreach ($required as $field) {
            if (!isset($input[$field]) || $input[$field] === '') {
                throw new Exception("Campo requerido: $field");
            }
        }
        
        // Validar que items sea un array con al menos 1 producto
        if (!is_array($input['items']) || count($input['items']) === 0) {
            throw new Exception('Debe incluir al menos un producto');
        }
        
        // Generar número de orden único
        $order_number = 'ORD-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -6));
        
        // Preparar datos
        $customer_name = trim($input['customer_name']);
        $customer_email = trim($input['customer_email']);
        $customer_phone = trim($input['customer_phone']);
        $customer_address = trim($input['customer_address']);
        $customer_cedula = isset($input['customer_cedula']) ? trim($input['customer_cedula']) : null;
        $shipping_method = trim($input['shipping_method']);
        $shipping_cost = isset($input['shipping_cost']) ? (float)$input['shipping_cost'] : 0.0;
        $subtotal = (float)$input['subtotal'];
        $tax = isset($input['tax']) ? (float)$input['tax'] : 0.0;
        $total = (float)$input['total'];
        $payment_method = trim($input['payment_method']);
        $payment_status = isset($input['payment_status']) ? trim($input['payment_status']) : 'pending';
        $notes = isset($input['notes']) ? trim($input['notes']) : null;
        $items_json = json_encode($input['items'], JSON_UNESCAPED_UNICODE);
        
        // Insertar orden
        $sql = "INSERT INTO orders (
                    order_number, customer_name, customer_email, customer_phone, 
                    customer_address, customer_cedula, shipping_method, shipping_cost,
                    subtotal, tax, total, status, payment_method, payment_status,
                    notes, items, created_at, updated_at
                ) VALUES (
                    :order_number, :customer_name, :customer_email, :customer_phone,
                    :customer_address, :customer_cedula, :shipping_method, :shipping_cost,
                    :subtotal, :tax, :total, 'pending', :payment_method, :payment_status,
                    :notes, :items, NOW(), NOW()
                )";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':order_number' => $order_number,
            ':customer_name' => $customer_name,
            ':customer_email' => $customer_email,
            ':customer_phone' => $customer_phone,
            ':customer_address' => $customer_address,
            ':customer_cedula' => $customer_cedula,
            ':shipping_method' => $shipping_method,
            ':shipping_cost' => $shipping_cost,
            ':subtotal' => $subtotal,
            ':tax' => $tax,
            ':total' => $total,
            ':payment_method' => $payment_method,
            ':payment_status' => $payment_status,
            ':notes' => $notes,
            ':items' => $items_json
        ]);
        
        $order_id = $db->lastInsertId();
        
        echo json_encode([
            'success' => true,
            'data' => [
                'id' => (int)$order_id,
                'order_number' => $order_number
            ],
            'message' => 'Orden creada exitosamente'
        ], JSON_UNESCAPED_UNICODE);
        
    }
    
    // ========================================
    // PUT: ACTUALIZAR ORDEN
    // ========================================
    else if ($method === 'PUT') {
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || !isset($input['id'])) {
            throw new Exception('ID de orden requerido');
        }
        
        $order_id = (int)$input['id'];
        
        // Verificar que la orden existe
        $stmt = $db->prepare("SELECT id FROM orders WHERE id = :id");
        $stmt->execute([':id' => $order_id]);
        if (!$stmt->fetch()) {
            throw new Exception('Orden no encontrada');
        }
        
        // Construir query de actualización dinámicamente
        $updates = [];
        $params = [':id' => $order_id];
        
        $updatable_fields = [
            'status', 'payment_status', 'tracking_number', 'notes',
            'customer_name', 'customer_email', 'customer_phone', 
            'customer_address', 'customer_cedula'
        ];
        
        foreach ($updatable_fields as $field) {
            if (isset($input[$field])) {
                $updates[] = "$field = :$field";
                $params[":$field"] = trim($input[$field]);
            }
        }
        
        if (count($updates) === 0) {
            throw new Exception('No hay campos para actualizar');
        }
        
        $updates[] = "updated_at = NOW()";
        
        $sql = "UPDATE orders SET " . implode(', ', $updates) . " WHERE id = :id";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        
        echo json_encode([
            'success' => true,
            'message' => 'Orden actualizada exitosamente'
        ], JSON_UNESCAPED_UNICODE);
        
    }
    
    else {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}