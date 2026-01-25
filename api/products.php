<?php
/**
 * API Endpoint: products.php
 * ✅ Sistema de búsqueda corregido y mejorado
 * ✅ Subcategorías para todas las categorías
 * ✅ Orden personalizado
 */

// Headers CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=UTF-8');

// Manejar preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Solo permitir GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'success' => false, 
        'message' => 'Método no permitido. Solo GET.'
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

// Incluir configuración de base de datos
require_once __DIR__ . '/config/database.php';

try {
    // ========================================
    // 1. CONECTAR A LA BASE DE DATOS
    // ========================================
    $database = new Database();
    $db = $database->getConnection();

    if (!$db) {
        throw new Exception('Error: No se pudo obtener la conexión');
    }

    // ========================================
    // 2. OBTENER Y LIMPIAR PARÁMETROS DE BÚSQUEDA
    // ========================================
    $category = isset($_GET['category']) && $_GET['category'] !== 'all' && $_GET['category'] !== '' 
        ? trim($_GET['category']) 
        : null;
    
    $subcategory = isset($_GET['subcategory']) && $_GET['subcategory'] !== '' 
        ? trim($_GET['subcategory']) 
        : null;
    
    // ✅ MEJORADO: Limpieza y validación de búsqueda
    $search = isset($_GET['search']) && $_GET['search'] !== '' 
        ? trim($_GET['search']) 
        : null;
    
    // Log de parámetros recibidos (para debug)
    error_log("📥 Parámetros recibidos - Category: " . ($category ?? 'null') . ", Subcategory: " . ($subcategory ?? 'null') . ", Search: " . ($search ?? 'null'));

    // ========================================
    // 3. CONSTRUIR QUERY SQL PARA PRODUCTOS
    // ========================================
    $sql = "SELECT 
                id,
                sku,
                name,
                category,
                subcategory,
                price,
                description,
                image,
                images,
                stock,
                featured,
                rating,
                review_count,
                created_at,
                updated_at
            FROM products
            WHERE active = 1";

    $params = [];

    // Filtro por categoría
    if ($category) {
        $sql .= " AND LOWER(category) = LOWER(:category)";
        $params[':category'] = $category;
    }

    // Filtro por subcategoría
    if ($subcategory) {
        $sql .= " AND LOWER(subcategory) = LOWER(:subcategory)";
        $params[':subcategory'] = $subcategory;
    }

    // ✅ MEJORADO: Filtro por búsqueda con mejor manejo
    if ($search && strlen($search) >= 2) { // Mínimo 2 caracteres para buscar
        $searchTerm = '%' . $search . '%';
        $sql .= " AND (
            LOWER(name) LIKE LOWER(:search1) 
            OR LOWER(description) LIKE LOWER(:search2) 
            OR LOWER(sku) LIKE LOWER(:search3)
            OR LOWER(category) LIKE LOWER(:search4)
            OR LOWER(subcategory) LIKE LOWER(:search5)
        )";
        $params[':search1'] = $searchTerm;
        $params[':search2'] = $searchTerm;
        $params[':search3'] = $searchTerm;
        $params[':search4'] = $searchTerm;
        $params[':search5'] = $searchTerm;
        
        error_log("🔍 Buscando: " . $search);
    }

    // Ordenar: destacados primero, luego por fecha
    $sql .= " ORDER BY featured DESC, created_at DESC";

    // ========================================
    // 4. EJECUTAR QUERY DE PRODUCTOS
    // ========================================
    $stmt = $db->prepare($sql);
    
    // ✅ MEJORADO: Manejo de errores en la ejecución
    try {
        $stmt->execute($params);
        $products = $stmt->fetchAll();
        
        error_log("✅ Productos encontrados: " . count($products));
    } catch (PDOException $e) {
        error_log("❌ Error ejecutando query: " . $e->getMessage());
        throw new Exception("Error en la búsqueda de productos");
    }

    // ========================================
    // 5. PROCESAR RESULTADOS DE PRODUCTOS
    // ========================================
    foreach ($products as &$product) {
        // Convertir campo 'images' de JSON a array
        if (isset($product['images']) && is_string($product['images'])) {
            $decoded = json_decode($product['images'], true);
            $product['images'] = is_array($decoded) ? $decoded : [$product['image'], $product['image'], $product['image']];
        } else {
            $product['images'] = [$product['image'], $product['image'], $product['image']];
        }

        // Convertir tipos de datos
        $product['id'] = (int)$product['id'];
        $product['price'] = (float)$product['price'];
        $product['stock'] = (int)$product['stock'];
        $product['featured'] = (bool)$product['featured'];
        $product['rating'] = (float)($product['rating'] ?? 0);
        $product['review_count'] = (int)($product['review_count'] ?? 0);
        
        // ✅ Asegurar que category y subcategory sean strings
        $product['category'] = $product['category'] ?? '';
        $product['subcategory'] = $product['subcategory'] ?? '';
    }

    // ========================================
    // 6. OBTENER CATEGORÍAS ÚNICAS CON ORDEN PERSONALIZADO
    // ========================================
    
    // ✅ ORDEN DESEADO - Actualizado con todas las categorías
    $categoryOrder = [
        'ropa',
        'belleza',        // ⭐ NUEVO: Victoria's Secret
        'perfumes',
        'juguetes',
        'peluches',
        'joyas',
        'relojes',
        'deportes',       // ⭐ NUEVO: Patines y deportivos
        'accesorios'
    ];
    
    $sqlCategories = "SELECT 
                        DISTINCT category,
                        COUNT(*) as count
                      FROM products 
                      WHERE active = 1 
                      GROUP BY category 
                      ORDER BY category";
    
    $stmtCategories = $db->prepare($sqlCategories);
    $stmtCategories->execute();
    $categoriesData = $stmtCategories->fetchAll();

    // Crear mapa de categorías con conteos
    $categoryMap = [];
    $totalCount = 0;
    foreach ($categoriesData as $cat) {
        $catLower = strtolower(trim($cat['category']));
        $categoryMap[$catLower] = (int)$cat['count'];
        $totalCount += (int)$cat['count'];
    }

    $categories = [];
    
    // Agregar "Todos" primero
    $categories[] = [
        'id' => 'all',
        'name' => 'Todos',
        'count' => $totalCount
    ];
    
    // Agregar categorías en el orden especificado
    foreach ($categoryOrder as $catId) {
        if (isset($categoryMap[$catId])) {
            $categories[] = [
                'id' => $catId,
                'name' => ucfirst($catId),
                'count' => $categoryMap[$catId]
            ];
        }
    }

    // ========================================
    // 7. OBTENER SUBCATEGORÍAS PARA TODAS LAS CATEGORÍAS
    // ========================================
    
    $sqlAllSubcategories = "SELECT 
                                category,
                                subcategory,
                                COUNT(*) as count
                            FROM products 
                            WHERE active = 1 
                            AND subcategory IS NOT NULL
                            AND subcategory != ''
                            GROUP BY category, subcategory 
                            ORDER BY category, subcategory";
    
    $stmtAllSubcategories = $db->prepare($sqlAllSubcategories);
    $stmtAllSubcategories->execute();
    $allSubcategoriesData = $stmtAllSubcategories->fetchAll();

    // Organizar subcategorías por categoría
    $subcategoriesByCategory = [];
    foreach ($allSubcategoriesData as $subcat) {
        $cat = strtolower(trim($subcat['category']));
        $sub = strtolower(trim($subcat['subcategory']));
        
        if (!isset($subcategoriesByCategory[$cat])) {
            $subcategoriesByCategory[$cat] = [];
        }
        
        $subcategoriesByCategory[$cat][] = [
            'id' => $sub,
            'name' => ucfirst($sub),
            'count' => (int)$subcat['count']
        ];
    }

    // ========================================
    // 8. CONFIGURACIÓN DE ENVÍO
    // ========================================
    $shippingConfig = [
        'cost' => 5.0,
        'freeThreshold' => 50.0,
        'expressCost' => 10.0
    ];

    // ========================================
    // 9. RESPUESTA EXITOSA
    // ========================================
    $response = [
        'success' => true,
        'products' => $products,
        'categories' => $categories,
        'subcategoriesByCategory' => $subcategoriesByCategory,
        'shippingConfig' => $shippingConfig,
        'total' => count($products),
        'filters' => [
            'category' => $category,
            'subcategory' => $subcategory,
            'search' => $search
        ],
        'timestamp' => date('c')
    ];

    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    // Error de base de datos
    error_log("❌ Database Error: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error de base de datos',
        'error' => $e->getMessage(),
        'code' => 'DB_ERROR'
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    // Error general
    error_log("❌ General Error: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener productos',
        'error' => $e->getMessage(),
        'code' => 'GENERAL_ERROR'
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}

// Cerrar conexión
if (isset($database)) {
    $database->closeConnection();
}
?>