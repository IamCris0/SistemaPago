<?php
/**
 * VERIFICADOR DE PRODUCTS.PHP
 * Este script verifica qué está mal con products.php
 */

header('Content-Type: text/html; charset=UTF-8');

echo "<h1>🔍 Verificador de products.php</h1>";
echo "<pre>";

$file = __DIR__ . '/products.php';

if (!file_exists($file)) {
    echo "❌ products.php NO EXISTE\n";
    exit;
}

echo "✅ products.php existe\n\n";

// 1. Verificar BOM
$content = file_get_contents($file);
$bom = substr($content, 0, 3);

echo "1️⃣ VERIFICAR BOM:\n";
if ($bom === "\xEF\xBB\xBF") {
    echo "   ❌ TIENE BOM (esto causa error 415)\n";
} else {
    echo "   ✅ Sin BOM\n";
}

// 2. Verificar espacios antes de <?php
echo "\n2️⃣ VERIFICAR ESPACIOS ANTES DE <?php:\n";
if (preg_match('/^\s+<\?php/', $content)) {
    echo "   ❌ TIENE ESPACIOS/NEWLINES antes de <?php\n";
} else if (substr($content, 0, 5) === '<?php') {
    echo "   ✅ Empieza correctamente con <?php\n";
} else {
    echo "   ❌ NO empieza con <?php\n";
    echo "   Empieza con: " . bin2hex(substr($content, 0, 10)) . "\n";
}

// 3. Verificar tamaño
echo "\n3️⃣ TAMAÑO DEL ARCHIVO:\n";
$size = filesize($file);
echo "   Tamaño: " . number_format($size) . " bytes\n";
if ($size > 100000) {
    echo "   ⚠️ Archivo muy grande (puede causar timeout)\n";
} else {
    echo "   ✅ Tamaño normal\n";
}

// 4. Verificar sintaxis
echo "\n4️⃣ VERIFICAR SINTAXIS PHP:\n";
$output = shell_exec("php -l " . escapeshellarg($file) . " 2>&1");
if (strpos($output, 'No syntax errors') !== false) {
    echo "   ✅ Sin errores de sintaxis\n";
} else {
    echo "   ❌ ERROR DE SINTAXIS:\n";
    echo "   " . $output . "\n";
}

// 5. Verificar permisos
echo "\n5️⃣ PERMISOS:\n";
$perms = substr(sprintf('%o', fileperms($file)), -4);
echo "   Permisos: $perms\n";
if ($perms === '0644' || $perms === '0755') {
    echo "   ✅ Permisos correctos\n";
} else {
    echo "   ⚠️ Permisos inusuales\n";
}

// 6. Primeras líneas
echo "\n6️⃣ PRIMERAS 5 LÍNEAS:\n";
$lines = explode("\n", $content);
for ($i = 0; $i < 5; $i++) {
    if (isset($lines[$i])) {
        echo "   Línea " . ($i+1) . ": " . htmlspecialchars(substr($lines[$i], 0, 80)) . "\n";
    }
}

// 7. Buscar require_once
echo "\n7️⃣ BUSCAR REQUIRE_ONCE:\n";
if (preg_match('/require_once.*database\.php/', $content)) {
    echo "   ✅ Tiene require_once database.php\n";
} else {
    echo "   ❌ NO tiene require_once database.php\n";
}

// 8. Test de ejecución simple
echo "\n8️⃣ TEST DE EJECUCIÓN:\n";
ob_start();
try {
    include $file;
    $output = ob_get_clean();
    
    // Verificar si es JSON válido
    $json = json_decode($output, true);
    if ($json !== null) {
        echo "   ✅ Produce JSON válido\n";
        echo "   Total de productos: " . ($json['total'] ?? 'N/A') . "\n";
    } else {
        echo "   ❌ NO produce JSON válido\n";
        echo "   Output: " . substr($output, 0, 200) . "...\n";
    }
} catch (Exception $e) {
    ob_end_clean();
    echo "   ❌ ERROR AL EJECUTAR: " . $e->getMessage() . "\n";
}

echo "\n" . str_repeat("=", 60) . "\n";
echo "DIAGNÓSTICO COMPLETO\n";
echo str_repeat("=", 60) . "\n";

echo "</pre>";
