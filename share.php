<?php
/**
 * MAWEWE - share.php v3
 * ✅ Imagen del PRODUCTO en Facebook, WhatsApp, Instagram
 * ✅ Headers no-cache para que Facebook relea los OG tags
 * ✅ og:image siempre con https:// (requerido por Facebook)
 * ✅ Modo debug: ?debug=1 para verificar que la imagen es correcta
 */

$DB_HOST  = 'localhost';
$DB_NAME  = 'maweweco_tienda_db';
$DB_USER  = 'maweweco_cris';
$DB_PASS  = 'bdC(ZFro1rYd';                    // ← PON TU CONTRASEÑA AQUÍ
$SITE_URL = 'https://tienda.mawewe.com.ec';

$og_title = 'Mawewe | Tienda Online Premium - Envío Gratis sobre $60';
$og_desc  = 'Descubre productos premium en Ecuador: peluches, perfumes, LEGO, joyas y más. Envío gratis sobre $60. Pago seguro con PayPal.';
$og_image = $SITE_URL . '/assets/img/logo.jpg';
$og_url   = $SITE_URL . '/';
$redirect = $SITE_URL . '/';
$found    = false;

$product_id = isset($_GET['product'])  ? (int) $_GET['product']  : 0;
$category   = isset($_GET['category']) ? trim($_GET['category']) : '';
$debug      = isset($_GET['debug'])    && $_GET['debug'] === '1';

if ($product_id > 0) {
    try {
        $pdo = new PDO(
            "mysql:host={$DB_HOST};dbname={$DB_NAME};charset=utf8mb4",
            $DB_USER, $DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_SILENT]
        );
        $stmt = $pdo->prepare(
            "SELECT name, description, image, images, price
             FROM products WHERE id = ? AND active = 1 LIMIT 1"
        );
        $stmt->execute([$product_id]);
        $p = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($p) {
            $found = true;
            $img   = '';

            // 1) Buscar en array images[]
            if (!empty($p['images'])) {
                $arr = json_decode($p['images'], true);
                if (is_array($arr)) {
                    foreach ($arr as $candidate) {
                        $candidate = trim((string)$candidate);
                        if ($candidate !== '' && $candidate !== 'null' && $candidate !== 'undefined') {
                            $img = $candidate;
                            break;
                        }
                    }
                }
            }

            // 2) Fallback campo image
            if (empty($img) && !empty($p['image'])) {
                $img = trim($p['image']);
            }

            // 3) URL absoluta con HTTPS (Facebook requiere https)
            if (!empty($img)) {
                if (!preg_match('/^https?:\/\//i', $img)) {
                    $img = $SITE_URL . '/' . ltrim($img, '/');
                }
                $img = preg_replace('/^http:\/\//i', 'https://', $img);
            } else {
                $img = $SITE_URL . '/assets/img/logo.jpg';
            }

            $price    = '$' . number_format((float)$p['price'], 2);
            $og_title = $p['name'] . ' - ' . $price . ' | Mawewe Ecuador';
            $og_desc  = !empty($p['description'])
                ? mb_substr(strip_tags($p['description']), 0, 200) . '...'
                : 'Compra ' . $p['name'] . ' en Mawewe. Envío gratis sobre $60.';
            $og_image = $img;
            $og_url   = $SITE_URL . '/?product=' . $product_id;
            $redirect = $SITE_URL . '/?product=' . $product_id;
        }
    } catch (Exception $e) {
        $redirect = $SITE_URL . '/?product=' . $product_id;
    }
}

if ($category && !$product_id) {
    $cat      = ucfirst(str_replace('_', ' ', $category));
    $og_title = $cat . ' | Mawewe - Tienda Online Ecuador';
    $og_desc  = 'Colección de ' . strtolower($cat) . ' en Mawewe. Envío gratis sobre $60.';
    $og_url   = $SITE_URL . '/?category=' . urlencode($category);
    $redirect = $og_url;
}

// ─── DEBUG: ver qué datos tiene el archivo ────────────────────────────────────
if ($debug) {
    header('Content-Type: text/plain; charset=UTF-8');
    echo "=== share.php DEBUG ===\n\n";
    echo "product_id : {$product_id}\n";
    echo "found_in_db: " . ($found ? 'SI ✓' : 'NO ✗') . "\n";
    echo "og_title   : {$og_title}\n";
    echo "og_image   : {$og_image}\n";
    echo "og_url     : {$og_url}\n";
    echo "redirect   : {$redirect}\n\n";
    echo "User-Agent : " . ($_SERVER['HTTP_USER_AGENT'] ?? 'N/A') . "\n";
    exit;
}

$ua     = $_SERVER['HTTP_USER_AGENT'] ?? '';
$is_bot = (bool) preg_match(
    '/(facebookexternalhit|facebot|whatsapp|twitterbot|linkedinbot|telegrambot|slackbot|discordbot|applebot|googlebot|bingbot|instagram|pinterest)/i',
    $ua
);

if (!$is_bot) {
    header('Location: ' . $redirect, true, 302);
    exit;
}

// Headers para que Facebook NO use caché antiguo
header('Content-Type: text/html; charset=UTF-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

$t  = htmlspecialchars($og_title,  ENT_QUOTES, 'UTF-8');
$d  = htmlspecialchars($og_desc,   ENT_QUOTES, 'UTF-8');
$i  = htmlspecialchars($og_image,  ENT_QUOTES, 'UTF-8');
$u  = htmlspecialchars($og_url,    ENT_QUOTES, 'UTF-8');
$re = htmlspecialchars($redirect,  ENT_QUOTES, 'UTF-8');
?><!DOCTYPE html>
<html lang="es-EC" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="UTF-8">
  <title><?= $t ?></title>
  <link rel="canonical" href="<?= $u ?>">
  <meta http-equiv="refresh" content="0; url=<?= $re ?>">
  <meta property="og:type"             content="product">
  <meta property="og:site_name"        content="Mawewe">
  <meta property="og:url"              content="<?= $u ?>">
  <meta property="og:title"            content="<?= $t ?>">
  <meta property="og:description"      content="<?= $d ?>">
  <meta property="og:image"            content="<?= $i ?>">
  <meta property="og:image:secure_url" content="<?= $i ?>">
  <meta property="og:image:type"       content="image/jpeg">
  <meta property="og:image:width"      content="1200">
  <meta property="og:image:height"     content="630">
  <meta property="og:image:alt"        content="<?= $t ?>">
  <meta property="og:locale"           content="es_EC">
  <meta name="twitter:card"            content="summary_large_image">
  <meta name="twitter:title"           content="<?= $t ?>">
  <meta name="twitter:description"     content="<?= $d ?>">
  <meta name="twitter:image"           content="<?= $i ?>">
</head>
<body>
  <p>Redirigiendo... <a href="<?= $re ?>">Haz clic aquí</a></p>
  <img src="<?= $i ?>" alt="<?= $t ?>" style="display:none" width="1200" height="630">
</body>
</html>
