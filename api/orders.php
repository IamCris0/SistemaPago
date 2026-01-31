<?php
/**
 * API de Órdenes - Mawewe CRM
 * CRUD completo para gestión de órdenes
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/config/database.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception('Error de conexión a BD');
    }
    
    // ========================================
    // LISTAR ÓRDENES
    // ========================================
    if ($method === 'GET' && $action === 'list') {
        $page = (int)($_GET['page'] ?? 1);
        $limit = (int)($_GET['limit'] ?? 50);
        $offset = ($page - 1) * $limit;
        $status = $_GET['status'] ?? 'all';
        
        $sql = "SELECT 
                    o.id,
                    o.order_number,
                    o.email,
                    o.first_name,
                    o.last_name,
                    o.phone,
                    o.city,
                    o.payment_method,
                    o.subtotal,
                    o.shipping_cost,
                    o.total,
                    o.status,
                    o.created_at,
                    COUNT(oi.id) as item_count
                FROM orders o
                LEFT JOIN order_items oi ON o.id = oi.order_id";
        
        $params = [];
        
        if ($status !== 'all') {
            $sql .= " WHERE o.status = :status";
            $params[':status'] = $status;
        }
        
        $sql .= " GROUP BY o.id ORDER BY o.created_at DESC LIMIT :limit OFFSET :offset";
        
        $stmt = $db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $orders = $stmt->fetchAll();
        
        // Contar total
        $sqlCount = "SELECT COUNT(*) as total FROM orders";
        if ($status !== 'all') {
            $sqlCount .= " WHERE status = :status";
        }
        $stmtCount = $db->prepare($sqlCount);
        if ($status !== 'all') {
            $stmtCount->execute([':status' => $status]);
        } else {
            $stmtCount->execute();
        }
        $total = $stmtCount->fetch()['total'];
        
        foreach ($orders as &$order) {
            $order['id'] = (int)$order['id'];
            $order['subtotal'] = (float)$order['subtotal'];
            $order['shipping_cost'] = (float)$order['shipping_cost'];
            $order['total'] = (float)$order['total'];
            $order['item_count'] = (int)$order['item_count'];
        }
        
        echo json_encode([
            'success' => true,
            'orders' => $orders,
            'total' => (int)$total,
            'page' => $page,
            'pages' => ceil($total / $limit),
            'limit' => $limit
        ]);
        exit();
    }
    
    // ========================================
    // OBTENER UNA ORDEN
    // ========================================
    if ($method === 'GET' && $action === 'get') {
        $id = (int)($_GET['id'] ?? 0);
        
        if (!$id) {
            throw new Exception('ID de orden requerido');
        }
        
        // Obtener orden
        $sql = "SELECT * FROM orders WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->execute([':id' => $id]);
        $order = $stmt->fetch();
        
        if (!$order) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Orden no encontrada'
            ]);
            exit();
        }
        
        // Obtener items de la orden
        $sqlItems = "SELECT 
                        oi.*,
                        p.image
                    FROM order_items oi
                    LEFT JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id = :order_id";
        
        $stmtItems = $db->prepare($sqlItems);
        $stmtItems->execute([':order_id' => $id]);
        $items = $stmtItems->fetchAll();
        
        $order['id'] = (int)$order['id'];
        $order['subtotal'] = (float)$order['subtotal'];
        $order['shipping_cost'] = (float)$order['shipping_cost'];
        $order['total'] = (float)$order['total'];
        $order['items'] = $items;
        
        echo json_encode([
            'success' => true,
            'order' => $order
        ]);
        exit();
    }
    
    // ========================================
    // ACTUALIZAR ESTADO DE ORDEN
    // ========================================
    if ($method === 'PUT' && $action === 'update-status') {
        $input = json_decode(file_get_contents('php://input'), true);
        $id = (int)($input['id'] ?? 0);
        $newStatus = $input['status'] ?? '';
        
        if (!$id || !$newStatus) {
            throw new Exception('ID y estado requeridos');
        }
        
        $validStatuses = ['pending_payment', 'processing', 'completed', 'cancelled'];
        if (!in_array($newStatus, $validStatuses)) {
            throw new Exception('Estado inválido');
        }
        
        $sql = "UPDATE orders SET status = :status, updated_at = NOW() WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':status' => $newStatus,
            ':id' => $id
        ]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Estado actualizado correctamente'
        ]);
        exit();
    }
    
    // ========================================
    // ELIMINAR ORDEN
    // ========================================
    if ($method === 'DELETE' && $action === 'delete') {
        $id = (int)($_GET['id'] ?? 0);
        
        if (!$id) {
            throw new Exception('ID de orden requerido');
        }
        
        // Eliminar items primero (CASCADE debería hacerlo automáticamente)
        $sql = "DELETE FROM orders WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->execute([':id' => $id]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Orden eliminada correctamente'
        ]);
        exit();
    }
    
    // ========================================
    // ESTADÍSTICAS DE ÓRDENES
    // ========================================
    if ($method === 'GET' && $action === 'stats') {
        $startDate = $_GET['start_date'] ?? date('Y-m-01');
        $endDate = $_GET['end_date'] ?? date('Y-m-t');
        
        $sql = "SELECT 
                    COUNT(*) as total_orders,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN status = 'pending_payment' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
                    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                    SUM(total) as total_revenue,
                    AVG(total) as avg_order_value
                FROM orders
                WHERE DATE(created_at) BETWEEN :start_date AND :end_date";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':start_date' => $startDate,
            ':end_date' => $endDate
        ]);
        
        $stats = $stmt->fetch();
        
        echo json_encode([
            'success' => true,
            'stats' => [
                'total_orders' => (int)$stats['total_orders'],
                'completed' => (int)$stats['completed'],
                'pending' => (int)$stats['pending'],
                'processing' => (int)$stats['processing'],
                'cancelled' => (int)$stats['cancelled'],
                'total_revenue' => (float)$stats['total_revenue'],
                'avg_order_value' => (float)$stats['avg_order_value']
            ],
            'period' => [
                'start' => $startDate,
                'end' => $endDate
            ]
        ]);
        exit();
    }
    
    // Acción no válida
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Acción no válida'
    ]);
    
} catch (Exception $e) {
    error_log("Error orders.php: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error en el servidor',
        'error' => $e->getMessage()
    ]);
}
?>
