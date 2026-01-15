<?php
/**
 * Script de Prueba de Conexión MySQL
 * Mawewe E-commerce
 * 
 * Para probar: https://mawewe.com.ec/api/test-connection.php
 */

// Headers
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');

echo "<h1>🔍 Test de Conexión MySQL - Mawewe</h1>";
echo "<pre>";

// ========================================
// 1. INFORMACIÓN DEL SERVIDOR
// ========================================
echo "\n📊 INFORMACIÓN DEL SERVIDOR:\n";
echo "PHP Version: " . PHP_VERSION . "\n";
echo "Server Software: " . $_SERVER['SERVER_SOFTWARE'] . "\n";
echo "Server Name: " . $_SERVER['SERVER_NAME'] . "\n";
echo "Document Root: " . $_SERVER['DOCUMENT_ROOT'] . "\n";
echo "Current Script: " . __FILE__ . "\n";

// ========================================
// 2. VERIFICAR EXTENSIÓN PDO
// ========================================
echo "\n🔌 EXTENSIONES PHP:\n";
echo "PDO disponible: " . (extension_loaded('pdo') ? '✅ SÍ' : '❌ NO') . "\n";
echo "PDO MySQL disponible: " . (extension_loaded('pdo_mysql') ? '✅ SÍ' : '❌ NO') . "\n";

if (!extension_loaded('pdo') || !extension_loaded('pdo_mysql')) {
    echo "\n❌ ERROR: PDO o PDO MySQL no están disponibles\n";
    echo "Contacta a tu proveedor de hosting para habilitar estas extensiones.\n";
    exit();
}

// ========================================
// 3. DATOS DE CONEXIÓN
// ========================================
$host = "mawewe.com.ec";  // ✅ Usando dominio
$db_name = "maweweco_tienda_db";
$username = "maweweco_admin";
$password = "Tr~RcW\$bIE(U";
$port = "3306";

echo "\n🔐 CONFIGURACIÓN DE CONEXIÓN:\n";
echo "Host: {$host} (usando dominio) ✅\n";
echo "Puerto: {$port}\n";
echo "Base de datos: {$db_name}\n";
echo "Usuario: {$username}\n";
echo "Contraseña: " . str_repeat('*', strlen($password)) . "\n";

// ========================================
// 4. INTENTAR CONEXIÓN
// ========================================
echo "\n🔄 INTENTANDO CONEXIÓN...\n";

try {
    // Construir DSN
    $dsn = "mysql:host={$host};port={$port};dbname={$db_name};charset=utf8mb4";
    echo "DSN: {$dsn}\n\n";
    
    // Crear conexión
    $conn = new PDO(
        $dsn,
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
        ]
    );
    
    echo "✅ CONEXIÓN EXITOSA CON DOMINIO!\n\n";
    
    // ========================================
    // 5. INFORMACIÓN DE LA BASE DE DATOS
    // ========================================
    echo "📦 INFORMACIÓN DE LA BASE DE DATOS:\n";
    
    // Versión de MySQL
    $version = $conn->query('SELECT VERSION()')->fetchColumn();
    echo "MySQL Version: {$version}\n";
    
    // Listar tablas
    $stmt = $conn->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    echo "\n📋 TABLAS ENCONTRADAS (" . count($tables) . "):\n";
    foreach ($tables as $table) {
        echo "  - {$table}\n";
        
        // Contar registros
        try {
            $count = $conn->query("SELECT COUNT(*) FROM `{$table}`")->fetchColumn();
            echo "    → {$count} registros\n";
        } catch (Exception $e) {
            echo "    → Error contando: {$e->getMessage()}\n";
        }
    }
    
    // ========================================
    // 6. VERIFICAR TABLA PRODUCTS
    // ========================================
    if (in_array('products', $tables)) {
        echo "\n🛍️ ESTRUCTURA DE LA TABLA 'products':\n";
        $stmt = $conn->query("DESCRIBE products");
        $columns = $stmt->fetchAll();
        
        foreach ($columns as $col) {
            echo "  - {$col['Field']} ({$col['Type']}) {$col['Null']} {$col['Key']}\n";
        }
        
        // Mostrar primeros 3 productos
        echo "\n📦 PRIMEROS 3 PRODUCTOS:\n";
        $stmt = $conn->query("SELECT id, sku, name, price, stock FROM products LIMIT 3");
        $products = $stmt->fetchAll();
        
        foreach ($products as $product) {
            echo "  - ID: {$product['id']} | SKU: {$product['sku']} | {$product['name']} | \${$product['price']} | Stock: {$product['stock']}\n";
        }
    }
    
    // ========================================
    // 7. VERIFICAR TABLA ORDERS
    // ========================================
    if (in_array('orders', $tables)) {
        echo "\n📋 TABLA 'orders' EXISTE ✅\n";
        $count = $conn->query("SELECT COUNT(*) FROM orders")->fetchColumn();
        echo "Total de órdenes: {$count}\n";
    } else {
        echo "\n⚠️ TABLA 'orders' NO EXISTE - Crear tabla primero\n";
    }
    
    echo "\n✅ TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE!\n";
    echo "\n🎉 CONEXIÓN USANDO DOMINIO mawewe.com.ec FUNCIONANDO PERFECTAMENTE!\n";
    echo "\n🚀 Tu API está lista para funcionar.\n";
    
} catch (PDOException $e) {
    echo "\n❌ ERROR DE CONEXIÓN:\n";
    echo "Mensaje: " . $e->getMessage() . "\n";
    echo "Código: " . $e->getCode() . "\n";
    echo "\n💡 POSIBLES SOLUCIONES:\n";
    echo "1. Verifica que el dominio 'mawewe.com.ec' esté apuntando a tu servidor\n";
    echo "2. Verifica que el DNS esté propagado correctamente\n";
    echo "3. Verifica que el puerto 3306 esté abierto\n";
    echo "4. Verifica que las credenciales sean correctas\n";
    echo "5. Verifica que el usuario tenga permisos en la base de datos\n";
    echo "6. Prueba usando 'localhost' en lugar del dominio si estás en el mismo servidor\n";
}

echo "</pre>";
?>
