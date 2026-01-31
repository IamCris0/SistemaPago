<?php
/**
 * API de Auditoría - Mawewe CRM v3.0
 * Registro y consulta de todas las acciones del sistema
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
    // REGISTRAR ACCIÓN
    // ========================================
    if ($method === 'POST' && $action === 'log') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $sql = "INSERT INTO audit_log (
                    user_id, action, entity_type, entity_id, 
                    old_value, new_value, description, ip_address
                ) VALUES (
                    :user_id, :action, :entity_type, :entity_id,
                    :old_value, :new_value, :description, :ip
                )";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':user_id' => $input['user_id'] ?? null,
            ':action' => $input['action'],
            ':entity_type' => $input['entity_type'],
            ':entity_id' => $input['entity_id'] ?? null,
            ':old_value' => isset($input['old_value']) ? json_encode($input['old_value']) : null,
            ':new_value' => isset($input['new_value']) ? json_encode($input['new_value']) : null,
            ':description' => $input['description'] ?? '',
            ':ip' => $_SERVER['REMOTE_ADDR'] ?? 'Unknown'
        ]);
        
        echo json_encode([
            'success' => true,
            'id' => (int)$db->lastInsertId()
        ]);
        exit();
    }
    
    // ========================================
    // OBTENER HISTORIAL COMPLETO
    // ========================================
    if ($method === 'GET' && $action === 'list') {
        $page = (int)($_GET['page'] ?? 1);
        $limit = (int)($_GET['limit'] ?? 50);
        $offset = ($page - 1) * $limit;
        
        $filters = [];
        $params = [];
        
        // Filtros opcionales
        if (!empty($_GET['user_id'])) {
            $filters[] = "a.user_id = :user_id";
            $params[':user_id'] = (int)$_GET['user_id'];
        }
        
        if (!empty($_GET['entity_type'])) {
            $filters[] = "a.entity_type = :entity_type";
            $params[':entity_type'] = $_GET['entity_type'];
        }
        
        if (!empty($_GET['action'])) {
            $filters[] = "a.action = :action";
            $params[':action'] = $_GET['action'];
        }
        
        if (!empty($_GET['start_date'])) {
            $filters[] = "DATE(a.created_at) >= :start_date";
            $params[':start_date'] = $_GET['start_date'];
        }
        
        if (!empty($_GET['end_date'])) {
            $filters[] = "DATE(a.created_at) <= :end_date";
            $params[':end_date'] = $_GET['end_date'];
        }
        
        $whereClause = !empty($filters) ? 'WHERE ' . implode(' AND ', $filters) : '';
        
        // Contar total
        $sqlCount = "SELECT COUNT(*) as total FROM audit_log a $whereClause";
        $stmtCount = $db->prepare($sqlCount);
        $stmtCount->execute($params);
        $total = $stmtCount->fetch()['total'];
        
        // Obtener registros
        $sql = "SELECT 
                    a.*,
                    e.nombre as user_name,
                    e.cargo as user_role
                FROM audit_log a
                LEFT JOIN employees e ON a.user_id = e.id
                $whereClause
                ORDER BY a.created_at DESC
                LIMIT :limit OFFSET :offset";
        
        $stmt = $db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $logs = $stmt->fetchAll();
        
        // Procesar datos
        foreach ($logs as &$log) {
            $log['id'] = (int)$log['id'];
            $log['user_id'] = $log['user_id'] ? (int)$log['user_id'] : null;
            $log['entity_id'] = $log['entity_id'] ? (int)$log['entity_id'] : null;
            
            // Decodificar JSON
            if ($log['old_value']) {
                $log['old_value'] = json_decode($log['old_value'], true);
            }
            if ($log['new_value']) {
                $log['new_value'] = json_decode($log['new_value'], true);
            }
        }
        
        echo json_encode([
            'success' => true,
            'logs' => $logs,
            'total' => (int)$total,
            'page' => $page,
            'pages' => ceil($total / $limit),
            'limit' => $limit
        ]);
        exit();
    }
    
    // ========================================
    // ESTADÍSTICAS DE AUDITORÍA
    // ========================================
    if ($method === 'GET' && $action === 'stats') {
        $startDate = $_GET['start_date'] ?? date('Y-m-01');
        $endDate = $_GET['end_date'] ?? date('Y-m-t');
        
        // Acciones por tipo
        $sqlByAction = "SELECT 
                            action,
                            COUNT(*) as count
                        FROM audit_log
                        WHERE DATE(created_at) BETWEEN :start AND :end
                        GROUP BY action
                        ORDER BY count DESC";
        
        $stmtAction = $db->prepare($sqlByAction);
        $stmtAction->execute([':start' => $startDate, ':end' => $endDate]);
        $byAction = $stmtAction->fetchAll();
        
        // Entidades más modificadas
        $sqlByEntity = "SELECT 
                            entity_type,
                            COUNT(*) as count
                        FROM audit_log
                        WHERE DATE(created_at) BETWEEN :start AND :end
                        AND entity_type IS NOT NULL
                        GROUP BY entity_type
                        ORDER BY count DESC";
        
        $stmtEntity = $db->prepare($sqlByEntity);
        $stmtEntity->execute([':start' => $startDate, ':end' => $endDate]);
        $byEntity = $stmtEntity->fetchAll();
        
        // Usuarios más activos
        $sqlByUser = "SELECT 
                            e.nombre,
                            e.cargo,
                            COUNT(*) as count
                        FROM audit_log a
                        JOIN employees e ON a.user_id = e.id
                        WHERE DATE(a.created_at) BETWEEN :start AND :end
                        GROUP BY a.user_id
                        ORDER BY count DESC
                        LIMIT 10";
        
        $stmtUser = $db->prepare($sqlByUser);
        $stmtUser->execute([':start' => $startDate, ':end' => $endDate]);
        $byUser = $stmtUser->fetchAll();
        
        // Actividad por día
        $sqlByDay = "SELECT 
                        DATE(created_at) as date,
                        COUNT(*) as count
                    FROM audit_log
                    WHERE DATE(created_at) BETWEEN :start AND :end
                    GROUP BY DATE(created_at)
                    ORDER BY date";
        
        $stmtDay = $db->prepare($sqlByDay);
        $stmtDay->execute([':start' => $startDate, ':end' => $endDate]);
        $byDay = $stmtDay->fetchAll();
        
        echo json_encode([
            'success' => true,
            'period' => [
                'start' => $startDate,
                'end' => $endDate
            ],
            'by_action' => $byAction,
            'by_entity' => $byEntity,
            'by_user' => $byUser,
            'by_day' => $byDay
        ]);
        exit();
    }
    
    // ========================================
    // HISTORIAL DE UNA ENTIDAD ESPECÍFICA
    // ========================================
    if ($method === 'GET' && $action === 'entity-history') {
        $entityType = $_GET['entity_type'] ?? '';
        $entityId = (int)($_GET['entity_id'] ?? 0);
        
        if (empty($entityType) || !$entityId) {
            throw new Exception('Tipo de entidad e ID requeridos');
        }
        
        $sql = "SELECT 
                    a.*,
                    e.nombre as user_name,
                    e.cargo as user_role
                FROM audit_log a
                LEFT JOIN employees e ON a.user_id = e.id
                WHERE a.entity_type = :entity_type 
                AND a.entity_id = :entity_id
                ORDER BY a.created_at DESC";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':entity_type' => $entityType,
            ':entity_id' => $entityId
        ]);
        
        $logs = $stmt->fetchAll();
        
        // Procesar datos
        foreach ($logs as &$log) {
            $log['id'] = (int)$log['id'];
            $log['user_id'] = $log['user_id'] ? (int)$log['user_id'] : null;
            $log['entity_id'] = (int)$log['entity_id'];
            
            if ($log['old_value']) {
                $log['old_value'] = json_decode($log['old_value'], true);
            }
            if ($log['new_value']) {
                $log['new_value'] = json_decode($log['new_value'], true);
            }
        }
        
        echo json_encode([
            'success' => true,
            'logs' => $logs,
            'total' => count($logs)
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
    error_log("Error audit.php: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error en el servidor',
        'error' => $e->getMessage()
    ]);
}
?>
