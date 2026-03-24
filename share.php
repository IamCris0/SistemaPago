<?php
/**
 * MAWEWE - share.php v8
 *
 * ✅ og:image apunta a share-image.php (tarjeta 1200×630 con producto + texto)
 * ✅ absHttps() con doble dominio (mawewe.com.ec para images/, tienda para assets/)
 * ✅ Parseo robusto de JSON de imágenes
 * ✅ Cache-buster diario
 * ✅ Sin canonical ni http-equiv → bots leen este archivo, no la SPA
 * ✅ Descripción siempre válida
 */

$DB_HOST  = 'localhost';
$DB_NAME  = 'maweweco_tienda_db';
$DB_USER  = 'maweweco_cris';
$DB_PASS  = 'bdC(ZFro1rYd';
$SITE_URL = 'https://tienda.mawewe.com.ec';
$CDN_URL  = 'https://mawewe.com.ec';
$FB_APP_ID = '';

// ─── Parámetros ──────────────────────────────────────────────────────────────
$product_id = isset($_GET['product']) ? (int)$_GET['product'] : 0;
$debug      = isset($_GET['debug'])   && $_GET['debug'] === '1';

// ─── Valores por defecto ─────────────────────────────────────────────────────
$og_title  = 'Mawewe | Tienda Online Premium Ecuador';
$og_desc   = 'Productos premium con envío gratis sobre $60. Pago seguro con PayPal.';
$og_price  = '';
$redirect  = $SITE_URL . '/';
$found     = false;

// ✅ og:url = ESTE archivo (jamás la SPA)
$share_url = $SITE_URL . '/share.php' . ($product_id ? '?product=' . $product_id : '');

// ✅ og:image = imagen generada dinámicamente (1200×630, diseño profesional)
// Si no hay producto → usa el logo estático
$og_image = $product_id
    ? $SITE_URL . '/share-image.php?product=' . $product_id . '&cb=' . date('Ymd')
    : $SITE_URL . '/assets/img/og-default.jpg';

// ─── HELPER: imagen → URL absoluta HTTPS con dominio correcto ─────────────────
function absHttps($img, $siteUrl, $cdnUrl) {
    $img = trim((string)$img);
    if (empty($img) || in_array($img, ['null','undefined',''])) return '';
    if (preg_match('/^https?:\/\//i', $img))
        return preg_replace('/^http:\/\//i', 'https://', $img);
    $clean = ltrim($img, '/');
    return (strpos($clean, 'images/') === 0)
        ? $cdnUrl  . '/' . $clean
        : $siteUrl . '/' . $clean;
}

// ─── HELPER: primer elemento válido de JSON array ────────────────────────────
function firstImageFromJson($json, $siteUrl, $cdnUrl) {
    if (empty($json)) return '';
    $arr = @json_decode($json, true);
    if (!is_array($arr)) return '';
    foreach ($arr as $item) {
        $url = absHttps(trim((string)$item), $siteUrl, $cdnUrl);
        if ($url) return $url;
    }
    return '';
}

