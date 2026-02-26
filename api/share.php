<?php
/**
 * MAWEWE - Share Handler
 * Este archivo genera meta tags Open Graph dinámicos para Facebook, WhatsApp e Instagram.
 * 
 * USO: Redirige las URLs compartidas a este archivo.
 * Ejemplo: https://tienda.mawewe.com.ec/share.php?product=2
 * 
 * Luego este redirige a la tienda con el producto abierto.
 */

// ─── CONFIGURACIÓN ───────────────────────────────────────────────────────────
$DB_HOST = 'localhost';
$DB_NAME = 'maweweco_tienda_db';
$DB_USER = 'maweweco_cris';       // ← Cambia si es diferente
$DB_PASS = '';                     // ← Pon tu contraseña de BD aquí
$SITE_URL = 'https://tienda.mawewe.com.ec';
$SITE_NAME = 'Mawewe | Tienda Online Premium';

// ─── DEFAULTS ────────────────────────────────────────────────────────────────
$title       = 'Mawewe | Tienda Online Premium - Envío Gratis sobre $60';
$description = 'Descubre productos premium en Ecuador: peluches, perfumes de lujo, LEGO, joyas y más. Envío gratis en compras sobre $60. Pago 100% seguro con PayPal.';
$image       = $SITE_URL . '/assets/img/logo.jpg';
$canonical   = $SITE_URL . '/';
$redirect    = $SITE_URL . '/';

// ─── OBTENER PARÁMETROS ───────────────────────────────────────────────────────
$product_id  = isset($_GET['product'])  ? (int)$_GET['product']  : 0;
$category    = isset($_GET['category']) ? trim($_GET['category']) : '';

// ─── CONECTAR A BD Y OBTENER DATOS DEL PRODUCTO ──────────────────────────────
if ($product_id > 0) {
    try {
        $pdo = new PDO(
            "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4",
            $DB_USER,
            $DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );

        $stmt = $pdo->prepare(
            "SELECT id, name, description, image, images, price, category, subcategory
             FROM products
             WHERE id = ? AND active = 1
             LIMIT 1"
        );
        $stmt->execute([$product_id]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($product) {
            // Obtener primera imagen (de images[] o image principal)
            $first_image = $product['image'];
            if (!empty($product['images'])) {
                $imgs = json_decode($product['images'], true);
                if (is_array($imgs) && count($imgs) > 0) {
                    $first_image = $imgs[0];
                }
            }

            // Construir URL absoluta de la imagen
            if (!str_starts_with($first_image, 'http')) {
                $first_image = $SITE_URL . '/' . ltrim($first_image, '/');
            }

            $price_fmt   = '$' . number_format((float)$product['price'], 2);
            $title       = $product['name'] . ' - ' . $price_fmt . ' | Mawewe Ecuador';
            $description = !empty($product['description'])
                ? mb_substr(strip_tags($product['description']), 0, 200) . '...'
                : 'Compra ' . $product['name'] . ' en Mawewe. Envío gratis sobre $60.';
            $image       = $first_image;
            $canonical   = $SITE_URL . '/?product=' . $product_id;
            $redirect    = $SITE_URL . '/?product=' . $product_id;
        }

    } catch (Exception $e) {
        // Si falla la BD, redirige a la tienda normal
        $redirect = $SITE_URL . '/?product=' . $product_id;
    }
}

// ─── CATEGORÍA ───────────────────────────────────────────────────────────────
if ($category && !$product_id) {
    $cat_name    = ucfirst(str_replace('_', ' ', $category));
    $title       = $cat_name . ' | Mawewe - Tienda Online Ecuador';
    $description = 'Descubre nuestra colección de ' . strtolower($cat_name) . ' en Mawewe. Envío gratis sobre $60. Pago seguro con PayPal.';
    $canonical   = $SITE_URL . '/?category=' . urlencode($category);
    $redirect    = $canonical;
}

// ─── DETECTAR SI ES BOT DE RED SOCIAL ────────────────────────────────────────
$user_agent = strtolower($_SERVER['HTTP_USER_AGENT'] ?? '');
$is_bot = preg_match(
    '/(facebookexternalhit|facebot|twitterbot|whatsapp|linkedinbot|telegrambot|slackbot|discordbot|instagram|applebot|googlebot|bingbot)/i',
    $user_agent
);

// ─── SI ES HUMANO: REDIRIGIR A LA TIENDA ─────────────────────────────────────
if (!$is_bot) {
    header('Location: ' . $redirect, true, 302);
    exit;
}

// ─── SI ES BOT: SERVIR META TAGS OPEN GRAPH ──────────────────────────────────
$title_esc       = htmlspecialchars($title,       ENT_QUOTES, 'UTF-8');
$description_esc = htmlspecialchars($description, ENT_QUOTES, 'UTF-8');
$image_esc       = htmlspecialchars($image,       ENT_QUOTES, 'UTF-8');
$canonical_esc   = htmlspecialchars($canonical,   ENT_QUOTES, 'UTF-8');
$site_name_esc   = htmlspecialchars($SITE_NAME,   ENT_QUOTES, 'UTF-8');

header('Content-Type: text/html; charset=UTF-8');
?><!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title><?= $title_esc ?></title>
  <link rel="canonical" href="<?= $canonical_esc ?>">

  <!-- Open Graph (Facebook, Instagram, WhatsApp) -->
  <meta property="og:type"        content="product">
  <meta property="og:site_name"   content="<?= $site_name_esc ?>">
  <meta property="og:url"         content="<?= $canonical_esc ?>">
  <meta property="og:title"       content="<?= $title_esc ?>">
  <meta property="og:description" content="<?= $description_esc ?>">
  <meta property="og:image"       content="<?= $image_esc ?>">
  <meta property="og:image:width"  content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt"   content="<?= $title_esc ?>">
  <meta property="og:locale"      content="es_EC">

  <!-- Twitter Card -->
  <meta name="twitter:card"        content="summary_large_image">
  <meta name="twitter:title"       content="<?= $title_esc ?>">
  <meta name="twitter:description" content="<?= $description_esc ?>">
  <meta name="twitter:image"       content="<?= $image_esc ?>">

  <!-- Redirigir a la tienda si un humano llega aquí -->
  <meta http-equiv="refresh" content="0; url=<?= $canonical_esc ?>">
</head>
<body>
  <p>Redirigiendo a <a href="<?= $canonical_esc ?>"><?= $title_esc ?></a>...</p>
</body>
</html>
