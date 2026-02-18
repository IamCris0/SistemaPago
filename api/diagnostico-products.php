<?php
// ===================================================================
// DIAGNÓSTICO COMPLETO - Detectar problema 415
// ===================================================================

header('Content-Type: text/html; charset=UTF-8');

echo "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Diagnóstico API</title>";
echo "<style>body{font-family:monospace;padding:20px;background:#f5f5f5;}";
echo ".ok{color:green;font-weight:bold;}.error{color:red;font-weight:bold;}";
echo ".warning{color:orange;font-weight:bold;}pre{background:white;padding:15px;border-radius:5px;}</style>";
echo "</head><body><h1>🔍 Diagnóstico API Mawewe</h1>";

// Test 1: PHP está funcionando
echo "<h2>✅ Test 1: PHP Funciona</h2>";
echo "<p class='ok'>✓ PHP versión: " . phpversion() . "</p>";

// Test 2: Verificar módulos Apache
echo "<h2>Test 2: Módulos Apache</h2>";
if (function_exists('apache_get_modules')) {
    $modules = apache_get_modules();
    echo in_array('mod_headers', $modules) 
        ? "<p class='ok'>✓ mod_headers habilitado</p>" 
        : "<p class='error'>✗ mod_headers NO habilitado</p>";
    echo in_array('mod_rewrite', $modules) 
        ? "<p class='ok'>✓ mod_rewrite habilitado</p>" 
        : "<p class='warning'>⚠ mod_rewrite NO habilitado</p>";
} else {
    echo "<p class='warning'>⚠ No se puede verificar (apache_get_modules no disponible)</p>";
}

// Test 3: Headers CORS
echo "<h2>Test 3: Headers CORS</h2>";
$headers = headers_list();
echo "<pre>";
foreach ($headers as $header) {
    if (stripos($header, 'Access-Control') !== false) {
        echo "<span class='ok'>✓ $header</span>\n";
    }
}
echo "</pre>";

// Test 4: Conexión a Base de Datos
echo "<h2>Test 4: Conexión Base de Datos</h2>";
try {
    require_once __DIR__ . '/config/database.php';
    $database = new Database();
    $db = $database->getConnection();
    
    if ($db) {
        echo "<p class='ok'>✓ Conexión exitosa</p>";
        
        // Test columnas
        $stmt = $db->query("DESCRIBE products");
        $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        echo "<p class='ok'>✓ Columnas disponibles: " . implode(', ', $columns) . "</p>";
        
        // Test count
        $stmt = $db->query("SELECT COUNT(*) FROM products WHERE active = 1");
        $count = $stmt->fetchColumn();
        echo "<p class='ok'>✓ Productos activos: $count</p>";
        
    } else {
        echo "<p class='error'>✗ No se pudo conectar</p>";
    }
} catch (Exception $e) {
    echo "<p class='error'>✗ Error: " . $e->getMessage() . "</p>";
}

// Test 5: Simular petición API
echo "<h2>Test 5: Simular Respuesta API</h2>";
try {
    ob_start();
    
    $stmt = $db->prepare("SELECT id, name, price FROM products WHERE active = 1 LIMIT 3");
    $stmt->execute();
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $response = [
        'success' => true,
        'products' => $products,
        'test' => true
    ];
    
    $json = json_encode($response, JSON_UNESCAPED_UNICODE);
    
    ob_end_clean();
    
    echo "<p class='ok'>✓ JSON generado correctamente</p>";
    echo "<pre>" . htmlspecialchars(substr($json, 0, 500)) . "...</pre>";
    
} catch (Exception $e) {
    ob_end_clean();
    echo "<p class='error'>✗ Error generando JSON: " . $e->getMessage() . "</p>";
}

// Test 6: Verificar archivo products.php
echo "<h2>Test 6: Archivo products.php</h2>";
$productsFile = __DIR__ . '/products.php';
if (file_exists($productsFile)) {
    echo "<p class='ok'>✓ Archivo existe</p>";
    
    $content = file_get_contents($productsFile);
    
    // Verificar BOM
    $bom = substr($content, 0, 3);
    if ($bom === "\xEF\xBB\xBF") {
        echo "<p class='error'>✗ PROBLEMA: Archivo tiene BOM (Byte Order Mark)</p>";
        echo "<p>Solución: Guarda el archivo como UTF-8 sin BOM</p>";
    } else {
        echo "<p class='ok'>✓ Sin BOM</p>";
    }
    
    // Verificar <?php al inicio
    if (substr(ltrim($content), 0, 5) !== '<?php') {
        echo "<p class='error'>✗ PROBLEMA: El archivo no empieza con &lt;?php</p>";
    } else {
        echo "<p class='ok'>✓ Empieza correctamente con &lt;?php</p>";
    }
    
    // Verificar espacios antes de <?php
    if ($content[0] !== '<') {
        echo "<p class='error'>✗ PROBLEMA: Hay espacios o caracteres antes de &lt;?php</p>";
    } else {
        echo "<p class='ok'>✓ Sin espacios antes de &lt;?php</p>";
    }
    
    echo "<p>Tamaño: " . filesize($productsFile) . " bytes</p>";
    echo "<p>Permisos: " . substr(sprintf('%o', fileperms($productsFile)), -4) . "</p>";
} else {
    echo "<p class='error'>✗ Archivo products.php NO EXISTE</p>";
}

// Test 7: Verificar .htaccess
echo "<h2>Test 7: Archivo .htaccess</h2>";
$htaccess = __DIR__ . '/.htaccess';
if (file_exists($htaccess)) {
    echo "<p class='ok'>✓ Archivo .htaccess existe</p>";
    $content = file_get_contents($htaccess);
    
    if (stripos($content, 'Access-Control-Allow-Origin') !== false) {
        echo "<p class='ok'>✓ Contiene configuración CORS</p>";
    } else {
        echo "<p class='error'>✗ NO contiene configuración CORS</p>";
    }
    
    echo "<p>Tamaño: " . filesize($htaccess) . " bytes</p>";
} else {
    echo "<p class='error'>✗ Archivo .htaccess NO EXISTE</p>";
}

// Test 8: Request Method
echo "<h2>Test 8: HTTP Request Info</h2>";
echo "<p>REQUEST_METHOD: " . ($_SERVER['REQUEST_METHOD'] ?? 'N/A') . "</p>";
echo "<p>HTTP_ORIGIN: " . ($_SERVER['HTTP_ORIGIN'] ?? 'N/A') . "</p>";
echo "<p>HTTP_HOST: " . ($_SERVER['HTTP_HOST'] ?? 'N/A') . "</p>";

echo "<hr><p style='color:#666;'>Diagnóstico completado " . date('Y-m-d H:i:s') . "</p>";
echo "</body></html>";