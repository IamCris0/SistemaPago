<?php
/**
 * DIAGNÓSTICO COMPLETO - products.php
 * Verifica la estructura de la tabla y sugiere correcciones
 */

header('Content-Type: text/html; charset=UTF-8');

echo "<h1>🔬 Diagnóstico Completo - Tabla Products</h1>";
echo "<style>
body { font-family: monospace; padding: 20px; background: #f5f5f5; }
.success { color: green; font-weight: bold; }
.error { color: red; font-weight: bold; }
.warning { color: orange; font-weight: bold; }
pre { background: white; padding: 15px; border-radius: 5px; }
table { width: 100%; border-collapse: collapse; background: white; margin: 20px 0; }
th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
th { background-color: #8C004B; color: white; }
tr:nth-child(even) { background-color: #f9f9f9; }
</style>";

require_once __DIR__ . '/config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception('Error de conexión a BD');
    }
    
    echo "<p class='success'>✅ Conexión exitosa a la base de datos</p>";
    
    // ========================================
    // 1. VERIFICAR ESTRUCTURA ACTUAL
    // ========================================
    echo "<h2>📋 Estructura Actual de la Tabla</h2>";
    
    $stmt = $db->query("DESCRIBE products");
    $currentColumns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<table>";
    echo "<tr><th>Columna</th><th>Tipo</th><th>Null</th><th>Key</th><th>Default</th></tr>";
    
    $existingColumns = [];
    foreach ($currentColumns as $col) {
        echo "<tr>";
        echo "<td><strong>{$col['Field']}</strong></td>";
        echo "<td>{$col['Type']}</td>";
        echo "<td>{$col['Null']}</td>";
        echo "<td>{$col['Key']}</td>";
        echo "<td>" . ($col['Default'] ?? 'NULL') . "</td>";
        echo "</tr>";
        
        $existingColumns[] = $col['Field'];
    }
    
    echo "</table>";
    
    // ========================================
    // 2. VERIFICAR COLUMNAS REQUERIDAS
    // ========================================
    echo "<h2>🔍 Verificación de Columnas</h2>";
    
    $requiredColumns = [
        'id' => 'INT(11) AUTO_INCREMENT PRIMARY KEY',
        'name' => 'VARCHAR(255) NOT NULL',
        'price' => 'DECIMAL(10,2) NOT NULL DEFAULT 0.00',
        'active' => 'TINYINT(1) DEFAULT 1'
    ];
    
    $recommendedColumns = [
        'sku' => 'VARCHAR(100)',
        'category' => 'VARCHAR(100)',
        'subcategory' => 'VARCHAR(100)',
        'description' => 'TEXT',
        'image' => 'TEXT',
        'images' => 'TEXT',
        'stock' => 'INT(11) DEFAULT 0',
        'featured' => 'TINYINT(1) DEFAULT 0',
        'rating' => 'DECIMAL(3,2) DEFAULT 0.00',
        'review_count' => 'INT(11) DEFAULT 0',
        'created_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
        'updated_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
    ];
    
    echo "<h3>Columnas Requeridas:</h3>";
    echo "<table>";
    echo "<tr><th>Columna</th><th>Estado</th><th>Tipo Esperado</th></tr>";
    
    $missingRequired = [];
    foreach ($requiredColumns as $col => $type) {
        $exists = in_array($col, $existingColumns);
        echo "<tr>";
        echo "<td><strong>$col</strong></td>";
        echo "<td>" . ($exists ? "<span class='success'>✅ Existe</span>" : "<span class='error'>❌ Falta</span>") . "</td>";
        echo "<td>$type</td>";
        echo "</tr>";
        
        if (!$exists) {
            $missingRequired[] = $col;
        }
    }
    echo "</table>";
    
    echo "<h3>Columnas Recomendadas:</h3>";
    echo "<table>";
    echo "<tr><th>Columna</th><th>Estado</th><th>Tipo Esperado</th></tr>";
    
    $missingRecommended = [];
    foreach ($recommendedColumns as $col => $type) {
        $exists = in_array($col, $existingColumns);
        echo "<tr>";
        echo "<td><strong>$col</strong></td>";
        echo "<td>" . ($exists ? "<span class='success'>✅ Existe</span>" : "<span class='warning'>⚠️ Falta</span>") . "</td>";
        echo "<td>$type</td>";
        echo "</tr>";
        
        if (!$exists) {
            $missingRecommended[] = $col;
        }
    }
    echo "</table>";
    
    // ========================================
    // 3. GENERAR SQL PARA ARREGLAR
    // ========================================
    
    if (!empty($missingRequired) || !empty($missingRecommended)) {
        echo "<h2>🔧 Scripts SQL para Arreglar</h2>";
        
        echo "<h3>Opción 1: Agregar solo las columnas faltantes</h3>";
        echo "<pre>";
        
        foreach ($missingRequired as $col) {
            echo "ALTER TABLE products ADD COLUMN $col {$requiredColumns[$col]};\n";
        }
        
        foreach ($missingRecommended as $col) {
            echo "ALTER TABLE products ADD COLUMN $col {$recommendedColumns[$col]};\n";
        }
        
        echo "</pre>";
        
        echo "<h3>Opción 2: Recrear tabla completa (⚠️ BORRA TODOS LOS DATOS)</h3>";
        echo "<pre>";
        echo "DROP TABLE IF EXISTS products;

CREATE TABLE products (
    id INT(11) AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(100) DEFAULT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT NULL,
    subcategory VARCHAR(100) DEFAULT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    description TEXT,
    image TEXT,
    images TEXT,
    stock INT(11) DEFAULT 0,
    featured TINYINT(1) DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0.00,
    review_count INT(11) DEFAULT 0,
    active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_category (category),
    KEY idx_active (active),
    KEY idx_featured (featured)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
";
        echo "</pre>";
    } else {
        echo "<p class='success'>✅ ¡Todas las columnas están presentes!</p>";
    }
    
    // ========================================
    // 4. CONTAR PRODUCTOS
    // ========================================
    echo "<h2>📊 Resumen de Datos</h2>";
    
    $total = $db->query("SELECT COUNT(*) FROM products")->fetchColumn();
    $active = $db->query("SELECT COUNT(*) FROM products WHERE active = 1")->fetchColumn();
    
    echo "<table>";
    echo "<tr><th>Total de productos</th><td>$total</td></tr>";
    echo "<tr><th>Productos activos</th><td>$active</td></tr>";
    echo "</table>";
    
    if ($total > 0) {
        echo "<h3>Primeros 3 productos:</h3>";
        $stmt = $db->query("SELECT * FROM products LIMIT 3");
        $samples = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "<pre>";
        print_r($samples);
        echo "</pre>";
    }
    
} catch (Exception $e) {
    echo "<p class='error'>❌ Error: " . $e->getMessage() . "</p>";
    echo "<pre>" . $e->getTraceAsString() . "</pre>";
}
?>
