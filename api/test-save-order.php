<?php
/**
 * test-save-order.php
 * Prueba la estructura de la tabla orders
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: text/html; charset=UTF-8');

echo "<h1>🔍 Test de save-order.php</h1>";
echo "<style>
body { font-family: monospace; padding: 20px; background: #f5f5f5; }
.success { color: green; font-weight: bold; }
.error { color: red; font-weight: bold; }
pre { background: white; padding: 15px; border-radius: 5px; }
</style>";

try {
    // 1. Verificar archivo de config
    $configPath = __DIR__ . '/config/database.php';
    
    if (!file_exists($configPath)) {
        echo "<p class='error'>❌ No existe: $configPath</p>";
        exit();
    }
    
    echo "<p class='success'>✅ Existe config/database.php</p>";
    
    require_once $configPath;
    
    // 2. Conectar
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        echo "<p class='error'>❌ No se pudo conectar a la BD</p>";
        exit();
    }
    
    echo "<p class='success'>✅ Conexión a BD exitosa</p>";
    
    // 3. Describir tabla orders
    echo "<h2>📋 Estructura de la tabla 'orders':</h2>";
    
    $stmt = $db->query("DESCRIBE orders");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<pre>";
    echo "Columnas en la tabla orders:\n\n";
    
    $hasPaypalOrderId = false;
    $hasOrderNumber = false;
    
    foreach ($columns as $col) {
        echo sprintf(
            "%-20s %-15s %-10s %-10s\n",
            $col['Field'],
            $col['Type'],
            $col['Null'],
            $col['Key']
        );
        
        if ($col['Field'] === 'paypal_order_id') {
            $hasPaypalOrderId = true;
        }
        if ($col['Field'] === 'order_number') {
            $hasOrderNumber = true;
        }
    }
    
    echo "</pre>";
    
    // 4. Verificaciones
    echo "<h2>🔍 Verificaciones:</h2>";
    
    if ($hasPaypalOrderId) {
        echo "<p class='error'>❌ PROBLEMA: La tabla tiene 'paypal_order_id' (debe eliminarse)</p>";
        echo "<p>Ejecuta este SQL en phpMyAdmin:</p>";
        echo "<pre>";
        echo "ALTER TABLE orders DROP COLUMN paypal_order_id;\n";
        echo "</pre>";
    } else {
        echo "<p class='success'>✅ Correcto: NO tiene 'paypal_order_id'</p>";
    }
    
    if ($hasOrderNumber) {
        echo "<p class='success'>✅ Correcto: Tiene 'order_number'</p>";
    } else {
        echo "<p class='error'>❌ PROBLEMA: Falta 'order_number'</p>";
    }
    
    // 5. Test de INSERT
    echo "<h2>🧪 Test de INSERT:</h2>";
    
    $testOrderNumber = 'TEST-' . time();
    
    $sql = "INSERT INTO orders (
        order_number,
        email,
        first_name,
        last_name,
        payment_method,
        subtotal,
        shipping_cost,
        total,
        status
    ) VALUES (
        :order_number,
        :email,
        :first_name,
        :last_name,
        :payment_method,
        :subtotal,
        :shipping_cost,
        :total,
        :status
    )";
    
    $stmt = $db->prepare($sql);
    
    try {
        $result = $stmt->execute([
            ':order_number' => $testOrderNumber,
            ':email' => 'test@example.com',
            ':first_name' => 'Test',
            ':last_name' => 'User',
            ':payment_method' => 'transfer',
            ':subtotal' => 10.00,
            ':shipping_cost' => 0.00,
            ':total' => 10.00,
            ':status' => 'pending_payment'
        ]);
        
        if ($result) {
            $testId = $db->lastInsertId();
            echo "<p class='success'>✅ INSERT exitoso - ID: $testId</p>";
            
            // Eliminar orden de prueba
            $db->exec("DELETE FROM orders WHERE id = $testId");
            echo "<p>✅ Orden de prueba eliminada</p>";
        }
        
    } catch (PDOException $e) {
        echo "<p class='error'>❌ Error en INSERT:</p>";
        echo "<pre>" . $e->getMessage() . "</pre>";
    }
    
    // 6. Verificar permisos
    echo "<h2>🔐 Permisos del archivo:</h2>";
    echo "<pre>";
    echo "save-order.php: " . (file_exists(__DIR__ . '/save-order.php') ? '✅ Existe' : '❌ No existe') . "\n";
    
    if (file_exists(__DIR__ . '/save-order.php')) {
        $perms = fileperms(__DIR__ . '/save-order.php');
        echo "Permisos: " . substr(sprintf('%o', $perms), -4) . "\n";
    }
    echo "</pre>";
    
    echo "<h2>✅ Test completado</h2>";
    echo "<p>Si todo está en verde, el problema puede ser en el código JavaScript o en la URL.</p>";
    
} catch (Exception $e) {
    echo "<p class='error'>❌ Error: " . $e->getMessage() . "</p>";
    echo "<pre>" . $e->getTraceAsString() . "</pre>";
}
?>
