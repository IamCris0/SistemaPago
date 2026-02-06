<?php
// ============================================================
// HEADERS CORS FORZADOS (antes de cualquier output)
// ============================================================
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
} else {
    header("Access-Control-Allow-Origin: *");
}
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, cache-control");
header("Content-Type: application/json; charset=UTF-8");

// Manejar preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Solo GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

try {
    require_once __DIR__ . '/config/database.php';
    
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception('No se pudo conectar a la base de datos');
    }
    
    // Obtener columnas
    $stmt = $db->query("DESCRIBE products");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    // Columnas requeridas
    $required = ['id', 'name', 'price', 'active'];
    foreach ($required as $col) {
        if (!in_array($col, $columns)) {
            throw new Exception("Falta columna requerida: $col");
        }
    }
    
    // SELECT dinámico
    $select = ['id', 'name', 'price', 'active'];
    $optional = ['sku', 'category', 'subcategory', 'description', 'image', 'images', 'stock', 'created_at', 'updated_at'];
    
    foreach ($optional as $col) {
        if (in_array($col, $columns)) {
            $select[] = $col;
        }
    }
    
    $selectStr = implode(', ', $select);
    
    // Query base
    $sql = "SELECT $selectStr FROM products WHERE active = 1";
    $params = [];
    
    // Filtros
    $category = isset($_GET['category']) && $_GET['category'] !== 'all' && $_GET['category'] !== '' 
        ? trim($_GET['category']) : null;
    
    $subcategory = isset($_GET['subcategory']) && $_GET['subcategory'] !== '' 
        ? trim($_GET['subcategory']) : null;
    
    $search = isset($_GET['search']) && $_GET['search'] !== '' 
        ? trim($_GET['search']) : null;
    
    if ($category && in_array('category', $columns)) {
        $sql .= " AND LOWER(category) = LOWER(:category)";
        $params[':category'] = $category;
    }
    
    if ($subcategory && in_array('subcategory', $columns)) {
        $sql .= " AND LOWER(subcategory) = LOWER(:subcategory)";
        $params[':subcategory'] = $subcategory;
    }
    
    if ($search && strlen($search) >= 2) {
        $searchTerm = '%' . $search . '%';
        $conditions = ["LOWER(name) LIKE LOWER(:search)"];
        $params[':search'] = $searchTerm;
        $sql .= " AND (" . implode(' OR ', $conditions) . ")";
    }
    
    // Ordenar
    if (in_array('created_at', $columns)) {
        $sql .= " ORDER BY created_at DESC";
    } else {
        $sql .= " ORDER BY id DESC";
    }
    
    // Ejecutar
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Procesar productos
    foreach ($products as &$product) {
        if (!isset($product['sku'])) $product['sku'] = 'SKU-' . $product['id'];
        if (!isset($product['category'])) $product['category'] = '';
        if (!isset($product['subcategory'])) $product['subcategory'] = '';
        if (!isset($product['description'])) $product['description'] = '';
        if (!isset($product['image'])) $product['image'] = '';
        if (!isset($product['stock'])) $product['stock'] = 0;
        
        $product['id'] = (int)$product['id'];
        $product['price'] = (float)$product['price'];
        $product['stock'] = (int)$product['stock'];
        
        if (isset($product['images']) && is_string($product['images'])) {
            $decoded = json_decode($product['images'], true);
            $product['images'] = is_array($decoded) ? $decoded : [$product['image']];
        } else {
            $product['images'] = [$product['image']];
        }
    }
    
    // Categorías
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
        
        $categories[] = ['id' => 'all', 'name' => 'Todos', 'count' => $total];
        
        foreach ($catsData as $cat) {
            $categories[] = [
                'id' => strtolower($cat['category']),
                'name' => ucfirst($cat['category']),
                'count' => (int)$cat['count']
            ];
        }
    }
    
    // Respuesta
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
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}