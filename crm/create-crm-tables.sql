-- ========================================
-- SCRIPT DE CREACIÓN DE TABLAS - MAWEWE CRM
-- ========================================

-- Tabla de empleados
CREATE TABLE IF NOT EXISTS employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    cedula VARCHAR(10) UNIQUE NOT NULL,
    cargo VARCHAR(100) NOT NULL,
    sucursal VARCHAR(100) DEFAULT 'JOYERÍA MATRIZ',
    is_admin TINYINT(1) DEFAULT 0,
    active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_cedula (cedula),
    INDEX idx_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de asistencia
CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    date DATE NOT NULL,
    check_in DATETIME NOT NULL,
    check_out DATETIME NULL,
    hours_worked DECIMAL(5,2) DEFAULT 0.00,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    INDEX idx_employee_date (employee_id, date),
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- INSERTAR EMPLEADOS INICIALES
-- ========================================

-- Insertar administrador
INSERT INTO employees (nombre, cedula, cargo, sucursal, is_admin, active) VALUES
('VARGAS CASTILLO MANUEL', '2100064753', 'ADMINISTRADOR', 'JOYERÍA MATRIZ', 1, 1);

-- Insertar empleados
INSERT INTO employees (nombre, cedula, cargo, sucursal, is_admin, active) VALUES
('BRAVO CAIZA VALERIA ESTEFANIA', '2100603790', 'VENDEDOR', 'JOYERÍA MATRIZ', 0, 1),
('CUELLO VARGAS JORGE STEVEN', '2100996897', 'VENDEDOR', 'JOYERÍA MATRIZ', 0, 1),
('LOPEZ MENDOZA SERGIO DAMIAN', '2101050959', 'VENDEDOR', 'JOYERÍA MATRIZ', 0, 1),
('PEÑARRETA ARELLANO JHERLY VANESSA', '1950105864', 'VENDEDOR', 'JOYERÍA MATRIZ', 0, 1),
('VARGAS MOTOCHE CARLOS RENE', '2100037981', 'VENDEDOR', 'JOYERÍA MATRIZ', 0, 1),
('VARGAS MOTOCHE MARFA MODESTA', '0701908402', 'VENDEDOR', 'JOYERÍA MATRIZ', 0, 1);

-- ========================================
-- VERIFICAR ESTRUCTURA
-- ========================================

-- Ver empleados
SELECT * FROM employees ORDER BY is_admin DESC, nombre;

-- Ver estructura de tablas
DESCRIBE employees;
DESCRIBE attendance;
