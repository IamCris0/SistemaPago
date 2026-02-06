<?php
/**
 * MAWEWE API - PRODUCTS.PHP - VERSIÓN CORREGIDA
 * ✅ CORS configurado correctamente
 * ✅ Headers limpios
 * ✅ Compatible con cualquier frontend
 */

// ============================================================
// 1. LIMPIAR BUFFER DE SALIDA
// ============================================================
while (ob_get_level()) {
    ob_end_clean();
}

// ============================================================
// 2. HEADERS CORS - PERMITIR CUALQUIER ORIGEN
// ============================================================
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Max-Age: 3600');
header('Content-Type: application/json; charset=UTF-8');

// ============================================================
// 3. MANEJAR PREFLIGHT (OPTIONS)
// ============================================================
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ============================================================
// 4. SOLO PERMITIR GET
// ============================================================
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Método no permitido. Solo GET.'
    ]);
    exit;
}

// ============================================================
// 5. LÓGICA PRINCIPAL
// ============================================================
try {
    // Conectar a la base de datos
    require_once __DIR__ . '/config/database.php';
    
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception('No se pudo conectar a la base de datos');
    }
    
    // Obtener columnas disponibles
    $stmt = $db->query("DESCRIBE products");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    // Verificar columnas requeridas
    $required = ['id', 'name', 'price', 'active'];
    foreach ($required as $col) {
        if (!in_array($col, $columns)) {
            throw new Exception("Falta columna requerida: $col");
        }
    }
    
    // Construir SELECT dinámico
    $select = ['id', 'name', 'price', 'active'];
    $optional = ['sku', 'category', 'subcategory', 'description', 'image', 'images', 'stock', 'created_at', 'updated_at'];
    
    foreach ($optional as $col) {
        if (in_array($col, $columns)) {
            $select[] = $col;
        }
    }
    
    $selectStr = implode(', ', $select);
    
    // ============================================================
    // CONSTRUIR QUERY CON FILTROS
    // ============================================================
    $sql = "SELECT $selectStr FROM products WHERE active = 1";
    $params = [];
    
    // Filtro por categoría
    $category = isset($_GET['category']) && $_GET['category'] !== 'all' && $_GET['category'] !== '' 
        ? trim($_GET['category']) : null;
    
    if ($category && in_array('category', $columns)) {
        $sql .= " AND LOWER(category) = LOWER(:category)";
        $params[':category'] = $category;
    }
    
    // Filtro por subcategoría
    $subcategory = isset($_GET['subcategory']) && $_GET['subcategory'] !== '' 
        ? trim($_GET['subcategory']) : null;
    
    if ($subcategory && in_array('subcategory', $columns)) {
        $sql .= " AND LOWER(subcategory) = LOWER(:subcategory)";
        $params[':subcategory'] = $subcategory;
    }
    
    // Filtro por búsqueda
    $search = isset($_GET['search']) && $_GET['search'] !== '' 
        ? trim($_GET['search']) : null;
    
    if ($search && strlen($search) >= 2) {
        $searchTerm = '%' . $search . '%';
        $sql .= " AND LOWER(name) LIKE LOWER(:search)";
        $params[':search'] = $searchTerm;
    }
    
    // Ordenar
    if (in_array('created_at', $columns)) {
        $sql .= " ORDER BY created_at DESC";
    } else {
        $sql .= " ORDER BY id DESC";
    }
    
    // ============================================================
    // EJECUTAR QUERY
    // ============================================================
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // ============================================================
    // PROCESAR PRODUCTOS
    // ============================================================
    foreach ($products as &$product) {
        // Asegurar campos básicos
        if (!isset($product['sku'])) $product['sku'] = 'SKU-' . $product['id'];
        if (!isset($product['category'])) $product['category'] = '';
        if (!isset($product['subcategory'])) $product['subcategory'] = '';
        if (!isset($product['description'])) $product['description'] = '';
        if (!isset($product['image'])) $product['image'] = '';
        if (!isset($product['stock'])) $product['stock'] = 0;
        
        // Convertir tipos
        $product['id'] = (int)$product['id'];
        $product['price'] = (float)$product['price'];
        $product['stock'] = (int)$product['stock'];
        
        // Procesar imágenes
        if (isset($product['images']) && is_string($product['images'])) {
            $decoded = json_decode($product['images'], true);
            $product['images'] = is_array($decoded) ? $decoded : [$product['image']];
        } else {
            $product['images'] = [$product['image']];
        }
    }
    
    // ============================================================
    // OBTENER CATEGORÍAS
    // ============================================================
    $categories = [];
    $subcategoriesByCategory = [];
    
    if (in_array('category', $columns)) {
        $sqlCat = "SELECT category, COUNT(*) as count 
                   FROM products 
                   WHERE active = 1 AND category IS NOT NULL AND category != '' 
                   GROUP BY category";
        
        $stmtCat = $db->query($sqlCat);
        $catsData = $stmtCat->fetchAll(PDO::FETCH_ASSOC);
        
        $total = array_sum(array_column($catsData, 'count'));
        
        $categories[] = [
            'id' => 'all',
            'name' => 'Todos',
            'count' => $total
        ];
        
        foreach ($catsData as $cat) {
            $categories[] = [
                'id' => strtolower($cat['category']),
                'name' => ucfirst($cat['category']),
                'count' => (int)$cat['count']
            ];
        }
    }
    
    // ============================================================
    // RESPUESTA FINAL
    // ============================================================
    $response = [
        'success' => true,
        'products' => $products,
        'categories' => $categories,
        'subcategoriesByCategory' => $subcategoriesByCategory,
        'shippingConfig' => [
            'cost' => 0.0,
            'freeThreshold' => 0.0,
            'expressCost' => 0.0
        ],
        'total' => count($products),
        'timestamp' => date('c')
    ];
    
    // ============================================================
    // ENVIAR RESPUESTA
    // ============================================================
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error del servidor',
        'error' => $e->getMessage(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine()
    ], JSON_UNESCAPED_UNICODE);
}

// ============================================================
// 6. FLUSH FINAL
// ============================================================
if (function_exists('fastcgi_finish_request')) {
    fastcgi_finish_request();
}