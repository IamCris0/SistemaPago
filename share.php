<?php
/**
 * MAWEWE - share.php v6 — FIX DEFINITIVO FACEBOOK
 *
 * CAUSA RAÍZ del problema:
 *   - Versiones anteriores tenían <link rel="canonical"> y <meta http-equiv="refresh">
 *     apuntando a /?product=X (SPA JavaScript sin OG tags)
 *   - Facebook seguía esas redirecciones y leía el homepage → mostraba el logo
 *
 * SOLUCIÓN v6:
 *   ✅ og:url = este mismo share.php (nunca la SPA)
 *   ✅ CERO etiquetas canonical ni refresh para los bots
 *   ✅ Solo usuarios reales son redirigidos a la tienda (header Location)
 *   ✅ El body tiene contenido real del producto (texto + imagen) como respaldo
 */

$DB_HOST  = 'localhost';
$DB_NAME  = 'maweweco_tienda_db';
$DB_USER  = 'maweweco_cris';
$DB_PASS  = 'bdC(ZFro1rYd';
$SITE_URL = 'https://tienda.mawewe.com.ec';

// Si creas una App de Facebook pega el ID aquí para quitar la advertencia fb:app_id
// https://developers.facebook.com/ → My Apps → Create App (tipo: Consumer, gratis)
$FB_APP_ID = '';

// ─── Parámetros ──────────────────────────────────────────────────────────────
$product_id = isset($_GET['product']) ? (int) $_GET['product'] : 0;
$debug      = isset($_GET['debug'])   && $_GET['debug'] === '1';

// ─── Valores por defecto ─────────────────────────────────────────────────────
$og_title  = 'Mawewe | Tienda Online Premium Ecuador';
$og_desc   = 'Productos premium con envío gratis sobre $60. Pago seguro con PayPal.';
$og_image  = $SITE_URL . '/assets/img/logo.jpg';
$og_price  = '';
$redirect  = $SITE_URL . '/';
$found     = false;

// ✅ og:url = ESTE archivo (jamás la SPA)
$share_url = $SITE_URL . '/share.php' . ($product_id ? '?product=' . $product_id : '');

// ─── Helper: imagen → URL absoluta HTTPS ─────────────────────────────────────
function absHttps($img, $base) {
    $img = trim((string)$img);
    if (empty($img) || in_array($img, ['null','undefined'])) return '';
    if (preg_match('/^https?:\/\//i', $img))
        return preg_replace('/^http:\/\//i', 'https://', $img);
    return $base . '/' . ltrim($img, '/');
}

