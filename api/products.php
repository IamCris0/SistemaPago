<?php
/**
 * MAWEWE API - PRODUCTS.PHP
 * ✅ Fix rutas de imágenes: images/productos/ → URL completa de mawewe.com.ec
 * ✅ Búsqueda global funcionando
 * ✅ Fix CORS para tienda.mawewe.com.ec
 */

while (ob_get_level()) {
    ob_end_clean();
}

// ============================================================
// HEADERS CORS
// ============================================================
$allowed_origins = [
    'https://tienda.mawewe.com.ec',
    'https://mawewe.com.ec',
    'http://localhost',
    'http://localhost:3000',
];

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header('Access-Control-Allow-Origin: *');
}

header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Accept, Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Max-Age: 3600');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido. Solo GET.']);
    exit;
}

// ============================================================
// ✅ HELPER: Normalizar URL de imagen
// Convierte rutas relativas a URLs absolutas del dominio correcto:
//   images/productos/...  → https://mawewe.com.ec/images/productos/...
//   assets/img/...        → https://tienda.mawewe.com.ec/assets/img/...
//   (ya es URL completa)  → sin cambio
// ============================================================
function normalizeImageUrl($path) {
    if (empty($path)) return '';
    if (strpos($path, 'http://') === 0 || strpos($path, 'https://') === 0) {
        return $path; // ya es URL completa
    }
    // Imágenes nuevas subidas via CRM (products_crud.php upload-image)
    if (strpos($path, 'images/') === 0 || strpos($path, '/images/') === 0) {
        return 'https://mawewe.com.ec/' . ltrim($path, '/');
    }
    // Imágenes antiguas (assets/img/...)
    return 'https://tienda.mawewe.com.ec/' . ltrim($path, '/');
}

