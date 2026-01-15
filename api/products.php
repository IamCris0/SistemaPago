<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json; charset=UTF-8');

// Manejar preflight requests (OPTIONS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Solo permitir GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

require_once __DIR__ . '/config/database.php';

try {
    // Conectar a la base de datos
    $database = new Database();
    $db = $database->getConnection();

    if (!$db) {
        throw new Exception('Error de conexión a la base de datos');
    }

    // Obtener parámetros de búsqueda
    $category = isset($_GET['category']) ? $_GET['category'] : null;
    $subcategory = isset($_GET['subcategory']) ? $_GET['subcategory'] : null;
    $search = isset($_GET['search']) ? $_GET['search'] : null;

    // Construir query base
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

    // Agregar filtros
    if ($category && $category !== 'all') {
        $sql .= " AND category = :category";
        $params[':category'] = $category;
    }

    if ($subcategory) {
        $sql .= " AND subcategory = :subcategory";
        $params[':subcategory'] = $subcategory;
    }

    if ($search) {
        $sql .= " AND (name LIKE :search OR description LIKE :search OR sku LIKE :search)";
        $params[':search'] = '%' . $search . '%';
    }

    // Ordenar por featured primero, luego por fecha
    $sql .= " ORDER BY featured DESC, created_at DESC";

    // Preparar y ejecutar
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $products = $stmt->fetchAll();

    // Procesar imágenes (convertir JSON string a array)
    foreach ($products as &$product) {
        // Convertir images de JSON a array
        if (isset($product['images']) && is_string($product['images'])) {
            $product['images'] = json_decode($product['images'], true);
        }
        
        // Si no hay array de imágenes, crear uno con la imagen principal
        if (!isset($product['images']) || !is_array($product['images'])) {
            $product['images'] = [
                $product['image'], 
                $product['image'], 
                $product['image']
            ];
        }

        // Convertir tipos de datos
        $product['id'] = (int)$product['id'];
        $product['price'] = (float)$product['price'];
        $product['stock'] = (int)$product['stock'];
        $product['featured'] = (bool)$product['featured'];
        $product['rating'] = (float)$product['rating'];
        $product['review_count'] = (int)$product['review_count'];
    }

    // Obtener categorías únicas con conteo
    $sqlCategories = "SELECT 
                        category,
                        COUNT(*) as count
                      FROM products 
                      WHERE active = 1 
                      GROUP BY category 
                      ORDER BY category";
    
    $stmtCategories = $db->prepare($sqlCategories);
    $stmtCategories->execute();
    $categoriesData = $stmtCategories->fetchAll();

    $categories = [];
    foreach ($categoriesData as $cat) {
        $categories[] = [
            'id' => strtolower(str_replace(' ', '-', $cat['category'])),
            'name' => ucfirst($cat['category']),
            'count' => (int)$cat['count']
        ];
    }

    // Configuración de envío
    $shippingConfig = [
        'cost' => 5.0,
        'freeThreshold' => 50.0,
        'expressCost' => 10.0
    ];

    // Respuesta exitosa
    $response = [
        'success' => true,
        'products' => $products,
        'categories' => $categories,
        'shippingConfig' => $shippingConfig,
        'total' => count($products),
        'timestamp' => date('c')
    ];

    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener productos',
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>