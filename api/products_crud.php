<?php
/**
 * API DE PRODUCTOS CRUD - MAWEWE CRM
 * ✅ GET/list NO requiere autenticacion
 * ✅ POST/PUT/DELETE requieren token
 */

while (ob_get_level()) ob_end_clean();

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config/database.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'list';

/* ── Auth helper (solo para escritura) ── */
function getAuthUser($db) {
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $token   = null;
    if (isset($headers['Authorization'])) {
        if (preg_match('/Bearer\s+(.+)$/i', $headers['Authorization'], $m)) {
            $token = $m[1];
        }
    }
    if (!$token) {
        $body  = json_decode(file_get_contents('php://input'), true);
        $token = $body['token'] ?? $_GET['token'] ?? null;
    }
    if (!$token) {
        http_response_code(401);
        echo json_encode(['success'=>false,'message'=>'Token requerido']);
        exit;
    }
    $decoded = base64_decode($token);
    $parts   = explode(':', $decoded);
    if (count($parts) < 2) {
        http_response_code(401);
        echo json_encode(['success'=>false,'message'=>'Token invalido']);
        exit;
    }
    $userId = (int)$parts[0];
    $stmt = $db->prepare("SELECT id, nombre, is_admin FROM employees WHERE id=:id AND active=1");
    $stmt->execute([':id' => $userId]);
    $user = $stmt->fetch();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['success'=>false,'message'=>'Sesion invalida']);
        exit;
    }
    return $user;
}

