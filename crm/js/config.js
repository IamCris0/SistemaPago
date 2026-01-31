/**
 * Configuración Global - Mawewe CRM
 * Conexión con API en producción
 */

const CONFIG = {
    // API URLs
    API_URL: 'https://mawewe.com.ec/api',
    
    // Endpoints
    ENDPOINTS: {
        EMPLOYEES: '/employees.php',
        ATTENDANCE: '/attendance.php',
        REPORTS: '/reports.php',
        PRODUCTS: '/products.php'
    },
    
    // Configuración de la aplicación
    APP: {
        NAME: 'Mawewe CRM',
        VERSION: '2.0.0',
        COMPANY: 'Joyería Mawewe'
    },
    
    // Configuración de sesión
    SESSION: {
        EMPLOYEE_KEY: 'mawewe_employee',
        TOKEN_KEY: 'mawewe_token'
    }
};

/**
 * Helper para hacer peticiones a la API
 */
async function apiRequest(endpoint, options = {}) {
    const url = `${CONFIG.API_URL}${endpoint}`;
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
        ...options
    };

    try {
        const response = await fetch(url, defaultOptions);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error en API:', error);
        throw error;
    }
}

/**
 * Verificar estado de la API
 */
async function checkAPIStatus() {
    try {
        const response = await fetch(`${CONFIG.API_URL}/employees.php?action=list`);
        const data = await response.json();
        
        if (data.success) {
            console.log('%c✅ API Conectada', 'color: green; font-weight: bold;');
            console.log('Empleados encontrados:', data.total);
            return true;
        }
        return false;
    } catch (error) {
        console.error('%c❌ Error de conexión con API', 'color: red; font-weight: bold;');
        console.error(error);
        return false;
    }
}

// Verificar API al cargar
document.addEventListener('DOMContentLoaded', () => {
    checkAPIStatus();
});
