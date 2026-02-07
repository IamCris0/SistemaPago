<?php
/**
 * API DE PRODUCTOS - MAWEWE CRM v4.0
 * CRUD Completo con manejo de imágenes
 * 
 * CAMPOS AUTO-GESTIONADOS (NO ENVIAR EN FORMULARIOS):
 * - id: Auto-increment
 * - created_at: Auto timestamp
 * - updated_at: Auto timestamp on update
 * 
 * CAMPOS REQUERIDOS:
 * - sku: Código único del producto
 * - name: Nombre del producto
 * - category: Categoría principal
 * - price: Precio del producto
 * - image: URL de imagen principal
 * 
 * CAMPOS OPCIONALES:
 * - subcategory: Sub-categoría
 * - description: Descripción detallada
 * - images: Array JSON de URLs de imágenes adicionales
 * - stock: Cantidad en inventario (default 0)
 * - active: Estado activo/inactivo (default 1)
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/helpers/audit.php';
require_once __DIR__ . '/helpers/auth.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception('Error de conexión a BD');
    }
    
    // ========================================
    // LISTAR PRODUCTOS
    // ========================================
    if ($method === 'GET' && ($action === 'list' || $action === '')) {
        $page = (int)($_GET['page'] ?? 1);
        $limit = (int)($_GET['limit'] ?? 50);
        $offset = ($page - 1) * $limit;
        
        $filters = [];
        $params = [];
        
        // Filtro por categoría
        if (!empty($_GET['category'])) {
            $filters[] = "category = :category";
            $params[':category'] = $_GET['category'];
        }
        
        // Filtro por subcategoría
        if (!empty($_GET['subcategory'])) {
            $filters[] = "subcategory = :subcategory";
            $params[':subcategory'] = $_GET['subcategory'];
        }
        
        // Búsqueda
        if (!empty($_GET['search'])) {
            $filters[] = "(name LIKE :search OR sku LIKE :search OR description LIKE :search)";
            $params[':search'] = '%' . $_GET['search'] . '%';
        }
        
        // Filtro por stock
        if (isset($_GET['stock_status'])) {
            switch ($_GET['stock_status']) {
                case 'out':
                    $filters[] = "stock = 0";
                    break;
                case 'low':
                    $filters[] = "stock > 0 AND stock < 10";
                    break;
                case 'ok':
                    $filters[] = "stock >= 10";
                    break;
            }
        }
        
        // Filtro por estado
        if (isset($_GET['active'])) {
            $filters[] = "active = :active";
            $params[':active'] = (int)$_GET['active'];
        } else {
            // Por defecto solo activos
            $filters[] = "active = 1";
        }
        
        $whereClause = !empty($filters) ? 'WHERE ' . implode(' AND ', $filters) : '';
        
        // Contar total
        $sqlCount = "SELECT COUNT(*) as total FROM products $whereClause";
        $stmtCount = $db->prepare($sqlCount);
        $stmtCount->execute($params);
        $total = $stmtCount->fetch()['total'];
        
        // Obtener productos
        $sql = "SELECT 
                    id, sku, name, category, subcategory, price, 
                    description, image, images, stock, active,
                    created_at, updated_at
                FROM products 
                $whereClause
                ORDER BY created_at DESC
                LIMIT :limit OFFSET :offset";
        
        $stmt = $db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $products = $stmt->fetchAll();
        
        // Procesar cada producto
        foreach ($products as &$product) {
            $product['id'] = (int)$product['id'];
            $product['price'] = (float)$product['price'];
            $product['stock'] = (int)$product['stock'];
            $product['active'] = (bool)$product['active'];
            
            // Decodificar array de imágenes
            if ($product['images']) {
                $decoded = json_decode($product['images'], true);
                $product['images'] = is_array($decoded) ? $decoded : [];
            } else {
                $product['images'] = [];
            }
        }
        
        echo json_encode([
            'success' => true,
            'products' => $products,
            'total' => (int)$total,
            'page' => $page,
            'pages' => ceil($total / $limit),
            'limit' => $limit
        ]);
        exit();
    }
    
    // ========================================
    // OBTENER UN PRODUCTO
    // ========================================
    if ($method === 'GET' && $action === 'get') {
        $id = (int)($_GET['id'] ?? 0);
        
        if (!$id) {
            throw new Exception('ID de producto requerido');
        }
        
        $sql = "SELECT * FROM products WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->execute([':id' => $id]);
        $product = $stmt->fetch();
        
        if (!$product) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Producto no encontrado'
            ]);
            exit();
        }
        
        // Procesar datos
        $product['id'] = (int)$product['id'];
        $product['price'] = (float)$product['price'];
        $product['stock'] = (int)$product['stock'];
        $product['active'] = (bool)$product['active'];
        
        if ($product['images']) {
            $decoded = json_decode($product['images'], true);
            $product['images'] = is_array($decoded) ? $decoded : [];
        } else {
            $product['images'] = [];
        }
        
        echo json_encode([
            'success' => true,
            'product' => $product
        ]);
        exit();
    }
    
    // ========================================
    // CREAR PRODUCTO
    // ========================================
    if ($method === 'POST' && $action === 'create') {
        // Verificar autenticación
        $currentUser = verifyAuth($db);
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        // Validaciones
        if (empty($input['sku']) || empty($input['name']) || empty($input['category']) || !isset($input['price'])) {
            throw new Exception('SKU, nombre, categoría y precio son requeridos');
        }
        
        // Verificar que el SKU no exista
        $sqlCheck = "SELECT id FROM products WHERE sku = :sku";
        $stmtCheck = $db->prepare($sqlCheck);
        $stmtCheck->execute([':sku' => trim($input['sku'])]);
        
        if ($stmtCheck->fetch()) {
            http_response_code(409);
            echo json_encode([
                'success' => false,
                'message' => 'Ya existe un producto con este SKU'
            ]);
            exit();
        }
        
        // Preparar array de imágenes
        $imagesJson = null;
        if (!empty($input['images']) && is_array($input['images'])) {
            $imagesJson = json_encode($input['images'], JSON_UNESCAPED_SLASHES);
        }
        
        // Crear producto
        // NOTA: NO se envían id, created_at, updated_at (auto-gestionados)
        $sql = "INSERT INTO products (
                    sku, name, category, subcategory, price, 
                    description, image, images, stock, active
                ) VALUES (
                    :sku, :name, :category, :subcategory, :price,
                    :description, :image, :images, :stock, :active
                )";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':sku' => trim($input['sku']),
            ':name' => trim($input['name']),
            ':category' => trim($input['category']),
            ':subcategory' => trim($input['subcategory'] ?? ''),
            ':price' => (float)$input['price'],
            ':description' => trim($input['description'] ?? ''),
            ':image' => trim($input['image'] ?? ''),
            ':images' => $imagesJson,
            ':stock' => (int)($input['stock'] ?? 0),
            ':active' => (int)($input['active'] ?? 1)
        ]);
        
        $newId = (int)$db->lastInsertId();
        
        // Registrar en auditoría
        logAudit($db, [
            'user_id' => $currentUser['id'],
            'action' => 'CREATE',
            'entity_type' => 'PRODUCT',
            'entity_id' => $newId,
            'new_value' => [
                'sku' => $input['sku'],
                'name' => $input['name'],
                'category' => $input['category'],
                'price' => $input['price']
            ],
            'description' => "Producto creado: {$input['name']}"
        ]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Producto creado exitosamente',
            'id' => $newId
        ]);
        exit();
    }
    
    // ========================================
    // ACTUALIZAR PRODUCTO
    // ========================================
    if ($method === 'PUT' && $action === 'update') {
        // Verificar autenticación
        $currentUser = verifyAuth($db);
        
        $input = json_decode(file_get_contents('php://input'), true);
        $id = (int)($input['id'] ?? 0);
        
        if (!$id) {
            throw new Exception('ID de producto requerido');
        }
        
        // Obtener datos actuales
        $sqlOld = "SELECT * FROM products WHERE id = :id";
        $stmtOld = $db->prepare($sqlOld);
        $stmtOld->execute([':id' => $id]);
        $oldData = $stmtOld->fetch();
        
        if (!$oldData) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Producto no encontrado'
            ]);
            exit();
        }
        
        // Verificar que el SKU no exista en otro producto
        if (isset($input['sku']) && $input['sku'] !== $oldData['sku']) {
            $sqlCheck = "SELECT id FROM products WHERE sku = :sku AND id != :id";
            $stmtCheck = $db->prepare($sqlCheck);
            $stmtCheck->execute([
                ':sku' => trim($input['sku']),
                ':id' => $id
            ]);
            
            if ($stmtCheck->fetch()) {
                http_response_code(409);
                echo json_encode([
                    'success' => false,
                    'message' => 'Ya existe otro producto con este SKU'
                ]);
                exit();
            }
        }
        
        // Preparar array de imágenes
        $imagesJson = $oldData['images'];
        if (isset($input['images'])) {
            if (is_array($input['images'])) {
                $imagesJson = json_encode($input['images'], JSON_UNESCAPED_SLASHES);
            } elseif ($input['images'] === null || $input['images'] === '') {
                $imagesJson = null;
            }
        }
        
        // Actualizar producto
        // NOTA: NO se actualiza id, created_at se mantiene, updated_at se actualiza automáticamente
        $sql = "UPDATE products 
                SET sku = :sku,
                    name = :name,
                    category = :category,
                    subcategory = :subcategory,
                    price = :price,
                    description = :description,
                    image = :image,
                    images = :images,
                    stock = :stock,
                    active = :active
                WHERE id = :id";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':sku' => trim($input['sku'] ?? $oldData['sku']),
            ':name' => trim($input['name'] ?? $oldData['name']),
            ':category' => trim($input['category'] ?? $oldData['category']),
            ':subcategory' => trim($input['subcategory'] ?? $oldData['subcategory']),
            ':price' => (float)($input['price'] ?? $oldData['price']),
            ':description' => trim($input['description'] ?? $oldData['description']),
            ':image' => trim($input['image'] ?? $oldData['image']),
            ':images' => $imagesJson,
            ':stock' => (int)($input['stock'] ?? $oldData['stock']),
            ':active' => (int)($input['active'] ?? $oldData['active']),
            ':id' => $id
        ]);
        
        // Registrar en auditoría
        logAudit($db, [
            'user_id' => $currentUser['id'],
            'action' => 'UPDATE',
            'entity_type' => 'PRODUCT',
            'entity_id' => $id,
            'old_value' => [
                'name' => $oldData['name'],
                'price' => $oldData['price'],
                'stock' => $oldData['stock']
            ],
            'new_value' => [
                'name' => $input['name'] ?? $oldData['name'],
                'price' => $input['price'] ?? $oldData['price'],
                'stock' => $input['stock'] ?? $oldData['stock']
            ],
            'description' => "Producto actualizado: {$oldData['name']}"
        ]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Producto actualizado exitosamente'
        ]);
        exit();
    }
    
    // ========================================
    // ACTIVAR/DESACTIVAR PRODUCTO
    // ========================================
    if ($method === 'PUT' && $action === 'toggle-status') {
        $currentUser = verifyAuth($db);
        
        $input = json_decode(file_get_contents('php://input'), true);
        $id = (int)($input['id'] ?? 0);
        
        if (!$id) {
            throw new Exception('ID de producto requerido');
        }
        
        // Obtener estado actual
        $sqlOld = "SELECT name, active FROM products WHERE id = :id";
        $stmtOld = $db->prepare($sqlOld);
        $stmtOld->execute([':id' => $id]);
        $oldData = $stmtOld->fetch();
        
        if (!$oldData) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Producto no encontrado'
            ]);
            exit();
        }
        
        $newStatus = !$oldData['active'];
        
        // Actualizar estado (updated_at se actualiza automáticamente)
        $sql = "UPDATE products SET active = :active WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':active' => (int)$newStatus,
            ':id' => $id
        ]);
        
        // Registrar en auditoría
        logAudit($db, [
            'user_id' => $currentUser['id'],
            'action' => 'UPDATE',
            'entity_type' => 'PRODUCT',
            'entity_id' => $id,
            'old_value' => ['active' => (bool)$oldData['active']],
            'new_value' => ['active' => $newStatus],
            'description' => ($newStatus ? 'Activado' : 'Desactivado') . " producto: {$oldData['name']}"
        ]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Estado actualizado exitosamente',
            'active' => $newStatus
        ]);
        exit();
    }
    
    // ========================================
    // ACTUALIZAR STOCK ÚNICAMENTE
    // ========================================
    if ($method === 'PUT' && $action === 'update-stock') {
        $currentUser = verifyAuth($db);
        
        $input = json_decode(file_get_contents('php://input'), true);
        $id = (int)($input['id'] ?? 0);
        $newStock = (int)($input['stock'] ?? 0);
        
        if (!$id) {
            throw new Exception('ID de producto requerido');
        }
        
        // Obtener datos actuales
        $sqlOld = "SELECT name, stock FROM products WHERE id = :id";
        $stmtOld = $db->prepare($sqlOld);
        $stmtOld->execute([':id' => $id]);
        $oldData = $stmtOld->fetch();
        
        if (!$oldData) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Producto no encontrado'
            ]);
            exit();
        }
        
        // Actualizar stock (updated_at se actualiza automáticamente)
        $sql = "UPDATE products SET stock = :stock WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':stock' => $newStock,
            ':id' => $id
        ]);
        
        // Registrar en auditoría
        logAudit($db, [
            'user_id' => $currentUser['id'],
            'action' => 'UPDATE',
            'entity_type' => 'PRODUCT',
            'entity_id' => $id,
            'old_value' => ['stock' => (int)$oldData['stock']],
            'new_value' => ['stock' => $newStock],
            'description' => "Stock actualizado: {$oldData['name']} ({$oldData['stock']} → {$newStock})"
        ]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Stock actualizado exitosamente',
            'stock' => $newStock
        ]);
        exit();
    }
    
    // ========================================
    // ELIMINAR PRODUCTO (SOFT DELETE)
    // ========================================
    if ($method === 'DELETE' && $action === 'delete') {
        $currentUser = verifyAuth($db);
        
        $id = (int)($_GET['id'] ?? 0);
        
        if (!$id) {
            throw new Exception('ID de producto requerido');
        }
        
        // Obtener datos
        $sqlOld = "SELECT name FROM products WHERE id = :id";
        $stmtOld = $db->prepare($sqlOld);
        $stmtOld->execute([':id' => $id]);
        $oldData = $stmtOld->fetch();
        
        if (!$oldData) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Producto no encontrado'
            ]);
            exit();
        }
        
        // Soft delete: solo desactivar (updated_at se actualiza automáticamente)
        $sql = "UPDATE products SET active = 0 WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->execute([':id' => $id]);
        
        // Registrar en auditoría
        logAudit($db, [
            'user_id' => $currentUser['id'],
            'action' => 'DELETE',
            'entity_type' => 'PRODUCT',
            'entity_id' => $id,
            'description' => "Producto eliminado (soft delete): {$oldData['name']}"
        ]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Producto eliminado exitosamente'
        ]);
        exit();
    }
    
    // Acción no válida
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Acción no válida'
    ]);
    
} catch (Exception $e) {
    error_log("Error products_crud.php: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error en el servidor',
        'error' => $e->getMessage()
    ]);
}
?>