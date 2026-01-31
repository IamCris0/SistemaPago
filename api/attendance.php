<?php
/**
 * API de Asistencia - Mawewe CRM
 * Control de entrada y salida de empleados
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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
    // MARCAR ENTRADA
    // ========================================
    if ($method === 'POST' && $action === 'check-in') {
        $input = json_decode(file_get_contents('php://input'), true);
        $employeeId = $input['employee_id'] ?? 0;
        
        if (!$employeeId) {
            throw new Exception('ID de empleado requerido');
        }
        
        // Verificar si ya marcó entrada hoy
        $today = date('Y-m-d');
        $sql = "SELECT * FROM attendance 
                WHERE employee_id = :employee_id 
                AND DATE(check_in) = :today 
                AND check_out IS NULL";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':employee_id' => $employeeId,
            ':today' => $today
        ]);
        
        if ($stmt->fetch()) {
            throw new Exception('Ya has marcado entrada hoy');
        }
        
        // Marcar entrada
        $sql = "INSERT INTO attendance (employee_id, check_in, date) 
                VALUES (:employee_id, NOW(), :date)";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':employee_id' => $employeeId,
            ':date' => $today
        ]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Entrada marcada exitosamente',
            'time' => date('H:i:s'),
            'id' => (int)$db->lastInsertId()
        ]);
        exit();
    }
    
    // ========================================
    // MARCAR SALIDA
    // ========================================
    if ($method === 'POST' && $action === 'check-out') {
        $input = json_decode(file_get_contents('php://input'), true);
        $employeeId = $input['employee_id'] ?? 0;
        
        if (!$employeeId) {
            throw new Exception('ID de empleado requerido');
        }
        
        // Buscar entrada de hoy sin salida
        $today = date('Y-m-d');
        $sql = "SELECT * FROM attendance 
                WHERE employee_id = :employee_id 
                AND DATE(check_in) = :today 
                AND check_out IS NULL 
                ORDER BY check_in DESC 
                LIMIT 1";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':employee_id' => $employeeId,
            ':today' => $today
        ]);
        
        $attendance = $stmt->fetch();
        
        if (!$attendance) {
            throw new Exception('No hay entrada registrada hoy');
        }
        
        // Calcular horas trabajadas
        $checkIn = new DateTime($attendance['check_in']);
        $checkOut = new DateTime();
        $diff = $checkIn->diff($checkOut);
        $hoursWorked = $diff->h + ($diff->i / 60);
        
        // Marcar salida
        $sql = "UPDATE attendance 
                SET check_out = NOW(), 
                    hours_worked = :hours_worked 
                WHERE id = :id";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':hours_worked' => round($hoursWorked, 2),
            ':id' => $attendance['id']
        ]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Salida marcada exitosamente',
            'time' => date('H:i:s'),
            'hours_worked' => round($hoursWorked, 2)
        ]);
        exit();
    }
    
    // ========================================
    // OBTENER ASISTENCIA DE HOY
    // ========================================
    if ($method === 'GET' && $action === 'today') {
        $employeeId = $_GET['employee_id'] ?? 0;
        
        $today = date('Y-m-d');
        $sql = "SELECT a.*, e.nombre, e.cargo 
                FROM attendance a
                JOIN employees e ON a.employee_id = e.id
                WHERE DATE(a.check_in) = :today";
        
        $params = [':today' => $today];
        
        if ($employeeId) {
            $sql .= " AND a.employee_id = :employee_id";
            $params[':employee_id'] = $employeeId;
        }
        
        $sql .= " ORDER BY a.check_in DESC";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $records = $stmt->fetchAll();
        
        foreach ($records as &$record) {
            $record['id'] = (int)$record['id'];
            $record['employee_id'] = (int)$record['employee_id'];
            $record['hours_worked'] = (float)($record['hours_worked'] ?? 0);
        }
        
        echo json_encode([
            'success' => true,
            'records' => $records,
            'total' => count($records)
        ]);
        exit();
    }
    
    // ========================================
    // OBTENER HISTORIAL DE ASISTENCIA
    // ========================================
    if ($method === 'GET' && $action === 'history') {
        $employeeId = $_GET['employee_id'] ?? 0;
        $startDate = $_GET['start_date'] ?? date('Y-m-01');
        $endDate = $_GET['end_date'] ?? date('Y-m-t');
        
        $sql = "SELECT a.*, e.nombre, e.cargo 
                FROM attendance a
                JOIN employees e ON a.employee_id = e.id
                WHERE a.date BETWEEN :start_date AND :end_date";
        
        $params = [
            ':start_date' => $startDate,
            ':end_date' => $endDate
        ];
        
        if ($employeeId) {
            $sql .= " AND a.employee_id = :employee_id";
            $params[':employee_id'] = $employeeId;
        }
        
        $sql .= " ORDER BY a.date DESC, a.check_in DESC";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $records = $stmt->fetchAll();
        
        foreach ($records as &$record) {
            $record['id'] = (int)$record['id'];
            $record['employee_id'] = (int)$record['employee_id'];
            $record['hours_worked'] = (float)($record['hours_worked'] ?? 0);
        }
        
        echo json_encode([
            'success' => true,
            'records' => $records,
            'total' => count($records),
            'period' => [
                'start' => $startDate,
                'end' => $endDate
            ]
        ]);
        exit();
    }
    
    // ========================================
    // ESTADÍSTICAS DE ASISTENCIA
    // ========================================
    if ($method === 'GET' && $action === 'stats') {
        $employeeId = $_GET['employee_id'] ?? 0;
        $month = $_GET['month'] ?? date('Y-m');
        
        $sql = "SELECT 
                    COUNT(*) as total_days,
                    SUM(CASE WHEN check_out IS NOT NULL THEN 1 ELSE 0 END) as complete_days,
                    SUM(hours_worked) as total_hours,
                    AVG(hours_worked) as avg_hours
                FROM attendance
                WHERE DATE_FORMAT(date, '%Y-%m') = :month";
        
        $params = [':month' => $month];
        
        if ($employeeId) {
            $sql .= " AND employee_id = :employee_id";
            $params[':employee_id'] = $employeeId;
        }
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $stats = $stmt->fetch();
        
        echo json_encode([
            'success' => true,
            'stats' => [
                'total_days' => (int)$stats['total_days'],
                'complete_days' => (int)$stats['complete_days'],
                'total_hours' => round((float)$stats['total_hours'], 2),
                'avg_hours' => round((float)$stats['avg_hours'], 2)
            ],
            'month' => $month
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
    error_log("Error attendance.php: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error en el servidor',
        'error' => $e->getMessage()
    ]);
}
?>
