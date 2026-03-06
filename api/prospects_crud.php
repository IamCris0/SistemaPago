<?php
/**
 * API Prospectos - Mawewe CRM
 * CRUD completo + conversión a cliente
 *
 * Endpoints:
 *   GET  ?action=list              → Listar prospectos (filtros: plataforma, estado)
 *   GET  ?action=get&id=X          → Obtener prospecto
 *   POST ?action=create            → Crear prospecto
 *   POST ?action=update            → Actualizar prospecto
 *   POST ?action=convert&id=X      → Convertir a cliente (→ clients, elimina de prospects)
 *   POST ?action=delete&id=X       → Eliminar prospecto
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once __DIR__ . '/config/database.php';

/* ── Auth Helper ─────────────────────────────────── */
function getAuthUser(PDO $db): array {
    $headers = getallheaders();
    $token   = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    $token   = str_replace('Bearer ', '', trim($token));
    if (!$token) throw new Exception('No autorizado', 401);

    $stmt = $db->prepare("SELECT e.id, e.nombre, e.is_admin, e.active
                          FROM auth_tokens t
                          JOIN employees e ON e.id = t.employee_id
                          WHERE t.token = :token AND t.expires_at > NOW() AND e.active = 1");
    $stmt->execute([':token' => $token]);
    $user = $stmt->fetch();
    if (!$user) throw new Exception('Token inválido o expirado', 401);
    return $user;
}

function auditLog(PDO $db, int $prospectId, string $action, string $details, int $userId): void {
    try {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        $stmt = $db->prepare("INSERT INTO prospects_audit
                              (prospect_id, action, details, performed_by, ip_address)
                              VALUES (:pid, :action, :details, :uid, :ip)");
        $stmt->execute([':pid'=>$prospectId,':action'=>$action,':details'=>$details,':uid'=>$userId,':ip'=>$ip]);
    } catch (Exception $e) { /* no bloquear si falla auditoría */ }
}

/* ── Main ────────────────────────────────────────── */
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
    $database = new Database();
    $db       = $database->getConnection();
    if (!$db) throw new Exception('Error de conexión a BD');

    $user = getAuthUser($db);

    /* ════════════════════════════════════════════════
       LISTAR PROSPECTOS
       GET ?action=list[&plataforma=X][&estado=Y][&search=Z]
    ════════════════════════════════════════════════ */
    if ($method === 'GET' && $action === 'list') {

        $where  = [];
        $params = [];

        $plataforma = trim($_GET['plataforma'] ?? '');
        $estado     = trim($_GET['estado']     ?? '');
        $search     = trim($_GET['search']     ?? '');

        if ($plataforma) { $where[] = "p.plataforma = :plataforma"; $params[':plataforma'] = $plataforma; }
        if ($estado)     { $where[] = "p.estado = :estado";         $params[':estado']     = $estado;     }
        if ($search) {
            $where[] = "(p.nombre LIKE :s OR p.telefono LIKE :s2 OR p.cedula LIKE :s3)";
            $params[':s'] = $params[':s2'] = $params[':s3'] = "%$search%";
        }

        $whereSQL = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        $sql = "SELECT p.*, e.nombre AS registrado_por
                FROM   prospects p
                LEFT JOIN employees e ON e.id = p.created_by
                $whereSQL
                ORDER BY p.created_at DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        // Conteos por plataforma para el dashboard
        $countStmt = $db->query("SELECT plataforma, COUNT(*) AS total FROM prospects GROUP BY plataforma");
        $counts = $countStmt->fetchAll();

        echo json_encode(['success' => true, 'data' => $rows, 'counts_by_platform' => $counts]);
        exit();
    }

    /* ════════════════════════════════════════════════
       OBTENER UN PROSPECTO
       GET ?action=get&id=X
    ════════════════════════════════════════════════ */
    if ($method === 'GET' && $action === 'get') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) throw new Exception('ID requerido');

        $stmt = $db->prepare("SELECT p.*, e.nombre AS registrado_por
                              FROM prospects p
                              LEFT JOIN employees e ON e.id = p.created_by
                              WHERE p.id = :id");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        if (!$row) { http_response_code(404); echo json_encode(['success'=>false,'message'=>'No encontrado']); exit(); }

        echo json_encode(['success' => true, 'data' => $row]);
        exit();
    }

    /* ════════════════════════════════════════════════
       CREAR PROSPECTO
       POST ?action=create
    ════════════════════════════════════════════════ */
    if ($method === 'POST' && $action === 'create') {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $nombre     = trim($body['nombre']     ?? '');
        $cedula     = trim($body['cedula']     ?? '');
        $telefono   = trim($body['telefono']   ?? '');
        $email      = trim($body['email']      ?? '');
        $plataforma = trim($body['plataforma'] ?? 'otro');
        $interes    = trim($body['interes']    ?? '');
        $notas      = trim($body['notas']      ?? '');
        $estado     = trim($body['estado']     ?? 'nuevo');

        if (!$nombre) throw new Exception('El nombre es requerido');

        $plataformas_validas = ['facebook','instagram','tiktok','whatsapp','otro'];
        if (!in_array($plataforma, $plataformas_validas)) $plataforma = 'otro';

        $estados_validos = ['nuevo','contactado','seguimiento','perdido'];
        if (!in_array($estado, $estados_validos)) $estado = 'nuevo';

        $stmt = $db->prepare("INSERT INTO prospects
                              (nombre,cedula,telefono,email,plataforma,interes,notas,estado,created_by)
                              VALUES (:nombre,:cedula,:telefono,:email,:plataforma,:interes,:notas,:estado,:uid)");
        $stmt->execute([
            ':nombre'     => $nombre,
            ':cedula'     => $cedula     ?: null,
            ':telefono'   => $telefono   ?: null,
            ':email'      => $email      ?: null,
            ':plataforma' => $plataforma,
            ':interes'    => $interes    ?: null,
            ':notas'      => $notas      ?: null,
            ':estado'     => $estado,
            ':uid'        => $user['id'],
        ]);
        $newId = (int)$db->lastInsertId();

        auditLog($db, $newId, 'created', "Prospecto creado por {$user['nombre']}", $user['id']);

        echo json_encode(['success' => true, 'message' => 'Prospecto creado', 'id' => $newId]);
        exit();
    }

    /* ════════════════════════════════════════════════
       ACTUALIZAR PROSPECTO
       POST ?action=update
    ════════════════════════════════════════════════ */
    if ($method === 'POST' && $action === 'update') {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $id         = (int)($body['id']         ?? 0);
        $nombre     = trim($body['nombre']       ?? '');
        $cedula     = trim($body['cedula']       ?? '');
        $telefono   = trim($body['telefono']     ?? '');
        $email      = trim($body['email']        ?? '');
        $plataforma = trim($body['plataforma']   ?? 'otro');
        $interes    = trim($body['interes']      ?? '');
        $notas      = trim($body['notas']        ?? '');
        $estado     = trim($body['estado']       ?? 'nuevo');

        if (!$id)     throw new Exception('ID requerido');
        if (!$nombre) throw new Exception('El nombre es requerido');

        $plataformas_validas = ['facebook','instagram','tiktok','whatsapp','otro'];
        if (!in_array($plataforma, $plataformas_validas)) $plataforma = 'otro';
        $estados_validos = ['nuevo','contactado','seguimiento','perdido'];
        if (!in_array($estado, $estados_validos)) $estado = 'nuevo';

        $stmt = $db->prepare("UPDATE prospects SET
                              nombre=:nombre, cedula=:cedula, telefono=:telefono,
                              email=:email, plataforma=:plataforma, interes=:interes,
                              notas=:notas, estado=:estado
                              WHERE id=:id");
        $stmt->execute([
            ':nombre'=>$nombre,':cedula'=>$cedula?:null,':telefono'=>$telefono?:null,
            ':email'=>$email?:null,':plataforma'=>$plataforma,':interes'=>$interes?:null,
            ':notas'=>$notas?:null,':estado'=>$estado,':id'=>$id,
        ]);

        auditLog($db, $id, 'updated', "Actualizado por {$user['nombre']}", $user['id']);

        echo json_encode(['success' => true, 'message' => 'Prospecto actualizado']);
        exit();
    }

    /* ════════════════════════════════════════════════
       CONVERTIR A CLIENTE
       POST ?action=convert&id=X
       (inserta en clients, elimina de prospects)
    ════════════════════════════════════════════════ */
    if ($method === 'POST' && $action === 'convert') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) throw new Exception('ID requerido');

        // Obtener datos del prospecto
        $stmt = $db->prepare("SELECT * FROM prospects WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $prospect = $stmt->fetch();
        if (!$prospect) { http_response_code(404); echo json_encode(['success'=>false,'message'=>'Prospecto no encontrado']); exit(); }

        // Verificar que no exista ya como cliente (por cédula si la tiene)
        if ($prospect['cedula']) {
            $checkStmt = $db->prepare("SELECT id FROM clients WHERE cedula = :cedula LIMIT 1");
            $checkStmt->execute([':cedula' => $prospect['cedula']]);
            if ($checkStmt->fetch()) {
                http_response_code(409);
                echo json_encode(['success'=>false,'message'=>'Ya existe un cliente con esa cédula']);
                exit();
            }
        }

        $db->beginTransaction();
        try {
            // Insertar en clients
            // Ajusta columnas según tu tabla clients real
            $insertStmt = $db->prepare("INSERT INTO clients
                                        (nombre, cedula, telefono, email, notas, created_by)
                                        VALUES (:nombre,:cedula,:telefono,:email,:notas,:uid)");
            $insertStmt->execute([
                ':nombre'   => $prospect['nombre'],
                ':cedula'   => $prospect['cedula'],
                ':telefono' => $prospect['telefono'],
                ':email'    => $prospect['email'],
                ':notas'    => trim(($prospect['notas'] ?? '') . "\n[Convertido desde prospecto - Plataforma: {$prospect['plataforma']} - Interés: {$prospect['interes']}]"),
                ':uid'      => $user['id'],
            ]);
            $clientId = (int)$db->lastInsertId();

            // Auditar conversión
            auditLog($db, $id, 'converted',
                "Convertido a cliente ID $clientId por {$user['nombre']}",
                $user['id']);

            // Eliminar de prospects
            $db->prepare("DELETE FROM prospects WHERE id = :id")->execute([':id' => $id]);

            $db->commit();
            echo json_encode(['success' => true, 'message' => 'Prospecto convertido a cliente', 'client_id' => $clientId]);

        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
        exit();
    }

    /* ════════════════════════════════════════════════
       ELIMINAR PROSPECTO
       POST ?action=delete&id=X
    ════════════════════════════════════════════════ */
    if ($method === 'POST' && $action === 'delete') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) throw new Exception('ID requerido');

        auditLog($db, $id, 'deleted', "Eliminado por {$user['nombre']}", $user['id']);
        $db->prepare("DELETE FROM prospects WHERE id = :id")->execute([':id' => $id]);

        echo json_encode(['success' => true, 'message' => 'Prospecto eliminado']);
        exit();
    }

    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Acción no válida']);

} catch (Exception $e) {
    $code = $e->getCode();
    if (!in_array($code, [400, 401, 403, 404, 409])) $code = 500;
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
