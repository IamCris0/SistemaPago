<?php
/**
 * share-image.php — Generador dinámico de imagen OG 1200×630
 * Mawewe Ecuador
 *
 * URL: https://tienda.mawewe.com.ec/share-image.php?product=132
 *
 * Genera una imagen landscape con:
 *   - Mitad izquierda: foto del producto (cuadrada, centrada)
 *   - Mitad derecha:  nombre, precio, descripción, logo/marca
 *   - Fondo oscuro elegante con acento magenta #8C004B
 *
 * Requiere: PHP extensión GD (habilitada en casi todos los hostings)
 */

// ─── Config ──────────────────────────────────────────────────────────────────
$DB_HOST  = 'localhost';
$DB_NAME  = 'maweweco_tienda_db';
$DB_USER  = 'maweweco_cris';
$DB_PASS  = 'bdC(ZFro1rYd';
$SITE_URL = 'https://tienda.mawewe.com.ec';
$CDN_URL  = 'https://mawewe.com.ec';

// Dimensiones de la tarjeta OG (Facebook recomienda 1200×630)
define('W', 1200);
define('H', 630);

// ─── Helper: ruta → URL absoluta ─────────────────────────────────────────────
function resolveUrl($path, $siteUrl, $cdnUrl) {
    $path = trim((string)$path);
    if (empty($path)) return '';
    if (preg_match('/^https?:\/\//i', $path))
        return preg_replace('/^http:\/\//i', 'https://', $path);
    $clean = ltrim($path, '/');
    return (strpos($clean, 'images/') === 0)
        ? $cdnUrl  . '/' . $clean
        : $siteUrl . '/' . $clean;
}

// ─── Helper: descargar imagen remota con cURL ─────────────────────────────────
function fetchImage($url) {
    if (empty($url)) return false;
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT        => 8,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_USERAGENT      => 'MaweweShareBot/1.0',
    ]);
    $data   = curl_exec($ch);
    $type   = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($status !== 200 || !$data) return false;
    $img = @imagecreatefromstring($data);
    return $img ?: false;
}

// ─── Helper: texto con salto de línea automático ─────────────────────────────
function drawWrappedText($canvas, $font, $size, $x, $y, $maxWidth, $lineHeight, $text, $color) {
    $words = explode(' ', $text);
    $line  = '';
    $curY  = $y;
    foreach ($words as $word) {
        $test = $line ? $line . ' ' . $word : $word;
        $bbox = imagettfbbox($size, 0, $font, $test);
        if (($bbox[2] - $bbox[0]) > $maxWidth && $line !== '') {
            imagettftext($canvas, $size, 0, $x, $curY, $color, $font, $line);
            $line = $word;
            $curY += $lineHeight;
        } else {
            $line = $test;
        }
    }
    if ($line) imagettftext($canvas, $size, 0, $x, $curY, $color, $font, $line);
    return $curY;
}

// ─── Obtener datos del producto ───────────────────────────────────────────────
$product_id = isset($_GET['product']) ? (int)$_GET['product'] : 0;
$product    = null;

