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

    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? 'list';

    /* ═══════ LISTAR — SIN AUTH ═══════ */
    if ($method === 'GET' && in_array($action, ['list',''])) {
        $page   = max(1, (int)($_GET['page']  ?? 1));
        $limit  = max(1, (int)($_GET['limit'] ?? 50));
        $offset = ($page - 1) * $limit;

        $filters = ['active = 1'];
        $params  = [];

        if (isset($_GET['active']) && $_GET['active'] !== '') {
            $filters = [];
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

    /* ═══════ GET CATEGORIAS CON SUBCATEGORIAS — SIN AUTH ═══════ */
    if ($method === 'GET' && $action === 'categories') {
        $stmt = $db->query("SELECT DISTINCT category, subcategory FROM products WHERE active=1 AND category != '' ORDER BY category, subcategory");
        $rows = $stmt->fetchAll();

        $cats = [];
        foreach ($rows as $row) {
            $cat = $row['category'];
            $sub = $row['subcategory'];
            if (!isset($cats[$cat])) $cats[$cat] = [];
            if ($sub && !in_array($sub, $cats[$cat])) $cats[$cat][] = $sub;
        }

        // También traer inactivos para no perder datos
        $stmt2 = $db->query("SELECT DISTINCT category, subcategory FROM products WHERE category != '' ORDER BY category, subcategory");
        $rows2 = $stmt2->fetchAll();
        foreach ($rows2 as $row) {
            $cat = $row['category'];
            $sub = $row['subcategory'];
            if (!isset($cats[$cat])) $cats[$cat] = [];
            if ($sub && !in_array($sub, $cats[$cat])) $cats[$cat][] = $sub;
        }

        echo json_encode(['success'=>true,'categories'=>$cats]);
        exit();
    }

    /* ═══════ UPLOAD IMAGE — requiere auth ═══════ */
    if ($method === 'POST' && $action === 'upload-image') {
        // Para multipart/form-data el token puede venir en POST
        $token = $_POST['token'] ?? null;
        if (!$token) {
            $hdrs = function_exists('getallheaders') ? getallheaders() : [];
            if (isset($hdrs['Authorization']) && preg_match('/Bearer\s+(.+)$/i', $hdrs['Authorization'], $m)) {
                $token = $m[1];
            }
        }
        if (!$token) {
            http_response_code(401);
            echo json_encode(['success'=>false,'message'=>'Token requerido']);
            exit;
        }
        // Verificar usuario
        $decoded = base64_decode($token);
        $parts   = explode(':', $decoded);
        if (count($parts) >= 1) {
            $userId = (int)$parts[0];
            $chk = $db->prepare("SELECT id FROM employees WHERE id=:id AND active=1");
            $chk->execute([':id'=>$userId]);
            if (!$chk->fetch()) {
                http_response_code(401);
                echo json_encode(['success'=>false,'message'=>'Sesion invalida']);
                exit;
            }
        }

        if (empty($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
            $errCode = $_FILES['image']['error'] ?? -1;
            http_response_code(400);
            echo json_encode(['success'=>false,'message'=>'No se recibio imagen valida (error '.$errCode.')']);
            exit;
        }

        $file = $_FILES['image'];

        // Validar tipo MIME real
        $finfo    = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        $allowed = ['image/jpeg'=>'jpg','image/jpg'=>'jpg','image/png'=>'png','image/webp'=>'webp','image/gif'=>'gif'];
        if (!array_key_exists($mimeType, $allowed)) {
            http_response_code(400);
            echo json_encode(['success'=>false,'message'=>'Tipo de archivo no permitido: '.$mimeType]);
            exit;
        }

        // Tamaño máximo 5 MB
        if ($file['size'] > 5 * 1024 * 1024) {
            http_response_code(400);
            echo json_encode(['success'=>false,'message'=>'Imagen demasiado grande (max 5 MB)']);
            exit;
        }

        $category  = preg_replace('/[^a-zA-Z0-9_\-]/', '_', trim($_POST['category'] ?? 'general'));
        $sku       = preg_replace('/[^a-zA-Z0-9_\-]/', '_', trim($_POST['sku']      ?? 'prod'));
        $ext       = $allowed[$mimeType];

        // Directorio destino: public_html/images/productos/{category}/{sku}/
        $publicHtml = dirname(__DIR__);   // /home/usuario/public_html
        $uploadDir  = $publicHtml . '/images/productos/' . $category . '/' . $sku . '/';

        if (!is_dir($uploadDir)) {
            if (!mkdir($uploadDir, 0755, true)) {
                http_response_code(500);
                echo json_encode(['success'=>false,'message'=>'No se pudo crear el directorio de subida']);
                exit;
            }
        }

        $filename     = $sku . '_' . time() . '_' . rand(100,999) . '.' . $ext;
        $destination  = $uploadDir . $filename;

        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            http_response_code(500);
            echo json_encode(['success'=>false,'message'=>'Error al mover el archivo al servidor']);
            exit;
        }

        $relativePath = 'images/productos/' . $category . '/' . $sku . '/' . $filename;
        echo json_encode(['success'=>true, 'path'=>$relativePath, 'url'=>'https://mawewe.com.ec/'.$relativePath]);
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
        if ($chk->fetch()) { http_response_code(409); echo json_encode(['success'=>false,'message'=>'SKU ya existe. Usa un SKU diferente.']); exit; }

        $imgsJson = null;
        if (!empty($input['images']) && is_array($input['images'])) {
            $imgsJson = json_encode($input['images'], JSON_UNESCAPED_SLASHES);
        }

        $mainImage = '';
        if (!empty($input['images']) && is_array($input['images']) && count($input['images']) > 0) {
            $mainImage = $input['images'][0];
        } elseif (!empty($input['image'])) {
            $mainImage = trim($input['image']);
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
            ':img'    => $mainImage,
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

        $mainImage = $old['image'];
        if (!empty($input['images']) && is_array($input['images']) && count($input['images']) > 0) {
            $mainImage = $input['images'][0];
        } elseif (isset($input['image'])) {
            $mainImage = trim($input['image']);
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
            ':img'    => $mainImage,
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