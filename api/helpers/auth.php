<?php
/**
 * Helper de Autenticación
 * Funciones para verificar permisos y tokens
 */

/**
 * Verificar autenticación y retornar usuario actual
 */
function verifyAuth($db) {
    // Obtener token del header Authorization
    $headers = getallheaders();
    $token = null;
    
    if (isset($headers['Authorization'])) {
        $auth = $headers['Authorization'];
        if (preg_match('/Bearer\s+(.*)$/i', $auth, $matches)) {
            $token = $matches[1];
        }
    }
    
    // También verificar en POST/GET
    if (!$token) {
        $input = json_decode(file_get_contents('php://input'), true);
        $token = $input['token'] ?? $_GET['token'] ?? null;
    }
    
    if (!$token) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Token de autenticación requerido'
        ]);
        exit();
    }
    
    // Decodificar token (en producción usar JWT)
    $decoded = base64_decode($token);
    $parts = explode(':', $decoded);
    
    if (count($parts) < 2) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Token inválido'
        ]);
        exit();
    }
    
    $userId = (int)$parts[0];
    
    // Verificar que el usuario existe y está activo
    $sql = "SELECT * FROM employees WHERE id = :id AND active = 1";
    $stmt = $db->prepare($sql);
    $stmt->execute([':id' => $userId]);
    $user = $stmt->fetch();
    
    if (!$user) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Sesión inválida o expirada'
        ]);
        exit();
    }
    
    return [
        'id' => (int)$user['id'],
        'nombre' => $user['nombre'],
        'cedula' => $user['cedula'],
        'cargo' => $user['cargo'],
        'is_admin' => (bool)$user['is_admin']
    ];
}

/**
 * Verificar si el usuario tiene permiso de administrador
 */
function requireAdmin($db) {
    $user = verifyAuth($db);
    
    if (!$user['is_admin']) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Acceso denegado. Se requieren permisos de administrador.'
        ]);
        exit();
    }
    
    return $user;
}
?>
