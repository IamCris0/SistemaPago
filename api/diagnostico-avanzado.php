<?php
/**
 * Script de Diagnóstico Avanzado MySQL
 * Prueba diferentes configuraciones para encontrar la correcta
 */

header('Content-Type: text/html; charset=UTF-8');
header('Access-Control-Allow-Origin: *');

echo "<h1>🔬 Diagnóstico Avanzado MySQL - Mawewe</h1>";
echo "<pre>";

// Datos base
$hosts = ['localhost', '127.0.0.1', 'mawewe.com.ec', '192.99.84.47'];
$db_name = "maweweco_tienda_db";
$username = "maweweco_admin";
$port = "3306";

// Diferentes formas de escapar la contraseña
$passwords = [
    'Tr~RcW$bIE(U',           // Sin escapar
    'Tr~RcW\$bIE(U',          // Escapado con \
    "Tr~RcW\$bIE(U)",         // Comillas dobles escapado
    'Tr~RcW\$bIE\(U\)',       // Todo escapado
];

echo "📊 INFORMACIÓN DEL SERVIDOR:\n";
echo "PHP Version: " . PHP_VERSION . "\n";
echo "Server: " . $_SERVER['SERVER_NAME'] . "\n\n";

echo "🔐 CREDENCIALES A PROBAR:\n";
echo "Base de datos: {$db_name}\n";
echo "Usuario: {$username}\n";
echo "Puerto: {$port}\n\n";

echo "=" . str_repeat("=", 70) . "\n";
echo "PROBANDO DIFERENTES CONFIGURACIONES...\n";
echo "=" . str_repeat("=", 70) . "\n\n";

$success = false;
$working_config = null;

foreach ($hosts as $host) {
    foreach ($passwords as $index => $password) {
        echo "🔄 Probando:\n";
        echo "   Host: {$host}\n";
        echo "   Password variación #" . ($index + 1) . "\n";
        
        try {
            $dsn = "mysql:host={$host};port={$port};dbname={$db_name};charset=utf8mb4";
            
            $conn = new PDO(
                $dsn,
                $username,
                $password,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                ]
            );
            
            // Si llegamos aquí, la conexión fue exitosa
            echo "   ✅ ¡CONEXIÓN EXITOSA!\n\n";
            
            $success = true;
            $working_config = [
                'host' => $host,
                'password' => $password,
                'password_index' => $index + 1
            ];
            
            // Obtener información de la base de datos
            echo "📦 INFORMACIÓN DE LA BASE DE DATOS:\n";
            $version = $conn->query('SELECT VERSION()')->fetchColumn();
            echo "   MySQL Version: {$version}\n";
            
            // Contar tablas
            $stmt = $conn->query("SHOW TABLES");
            $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
            echo "   Tablas encontradas: " . count($tables) . "\n";
            
            // Listar tablas
            if (count($tables) > 0) {
                echo "\n   Tablas:\n";
                foreach ($tables as $table) {
                    $count = $conn->query("SELECT COUNT(*) FROM `{$table}`")->fetchColumn();
                    echo "   - {$table}: {$count} registros\n";
                }
            }
            
            break 2; // Salir de ambos loops
            
        } catch (PDOException $e) {
            echo "   ❌ Error: " . $e->getMessage() . "\n\n";
        }
    }
}

echo "=" . str_repeat("=", 70) . "\n\n";

if ($success && $working_config) {
    echo "🎉 ¡CONFIGURACIÓN CORRECTA ENCONTRADA!\n\n";
    echo "✅ USA ESTA CONFIGURACIÓN EN database.php:\n\n";
    echo "```php\n";
    echo "private \$host = \"{$working_config['host']}\";\n";
    echo "private \$db_name = \"{$db_name}\";\n";
    echo "private \$username = \"{$username}\";\n";
    
    // Mostrar la contraseña correctamente escapada para PHP
    if ($working_config['password_index'] == 1) {
        echo "private \$password = 'Tr~RcW\$bIE(U)';  // Comillas simples\n";
    } else if ($working_config['password_index'] == 2) {
        echo "private \$password = 'Tr~RcW\\\$bIE(U)';  // Escapado con \\\n";
    } else if ($working_config['password_index'] == 3) {
        echo "private \$password = \"Tr~RcW\\\$bIE(U)\";  // Comillas dobles\n";
    } else {
        echo "private \$password = '{$working_config['password']}';\n";
    }
    
    echo "private \$port = \"{$port}\";\n";
    echo "```\n\n";
    
    echo "📝 COPIA ESTA CONFIGURACIÓN Y REEMPLÁZALA EN:\n";
    echo "   /api/config/database.php (líneas 23-27)\n\n";
    
} else {
    echo "❌ NO SE PUDO CONECTAR CON NINGUNA CONFIGURACIÓN\n\n";
    echo "💡 POSIBLES CAUSAS:\n";
    echo "1. El usuario 'maweweco_admin' no existe\n";
    echo "2. La contraseña es incorrecta\n";
    echo "3. El usuario no tiene permisos en la base de datos 'maweweco_tienda_db'\n";
    echo "4. MySQL no está corriendo\n\n";
    
    echo "🔧 SOLUCIONES:\n";
    echo "1. Ve a cPanel → MySQL Databases\n";
    echo "2. Verifica que el usuario 'maweweco_admin' existe\n";
    echo "3. Verifica que tiene permisos en 'maweweco_tienda_db'\n";
    echo "4. Si no existe, créalo con la contraseña correcta\n";
    echo "5. Asigna todos los permisos (ALL PRIVILEGES) al usuario\n\n";
    
    echo "📸 VERIFICA EN PHPMYADMIN:\n";
    echo "1. Abre phpMyAdmin desde cPanel\n";
    echo "2. Ve a la pestaña 'Usuarios' o 'User accounts'\n";
    echo "3. Busca 'maweweco_admin'\n";
    echo "4. Verifica que tenga permisos en 'maweweco_tienda_db'\n\n";
}

echo "</pre>";
?>
