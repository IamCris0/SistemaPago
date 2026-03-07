<?php
/**
 * API Prospectos - Mawewe CRM
 * ✅ FIX: getAuthUser usa decodificación de token base64 (sin tabla auth_tokens)
 * ✅ FIX: Al convertir, conserva el email real del prospecto; el placeholder
 *         solo se usa si no tiene email y NO sobreescribe clientes existentes
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once __DIR__ . '/config/database.php';

/* ── Auth Helper ─────────────────────────────────── */
function getAuthUser(PDO $db): array {
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $token   = '';

    foreach ($headers as $k => $v) {
        if (strtolower($k) === 'authorization') {
            $token = $v;
            break;
        }
    }

    $token = str_replace('Bearer ', '', trim($token));

    if (!$token) throw new Exception('No autorizado', 401);

    $decoded = base64_decode($token);
    $parts   = explode(':', $decoded);
    $userId  = (int)($parts[0] ?? 0);

    if (!$userId) throw new Exception('Token inválido', 401);

    $stmt = $db->prepare(
        "SELECT id, nombre, is_admin, active
         FROM employees
         WHERE id = :id AND active = 1"
    );
    $stmt->execute([':id' => $userId]);
    $user = $stmt->fetch();

    if (!$user) throw new Exception('Sesión inválida o expirada', 401);

    return $user;
}

