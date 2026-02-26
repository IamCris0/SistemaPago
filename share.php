<?php
/**
 * MAWEWE - share.php v2
 * ✅ Imagen del PRODUCTO (no el logo) en Facebook, WhatsApp, Instagram
 * ✅ Bots de redes sociales ven los OG tags con imagen real
 * ✅ Humanos son redirigidos a la tienda con el modal abierto
 */

// ─── CONFIGURACIÓN ───────────────────────────────────────────────────────────
$DB_HOST  = 'localhost';
$DB_NAME  = 'maweweco_tienda_db';
$DB_USER  = 'maweweco_cris';
$DB_PASS  = '';                   // ← PON TU CONTRASEÑA AQUÍ
$SITE_URL = 'https://tienda.mawewe.com.ec';

// ─── DEFAULTS (logo de Mawewe) ────────────────────────────────────────────────
$og_title = 'Mawewe | Tienda Online Premium - Envío Gratis sobre $60';
$og_desc  = 'Descubre productos premium en Ecuador: peluches, perfumes, LEGO, joyas y más. Envío gratis sobre $60. Pago seguro con PayPal.';
$og_image = $SITE_URL . '/assets/img/logo.jpg';
$og_url   = $SITE_URL . '/';
$redirect = $SITE_URL . '/';

// ─── PARÁMETROS ───────────────────────────────────────────────────────────────
$product_id = isset($_GET['product'])  ? (int) $_GET['product']  : 0;
$category   = isset($_GET['category']) ? trim($_GET['category']) : '';

// ─── BUSCAR PRODUCTO EN BD ────────────────────────────────────────────────────
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
            // ✅ Obtener primera imagen (del array images[] primero, luego image)
            $img = '';

            // 1) Intentar array images[]
            if (!empty($p['images'])) {
                $arr = json_decode($p['images'], true);
                if (is_array($arr)) {
                    // Buscar primera imagen no vacía
                    foreach ($arr as $candidate) {
                        $candidate = trim($candidate);
                        if ($candidate !== '' && $candidate !== 'null') {
                            $img = $candidate;
                            break;
                        }
                    }
                }
            }

            // 2) Fallback a campo image
            if (empty($img)) {
                $img = trim($p['image'] ?? '');
            }

            // 3) Convertir a URL absoluta si es relativa
            if (!empty($img) && !preg_match('/^https?:\/\//i', $img)) {
                $img = $SITE_URL . '/' . ltrim($img, '/');
            }

            // 4) Si aún vacío, usar logo
            if (empty($img)) {
                $img = $SITE_URL . '/assets/img/logo.jpg';
            }

            $price     = '$' . number_format((float)$p['price'], 2);
            $og_title  = $p['name'] . ' - ' . $price . ' | Mawewe Ecuador';
            $og_desc   = !empty($p['description'])
                ? mb_substr(strip_tags($p['description']), 0, 200) . '...'
                : 'Compra ' . $p['name'] . ' en Mawewe. Envío gratis sobre $60.';
            $og_image  = $img;
            $og_url    = $SITE_URL . '/?product=' . $product_id;
            $redirect  = $SITE_URL . '/?product=' . $product_id;
        }

    } catch (Exception $e) {
        $redirect = $SITE_URL . '/?product=' . $product_id;
    }
}

// ─── CATEGORÍA ────────────────────────────────────────────────────────────────
if ($category && !$product_id) {
    $cat      = ucfirst(str_replace('_', ' ', $category));
    $og_title = $cat . ' | Mawewe - Tienda Online Ecuador';
    $og_desc  = 'Colección de ' . strtolower($cat) . ' en Mawewe. Envío gratis sobre $60.';
    $og_url   = $SITE_URL . '/?category=' . urlencode($category);
    $redirect = $og_url;
}

// ─── DETECTAR BOTS DE REDES SOCIALES ─────────────────────────────────────────
$ua     = $_SERVER['HTTP_USER_AGENT'] ?? '';
$is_bot = (bool) preg_match(
    '/(facebookexternalhit|facebot|whatsapp|twitterbot|linkedinbot|telegrambot|slackbot|discordbot|applebot|googlebot|bingbot|instagram|pinterest)/i',
    $ua
);

// ─── HUMANOS → REDIRIGIR A LA TIENDA ─────────────────────────────────────────
if (!$is_bot) {
    header('Location: ' . $redirect, true, 302);
    exit;
}

// ─── BOTS → SERVIR HTML CON OG TAGS ──────────────────────────────────────────
$t  = htmlspecialchars($og_title,  ENT_QUOTES, 'UTF-8');
$d  = htmlspecialchars($og_desc,   ENT_QUOTES, 'UTF-8');
$i  = htmlspecialchars($og_image,  ENT_QUOTES, 'UTF-8');
$u  = htmlspecialchars($og_url,    ENT_QUOTES, 'UTF-8');
$re = htmlspecialchars($redirect,  ENT_QUOTES, 'UTF-8');

header('Content-Type: text/html; charset=UTF-8');
// Cache 5 minutos para bots (actualiza si cambias el producto)
header('Cache-Control: public, max-age=300');
?><!DOCTYPE html>
<html lang="es-EC">
<head>
  <meta charset="UTF-8">
  <title><?= $t ?></title>
  <link rel="canonical" href="<?= $u ?>">
  <meta http-equiv="refresh" content="0; url=<?= $re ?>">

  <!-- ✅ Open Graph — imagen del producto para Facebook / WhatsApp / Instagram -->
  <meta property="og:type"         content="product">
  <meta property="og:site_name"    content="Mawewe">
  <meta property="og:url"          content="<?= $u ?>">
  <meta property="og:title"        content="<?= $t ?>">
  <meta property="og:description"  content="<?= $d ?>">
  <meta property="og:image"        content="<?= $i ?>">
  <meta property="og:image:secure_url" content="<?= $i ?>">
  <meta property="og:image:width"  content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt"    content="<?= $t ?>">
  <meta property="og:locale"       content="es_EC">

  <!-- Twitter / X Card -->
  <meta name="twitter:card"        content="summary_large_image">
  <meta name="twitter:title"       content="<?= $t ?>">
  <meta name="twitter:description" content="<?= $d ?>">
  <meta name="twitter:image"       content="<?= $i ?>">
</head>
<body>
  <p>Redirigiendo... <a href="<?= $re ?>">Haz clic aquí si no redirige</a></p>
</body>
</html>
