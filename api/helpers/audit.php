<?php
/**
 * Helper de Auditoría
 * Funciones para registrar acciones en el sistema
 */

/**
 * Registrar acción en el log de auditoría
 */
function logAudit($db, $data) {
    try {
        $sql = "INSERT INTO audit_log (
                    user_id, action, entity_type, entity_id,
                    old_value, new_value, description, ip_address
                ) VALUES (
                    :user_id, :action, :entity_type, :entity_id,
                    :old_value, :new_value, :description, :ip
                )";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':user_id' => $data['user_id'] ?? null,
            ':action' => $data['action'],
            ':entity_type' => $data['entity_type'],
            ':entity_id' => $data['entity_id'] ?? null,
            ':old_value' => isset($data['old_value']) ? json_encode($data['old_value'], JSON_UNESCAPED_UNICODE) : null,
            ':new_value' => isset($data['new_value']) ? json_encode($data['new_value'], JSON_UNESCAPED_UNICODE) : null,
            ':description' => $data['description'] ?? '',
            ':ip' => $_SERVER['REMOTE_ADDR'] ?? 'Unknown'
        ]);
        
        return (int)$db->lastInsertId();
    } catch (Exception $e) {
        error_log("Error logging audit: " . $e->getMessage());
        return false;
    }
}

/**
 * Comparar dos arrays y retornar solo los campos que cambiaron
 */
function getChangedFields($oldData, $newData) {
    $changes = [];
    
    foreach ($newData as $key => $value) {
        if (!isset($oldData[$key]) || $oldData[$key] != $value) {
            $changes[$key] = [
                'old' => $oldData[$key] ?? null,
                'new' => $value
            ];
        }
    }
    
    return $changes;
}
?>
