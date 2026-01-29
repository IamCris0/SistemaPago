<?php
/**
 * Generador de PDF para órdenes
 * Usa TCPDF para crear recibos profesionales
 */

require_once('tcpdf/tcpdf.php');
require_once __DIR__ . '/config/database.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Obtener orderNumber
$orderNumber = $_GET['orderNumber'] ?? null;

if (!$orderNumber) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Número de orden requerido']);
    exit();
}

try {
    // Conectar a BD
    $database = new Database();
    $db = $database->getConnection();
    
    // Obtener orden
    $sql = "SELECT * FROM orders WHERE order_number = :order_number";
    $stmt = $db->prepare($sql);
    $stmt->execute([':order_number' => $orderNumber]);
    $order = $stmt->fetch();
    
    if (!$order) {
        throw new Exception('Orden no encontrada');
    }
    
    // Obtener items
    $sqlItems = "SELECT * FROM order_items WHERE order_id = :order_id";
    $stmtItems = $db->prepare($sqlItems);
    $stmtItems->execute([':order_id' => $order['id']]);
    $items = $stmtItems->fetchAll();
    
    // Crear PDF
    $pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, PDF_PAGE_FORMAT, true, 'UTF-8', false);
    
    $pdf->SetCreator(PDF_CREATOR);
    $pdf->SetAuthor('Mawewe');
    $pdf->SetTitle('Orden ' . $orderNumber);
    $pdf->SetSubject('Recibo de Compra');
    
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    
    $pdf->AddPage();
    
    // Logo y header
    $html = '
    <style>
        h1 { color: #8C004B; text-align: center; }
        h2 { color: #333; border-bottom: 2px solid #8C004B; padding-bottom: 5px; }
        table { border-collapse: collapse; width: 100%; }
        th { background-color: #8C004B; color: white; padding: 10px; }
        td { padding: 8px; border-bottom: 1px solid #ddd; }
        .total { font-size: 18px; font-weight: bold; color: #8C004B; }
        .info { background-color: #f5f5f5; padding: 10px; margin: 10px 0; }
    </style>
    
    <h1>MAWEWE</h1>
    <p style="text-align: center; color: #666;">Recibo de Compra</p>
    
    <div class="info">
        <strong>Número de Orden:</strong> ' . htmlspecialchars($orderNumber) . '<br>
        <strong>Fecha:</strong> ' . date('d/m/Y H:i', strtotime($order['created_at'])) . '<br>
        <strong>Estado:</strong> ' . htmlspecialchars($order['status']) . '
    </div>
    
    <h2>Datos del Cliente</h2>
    <div class="info">
        <strong>Nombre:</strong> ' . htmlspecialchars($order['first_name'] . ' ' . $order['last_name']) . '<br>
        <strong>Email:</strong> ' . htmlspecialchars($order['email']) . '<br>
        <strong>Teléfono:</strong> ' . htmlspecialchars($order['phone']) . '<br>
        <strong>Dirección:</strong> ' . htmlspecialchars($order['address']) . '
    </div>
    
    <h2>Productos</h2>
    <table>
        <thead>
            <tr>
                <th>Producto</th>
                <th>SKU</th>
                <th>Precio</th>
                <th>Cant.</th>
                <th>Subtotal</th>
            </tr>
        </thead>
        <tbody>';
    
    foreach ($items as $item) {
        $html .= '
            <tr>
                <td>' . htmlspecialchars($item['product_name']) . '</td>
                <td>' . htmlspecialchars($item['product_sku']) . '</td>
                <td>$' . number_format($item['price'], 2) . '</td>
                <td>' . $item['quantity'] . '</td>
                <td>$' . number_format($item['subtotal'], 2) . '</td>
            </tr>';
    }
    
    $html .= '
        </tbody>
    </table>
    
    <div style="margin-top: 20px; text-align: right;">
        <p><strong>Subtotal:</strong> $' . number_format($order['subtotal'], 2) . '</p>
        <p><strong>Envío:</strong> ' . ($order['shipping_cost'] > 0 ? '$' . number_format($order['shipping_cost'], 2) : 'GRATIS') . '</p>
        <p class="total">TOTAL: $' . number_format($order['total'], 2) . '</p>
    </div>
    
    <div style="margin-top: 30px; padding: 15px; background-color: #f0f0f0; border-left: 4px solid #8C004B;">
        <h3 style="margin-top: 0;">Método de Pago</h3>
        <p>' . htmlspecialchars($order['payment_method']) . '</p>
    </div>
    
    <div style="margin-top: 30px; text-align: center; font-size: 10px; color: #666;">
        <p>Mawewe - Jorge Añazco y 12 de Febrero, Lago Agrio, Ecuador</p>
        <p>WhatsApp: +593 98 183 2313 | Email: info@mawewe.com.ec</p>
        <p>¡Gracias por tu compra!</p>
    </div>';
    
    $pdf->writeHTML($html, true, false, true, false, '');
    
    // Output PDF
    $pdf->Output('Orden-' . $orderNumber . '.pdf', 'I');
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error generando PDF',
        'error' => $e->getMessage()
    ]);
}
?>