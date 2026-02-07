<?php
/**
 * MAWEWE API - PRODUCTS.PHP - VERSIÓN CORREGIDA
 * ✅ Búsqueda global funcionando
 * ✅ Fix error 500 en búsqueda
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
    // 6. OBTENER Y LIMPIAR PARÁMETROS
    // ============================================================
    $search = isset($_GET['search']) && trim($_GET['search']) !== '' 
        ? trim($_GET['search']) : null;
    
    $category = isset($_GET['category']) && trim($_GET['category']) !== '' 
        ? trim($_GET['category']) : null;
    
    $subcategory = isset($_GET['subcategory']) && trim($_GET['subcategory']) !== '' 
        ? trim($_GET['subcategory']) : null;
    
    error_log("🔍 PARÁMETROS RECIBIDOS:");
    error_log("  - search: " . ($search ?? 'null'));
    error_log("  - category: " . ($category ?? 'null'));
    error_log("  - subcategory: " . ($subcategory ?? 'null'));
    
    // ============================================================
    // 7. CONSTRUIR QUERY CON FILTROS
    // ============================================================
    
    // SQL base
    $sql = "SELECT 
                id, sku, name, category, subcategory, price, 
                description, image, images, stock, active, 
                created_at, updated_at 
            FROM products 
            WHERE active = 1";
    
    $params = [];
    
    // ✅ BÚSQUEDA GLOBAL (tiene prioridad sobre categorías)
    if ($search && strlen($search) >= 2) {
        error_log("🔍 BÚSQUEDA GLOBAL ACTIVADA: " . $search);
        
        $sql .= " AND (
            LOWER(name) LIKE LOWER(:search1) OR
            LOWER(description) LIKE LOWER(:search2) OR
            LOWER(sku) LIKE LOWER(:search3) OR
            LOWER(category) LIKE LOWER(:search4) OR
            LOWER(subcategory) LIKE LOWER(:search5)
        )";
        
        $searchParam = '%' . $search . '%';
        $params[':search1'] = $searchParam;
        $params[':search2'] = $searchParam;
        $params[':search3'] = $searchParam;
        $params[':search4'] = $searchParam;
        $params[':search5'] = $searchParam;
        
    } else {
        // Solo aplicar filtros de categoría si NO hay búsqueda
        
        if ($category) {
            $sql .= " AND LOWER(TRIM(category)) = LOWER(:category)";
            $params[':category'] = $category;
            error_log("📂 Filtrando por categoría: " . $category);
        }
        
        if ($subcategory) {
            $sql .= " AND LOWER(TRIM(subcategory)) = LOWER(:subcategory)";
            $params[':subcategory'] = $subcategory;
            error_log("📁 Filtrando por subcategoría: " . $subcategory);
        }
    }
    
    // Ordenar
    $sql .= " ORDER BY created_at DESC";
    
    error_log("📊 SQL: " . $sql);
    error_log("📊 Params: " . json_encode($params));
    
    // ============================================================
    // 8. EJECUTAR QUERY
    // ============================================================
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    error_log("✅ " . count($products) . " productos encontrados");
    
    // ============================================================
    // 9. PROCESAR PRODUCTOS
    // ============================================================
    foreach ($products as &$product) {
        // Asegurar campos básicos
        $product['sku'] = $product['sku'] ?? 'SKU-' . $product['id'];
        $product['category'] = $product['category'] ?? '';
        $product['subcategory'] = $product['subcategory'] ?? '';
        $product['description'] = $product['description'] ?? '';
        $product['image'] = $product['image'] ?? '';
        $product['stock'] = $product['stock'] ?? 0;
        
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
    // 10. OBTENER CATEGORÍAS Y SUBCATEGORÍAS
    // ============================================================
    $categories = [];
    $subcategoriesByCategory = [];
    
    // Solo si NO hay búsqueda activa
    if (!$search) {
        
        // Contar categorías
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
        
        // Obtener subcategorías
        $sqlSubcat = "SELECT 
                          category,
                          subcategory,
                          COUNT(*) as count
                      FROM products
                      WHERE active = 1
                      AND category IS NOT NULL
                      AND category != ''
                      AND subcategory IS NOT NULL
                      AND subcategory != ''
                      GROUP BY category, subcategory
                      ORDER BY category, count DESC";
        
        $stmtSubcat = $db->query($sqlSubcat);
        $subcatsData = $stmtSubcat->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($subcatsData as $subcat) {
            $catKey = strtolower($subcat['category']);
            
            if (!isset($subcategoriesByCategory[$catKey])) {
                $subcategoriesByCategory[$catKey] = [];
            }
            
            $subcategoriesByCategory[$catKey][] = [
                'id' => strtolower($subcat['subcategory']),
                'name' => ucfirst($subcat['subcategory']),
                'count' => (int)$subcat['count']
            ];
        }
        
    } else {
        // Búsqueda activa: devolver categorías básicas
        $categories[] = ['id' => 'all', 'name' => 'Todos', 'count' => 0];
    }
    
    // ============================================================
    // 11. RESPUESTA FINAL
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
            'search' => $search,
            'search_is_global' => !empty($search)
        ]
    ];
    
    error_log("✅ Enviando respuesta con " . count($products) . " productos");
    
    // ============================================================
    // 12. ENVIAR RESPUESTA
    // ============================================================
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    
} catch (Exception $e) {
    error_log("❌ ERROR: " . $e->getMessage());
    error_log("❌ FILE: " . $e->getFile());
    error_log("❌ LINE: " . $e->getLine());
    error_log("❌ TRACE: " . $e->getTraceAsString());
    
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
// 13. FLUSH FINAL
// ============================================================
if (function_exists('fastcgi_finish_request')) {
    fastcgi_finish_request();
}
?>