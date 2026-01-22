<?php
/**
 * API Endpoint: products.php
 * Obtiene productos desde MySQL con categorías y subcategorías dinámicas
 * ✅ Subcategorías para TODAS las categorías
 * ✅ Orden personalizado de categorías
 * Ruta: /api/products.php
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
    // 2. OBTENER PARÁMETROS DE BÚSQUEDA
    // ========================================
    $category = isset($_GET['category']) && $_GET['category'] !== 'all' 
        ? $_GET['category'] 
        : null;
    
    $subcategory = isset($_GET['subcategory']) 
        ? $_GET['subcategory'] 
        : null;
    
    $search = isset($_GET['search']) 
        ? $_GET['search'] 
        : null;

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
        $sql .= " AND category = :category";
        $params[':category'] = $category;
    }

    // Filtro por subcategoría
    if ($subcategory) {
        $sql .= " AND subcategory = :subcategory";
        $params[':subcategory'] = $subcategory;
    }

    // Filtro por búsqueda
    if ($search) {
        $sql .= " AND (
            name LIKE :search 
            OR description LIKE :search 
            OR sku LIKE :search
        )";
        $params[':search'] = '%' . $search . '%';
    }

    // Ordenar: destacados primero, luego por fecha
    $sql .= " ORDER BY featured DESC, created_at DESC";

    // ========================================
    // 4. EJECUTAR QUERY DE PRODUCTOS
    // ========================================
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $products = $stmt->fetchAll();

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
    }

    // ========================================
    // 6. OBTENER CATEGORÍAS ÚNICAS CON ORDEN PERSONALIZADO
    // ========================================
    
    // ✅ ORDEN DESEADO: Todos, Ropa, Juguetes, Peluches, Joyas, Perfumes, Relojes, Accesorios
    $categoryOrder = [
        'ropa',
        'juguetes',
        'peluches',
        'joyas',
        'perfumes',
        'relojes',
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
        $categoryMap[strtolower($cat['category'])] = (int)$cat['count'];
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
                'name' => ucfirst($catId), // Primera letra mayúscula
                'count' => $categoryMap[$catId]
            ];
        }
    }

    // ========================================
    // 7. OBTENER SUBCATEGORÍAS PARA TODAS LAS CATEGORÍAS
    // ========================================
    
    // ✅ NUEVO: Obtener subcategorías agrupadas por categoría
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
        $cat = strtolower($subcat['category']);
        $sub = strtolower($subcat['subcategory']);
        
        if (!isset($subcategoriesByCategory[$cat])) {
            $subcategoriesByCategory[$cat] = [];
        }
        
        $subcategoriesByCategory[$cat][] = [
            'id' => $sub,
            'name' => ucfirst($sub), // Primera letra mayúscula
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
        'subcategoriesByCategory' => $subcategoriesByCategory, // ✅ NUEVO: Todas las subcategorías organizadas
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
        'trace' => $e->getTraceAsString()
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    // Error general
    error_log("❌ General Error: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener productos',
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}

// Cerrar conexión
if (isset($database)) {
    $database->closeConnection();
}
?>