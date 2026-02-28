<?php
/**
 * API DE PRODUCTOS CRUD - MAWEWE CRM
 * ✅ GET/list/categories/next-sku NO requieren autenticacion
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

function verifyToken($db, $token) {
    if (!$token) return false;
    $decoded = base64_decode($token);
    $parts   = explode(':', $decoded);
    $userId  = (int)($parts[0] ?? 0);
    if (!$userId) return false;
    $chk = $db->prepare("SELECT id FROM employees WHERE id=:id AND active=1");
    $chk->execute([':id' => $userId]);
    return (bool)$chk->fetch();
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

/* ── Detección MIME con fallback (no depende de finfo) ── */
function detectMime($tmpPath) {
    // Intentar con finfo si está disponible
    if (function_exists('finfo_open')) {
        $fi   = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($fi, $tmpPath);
        finfo_close($fi);
        if ($mime) return $mime;
    }
    // Fallback: magic bytes
    $fh    = fopen($tmpPath, 'rb');
    $bytes = fread($fh, 12);
    fclose($fh);
    $hex = bin2hex($bytes);
    if (substr($hex,0,6)  === 'ffd8ff')          return 'image/jpeg';
    if (substr($hex,0,16) === '89504e470d0a1a0a') return 'image/png';
    if (substr($hex,0,8)  === '47494638')         return 'image/gif';
    if (substr($hex,0,8)  === '52494646' &&
        substr($hex,16,8) === '57454250')         return 'image/webp';
    return 'application/octet-stream';
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
        $id = (int)($_GET['id'] ?? 0);
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

    /* ═══════ CATEGORIAS CON SUBCATEGORIAS — SIN AUTH ═══════
     *  Respuesta:
     *    categories   : { "ropa": ["americanino","chevignon"], ... }  ← objeto
     *    categoryList : ["ropa","peluches",...]                       ← array plano
     */
    if ($method === 'GET' && $action === 'categories') {
        $stmt = $db->query(
            "SELECT DISTINCT category, subcategory FROM products
             WHERE category != '' ORDER BY category, subcategory"
        );
        $rows = $stmt->fetchAll();

        $cats = [];
        foreach ($rows as $row) {
            $cat = trim($row['category']);
            $sub = trim($row['subcategory'] ?? '');
            if (!$cat) continue;
            if (!isset($cats[$cat])) $cats[$cat] = [];
            if ($sub && !in_array($sub, $cats[$cat])) $cats[$cat][] = $sub;
        }

        echo json_encode([
            'success'      => true,
            'categories'   => $cats,              // objeto { cat: [subs] }
            'categoryList' => array_keys($cats)   // array plano para datalist
        ]);
        exit();
    }

    /* ═══════ SIGUIENTE SKU DISPONIBLE — SIN AUTH ═══════
     *  GET ?action=next-sku&category=ropa&subcategory=americanino
     *  → { success:true, sku:"ROP-AME-015", prefix:"ROP-AME" }
     */
    if ($method === 'GET' && $action === 'next-sku') {
        $category    = trim($_GET['category']    ?? '');
        $subcategory = trim($_GET['subcategory'] ?? '');

        if (!$category) {
            echo json_encode(['success'=>false,'message'=>'Categoría requerida']);
            exit;
        }

        // Solo letras, máx 3 chars, mayúsculas
        $catCode = strtoupper(substr(preg_replace('/[^a-zA-Z]/', '', $category), 0, 3));
        $subCode = $subcategory
            ? strtoupper(substr(preg_replace('/[^a-zA-Z]/', '', $subcategory), 0, 3))
            : '';

        $prefix = $subCode ? "{$catCode}-{$subCode}" : $catCode;

        // Buscar SKUs con ese prefijo y extraer el número más alto
        $stmt = $db->prepare("SELECT sku FROM products WHERE sku LIKE :p");
        $stmt->execute([':p' => $prefix . '-%']);
        $existing = $stmt->fetchAll(PDO::FETCH_COLUMN);

        $maxNum = 0;
        foreach ($existing as $sku) {
            if (preg_match('/-(\d+)$/', $sku, $m)) {
                $maxNum = max($maxNum, (int)$m[1]);
            }
        }

        $nextSku = $prefix . '-' . str_pad($maxNum + 1, 3, '0', STR_PAD_LEFT);
        echo json_encode(['success'=>true, 'sku'=>$nextSku, 'prefix'=>$prefix]);
        exit();
    }

    /* ═══════ UPLOAD IMAGE — requiere auth ═══════ */
    if ($method === 'POST' && $action === 'upload-image') {
        // Token desde POST, Authorization header o GET
        $token = $_POST['token'] ?? null;
        if (!$token) {
            $hdrs = function_exists('getallheaders') ? getallheaders() : [];
            foreach ($hdrs as $k => $v) {
                if (strtolower($k) === 'authorization' &&
                    preg_match('/Bearer\s+(.+)$/i', $v, $m)) {
                    $token = $m[1];
                    break;
                }
            }
        }
        if (!$token) $token = $_GET['token'] ?? null;

        if (!verifyToken($db, $token)) {
            http_response_code(401);
            echo json_encode(['success'=>false,'message'=>'Sesion invalida. Vuelve a iniciar sesion.']);
            exit;
        }

        // Verificar archivo
        if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
            $errCode = $_FILES['image']['error'] ?? -1;
            $errMap  = [
                1 => 'Archivo demasiado grande (limite del servidor)',
                2 => 'Archivo demasiado grande (limite del formulario)',
                3 => 'Subida incompleta, intenta de nuevo',
                4 => 'No se seleccionó ningún archivo',
                6 => 'Sin carpeta temporal en el servidor',
                7 => 'No se puede escribir en disco'
            ];
            http_response_code(400);
            echo json_encode(['success'=>false, 'message'=> $errMap[$errCode] ?? "Error de subida (código $errCode)"]);
            exit;
        }

        $file = $_FILES['image'];

        // Tamaño máximo 5 MB
        if ($file['size'] > 5 * 1024 * 1024) {
            http_response_code(400);
            echo json_encode(['success'=>false,'message'=>'La imagen supera los 5 MB ('.round($file['size']/1024/1024,1).' MB)']);
            exit;
        }

        // Tipo MIME real (no confiar en extensión)
        $mimeType = detectMime($file['tmp_name']);
        $allowed  = [
            'image/jpeg' => 'jpg', 'image/jpg' => 'jpg',
            'image/png'  => 'png', 'image/webp' => 'webp',
            'image/gif'  => 'gif'
        ];
        if (!isset($allowed[$mimeType])) {
            http_response_code(400);
            echo json_encode(['success'=>false,'message'=>"Tipo '$mimeType' no permitido. Usa JPG, PNG, WebP o GIF."]);
            exit;
        }

        // Sanitizar nombres de carpeta
        $category = preg_replace('/[^a-zA-Z0-9_\-]/', '_', strtolower(trim($_POST['category'] ?? 'general')));
        $sku      = preg_replace('/[^a-zA-Z0-9_\-]/', '_', strtoupper(trim($_POST['sku'] ?? 'PROD')));
        $ext      = $allowed[$mimeType];

        // __DIR__ = public_html/api  →  dirname(__DIR__) = public_html
        $root      = dirname(__DIR__);
        $uploadDir = $root . '/images/productos/' . $category . '/' . $sku . '/';

        // Crear directorios si no existen
        if (!is_dir($uploadDir)) {
            if (!mkdir($uploadDir, 0755, true)) {
                // Intentar crear paso a paso y reportar dónde falla
                $base  = $root . '/images';
                $chain = [
                    $base,
                    $base . '/productos',
                    $base . '/productos/' . $category,
                    $uploadDir
                ];
                foreach ($chain as $dir) {
                    if (!is_dir($dir) && !@mkdir($dir, 0755)) {
                        http_response_code(500);
                        echo json_encode([
                            'success' => false,
                            'message' => "No se pudo crear la carpeta: $dir",
                            'fix'     => 'Crea public_html/images/ manualmente con permisos 755 desde el panel de hosting'
                        ]);
                        exit;
                    }
                }
            }
        }

        if (!is_writable($uploadDir)) {
            http_response_code(500);
            echo json_encode(['success'=>false,'message'=>"La carpeta no tiene permisos de escritura: $uploadDir"]);
            exit;
        }

        $filename    = $sku . '_' . time() . '_' . rand(1000,9999) . '.' . $ext;
        $destination = $uploadDir . $filename;

        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            http_response_code(500);
            echo json_encode(['success'=>false,'message'=>'Error al guardar el archivo en el servidor']);
            exit;
        }

        $relativePath = 'images/productos/' . $category . '/' . $sku . '/' . $filename;
        echo json_encode([
            'success' => true,
            'path'    => $relativePath,
            'url'     => 'https://mawewe.com.ec/' . $relativePath
        ]);
        exit();
    }

    /* ═══════ CREAR — requiere auth ═══════ */
    if ($method === 'POST' && $action === 'create') {
        $user  = getAuthUser($db);
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['sku']) || empty($input['name']) || empty($input['category']) || !isset($input['price'])) {
            throw new Exception('SKU, nombre, categoría y precio son requeridos');
        }

        $chk = $db->prepare("SELECT id FROM products WHERE sku=:sku");
        $chk->execute([':sku'=>trim($input['sku'])]);
        if ($chk->fetch()) {
            http_response_code(409);
            echo json_encode(['success'=>false,'message'=>'SKU ya existe. Usa un SKU diferente o genera uno nuevo.']);
            exit;
        }

        $imgsJson  = null;
        $mainImage = '';
        if (!empty($input['images']) && is_array($input['images'])) {
            $imgsJson  = json_encode($input['images'], JSON_UNESCAPED_SLASHES);
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

        logAuditP($db,['user_id'=>$user['id'],'action'=>'CREATE','entity_id'=>$newId,
            'description'=>"Producto creado: {$input['name']}"]);
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

        $imgsJson  = $old['images'];
        $mainImage = $old['image'];
        if (isset($input['images'])) {
            if (is_array($input['images']) && count($input['images']) > 0) {
                $imgsJson  = json_encode($input['images'], JSON_UNESCAPED_SLASHES);
                $mainImage = $input['images'][0];
            } else {
                $imgsJson = null;
            }
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

        logAuditP($db,['user_id'=>$user['id'],'action'=>'UPDATE','entity_id'=>$id,
            'description'=>"Producto actualizado: {$old['name']}"]);
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
        logAuditP($db,['user_id'=>$user['id'],'action'=>'UPDATE','entity_id'=>$id,
            'description'=>($newStatus?'Activado':'Desactivado').": {$old['name']}"]);
        echo json_encode(['success'=>true,'active'=>$newStatus]);
        exit();
    }

    /* ═══════ UPDATE STOCK ═══════ */
    if ($method === 'PUT' && $action === 'update-stock') {
        $user     = getAuthUser($db);
        $input    = json_decode(file_get_contents('php://input'), true);
        $id       = (int)($input['id']    ?? 0);
        $newStock = (int)($input['stock'] ?? 0);
        if (!$id) throw new Exception('ID requerido');
        $stmt = $db->prepare("SELECT name,stock FROM products WHERE id=:id");
        $stmt->execute([':id'=>$id]);
        $old = $stmt->fetch();
        if (!$old) { http_response_code(404); echo json_encode(['success'=>false,'message'=>'No encontrado']); exit; }
        $db->prepare("UPDATE products SET stock=:s WHERE id=:id")->execute([':s'=>$newStock,':id'=>$id]);
        logAuditP($db,['user_id'=>$user['id'],'action'=>'UPDATE','entity_id'=>$id,
            'old_value'=>['stock'=>(int)$old['stock']],'new_value'=>['stock'=>$newStock],
            'description'=>"Stock: {$old['name']} ({$old['stock']} → $newStock)"]);
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
        logAuditP($db,['user_id'=>$user['id'],'action'=>'DELETE','entity_id'=>$id,
            'description'=>"Eliminado: {$old['name']}"]);
        echo json_encode(['success'=>true,'message'=>'Producto eliminado']);
        exit();
    }

    http_response_code(400);
    echo json_encode(['success'=>false,'message'=>'Accion no valida: '.$action]);

} catch(Exception $e) {
    error_log('products_crud.php error: '.$e->getMessage().' in '.$e->getFile().':'.$e->getLine());
    http_response_code(500);
    echo json_encode(['success'=>false,'message'=>$e->getMessage()]);
}