try {
    require_once __DIR__ . '/config/database.php';

    $database = new Database();
    $db = $database->getConnection();

    if (!$db) {
        throw new Exception('No se pudo conectar a la base de datos');
    }

    // ============================================================
    // PARÁMETROS
    // ============================================================
    $search      = isset($_GET['search'])      && trim($_GET['search'])      !== '' ? trim($_GET['search'])      : null;
    $category    = isset($_GET['category'])    && trim($_GET['category'])    !== '' ? trim($_GET['category'])    : null;
    $subcategory = isset($_GET['subcategory']) && trim($_GET['subcategory']) !== '' ? trim($_GET['subcategory']) : null;

    error_log("🔍 PARÁMETROS: search=" . ($search ?? 'null') . " category=" . ($category ?? 'null'));

    // ============================================================
    // QUERY
    // ============================================================
    $sql = "SELECT id, sku, name, category, subcategory, price,
                   description, image, images, stock, active,
                   created_at, updated_at
            FROM products
            WHERE active = 1";

    $params = [];

    if ($search && strlen($search) >= 2) {
        $sql .= " AND (
            LOWER(name)        LIKE LOWER(:search1) OR
            LOWER(description) LIKE LOWER(:search2) OR
            LOWER(sku)         LIKE LOWER(:search3) OR
            LOWER(category)    LIKE LOWER(:search4) OR
            LOWER(subcategory) LIKE LOWER(:search5)
        )";
        $sp = '%' . $search . '%';
        $params[':search1'] = $sp;
        $params[':search2'] = $sp;
        $params[':search3'] = $sp;
        $params[':search4'] = $sp;
        $params[':search5'] = $sp;
    } else {
        if ($category) {
            $sql .= " AND LOWER(TRIM(category)) = LOWER(:category)";
            $params[':category'] = $category;
        }
        if ($subcategory) {
            $sql .= " AND LOWER(TRIM(subcategory)) = LOWER(:subcategory)";
            $params[':subcategory'] = $subcategory;
        }
    }

    $sql .= " ORDER BY created_at DESC";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    error_log("✅ " . count($products) . " productos encontrados");

    // ============================================================
    // ✅ PROCESAR PRODUCTOS — normalizar URLs de imágenes
    // ============================================================
    foreach ($products as &$product) {
        $product['id']     = (int)$product['id'];
        $product['price']  = (float)$product['price'];
        $product['stock']  = (int)$product['stock'];
        $product['active'] = (int)$product['active'];

        // Procesar array de imágenes
        $imgsArray = [];
        if (!empty($product['images'])) {
            $decoded = json_decode($product['images'], true);
            $imgsArray = is_array($decoded) ? $decoded : [$product['image']];
        } elseif (!empty($product['image'])) {
            $imgsArray = [$product['image']];
        }

        // ✅ Normalizar cada URL del array de imágenes
        $imgsArray = array_map('normalizeImageUrl', array_filter($imgsArray));
        $product['images'] = array_values($imgsArray);

        // ✅ Normalizar imagen principal
        $product['image'] = !empty($imgsArray) ? $imgsArray[0] : normalizeImageUrl($product['image'] ?? '');

        $product['sku']         = $product['sku']         ?? 'SKU-' . $product['id'];
        $product['category']    = $product['category']    ?? '';
        $product['subcategory'] = $product['subcategory'] ?? '';
        $product['description'] = $product['description'] ?? '';
        $product['stock']       = $product['stock']       ?? 0;
    }
    unset($product);

    // ============================================================
    // CATEGORÍAS Y SUBCATEGORÍAS
    // ============================================================
    $categories = [];
    $subcategoriesByCategory = [];

    if (!$search) {
        $sqlCat = "SELECT category, COUNT(*) as count
                   FROM products
                   WHERE active = 1 AND category IS NOT NULL AND category != ''
                   GROUP BY category ORDER BY count DESC";

        $stmtCat  = $db->query($sqlCat);
        $catsData = $stmtCat->fetchAll(PDO::FETCH_ASSOC);
        $total    = array_sum(array_column($catsData, 'count'));

        $categories[] = ['id' => 'all', 'name' => 'Todos', 'count' => $total];
        foreach ($catsData as $cat) {
            $categories[] = [
                'id'    => strtolower($cat['category']),
                'name'  => ucfirst($cat['category']),
                'count' => (int)$cat['count']
            ];
        }

        $sqlSub = "SELECT category, subcategory, COUNT(*) as count
                   FROM products
                   WHERE active = 1
                     AND category    IS NOT NULL AND category    != ''
                     AND subcategory IS NOT NULL AND subcategory != ''
                   GROUP BY category, subcategory ORDER BY category, count DESC";

        $stmtSub   = $db->query($sqlSub);
        $subcatsData = $stmtSub->fetchAll(PDO::FETCH_ASSOC);

        foreach ($subcatsData as $subcat) {
            $catKey = strtolower($subcat['category']);
            if (!isset($subcategoriesByCategory[$catKey])) $subcategoriesByCategory[$catKey] = [];
            $subcategoriesByCategory[$catKey][] = [
                'id'    => strtolower($subcat['subcategory']),
                'name'  => ucfirst($subcat['subcategory']),
                'count' => (int)$subcat['count']
            ];
        }
    } else {
        $categories[] = ['id' => 'all', 'name' => 'Todos', 'count' => 0];
    }

    // ============================================================
    // RESPUESTA
    // ============================================================
    echo json_encode([
        'success'                => true,
        'products'               => $products,
        'categories'             => $categories,
        'subcategoriesByCategory'=> $subcategoriesByCategory,
        'shippingConfig'         => ['cost' => 0.0, 'freeThreshold' => 0.0, 'expressCost' => 0.0],
        'total'                  => count($products),
        'timestamp'              => date('c'),
        'filters_applied'        => [
            'category'         => $category,
            'subcategory'      => $subcategory,
            'search'           => $search,
            'search_is_global' => !empty($search)
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

} catch (Exception $e) {
    error_log("❌ ERROR products.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error del servidor',
        'error'   => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

if (function_exists('fastcgi_finish_request')) {
    fastcgi_finish_request();
}
?>