function logAuditP($db, $data) {
    try {
        $db->prepare("INSERT INTO audit_log (user_id,action,entity_type,entity_id,old_value,new_value,description,ip_address)
                      VALUES (:uid,:act,:et,:eid,:ov,:nv,:desc,:ip)")
           ->execute([
               ':uid'  => $data['user_id'] ?? null,
               ':act'  => $data['action'],
               ':et'   => $data['entity_type'] ?? 'PRODUCT',
               ':eid'  => $data['entity_id'] ?? null,
               ':ov'   => isset($data['old_value']) ? json_encode($data['old_value']) : null,
               ':nv'   => isset($data['new_value']) ? json_encode($data['new_value']) : null,
               ':desc' => $data['description'] ?? '',
               ':ip'   => $_SERVER['REMOTE_ADDR'] ?? 'Unknown'
           ]);
    } catch(Exception $e) { error_log('Audit: '.$e->getMessage()); }
}

try {
    $database = new Database();
    $db = $database->getConnection();
    if (!$db) throw new Exception('Error de conexion a BD');

    /* ═══════ LISTAR — SIN AUTH ═══════ */
    if ($method === 'GET' && in_array($action, ['list',''])) {
        $page   = max(1, (int)($_GET['page']  ?? 1));
        $limit  = max(1, (int)($_GET['limit'] ?? 50));
        $offset = ($page - 1) * $limit;

        $filters = ['active = 1']; // default: solo activos
        $params  = [];

        if (isset($_GET['active']) && $_GET['active'] !== '') {
            $filters = []; // quitar default
            $filters[] = "active = :active";
            $params[':active'] = (int)$_GET['active'];
        }

        if (!empty($_GET['category'])) {
            $filters[] = "category = :category";
            $params[':category'] = $_GET['category'];
        }
        if (!empty($_GET['search'])) {
            $filters[] = "(name LIKE :search OR sku LIKE :search OR description LIKE :search)";
            $params[':search'] = '%'.$_GET['search'].'%';
        }
        if (isset($_GET['stock_status'])) {
            if ($_GET['stock_status'] === 'out') $filters[] = "stock = 0";
            elseif ($_GET['stock_status'] === 'low') $filters[] = "stock > 0 AND stock < 10";
            elseif ($_GET['stock_status'] === 'ok')  $filters[] = "stock >= 10";
        }

        $where = $filters ? 'WHERE '.implode(' AND ',$filters) : '';

        $total = $db->prepare("SELECT COUNT(*) FROM products $where");
        $total->execute($params);
        $total = (int)$total->fetchColumn();

        $sql = "SELECT id,sku,name,category,subcategory,price,description,image,images,stock,active,created_at,updated_at
                FROM products $where ORDER BY created_at DESC LIMIT :lim OFFSET :off";
        $stmt = $db->prepare($sql);
        foreach ($params as $k=>$v) $stmt->bindValue($k,$v);
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':off', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $products = $stmt->fetchAll();

        foreach ($products as &$p) {
            $p['id']     = (int)$p['id'];
            $p['price']  = (float)$p['price'];
            $p['stock']  = (int)$p['stock'];
            $p['active'] = (bool)$p['active'];
            if ($p['images']) {
                $d = json_decode($p['images'], true);
                $p['images'] = is_array($d) ? $d : [];
            } else {
                $p['images'] = [];
            }
        }

        echo json_encode([
            'success'  => true,
            'products' => $products,
            'total'    => $total,
            'page'     => $page,
            'pages'    => ceil($total / $limit),
            'limit'    => $limit
        ]);
        exit();
    }

    /* ═══════ GET SINGLE ═══════ */
    if ($method === 'GET' && $action === 'get') {
        $id   = (int)($_GET['id'] ?? 0);
        if (!$id) throw new Exception('ID requerido');
        $stmt = $db->prepare("SELECT * FROM products WHERE id=:id");
        $stmt->execute([':id'=>$id]);
        $p = $stmt->fetch();
        if (!$p) { http_response_code(404); echo json_encode(['success'=>false,'message'=>'No encontrado']); exit; }
        $p['id']     = (int)$p['id'];
        $p['price']  = (float)$p['price'];
        $p['stock']  = (int)$p['stock'];
        $p['active'] = (bool)$p['active'];
        if ($p['images']) { $d=json_decode($p['images'],true); $p['images']=is_array($d)?$d:[]; } else $p['images']=[];
        echo json_encode(['success'=>true,'product'=>$p]);
        exit();
    }

    /* ═══════ CREAR — requiere auth ═══════ */
    if ($method === 'POST' && $action === 'create') {
        $user  = getAuthUser($db);
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['sku']) || empty($input['name']) || empty($input['category']) || !isset($input['price'])) {
            throw new Exception('SKU, nombre, categoria y precio son requeridos');
        }

        $chk = $db->prepare("SELECT id FROM products WHERE sku=:sku");
        $chk->execute([':sku'=>trim($input['sku'])]);
        if ($chk->fetch()) { http_response_code(409); echo json_encode(['success'=>false,'message'=>'SKU ya existe']); exit; }

        $imgsJson = null;
        if (!empty($input['images']) && is_array($input['images'])) {
            $imgsJson = json_encode($input['images'], JSON_UNESCAPED_SLASHES);
        }

        $sql = "INSERT INTO products (sku,name,category,subcategory,price,description,image,images,stock,active)
                VALUES (:sku,:name,:cat,:sub,:price,:desc,:img,:imgs,:stock,:active)";
        $db->prepare($sql)->execute([
            ':sku'    => trim($input['sku']),
            ':name'   => trim($input['name']),
            ':cat'    => trim($input['category']),
            ':sub'    => trim($input['subcategory'] ?? ''),
            ':price'  => (float)$input['price'],
            ':desc'   => trim($input['description'] ?? ''),
            ':img'    => trim($input['image'] ?? ''),
            ':imgs'   => $imgsJson,
            ':stock'  => (int)($input['stock'] ?? 0),
            ':active' => (int)($input['active'] ?? 1)
        ]);
        $newId = (int)$db->lastInsertId();

        logAuditP($db,['user_id'=>$user['id'],'action'=>'CREATE','entity_id'=>$newId,'description'=>"Producto creado: {$input['name']}"]);
        echo json_encode(['success'=>true,'message'=>'Producto creado','id'=>$newId]);
        exit();
    }

    /* ═══════ ACTUALIZAR — requiere auth ═══════ */
    if ($method === 'PUT' && $action === 'update') {
        $user  = getAuthUser($db);
        $input = json_decode(file_get_contents('php://input'), true);
        $id    = (int)($input['id'] ?? 0);
        if (!$id) throw new Exception('ID requerido');

        $stmt = $db->prepare("SELECT * FROM products WHERE id=:id");
        $stmt->execute([':id'=>$id]);
        $old = $stmt->fetch();
        if (!$old) { http_response_code(404); echo json_encode(['success'=>false,'message'=>'No encontrado']); exit; }

        if (isset($input['sku']) && $input['sku'] !== $old['sku']) {
            $chk = $db->prepare("SELECT id FROM products WHERE sku=:sku AND id!=:id");
            $chk->execute([':sku'=>trim($input['sku']),':id'=>$id]);
            if ($chk->fetch()) { http_response_code(409); echo json_encode(['success'=>false,'message'=>'SKU ya en uso']); exit; }
        }

        $imgsJson = $old['images'];
        if (isset($input['images'])) {
            $imgsJson = is_array($input['images']) ? json_encode($input['images'],JSON_UNESCAPED_SLASHES) : null;
        }

        $sql = "UPDATE products SET sku=:sku,name=:name,category=:cat,subcategory=:sub,price=:price,
                description=:desc,image=:img,images=:imgs,stock=:stock,active=:active WHERE id=:id";
        $db->prepare($sql)->execute([
            ':sku'    => trim($input['sku']         ?? $old['sku']),
            ':name'   => trim($input['name']        ?? $old['name']),
            ':cat'    => trim($input['category']    ?? $old['category']),
            ':sub'    => trim($input['subcategory'] ?? $old['subcategory']),
            ':price'  => (float)($input['price']   ?? $old['price']),
            ':desc'   => trim($input['description'] ?? $old['description']),
            ':img'    => trim($input['image']       ?? $old['image']),
            ':imgs'   => $imgsJson,
            ':stock'  => (int)($input['stock']     ?? $old['stock']),
            ':active' => (int)($input['active']    ?? $old['active']),
            ':id'     => $id
        ]);

        logAuditP($db,['user_id'=>$user['id'],'action'=>'UPDATE','entity_id'=>$id,'description'=>"Producto actualizado: {$old['name']}"]);
        echo json_encode(['success'=>true,'message'=>'Producto actualizado']);
        exit();
    }

    /* ═══════ TOGGLE STATUS ═══════ */
    if ($method === 'PUT' && $action === 'toggle-status') {
        $user  = getAuthUser($db);
        $input = json_decode(file_get_contents('php://input'), true);
        $id    = (int)($input['id'] ?? 0);
        if (!$id) throw new Exception('ID requerido');
        $stmt = $db->prepare("SELECT name,active FROM products WHERE id=:id");
        $stmt->execute([':id'=>$id]);
        $old = $stmt->fetch();
        if (!$old) { http_response_code(404); echo json_encode(['success'=>false,'message'=>'No encontrado']); exit; }
        $newStatus = !$old['active'];
        $db->prepare("UPDATE products SET active=:a WHERE id=:id")->execute([':a'=>(int)$newStatus,':id'=>$id]);
        logAuditP($db,['user_id'=>$user['id'],'action'=>'UPDATE','entity_id'=>$id,'description'=>($newStatus?'Activado':'Desactivado').": {$old['name']}"]);
        echo json_encode(['success'=>true,'active'=>$newStatus]);
        exit();
    }

    /* ═══════ UPDATE STOCK ═══════ */
    if ($method === 'PUT' && $action === 'update-stock') {
        $user  = getAuthUser($db);
        $input = json_decode(file_get_contents('php://input'), true);
        $id    = (int)($input['id'] ?? 0);
        $newStock = (int)($input['stock'] ?? 0);
        if (!$id) throw new Exception('ID requerido');
        $stmt = $db->prepare("SELECT name,stock FROM products WHERE id=:id");
        $stmt->execute([':id'=>$id]);
        $old = $stmt->fetch();
        if (!$old) { http_response_code(404); echo json_encode(['success'=>false,'message'=>'No encontrado']); exit; }
        $db->prepare("UPDATE products SET stock=:s WHERE id=:id")->execute([':s'=>$newStock,':id'=>$id]);
        logAuditP($db,['user_id'=>$user['id'],'action'=>'UPDATE','entity_id'=>$id,
            'old_value'=>['stock'=>(int)$old['stock']],'new_value'=>['stock'=>$newStock],
            'description'=>"Stock: {$old['name']} ({$old['stock']} -> $newStock)"]);
        echo json_encode(['success'=>true,'stock'=>$newStock]);
        exit();
    }

    /* ═══════ ELIMINAR (soft delete) ═══════ */
    if ($method === 'DELETE' && $action === 'delete') {
        $user = getAuthUser($db);
        $id   = (int)($_GET['id'] ?? 0);
        if (!$id) throw new Exception('ID requerido');
        $stmt = $db->prepare("SELECT name FROM products WHERE id=:id");
        $stmt->execute([':id'=>$id]);
        $old = $stmt->fetch();
        if (!$old) { http_response_code(404); echo json_encode(['success'=>false,'message'=>'No encontrado']); exit; }
        $db->prepare("UPDATE products SET active=0 WHERE id=:id")->execute([':id'=>$id]);
        logAuditP($db,['user_id'=>$user['id'],'action'=>'DELETE','entity_id'=>$id,'description'=>"Eliminado: {$old['name']}"]);
        echo json_encode(['success'=>true,'message'=>'Producto eliminado']);
        exit();
    }

    http_response_code(400);
    echo json_encode(['success'=>false,'message'=>'Accion no valida']);

} catch(Exception $e) {
    error_log('products_crud.php: '.$e->getMessage());
    http_response_code(500);
    echo json_encode(['success'=>false,'message'=>$e->getMessage()]);
}
