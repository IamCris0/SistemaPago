<?php
/**
 * MAWEWE API - PRODUCTS.PHP - VERSIÓN CORREGIDA
 * ✅ Filtros de categoría funcionando
 * ✅ Filtros de búsqueda funcionando
 * ✅ Filtros de subcategoría funcionando
 * ✅ CORS configurado
 */

// ============================================================
// 1. LIMPIAR BUFFER DE SALIDA
// ============================================================
while (ob_get_level()) {
    ob_end_clean();
}

// ============================================================
// 2. HEADERS CORS
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
// 5. CONECTAR A LA BASE DE DATOS
// ============================================================
try {
    require_once __DIR__ . '/config/database.php';
    
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception('No se pudo conectar a la base de datos');
    }
    
    // ============================================================
    // 6. CONSTRUIR QUERY CON FILTROS
    // ============================================================
    
    // SQL base
    $sql = "SELECT 
                id, sku, name, category, subcategory, price, 
                description, image, images, stock, active, 
                created_at, updated_at 
            FROM products 
            WHERE active = 1";
    
    $params = [];
    
    // ✅ FILTRO POR CATEGORÍA
    $category = isset($_GET['category']) && $_GET['category'] !== '' 
        ? trim($_GET['category']) : null;
    
    if ($category) {
        $sql .= " AND LOWER(TRIM(category)) = LOWER(:category)";
        $params[':category'] = $category;
        error_log("🔍 PHP: Filtrando categoría: " . $category);
    }
    
    // ✅ FILTRO POR SUBCATEGORÍA
    $subcategory = isset($_GET['subcategory']) && $_GET['subcategory'] !== '' 
        ? trim($_GET['subcategory']) : null;
    
    if ($subcategory) {
        $sql .= " AND LOWER(TRIM(subcategory)) = LOWER(:subcategory)";
        $params[':subcategory'] = $subcategory;
        error_log("🔍 PHP: Filtrando subcategoría: " . $subcategory);
    }
    
    // ✅ FILTRO POR BÚSQUEDA
    $search = isset($_GET['search']) && $_GET['search'] !== '' 
        ? trim($_GET['search']) : null;
    
    if ($search && strlen($search) >= 2) {
        $sql .= " AND LOWER(name) LIKE LOWER(:search)";
        $params[':search'] = '%' . $search . '%';
        error_log("🔍 PHP: Filtrando búsqueda: " . $search);
    }
    
    // Ordenar por fecha de creación (más recientes primero)
    $sql .= " ORDER BY created_at DESC";
    
    error_log("📊 PHP: SQL completo: " . $sql);
    error_log("📊 PHP: Parámetros: " . json_encode($params));
    
    // ============================================================
    // 7. EJECUTAR QUERY
    // ============================================================
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    error_log("✅ PHP: " . count($products) . " productos encontrados");
    
    // ============================================================
    // 8. PROCESAR PRODUCTOS
    // ============================================================
    foreach ($products as &$product) {
        // Asegurar campos básicos
        if (!isset($product['sku']) || empty($product['sku'])) {
            $product['sku'] = 'SKU-' . $product['id'];
        }
        if (!isset($product['category'])) $product['category'] = '';
        if (!isset($product['subcategory'])) $product['subcategory'] = '';
        if (!isset($product['description'])) $product['description'] = '';
        if (!isset($product['image'])) $product['image'] = '';
        if (!isset($product['stock'])) $product['stock'] = 0;
        
        // Convertir tipos
        $product['id'] = (int)$product['id'];
        $product['price'] = (float)$product['price'];
        $product['stock'] = (int)$product['stock'];
        $product['active'] = (int)$product['active'];
        
        // Procesar imágenes
        if (isset($product['images']) && is_string($product['images']) && !empty($product['images'])) {
            $decoded = json_decode($product['images'], true);
            $product['images'] = is_array($decoded) ? $decoded : [$product['image']];
        } else {
            $product['images'] = [$product['image']];
        }
    }
    
    // ============================================================
    // 9. OBTENER CATEGORÍAS (solo si NO hay filtros aplicados)
    // ============================================================
    $categories = [];
    $subcategoriesByCategory = [];
    
    // Solo calcular categorías si no hay filtros (para optimizar)
    if (!$category && !$search) {
        // Contar todas las categorías
        $sqlCat = "SELECT 
                        category, 
                        COUNT(*) as count 
                   FROM products 
                   WHERE active = 1 
                   AND category IS NOT NULL 
                   AND category != '' 
                   GROUP BY category
                   ORDER BY count DESC";
        
        $stmtCat = $db->query($sqlCat);
        $catsData = $stmtCat->fetchAll(PDO::FETCH_ASSOC);
        
        // Calcular total
        $total = array_sum(array_column($catsData, 'count'));
        
        // Agregar "Todos" primero
        $categories[] = [
            'id' => 'all',
            'name' => 'Todos',
            'count' => $total
        ];
        
        // Agregar categorías individuales
        foreach ($catsData as $cat) {
            $categories[] = [
                'id' => strtolower($cat['category']),
                'name' => ucfirst($cat['category']),
                'count' => (int)$cat['count']
            ];
        }
        
        error_log("✅ PHP: " . count($categories) . " categorías calculadas");
    } else {
        // Si hay filtros, devolver categorías básicas sin recalcular
        $categories[] = ['id' => 'all', 'name' => 'Todos', 'count' => 0];
    }
    
    // ============================================================
    // 10. RESPUESTA FINAL
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
        'timestamp' => date('c'),
        'filters_applied' => [
            'category' => $category,
            'subcategory' => $subcategory,
            'search' => $search
        ]
    ];
    
    error_log("✅ PHP: Enviando respuesta con " . count($products) . " productos");
    
    // ============================================================
    // 11. ENVIAR RESPUESTA
    // ============================================================
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    
} catch (Exception $e) {
    error_log("❌ PHP ERROR: " . $e->getMessage());
    
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
// 12. FLUSH FINAL
// ============================================================
if (function_exists('fastcgi_finish_request')) {
    fastcgi_finish_request();
}