if ($product_id > 0) {
    try {
        $pdo  = new PDO("mysql:host={$DB_HOST};dbname={$DB_NAME};charset=utf8mb4",
                        $DB_USER, $DB_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        $stmt = $pdo->prepare(
            "SELECT id, name, description, image, images, price, category
             FROM products WHERE id = ? AND active = 1 LIMIT 1"
        );
        $stmt->execute([$product_id]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        error_log('[share-image.php] BD: ' . $e->getMessage());
    }
}

// ─── Preparar datos de texto ──────────────────────────────────────────────────
$name     = $product['name']        ?? 'Mawewe Ecuador';
$desc     = $product['description'] ?? 'Productos premium con envío gratis sobre $60.';
$price    = $product ? '$' . number_format((float)$product['price'], 2) . ' USD' : '';
$category = $product ? ucfirst($product['category'] ?? '') : '';

// Limpiar texto
$name  = html_entity_decode(strip_tags($name),  ENT_QUOTES, 'UTF-8');
$desc  = html_entity_decode(strip_tags($desc),  ENT_QUOTES, 'UTF-8');
$desc  = mb_substr($desc, 0, 140);  // recortar para que quepa

// Resolver URL de la imagen del producto
$imgUrl = '';
if ($product) {
    if (!empty($product['images'])) {
        $arr = @json_decode($product['images'], true);
        if (is_array($arr) && !empty($arr[0])) {
            $imgUrl = resolveUrl(trim($arr[0]), $SITE_URL, $CDN_URL);
        }
    }
    if (!$imgUrl && !empty($product['image'])) {
        $imgUrl = resolveUrl($product['image'], $SITE_URL, $CDN_URL);
    }
}

// ─── Cache: guardar resultado para no regenerar en cada bot ──────────────────
$cacheDir  = __DIR__ . '/og-cache/';
$cacheFile = $cacheDir . 'og_' . $product_id . '_' . date('Ymd') . '.jpg';

if ($product_id > 0 && !is_dir($cacheDir)) {
    @mkdir($cacheDir, 0755, true);
}

if ($product_id > 0 && file_exists($cacheFile)) {
    header('Content-Type: image/jpeg');
    header('Cache-Control: public, max-age=86400');
    header('X-Cache: HIT');
    readfile($cacheFile);
    exit;
}

// ─── Crear canvas ─────────────────────────────────────────────────────────────
$canvas = imagecreatetruecolor(W, H);
if (!$canvas) {
    header('Content-Type: image/jpeg');
    readfile($SITE_URL . '/assets/img/logo.jpg');
    exit;
}

// ─── Colores ──────────────────────────────────────────────────────────────────
$cBg       = imagecolorallocate($canvas, 18,  18,  22);   // fondo muy oscuro
$cBgRight  = imagecolorallocate($canvas, 26,  26,  32);   // panel derecho levemente más claro
$cAccent   = imagecolorallocate($canvas, 140, 0,   75);   // magenta Mawewe
$cAccentLt = imagecolorallocate($canvas, 180, 40,  110);  // magenta claro
$cWhite    = imagecolorallocate($canvas, 255, 255, 255);
$cGray     = imagecolorallocate($canvas, 180, 178, 172);
$cGrayDark = imagecolorallocate($canvas, 90,  88,  85);
$cYellow   = imagecolorallocate($canvas, 253, 196, 61);   // precio destacado
$cDivider  = imagecolorallocate($canvas, 50,  50,  60);   // línea divisoria

// ─── Fondo ────────────────────────────────────────────────────────────────────
imagefilledrectangle($canvas, 0,   0, W,   H, $cBg);       // fondo izquierdo
imagefilledrectangle($canvas, 520, 0, W,   H, $cBgRight);  // panel derecho
imagefilledrectangle($canvas, 518, 0, 522, H, $cDivider);  // separador

// Barra de acento superior
imagefilledrectangle($canvas, 0, 0, W, 6, $cAccent);

// Banda de acento izquierda (decorativa)
imagefilledrectangle($canvas, 0, 0, 6, H, $cAccent);

// ─── Cargar y dibujar imagen del producto ────────────────────────────────────
$productImg = $imgUrl ? fetchImage($imgUrl) : false;

// Área de la foto: x=6..518, y=6..H → 512×624 px
$photoX = 6;
$photoY = 6;
$photoW = 512;
$photoH = H - 6;

if ($productImg) {
    $sw = imagesx($productImg);
    $sh = imagesy($productImg);

    // Recorte centrado (objeto-fit: cover)
    $scale   = max($photoW / $sw, $photoH / $sh);
    $newW    = (int)($sw * $scale);
    $newH    = (int)($sh * $scale);
    $offX    = (int)(($photoW - $newW) / 2);
    $offY    = (int)(($photoH - $newH) / 2);

    // Fondo blanco para producto (se ve mejor que negro)
    imagefilledrectangle($canvas, $photoX, $photoY, $photoX + $photoW, $photoY + $photoH,
                         imagecolorallocate($canvas, 245, 244, 241));

    imagecopyresampled(
        $canvas, $productImg,
        $photoX + $offX, $photoY + $offY,
        0, 0,
        $newW, $newH,
        $sw, $sh
    );
    imagedestroy($productImg);

    // Degradado sutil en el borde derecho de la foto
    for ($gx = 0; $gx < 40; $gx++) {
        $alpha = (int)(120 * ($gx / 40));
        $c = imagecolorallocatealpha($canvas, 18, 18, 22, 127 - (int)($alpha * 127 / 120));
        imagefilledrectangle($canvas, 518 - $gx, $photoY, 519 - $gx, $photoY + $photoH, $c);
    }
} else {
    // Placeholder si no hay imagen
    imagefilledrectangle($canvas, $photoX, $photoY,
                         $photoX + $photoW, $photoY + $photoH,
                         imagecolorallocate($canvas, 40, 40, 50));
    $cx = $photoX + $photoW / 2;
    $cy = $photoY + $photoH / 2;
    imagefilledellipse($canvas, (int)$cx, (int)$cy, 120, 120, $cAccent);
}

// ─── Panel derecho: texto ─────────────────────────────────────────────────────
$tx   = 548;      // x inicio del texto
$maxW = 620;      // ancho máximo del texto

// Buscar fuentes disponibles en el servidor
$fontsToTry = [
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
    '/usr/share/fonts/truetype/freefont/FreeSansBold.otf',
    '/usr/share/fonts/truetype/freefont/FreeSans.otf',
    '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/dejavu/DejaVuSans.ttf',
    __DIR__ . '/assets/fonts/opensans-bold.ttf',
    __DIR__ . '/assets/fonts/opensans.ttf',
];

$fontBold   = null;
$fontNormal = null;

foreach ($fontsToTry as $f) {
    if (file_exists($f) && !$fontBold) {
        if (strpos(strtolower(basename($f)), 'bold') !== false ||
            strpos(strtolower(basename($f)), 'Bold') !== false) {
            $fontBold   = $f;
        } else {
            $fontNormal = $f;
        }
    }
}
if (!$fontBold && $fontNormal) $fontBold = $fontNormal;

$useTTF = $fontBold !== null;

// ── Marca/tienda (arriba) ─────────────────────────────────────────────────────
if ($useTTF) {
    imagettftext($canvas, 13, 0, $tx, 55, $cGrayDark, $fontNormal ?? $fontBold, 'TIENDA.MAWEWE.COM.EC');
} else {
    imagestring($canvas, 2, $tx, 35, 'TIENDA.MAWEWE.COM.EC', $cGrayDark);
}

// Línea decorativa bajo la marca
imagefilledrectangle($canvas, $tx, 65, $tx + 180, 67, $cAccent);

// ── Categoría ─────────────────────────────────────────────────────────────────
if ($category) {
    $catText = '  ' . strtoupper($category) . '  ';
    if ($useTTF) {
        $bbox    = imagettfbbox(11, 0, $fontBold, $catText);
        $catW    = $bbox[2] - $bbox[0] + 16;
        imagefilledrectangle($canvas, $tx, 78, $tx + $catW, 100, $cAccent);
        imagettftext($canvas, 11, 0, $tx + 8, 94, $cWhite, $fontBold, strtoupper($category));
    } else {
        imagestring($canvas, 2, $tx, 80, strtoupper($category), $cAccent);
    }
}

// ── Nombre del producto ────────────────────────────────────────────────────────
$nameStartY = $category ? 125 : 100;
if ($useTTF) {
    // Nombre en dos líneas máx, tamaño grande
    $nameLines  = [];
    $words      = explode(' ', $name);
    $line       = '';
    $lineCount  = 0;
    foreach ($words as $word) {
        $test = $line ? $line . ' ' . $word : $word;
        $bbox = imagettfbbox(26, 0, $fontBold, $test);
        if (($bbox[2] - $bbox[0]) > $maxW && $line !== '') {
            $nameLines[] = $line;
            $line = $word;
            $lineCount++;
            if ($lineCount >= 2) { $nameLines[] = $line . '…'; break; }
        } else {
            $line = $test;
        }
    }
    if ($line && $lineCount < 2) $nameLines[] = $line;

    $ny = $nameStartY;
    foreach ($nameLines as $nl) {
        imagettftext($canvas, 26, 0, $tx, $ny, $cWhite, $fontBold, $nl);
        $ny += 38;
    }
    $afterName = $ny + 10;
} else {
    $ny = $nameStartY;
    // Wrapping manual con imagestring
    $shortened = mb_substr($name, 0, 45);
    imagestring($canvas, 5, $tx, $ny, $shortened, $cWhite);
    $afterName = $ny + 40;
}

// ── Precio ────────────────────────────────────────────────────────────────────
if ($price) {
    if ($useTTF) {
        imagettftext($canvas, 32, 0, $tx, $afterName + 32, $cYellow, $fontBold, $price);
        $afterPrice = $afterName + 55;

        // Descuentos
        imagettftext($canvas, 12, 0, $tx,        $afterName + 72, $cAccentLt, $fontNormal ?? $fontBold,
                     '-20% con transferencia');
        imagettftext($canvas, 12, 0, $tx + 190, $afterName + 72, imagecolorallocate($canvas, 96,165,250),
                     $fontNormal ?? $fontBold, '-16% con PayPal');
        $afterPrice = $afterName + 90;
    } else {
        imagestring($canvas, 5, $tx, $afterName + 20, $price, $cYellow);
        $afterPrice = $afterName + 55;
    }
} else {
    $afterPrice = $afterName;
}

// Línea separadora
imagefilledrectangle($canvas, $tx, $afterPrice + 10, $tx + $maxW, $afterPrice + 12, $cDivider);

// ── Descripción ───────────────────────────────────────────────────────────────
$descY = $afterPrice + 30;
if ($useTTF) {
    drawWrappedText($canvas, $fontNormal ?? $fontBold, 14,
                    $tx, $descY, $maxW, 22, $desc, $cGray);
} else {
    $descShort = mb_substr($desc, 0, 100);
    imagestring($canvas, 2, $tx, $descY, $descShort, $cGray);
}

// ── Footer: envío gratis + URL ────────────────────────────────────────────────
$footY = H - 50;
imagefilledrectangle($canvas, 522, $footY - 12, W, H, imagecolorallocate($canvas, 20, 20, 26));
imagefilledrectangle($canvas, 522, $footY - 13, W, $footY - 11, $cAccent);

if ($useTTF) {
    imagettftext($canvas, 13, 0, $tx, $footY + 8, imagecolorallocate($canvas, 134,239,172),
                 $fontBold, '✓ Envío gratis sobre $60  •  Pago seguro PayPal');
    imagettftext($canvas, 11, 0, $tx, $footY + 26, $cGrayDark, $fontNormal ?? $fontBold,
                 'tienda.mawewe.com.ec');
} else {
    imagestring($canvas, 2, $tx, $footY + 5, 'Envio gratis >$60 | PayPal seguro', $cGray);
    imagestring($canvas, 1, $tx, $footY + 20, 'tienda.mawewe.com.ec', $cGrayDark);
}

// ── Ícono Mawewe (esquina superior derecha) ────────────────────────────────────
$iconX = W - 80;
$iconY = 20;
imagefilledellipse($canvas, $iconX + 24, $iconY + 24, 48, 48, $cAccent);
if ($useTTF) {
    imagettftext($canvas, 14, 0, $iconX + 4, $iconY + 32, $cWhite, $fontBold, 'MW');
}

// ─── Enviar imagen ────────────────────────────────────────────────────────────
header('Content-Type: image/jpeg');
header('Cache-Control: public, max-age=86400');
header('X-Generator: Mawewe-OG/1.0');

if ($product_id > 0 && is_writable($cacheDir)) {
    imagejpeg($canvas, $cacheFile, 92);
    readfile($cacheFile);
} else {
    imagejpeg($canvas, null, 92);
}

imagedestroy($canvas);
