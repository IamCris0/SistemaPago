<?php
/**
 * API de Auditoria - Mawewe CRM
 * ✅ Corregido: parametro action_filter para filtrar (evita conflicto con action=list)
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
    if (!$db) throw new Exception('Error de conexion a BD');

    /* ══════════════════════════════════════
       REGISTRAR ACCION (POST)
    ══════════════════════════════════════ */
    if ($method === 'POST' && $action === 'log') {
        $input = json_decode(file_get_contents('php://input'), true);

        $sql = "INSERT INTO audit_log
                    (user_id, action, entity_type, entity_id, old_value, new_value, description, ip_address)
                VALUES
                    (:uid, :act, :et, :eid, :ov, :nv, :desc, :ip)";

        $db->prepare($sql)->execute([
            ':uid'  => $input['user_id']     ?? null,
            ':act'  => $input['action'],
            ':et'   => $input['entity_type'] ?? null,
            ':eid'  => $input['entity_id']   ?? null,
            ':ov'   => isset($input['old_value']) ? json_encode($input['old_value']) : null,
            ':nv'   => isset($input['new_value']) ? json_encode($input['new_value']) : null,
            ':desc' => $input['description'] ?? '',
            ':ip'   => $_SERVER['REMOTE_ADDR'] ?? 'Unknown'
        ]);

        echo json_encode(['success' => true, 'id' => (int)$db->lastInsertId()]);
        exit();
    }

    /* ══════════════════════════════════════
       LISTAR HISTORIAL (GET action=list)
    ══════════════════════════════════════ */
    if ($method === 'GET' && $action === 'list') {
        $page   = max(1, (int)($_GET['page']  ?? 1));
        $limit  = max(1, (int)($_GET['limit'] ?? 50));
        $offset = ($page - 1) * $limit;

        $filters = [];
        $params  = [];

        // ✅ FIX: usar action_filter para el filtro de tipo de accion
        if (!empty($_GET['action_filter'])) {
            $filters[] = "a.action = :action_filter";
            $params[':action_filter'] = $_GET['action_filter'];
        }
        // compatibilidad con frontend antiguo que enviaba action directamente
        // pero solo si NO es uno de los valores reservados de routing
        if (!empty($_GET['filter_action']) && !in_array($_GET['filter_action'], ['list','log','stats','entity-history'])) {
            $filters[] = "a.action = :filter_action";
            $params[':filter_action'] = $_GET['filter_action'];
        }

        if (!empty($_GET['entity_type'])) {
            $filters[] = "a.entity_type = :entity_type";
            $params[':entity_type'] = $_GET['entity_type'];
        }

        if (!empty($_GET['user_id'])) {
            $filters[] = "a.user_id = :user_id";
            $params[':user_id'] = (int)$_GET['user_id'];
        }

        if (!empty($_GET['start_date'])) {
            $filters[] = "DATE(a.created_at) >= :start_date";
            $params[':start_date'] = $_GET['start_date'];
        }

        if (!empty($_GET['end_date'])) {
            $filters[] = "DATE(a.created_at) <= :end_date";
            $params[':end_date'] = $_GET['end_date'];
        }

        $where = !empty($filters) ? 'WHERE ' . implode(' AND ', $filters) : '';

        // Contar total
        $sqlCount = "SELECT COUNT(*) as total FROM audit_log a $where";
        $stmtCount = $db->prepare($sqlCount);
        $stmtCount->execute($params);
        $total = (int)$stmtCount->fetch()['total'];

        // Obtener registros
        $sql = "SELECT 
                    a.*,
                    e.nombre AS user_name,
                    e.cargo  AS user_role
                FROM audit_log a
                LEFT JOIN employees e ON a.user_id = e.id
                $where
                ORDER BY a.created_at DESC
                LIMIT :lim OFFSET :off";

        $stmt = $db->prepare($sql);
        foreach ($params as $k => $v) $stmt->bindValue($k, $v);
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':off', $offset, PDO::PARAM_INT);
        $stmt->execute();

        $logs = $stmt->fetchAll();

        foreach ($logs as &$log) {
            $log['id']        = (int)$log['id'];
            $log['user_id']   = $log['user_id']   ? (int)$log['user_id']   : null;
            $log['entity_id'] = $log['entity_id'] ? (int)$log['entity_id'] : null;
            if ($log['old_value']) $log['old_value'] = json_decode($log['old_value'], true);
            if ($log['new_value']) $log['new_value'] = json_decode($log['new_value'], true);
        }

        echo json_encode([
            'success' => true,
            'logs'    => $logs,
            'total'   => $total,
            'page'    => $page,
            'pages'   => max(1, (int)ceil($total / $limit)),
            'limit'   => $limit
        ]);
        exit();
    }

    /* ══════════════════════════════════════
       ESTADISTICAS (GET action=stats)
    ══════════════════════════════════════ */
    if ($method === 'GET' && $action === 'stats') {
        $startDate = $_GET['start_date'] ?? date('Y-m-01');
        $endDate   = $_GET['end_date']   ?? date('Y-m-t');

        $stmt = $db->prepare("SELECT action, COUNT(*) as count
                               FROM audit_log
                               WHERE DATE(created_at) BETWEEN :s AND :e
                               GROUP BY action ORDER BY count DESC");
        $stmt->execute([':s' => $startDate, ':e' => $endDate]);
        $byAction = $stmt->fetchAll();

        $stmt = $db->prepare("SELECT entity_type, COUNT(*) as count
                               FROM audit_log
                               WHERE DATE(created_at) BETWEEN :s AND :e AND entity_type IS NOT NULL
                               GROUP BY entity_type ORDER BY count DESC");
        $stmt->execute([':s' => $startDate, ':e' => $endDate]);
        $byEntity = $stmt->fetchAll();

        echo json_encode([
            'success'   => true,
            'by_action' => $byAction,
            'by_entity' => $byEntity,
            'period'    => ['start' => $startDate, 'end' => $endDate]
        ]);
        exit();
    }

    /* ══════════════════════════════════════
       HISTORIAL DE ENTIDAD (GET action=entity-history)
    ══════════════════════════════════════ */
    if ($method === 'GET' && $action === 'entity-history') {
        $entityType = $_GET['entity_type'] ?? '';
        $entityId   = (int)($_GET['entity_id'] ?? 0);

        if (!$entityType || !$entityId) throw new Exception('entity_type y entity_id requeridos');

        $sql = "SELECT a.*, e.nombre AS user_name, e.cargo AS user_role
                FROM audit_log a
                LEFT JOIN employees e ON a.user_id = e.id
                WHERE a.entity_type = :et AND a.entity_id = :eid
                ORDER BY a.created_at DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute([':et' => $entityType, ':eid' => $entityId]);
        $logs = $stmt->fetchAll();

        foreach ($logs as &$log) {
            $log['id'] = (int)$log['id'];
            if ($log['old_value']) $log['old_value'] = json_decode($log['old_value'], true);
            if ($log['new_value']) $log['new_value'] = json_decode($log['new_value'], true);
        }

        echo json_encode(['success' => true, 'logs' => $logs, 'total' => count($logs)]);
        exit();
    }

    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Accion no valida: ' . $action]);

} catch (Exception $e) {
    error_log('audit.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}