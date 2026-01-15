<?php
/**
 * API Endpoint: Obtener Productos
 * Mawewe E-commerce
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';

// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $pdo = getDBConnection();
    
    // Obtener parámetros opcionales
    $category = $_GET['category'] ?? null;
    $subcategory = $_GET['subcategory'] ?? null;
    $search = $_GET['search'] ?? null;
    $featured = $_GET['featured'] ?? null;
    
    // Construir query
    $sql = "SELECT 
                p.id,
                p.sku,
                p.name,
                p.category,
                p.subcategory,
                p.price,
                p.description,
                p.image,
                p.stock,
                p.featured,
                p.rating,
                p.review_count as \"reviewCount\",
                p.created_at as \"createdAt\",
                p.updated_at as \"updatedAt\"
            FROM products p
            WHERE 1=1";
    
    $params = [];
    
    // Filtrar por categoría
    if ($category && $category !== 'all') {
        $sql .= " AND p.category = :category";
        $params[':category'] = $category;
    }
    
    // Filtrar por subcategoría
    if ($subcategory) {
        $sql .= " AND p.subcategory = :subcategory";
        $params[':subcategory'] = $subcategory;
    }
    
    // Búsqueda
    if ($search) {
        $sql .= " AND (p.name ILIKE :search OR p.description ILIKE :search)";
        $params[':search'] = '%' . $search . '%';
    }
    
    // Solo destacados
    if ($featured === 'true') {
        $sql .= " AND p.featured = true";
    }
    
    // Ordenar
    $sql .= " ORDER BY p.featured DESC, p.rating DESC, p.name ASC";
    
    // Ejecutar query
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $products = $stmt->fetchAll();
    
    // Obtener categorías
    $categoriesStmt = $pdo->query("
        SELECT 
            id,
            name,
            description,
            created_at as \"createdAt\",
            updated_at as \"updatedAt\"
        FROM categories
        ORDER BY 
            CASE 
                WHEN id = 'ropa' THEN 1
                WHEN id = 'peluches' THEN 2
                WHEN id = 'juguetes' THEN 3
                WHEN id = 'perfumes' THEN 4
                WHEN id = 'joyas' THEN 5
                WHEN id = 'relojes' THEN 6
                WHEN id = 'accesorios' THEN 7
                ELSE 8
            END
    ");
    $categories = $categoriesStmt->fetchAll();
    
    // Obtener configuración de envío
    $shippingStmt = $pdo->query("
        SELECT 
            free_shipping_threshold as \"freeShippingThreshold\",
            standard_shipping_cost as \"standardShippingCost\",
            express_shipping_cost as \"expressShippingCost\"
        FROM shipping_config
        WHERE id = 1
    ");
    $shippingConfig = $shippingStmt->fetch();
    
    // Respuesta
    $response = [
        'products' => $products,
        'categories' => $categories,
        'shippingConfig' => [
            'freeShippingThreshold' => (float)$shippingConfig['freeShippingThreshold'],
            'standardShippingCost' => (float)$shippingConfig['standardShippingCost'],
            'expressShippingCost' => (float)$shippingConfig['expressShippingCost']
        ],
        'metadata' => [
            'totalProducts' => count($products),
            'lastUpdated' => date('Y-m-d'),
            'version' => '4.0',
            'currency' => 'USD'
        ]
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    error_log("Error en API: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Error al obtener productos',
        'message' => $e->getMessage()
    ]);
}
?>