// ─── Consultar BD ─────────────────────────────────────────────────────────────
if ($product_id > 0) {
    try {
        $pdo  = new PDO("mysql:host={$DB_HOST};dbname={$DB_NAME};charset=utf8mb4",
                        $DB_USER, $DB_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        $stmt = $pdo->prepare(
            "SELECT id, name, description, image, images, price, category
             FROM products WHERE id = ? AND active = 1 LIMIT 1"
        );
        $stmt->execute([$product_id]);
        $p = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($p) {
            $found    = true;
            $price    = number_format((float)$p['price'], 2);
            $category = ucfirst($p['category'] ?? '');
            $descRaw  = strip_tags($p['description'] ?? '');

            $og_title = $p['name'] . ' - $' . $price . ' USD | Mawewe Ecuador';
            $og_desc  = $descRaw
                ? mb_substr($descRaw, 0, 200) . (mb_strlen($descRaw) > 200 ? '…' : '')
                : $p['name'] . ' disponible en Mawewe Ecuador. Envío gratis sobre $60.';
            $og_price = $price;
            $redirect = $SITE_URL . '/?product=' . $product_id;
        }
    } catch (Exception $e) {
        error_log('[share.php v8] ' . $e->getMessage());
    }
}

// ─── Debug ────────────────────────────────────────────────────────────────────
if ($debug) {
    header('Content-Type: text/plain; charset=UTF-8');
    $imgCheck = @get_headers($og_image, 1);
    echo "========= share.php v8 DEBUG =========\n\n";
    echo "product_id  : {$product_id}\n";
    echo "found_in_db : " . ($found ? 'SÍ ✅' : 'NO ❌') . "\n\n";
    echo "og:title    : {$og_title}\n";
    echo "og:image    : {$og_image}\n";
    echo "  HTTP img  : " . ($imgCheck ? $imgCheck[0] : 'no verificable') . "\n";
    echo "og:url      : {$share_url}\n";
    echo "redirect    : {$redirect}\n\n";
    echo "User-Agent  : " . ($_SERVER['HTTP_USER_AGENT'] ?? 'N/A') . "\n\n";
    echo "=== PASOS ===\n";
    echo "1. Sube share.php y share-image.php a la raíz de tienda.mawewe.com.ec\n";
    echo "2. Crea carpeta: tienda.mawewe.com.ec/og-cache/ (permisos 755)\n";
    echo "3. Abre: https://developers.facebook.com/tools/debug/?q=" . urlencode($share_url) . "\n";
    echo "4. Haz clic en 'Volver a extraer' 3 veces\n";
    exit;
}

// ─── Detectar bots ────────────────────────────────────────────────────────────
$ua     = $_SERVER['HTTP_USER_AGENT'] ?? '';
$is_bot = (bool) preg_match(
    '/(facebookexternalhit|facebot|whatsapp|twitterbot|linkedinbot|telegrambot|slackbot|discordbot|applebot|googlebot|bingbot|instagram|pinterest|vkshare|iframely|MetaInspector|Embedly)/i',
    $ua
);

if (!$is_bot) {
    header('Location: ' . $redirect, true, 302);
    exit;
}

// ─── HTML para bots ───────────────────────────────────────────────────────────
header('Content-Type: text/html; charset=UTF-8');
header('Cache-Control: no-cache, no-store, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: Thu, 01 Jan 1970 00:00:00 GMT');
header('Vary: User-Agent');

$t  = htmlspecialchars($og_title,  ENT_QUOTES, 'UTF-8');
$d  = htmlspecialchars($og_desc,   ENT_QUOTES, 'UTF-8');
$i  = htmlspecialchars($og_image,  ENT_QUOTES, 'UTF-8');
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

  <meta property="og:url"              content="<?= $su ?>">
  <meta property="og:type"             content="product">
  <meta property="og:site_name"        content="Mawewe Ecuador">
  <meta property="og:title"            content="<?= $t ?>">
  <meta property="og:description"      content="<?= $d ?>">

  <meta property="og:image"            content="<?= $i ?>">
  <meta property="og:image:secure_url" content="<?= $i ?>">
  <meta property="og:image:type"       content="image/jpeg">
  <meta property="og:image:width"      content="1200">
  <meta property="og:image:height"     content="630">
  <meta property="og:image:alt"        content="<?= $t ?>">
  <meta property="og:locale"           content="es_EC">

  <?php if ($og_price): ?>
  <meta property="product:price:amount"   content="<?= htmlspecialchars($og_price) ?>">
  <meta property="product:price:currency" content="USD">
  <?php endif; ?>

  <meta name="twitter:card"        content="summary_large_image">
  <meta name="twitter:title"       content="<?= $t ?>">
  <meta name="twitter:description" content="<?= $d ?>">
  <meta name="twitter:image"       content="<?= $i ?>">

  <meta name="description" content="<?= $d ?>">
</head>
<body style="font-family:sans-serif;max-width:700px;margin:2rem auto;padding:1rem;background:#111;color:#eee;">
  <h1 style="color:#e91e8c;font-size:1.3rem"><?= $t ?></h1>
  <img src="<?= $i ?>" alt="<?= $t ?>" style="max-width:100%;border-radius:10px;margin:1rem 0;">
  <p style="color:#ccc"><?= $d ?></p>
  <?php if ($og_price): ?>
  <p style="font-size:1.4rem;font-weight:700;color:#fcd93e;">$<?= htmlspecialchars($og_price) ?> USD</p>
  <?php endif; ?>
  <a href="<?= $re ?>"
     style="display:inline-block;background:#8C004B;color:#fff;padding:.75rem 1.5rem;border-radius:8px;text-decoration:none;margin-top:1rem;font-weight:600;">
    Ver producto en la tienda →
  </a>
</body>
</html>