<?php
/**
 * API de Reportes - Mawewe CRM
 * Generación de reportes de ventas, productos y empleados
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/config/database.php';

$action = $_GET['action'] ?? '';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception('Error de conexión a BD');
    }
    
    // ========================================
    // REPORTE DE VENTAS
    // ========================================
    if ($action === 'sales') {
        $startDate = $_GET['start_date'] ?? date('Y-m-01');
        $endDate = $_GET['end_date'] ?? date('Y-m-t');
        
        // Ventas totales
        $sqlTotal = "SELECT 
                        COUNT(*) as total_orders,
                        SUM(total) as total_revenue,
                        AVG(total) as avg_order_value,
                        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
                        SUM(CASE WHEN status = 'pending_payment' THEN 1 ELSE 0 END) as pending_orders
                    FROM orders 
                    WHERE DATE(created_at) BETWEEN :start_date AND :end_date";
        
        $stmt = $db->prepare($sqlTotal);
        $stmt->execute([':start_date' => $startDate, ':end_date' => $endDate]);
        $totals = $stmt->fetch();
        
        // Ventas por día
        $sqlDaily = "SELECT 
                        DATE(created_at) as date,
                        COUNT(*) as orders,
                        SUM(total) as revenue
                    FROM orders 
                    WHERE DATE(created_at) BETWEEN :start_date AND :end_date
                    GROUP BY DATE(created_at)
                    ORDER BY date";
        
        $stmt = $db->prepare($sqlDaily);
        $stmt->execute([':start_date' => $startDate, ':end_date' => $endDate]);
        $daily = $stmt->fetchAll();
        
        // Productos más vendidos
        $sqlTopProducts = "SELECT 
                            oi.product_name,
                            oi.product_sku,
                            SUM(oi.quantity) as total_sold,
                            SUM(oi.subtotal) as total_revenue
                        FROM order_items oi
                        JOIN orders o ON oi.order_id = o.id
                        WHERE DATE(o.created_at) BETWEEN :start_date AND :end_date
                        GROUP BY oi.product_id
                        ORDER BY total_sold DESC
                        LIMIT 10";
        
        $stmt = $db->prepare($sqlTopProducts);
        $stmt->execute([':start_date' => $startDate, ':end_date' => $endDate]);
        $topProducts = $stmt->fetchAll();
        
        echo json_encode([
            'success' => true,
            'period' => [
                'start' => $startDate,
                'end' => $endDate
            ],
            'totals' => [
                'total_orders' => (int)$totals['total_orders'],
                'total_revenue' => (float)$totals['total_revenue'],
                'avg_order_value' => (float)$totals['avg_order_value'],
                'completed_orders' => (int)$totals['completed_orders'],
                'pending_orders' => (int)$totals['pending_orders']
            ],
            'daily' => $daily,
            'top_products' => $topProducts
        ]);
        exit();
    }
    
    // ========================================
    // REPORTE DE PRODUCTOS
    // ========================================
    if ($action === 'products') {
        // Resumen de inventario
        $sqlInventory = "SELECT 
                            COUNT(*) as total_products,
                            SUM(CASE WHEN stock > 0 THEN 1 ELSE 0 END) as in_stock,
                            SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as out_of_stock,
                            SUM(CASE WHEN stock < 10 THEN 1 ELSE 0 END) as low_stock,
                            SUM(stock) as total_items
                        FROM products 
                        WHERE active = 1";
        
        $stmt = $db->prepare($sqlInventory);
        $stmt->execute();
        $inventory = $stmt->fetch();
        
        // Productos con bajo stock
        $sqlLowStock = "SELECT id, sku, name, category, stock, price
                        FROM products 
                        WHERE active = 1 AND stock < 10
                        ORDER BY stock ASC
                        LIMIT 20";
        
        $stmt = $db->prepare($sqlLowStock);
        $stmt->execute();
        $lowStock = $stmt->fetchAll();
        
        // Productos sin stock
        $sqlOutStock = "SELECT id, sku, name, category, price
                        FROM products 
                        WHERE active = 1 AND stock = 0
                        ORDER BY name
                        LIMIT 20";
        
        $stmt = $db->prepare($sqlOutStock);
        $stmt->execute();
        $outStock = $stmt->fetchAll();
        
        // Productos por categoría
        $sqlByCategory = "SELECT 
                            category,
                            COUNT(*) as count,
                            SUM(stock) as total_stock
                        FROM products 
                        WHERE active = 1
                        GROUP BY category
                        ORDER BY count DESC";
        
        $stmt = $db->prepare($sqlByCategory);
        $stmt->execute();
        $byCategory = $stmt->fetchAll();
        
        echo json_encode([
            'success' => true,
            'inventory' => [
                'total_products' => (int)$inventory['total_products'],
                'in_stock' => (int)$inventory['in_stock'],
                'out_of_stock' => (int)$inventory['out_of_stock'],
                'low_stock' => (int)$inventory['low_stock'],
                'total_items' => (int)$inventory['total_items']
            ],
            'low_stock' => $lowStock,
            'out_of_stock' => $outStock,
            'by_category' => $byCategory
        ]);
        exit();
    }
    
    // ========================================
    // REPORTE DE EMPLEADOS
    // ========================================
    if ($action === 'employees') {
        $month = $_GET['month'] ?? date('Y-m');
        
        // Resumen de empleados
        $sqlEmployees = "SELECT 
                            COUNT(*) as total_employees,
                            SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) as active_employees,
                            SUM(CASE WHEN is_admin = 1 THEN 1 ELSE 0 END) as admins
                        FROM employees";
        
        $stmt = $db->prepare($sqlEmployees);
        $stmt->execute();
        $employees = $stmt->fetch();
        
        // Asistencia por empleado
        $sqlAttendance = "SELECT 
                            e.id,
                            e.nombre,
                            e.cargo,
                            COUNT(a.id) as days_worked,
                            SUM(a.hours_worked) as total_hours,
                            AVG(a.hours_worked) as avg_hours
                        FROM employees e
                        LEFT JOIN attendance a ON e.id = a.employee_id 
                            AND DATE_FORMAT(a.date, '%Y-%m') = :month
                        WHERE e.active = 1
                        GROUP BY e.id
                        ORDER BY total_hours DESC";
        
        $stmt = $db->prepare($sqlAttendance);
        $stmt->execute([':month' => $month]);
        $attendance = $stmt->fetchAll();
        
        foreach ($attendance as &$emp) {
            $emp['days_worked'] = (int)$emp['days_worked'];
            $emp['total_hours'] = round((float)($emp['total_hours'] ?? 0), 2);
            $emp['avg_hours'] = round((float)($emp['avg_hours'] ?? 0), 2);
        }
        
        echo json_encode([
            'success' => true,
            'month' => $month,
            'summary' => [
                'total_employees' => (int)$employees['total_employees'],
                'active_employees' => (int)$employees['active_employees'],
                'admins' => (int)$employees['admins']
            ],
            'attendance' => $attendance
        ]);
        exit();
    }
    
    // ========================================
    // DASHBOARD GENERAL
    // ========================================
    if ($action === 'dashboard') {
        $today = date('Y-m-d');
        $thisMonth = date('Y-m');
        
        // Ventas del día
        $sqlToday = "SELECT 
                        COUNT(*) as orders_today,
                        COALESCE(SUM(total), 0) as revenue_today
                    FROM orders 
                    WHERE DATE(created_at) = :today";
        
        $stmt = $db->prepare($sqlToday);
        $stmt->execute([':today' => $today]);
        $todayStats = $stmt->fetch();
        
        // Ventas del mes
        $sqlMonth = "SELECT 
                        COUNT(*) as orders_month,
                        COALESCE(SUM(total), 0) as revenue_month
                    FROM orders 
                    WHERE DATE_FORMAT(created_at, '%Y-%m') = :month";
        
        $stmt = $db->prepare($sqlMonth);
        $stmt->execute([':month' => $thisMonth]);
        $monthStats = $stmt->fetch();
        
        // Productos con bajo stock
        $sqlLowStock = "SELECT COUNT(*) as count 
                        FROM products 
                        WHERE active = 1 AND stock < 10";
        
        $stmt = $db->prepare($sqlLowStock);
        $stmt->execute();
        $lowStockCount = $stmt->fetch()['count'];
        
        // Empleados presentes hoy
        $sqlPresent = "SELECT COUNT(DISTINCT employee_id) as count
                        FROM attendance 
                        WHERE DATE(check_in) = :today";
        
        $stmt = $db->prepare($sqlPresent);
        $stmt->execute([':today' => $today]);
        $presentCount = $stmt->fetch()['count'];
        
        // Órdenes pendientes
        $sqlPending = "SELECT COUNT(*) as count 
                        FROM orders 
                        WHERE status = 'pending_payment'";
        
        $stmt = $db->prepare($sqlPending);
        $stmt->execute();
        $pendingCount = $stmt->fetch()['count'];
        
        echo json_encode([
            'success' => true,
            'date' => $today,
            'today' => [
                'orders' => (int)$todayStats['orders_today'],
                'revenue' => (float)$todayStats['revenue_today'],
                'employees_present' => (int)$presentCount
            ],
            'month' => [
                'orders' => (int)$monthStats['orders_month'],
                'revenue' => (float)$monthStats['revenue_month']
            ],
            'alerts' => [
                'low_stock' => (int)$lowStockCount,
                'pending_orders' => (int)$pendingCount
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
    error_log("Error reports.php: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error en el servidor',
        'error' => $e->getMessage()
    ]);
}
?>