// ─── Consultar BD ─────────────────────────────────────────────────────────────
if ($product_id > 0) {
    try {
        $pdo = new PDO(
            "mysql:host={$DB_HOST};dbname={$DB_NAME};charset=utf8mb4",
            $DB_USER, $DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
        $stmt = $pdo->prepare(
            "SELECT id, name, description, image, images, price
             FROM products WHERE id = ? AND active = 1 LIMIT 1"
        );
        $stmt->execute([$product_id]);
        $p = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($p) {
            $found = true;
            $img   = '';

            // 1) Primer elemento de images[]
            if (!empty($p['images'])) {
                $arr = json_decode($p['images'], true);
                if (is_array($arr)) {
                    foreach ($arr as $c) {
                        $a = absHttps($c, $SITE_URL);
                        if ($a) { $img = $a; break; }
                    }
                }
            }
            // 2) Campo image
            if (!$img) $img = absHttps($p['image'], $SITE_URL);
            // 3) Logo fallback
            if (!$img) $img = $SITE_URL . '/assets/img/logo.jpg';

            $price = number_format((float)$p['price'], 2);

            $og_title = $p['name'] . ' - $' . $price . ' | Mawewe Ecuador';
            $og_desc  = !empty($p['description'])
                ? mb_substr(strip_tags($p['description']), 0, 200)
                : $p['name'] . ' disponible en Mawewe. Envío gratis sobre $60.';
            $og_price  = $price;
            // Cache-buster: fuerza descarga nueva de la imagen
            $og_image  = $img . (strpos($img, '?') === false ? '?' : '&') . 'v=' . time();
            $redirect  = $SITE_URL . '/?product=' . $product_id;
        } else {
            $redirect = $SITE_URL . '/';
        }
    } catch (Exception $e) {
        error_log('[share.php] ' . $e->getMessage());
        $redirect = $SITE_URL . '/';
    }
}

// ─── Debug ────────────────────────────────────────────────────────────────────
if ($debug) {
    header('Content-Type: text/plain; charset=UTF-8');
    echo "========= share.php DEBUG v6 =========\n\n";
    echo "product_id  : {$product_id}\n";
    echo "found_in_db : " . ($found ? 'SÍ ✅' : 'NO ❌ (producto no existe o active=0)') . "\n\n";
    echo "og:title    : {$og_title}\n";
    echo "og:image    : {$og_image}\n";
    echo "og:url      : {$share_url}  ← debe ser share.php\n";
    echo "redirect    : {$redirect}\n\n";
    echo "User-Agent  : " . ($_SERVER['HTTP_USER_AGENT'] ?? 'N/A') . "\n\n";
    echo "=== PASO OBLIGATORIO después de subir el archivo ===\n";
    echo "1. Abre: https://developers.facebook.com/tools/debug/\n";
    echo "2. Pega: {$share_url}\n";
    echo "3. Haz clic en 'Volver a extraer' TRES veces\n";
    echo "4. Verifica que 'Vista previa del enlace' muestra la imagen del producto\n";
    exit;
}

// ─── Detectar si es bot de red social ────────────────────────────────────────
$ua     = $_SERVER['HTTP_USER_AGENT'] ?? '';
$is_bot = (bool) preg_match(
    '/(facebookexternalhit|facebot|whatsapp|twitterbot|linkedinbot|telegrambot|slackbot|discordbot|applebot|googlebot|bingbot|instagram|pinterest|vkshare|iframely|MetaInspector|Embedly)/i',
    $ua
);

// Solo los usuarios reales se redirigen a la tienda
if (!$is_bot) {
    header('Location: ' . $redirect, true, 302);
    exit;
}

// ─── Respuesta HTML para bots ─────────────────────────────────────────────────
// Sin canonical, sin http-equiv refresh → Facebook NO seguirá a la SPA
header('Content-Type: text/html; charset=UTF-8');
header('Cache-Control: no-cache, no-store, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: Thu, 01 Jan 1970 00:00:00 GMT');
header('Vary: User-Agent');

$t  = htmlspecialchars($og_title, ENT_QUOTES, 'UTF-8');
$d  = htmlspecialchars($og_desc,  ENT_QUOTES, 'UTF-8');
$i  = htmlspecialchars($og_image, ENT_QUOTES, 'UTF-8');
$su = htmlspecialchars($share_url, ENT_QUOTES, 'UTF-8');
$re = htmlspecialchars($redirect,  ENT_QUOTES, 'UTF-8');
?><!DOCTYPE html>
<html lang="es-EC" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="UTF-8">
  <title><?= $t ?></title>

  <?php if (!empty($FB_APP_ID)): ?>
  <meta property="fb:app_id" content="<?= htmlspecialchars($FB_APP_ID) ?>">
  <?php endif; ?>

  <!-- ================================================================
       Open Graph — Facebook, Instagram, LinkedIn, Telegram
       IMPORTANTE: og:url apunta a ESTE archivo (share.php), NO a la SPA
  ================================================================= -->
  <meta property="og:url"              content="<?= $su ?>">
  <meta property="og:type"             content="product">
  <meta property="og:site_name"        content="Mawewe">
  <meta property="og:title"            content="<?= $t ?>">
  <meta property="og:description"      content="<?= $d ?>">

  <meta property="og:image"            content="<?= $i ?>">
  <meta property="og:image:secure_url" content="<?= $i ?>">
  <meta property="og:image:type"       content="image/jpeg">
  <meta property="og:image:width"      content="1200">
  <meta property="og:image:height"     content="1200">
  <meta property="og:image:alt"        content="<?= $t ?>">
  <meta property="og:locale"           content="es_EC">

  <?php if ($og_price): ?>
  <meta property="product:price:amount"   content="<?= htmlspecialchars($og_price) ?>">
  <meta property="product:price:currency" content="USD">
  <?php endif; ?>

  <!-- Twitter / X -->
  <meta name="twitter:card"        content="summary_large_image">
  <meta name="twitter:title"       content="<?= $t ?>">
  <meta name="twitter:description" content="<?= $d ?>">
  <meta name="twitter:image"       content="<?= $i ?>">

  <meta name="description" content="<?= $d ?>">
</head>
<body style="font-family:sans-serif;max-width:600px;margin:2rem auto;padding:1rem;">
  <h1 style="color:#8C004B"><?= $t ?></h1>
  <img src="<?= $i ?>" alt="<?= $t ?>" style="max-width:100%;border-radius:8px;">
  <p><?= $d ?></p>
  <?php if ($og_price): ?>
  <p style="font-size:1.5rem;font-weight:bold;color:#8C004B;">$<?= htmlspecialchars($og_price) ?> USD</p>
  <?php endif; ?>
  <a href="<?= $re ?>" style="display:inline-block;background:#8C004B;color:white;padding:.75rem 1.5rem;border-radius:8px;text-decoration:none;margin-top:1rem;">
    Ver producto en Mawewe →
  </a>
</body>
</html>