function auditLog(PDO $db, int $prospectId, string $action, string $details, int $userId): void {
    try {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        $stmt = $db->prepare(
            "INSERT INTO prospects_audit
             (prospect_id, action, details, performed_by, ip_address)
             VALUES (:pid, :action, :details, :uid, :ip)"
        );
        $stmt->execute([
            ':pid'    => $prospectId,
            ':action' => $action,
            ':details'=> $details,
            ':uid'    => $userId,
            ':ip'     => $ip,
        ]);
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

    /* ════════════ LISTAR ════════════ */
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

        $countStmt = $db->query(
            "SELECT plataforma, COUNT(*) AS total FROM prospects GROUP BY plataforma"
        );
        $counts = $countStmt->fetchAll();

        echo json_encode([
            'success'              => true,
            'data'                 => $rows,
            'counts_by_platform'   => $counts,
        ]);
        exit();
    }

    /* ════════════ OBTENER UNO ════════════ */
    if ($method === 'GET' && $action === 'get') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) throw new Exception('ID requerido');

        $stmt = $db->prepare(
            "SELECT p.*, e.nombre AS registrado_por
             FROM prospects p
             LEFT JOIN employees e ON e.id = p.created_by
             WHERE p.id = :id"
        );
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();

        if (!$row) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'No encontrado']);
            exit();
        }

        echo json_encode(['success' => true, 'data' => $row]);
        exit();
    }

    /* ════════════ CREAR ════════════ */
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

        $stmt = $db->prepare(
            "INSERT INTO prospects
             (nombre,cedula,telefono,email,plataforma,interes,notas,estado,created_by)
             VALUES (:nombre,:cedula,:telefono,:email,:plataforma,:interes,:notas,:estado,:uid)"
        );
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

    /* ════════════ ACTUALIZAR ════════════ */
    if ($method === 'POST' && $action === 'update') {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $id         = (int)($body['id']       ?? 0);
        $nombre     = trim($body['nombre']     ?? '');
        $cedula     = trim($body['cedula']     ?? '');
        $telefono   = trim($body['telefono']   ?? '');
        $email      = trim($body['email']      ?? '');
        $plataforma = trim($body['plataforma'] ?? 'otro');
        $interes    = trim($body['interes']    ?? '');
        $notas      = trim($body['notas']      ?? '');
        $estado     = trim($body['estado']     ?? 'nuevo');

        if (!$id)     throw new Exception('ID requerido');
        if (!$nombre) throw new Exception('El nombre es requerido');

        $plataformas_validas = ['facebook','instagram','tiktok','whatsapp','otro'];
        if (!in_array($plataforma, $plataformas_validas)) $plataforma = 'otro';
        $estados_validos = ['nuevo','contactado','seguimiento','perdido'];
        if (!in_array($estado, $estados_validos)) $estado = 'nuevo';

        $stmt = $db->prepare(
            "UPDATE prospects SET
             nombre=:nombre, cedula=:cedula, telefono=:telefono,
             email=:email, plataforma=:plataforma, interes=:interes,
             notas=:notas, estado=:estado
             WHERE id=:id"
        );
        $stmt->execute([
            ':nombre'     => $nombre,
            ':cedula'     => $cedula     ?: null,
            ':telefono'   => $telefono   ?: null,
            ':email'      => $email      ?: null,
            ':plataforma' => $plataforma,
            ':interes'    => $interes    ?: null,
            ':notas'      => $notas      ?: null,
            ':estado'     => $estado,
            ':id'         => $id,
        ]);

        auditLog($db, $id, 'updated', "Actualizado por {$user['nombre']}", $user['id']);

        echo json_encode(['success' => true, 'message' => 'Prospecto actualizado']);
        exit();
    }

    /* ════════════ CONVERTIR A CLIENTE ════════════ */
    if ($method === 'POST' && $action === 'convert') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) throw new Exception('ID requerido');

        $stmt = $db->prepare("SELECT * FROM prospects WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $prospect = $stmt->fetch();
        if (!$prospect) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Prospecto no encontrado']);
            exit();
        }

        // Verificar si ya existe como cliente (por cédula)
        if ($prospect['cedula']) {
            $chk = $db->prepare("SELECT id FROM customers WHERE cedula = :cedula LIMIT 1");
            $chk->execute([':cedula' => $prospect['cedula']]);
            if ($chk->fetch()) {
                http_response_code(409);
                echo json_encode(['success' => false, 'message' => 'Ya existe un cliente con esa cédula']);
                exit();
            }
        }

        $db->beginTransaction();
        try {
            // Separar nombre en first_name / last_name
            $partes     = explode(' ', trim($prospect['nombre']), 2);
            $first_name = $partes[0];
            $last_name  = $partes[1] ?? $partes[0];

            // ✅ FIX: Usar el email REAL del prospecto si existe y no está en uso
            // Solo generar placeholder si NO tiene email real
            $emailReal = trim($prospect['email'] ?? '');
            $usarEmail = '';

            if ($emailReal && strpos($emailReal, '@mawewe.internal') === false) {
                // Tiene email real — verificar que no esté en uso por otro cliente
                $chkEmail = $db->prepare("SELECT id FROM customers WHERE email = :email LIMIT 1");
                $chkEmail->execute([':email' => $emailReal]);
                if (!$chkEmail->fetch()) {
                    // Email libre, usarlo
                    $usarEmail = $emailReal;
                } else {
                    // Email ya en uso → generar placeholder (no pisar al cliente existente)
                    $usarEmail = 'prospect_' . $prospect['id'] . '_' . time() . '@mawewe.internal';
                }
            } else {
                // Sin email real → placeholder único
                $usarEmail = 'prospect_' . $prospect['id'] . '_' . time() . '@mawewe.internal';
            }

            // Notas enriquecidas con contexto del prospecto
            $notasExtra = "[Convertido desde prospecto - Plataforma: {$prospect['plataforma']}"
                        . " - Interés: {$prospect['interes']}]";
            $notasFinales = trim(($prospect['notas'] ?? '') . "\n" . $notasExtra);

            $insertStmt = $db->prepare(
                "INSERT INTO customers
                 (first_name, last_name, email, phone, cedula, notes, created_by)
                 VALUES (:fn, :ln, :email, :phone, :cedula, :notes, :uid)"
            );
            $insertStmt->execute([
                ':fn'     => $first_name,
                ':ln'     => $last_name,
                ':email'  => $usarEmail,
                ':phone'  => $prospect['telefono'],
                ':cedula' => $prospect['cedula'],
                ':notes'  => $notasFinales,
                ':uid'    => $user['id'],
            ]);
            $clientId = (int)$db->lastInsertId();

            auditLog(
                $db, $id, 'converted',
                "Convertido a cliente ID $clientId por {$user['nombre']}",
                $user['id']
            );

            $db->prepare("DELETE FROM prospects WHERE id = :id")->execute([':id' => $id]);

            $db->commit();
            echo json_encode([
                'success'   => true,
                'message'   => 'Prospecto convertido a cliente',
                'client_id' => $clientId,
            ]);

        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
        exit();
    }

    /* ════════════ ELIMINAR ════════════ */
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
    $code = (int)$e->getCode();
    if (!in_array($code, [400, 401, 403, 404, 409])) $code = 500;
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}