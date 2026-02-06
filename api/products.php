<?php

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, cache-control');
header('Content-Type: application/json; charset=UTF-8');

// ✅ Headers para evitar caché
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');
header('Expires: 0');

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
    // 2. VERIFICAR COLUMNAS DISPONIBLES
    // ========================================
    $stmt = $db->query("DESCRIBE products");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    error_log("📋 Columnas disponibles en products: " . implode(", ", $columns));
    
    // Columnas requeridas
    $requiredColumns = ['id', 'name', 'price', 'active'];
    $missingColumns = array_diff($requiredColumns, $columns);
    
    if (!empty($missingColumns)) {
        throw new Exception('Faltan columnas requeridas: ' . implode(', ', $missingColumns));
    }

    // ========================================
    // 3. OBTENER Y LIMPIAR PARÁMETROS
    // ========================================
    $category = isset($_GET['category']) && $_GET['category'] !== 'all' && $_GET['category'] !== '' 
        ? trim($_GET['category']) 
        : null;
    
    $subcategory = isset($_GET['subcategory']) && $_GET['subcategory'] !== '' 
        ? trim($_GET['subcategory']) 
        : null;
    
    $search = isset($_GET['search']) && $_GET['search'] !== '' 
        ? trim($_GET['search']) 
        : null;
    
    error_log("📥 Parámetros - Category: " . ($category ?? 'null') . ", Subcategory: " . ($subcategory ?? 'null') . ", Search: " . ($search ?? 'null'));

    // ========================================
    // 4. CONSTRUIR QUERY DINÁMICA
    // ========================================
    
    // Seleccionar solo las columnas que existen
    $selectColumns = ['id', 'name', 'price', 'active'];
    
    // Columnas opcionales (sin featured, rating, review_count que fueron eliminadas)
    $optionalColumns = [
        'sku', 'category', 'subcategory', 'description', 
        'image', 'images', 'stock', 'created_at', 'updated_at'
    ];
    
    foreach ($optionalColumns as $col) {
        if (in_array($col, $columns)) {
            $selectColumns[] = $col;
        }
    }
    
    $selectString = implode(', ', $selectColumns);
    
    $sql = "SELECT $selectString FROM products WHERE active = 1";
    $params = [];

    // Filtro por categoría (si la columna existe)
    if ($category && in_array('category', $columns)) {
        $sql .= " AND LOWER(category) = LOWER(:category)";
        $params[':category'] = $category;
    }

    // Filtro por subcategoría (si la columna existe)
    if ($subcategory && in_array('subcategory', $columns)) {
        $sql .= " AND LOWER(subcategory) = LOWER(:subcategory)";
        $params[':subcategory'] = $subcategory;
    }

    // Filtro por búsqueda
    if ($search && strlen($search) >= 2) {
        $searchTerm = '%' . $search . '%';
        $searchConditions = ["LOWER(name) LIKE LOWER(:search1)"];
        $params[':search1'] = $searchTerm;
        
        $searchIndex = 2;
        foreach (['description', 'sku', 'category', 'subcategory'] as $col) {
            if (in_array($col, $columns)) {
                $searchConditions[] = "LOWER($col) LIKE LOWER(:search$searchIndex)";
                $params[":search$searchIndex"] = $searchTerm;
                $searchIndex++;
            }
        }
        
        $sql .= " AND (" . implode(' OR ', $searchConditions) . ")";
        error_log("🔍 Buscando: " . $search);
    }

    // Ordenar (sin usar 'featured' porque fue eliminado)
    if (in_array('created_at', $columns)) {
        $sql .= " ORDER BY created_at DESC";
    } else {
        $sql .= " ORDER BY id DESC";
    }

    // ========================================
    // 5. EJECUTAR QUERY
    // ========================================
    $stmt = $db->prepare($sql);
    
    try {
        $stmt->execute($params);
        $products = $stmt->fetchAll();
        
        error_log("✅ Productos activos encontrados: " . count($products));
    } catch (PDOException $e) {
        error_log("❌ Error ejecutando query: " . $e->getMessage());
        throw new Exception("Error en la búsqueda de productos: " . $e->getMessage());
    }

    // ========================================
    // 6. PROCESAR RESULTADOS
    // ========================================
    foreach ($products as &$product) {
        // Valores por defecto para columnas faltantes
        $defaults = [
            'sku' => 'SKU-' . $product['id'],
            'category' => '',
            'subcategory' => '',
            'description' => '',
            'image' => 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiB2aWV3Qm94PSIwIDAgNDAwIDQwMCI+CiAgPHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9IiNmMGYwZjAiIHJ4PSIxMiIvPgogIDxyZWN0IHg9IjE0MCIgeT0iMTQwIiB3aWR0aD0iMTIwIiBoZWlnaHQ9IjkwIiByeD0iOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYmJiIiBzdHJva2Utd2lkdGg9IjMiLz4KICA8Y2lyY2xlIGN4PSIxNzAiIGN5PSIxNzAiIHI9IjEyIiBmaWxsPSJub25lIiBzdHJva2U9IiNiYmIiIHN0cm9rZS13aWR0aD0iMyIvPgogIDxwb2x5Z29uIHBvaW50cz0iMTQwLDIzMCAxODUsMTg1IDIxMCwyMTAgMjQwLDE5MCAyNjAsMjMwIiBmaWxsPSIjYmJiIi8+CiAgPHRleHQgeD0iMjAwIiB5PSIyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjIyIiBmaWxsPSIjOTk5Ij5TaW4gSW1hZ2VuPC90ZXh0Pgo8L3N2Zz4=',
            'stock' => 0
        ];
        
        foreach ($defaults as $key => $value) {
            if (!isset($product[$key])) {
                $product[$key] = $value;
            }
        }
        
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
    }

    // ========================================
    // 7. OBTENER CATEGORÍAS
    // ========================================
    
    $categories = [];
    $subcategoriesByCategory = [];
    
    if (in_array('category', $columns)) {
        $categoryOrder = [
            'ropa', 'belleza', 'perfumes', 'juguetes', 'peluches',
            'joyas', 'relojes', 'deportes', 'accesorios'
        ];
        
        $sqlCategories = "SELECT DISTINCT category, COUNT(*) as count
                          FROM products 
                          WHERE active = 1 AND category IS NOT NULL AND category != ''
                          GROUP BY category";
        
        $stmtCategories = $db->prepare($sqlCategories);
        $stmtCategories->execute();
        $categoriesData = $stmtCategories->fetchAll();

        $categoryMap = [];
        $totalCount = 0;
        
        foreach ($categoriesData as $cat) {
            $catLower = strtolower(trim($cat['category']));
            $categoryMap[$catLower] = (int)$cat['count'];
            $totalCount += (int)$cat['count'];
        }

        // Agregar "Todos" primero
        $categories[] = [
            'id' => 'all',
            'name' => 'Todos',
            'count' => $totalCount
        ];
        
        // Agregar categorías en orden
        foreach ($categoryOrder as $catId) {
            if (isset($categoryMap[$catId])) {
                $categories[] = [
                    'id' => $catId,
                    'name' => ucfirst($catId),
                    'count' => $categoryMap[$catId]
                ];
            }
        }
        
        // Obtener subcategorías si existen
        if (in_array('subcategory', $columns)) {
            $sqlSubcat = "SELECT category, subcategory, COUNT(*) as count
                          FROM products 
                          WHERE active = 1 
                          AND category IS NOT NULL 
                          AND subcategory IS NOT NULL
                          AND subcategory != ''
                          GROUP BY category, subcategory";
            
            $stmtSubcat = $db->prepare($sqlSubcat);
            $stmtSubcat->execute();
            $subcatData = $stmtSubcat->fetchAll();

            foreach ($subcatData as $subcat) {
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
        }
    }

    // ========================================
    // 8. RESPUESTA EXITOSA
    // ========================================
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
        'filters' => [
            'category' => $category,
            'subcategory' => $subcategory,
            'search' => $search
        ],
        'timestamp' => date('c'),
        'available_columns' => $selectColumns
    ];

    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    error_log("❌ Database Error: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error de base de datos',
        'error' => $e->getMessage(),
        'code' => 'DB_ERROR'
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
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