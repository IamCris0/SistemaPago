/**
 * CONFIGURACIÓN GLOBAL DEL SISTEMA
 * MAWEWE/ELPALACIO CRM v4.0
 */

const CONFIG = {
    // URL base de la API
    API_URL: 'https://mawewe.com.ec/api',
    
    // Versión del sistema
    VERSION: '4.0.0',
    
    // Nombre del sistema
    APP_NAME: 'Sistema Seguimiento MAWEWE/ELPALACIO',
    
    // Configuración de localStorage
    STORAGE_KEYS: {
        USER: 'mawewe_user_v3',
        TOKEN: 'mawewe_token_v3',
        PERMISSIONS: 'mawewe_permissions_v3'
    },
    
    // Tiempos de refresco (en milisegundos)
    REFRESH_INTERVALS: {
        DASHBOARD: 5 * 60 * 1000,  // 5 minutos
        ATTENDANCE: 2 * 60 * 1000,  // 2 minutos
        NOTIFICATIONS: 1 * 60 * 1000 // 1 minuto
    },
    
    // Configuración de paginación
    PAGINATION: {
        DEFAULT_LIMIT: 50,
        MAX_LIMIT: 100
    },
    
    // Configuración de toast notifications
    TOAST: {
        DURATION: 5000, // 5 segundos
        POSITION: 'top-right'
    },
    
    // Endpoints de la API
    ENDPOINTS: {
        AUTH: {
            LOGIN: '/auth.php?action=login',
            VERIFY: '/auth.php?action=verify',
            LOGOUT: '/auth.php?action=logout'
        },
        EMPLOYEES: {
            LIST: '/employees.php?action=list',
            GET: '/employees.php?action=get',
            CREATE: '/employees.php?action=create',
            UPDATE: '/employees.php?action=update',
            DELETE: '/employees.php?action=delete',
            TOGGLE_STATUS: '/employees.php?action=toggle-status'
        },
        ATTENDANCE: {
            TODAY: '/attendance.php?action=today',
            HISTORY: '/attendance.php?action=history',
            CHECK_IN: '/attendance.php?action=check-in',
            CHECK_OUT: '/attendance.php?action=check-out',
            STATS: '/attendance.php?action=stats'
        },
        PRODUCTS: {
            LIST: '/products.php',
            GET: '/products.php?id='
        },
        ORDERS: {
            LIST: '/orders.php',
            GET: '/orders.php?id='
        },
        REPORTS: {
            DASHBOARD: '/reports.php?action=dashboard',
            SALES: '/reports.php?action=sales',
            PRODUCTS: '/reports.php?action=products',
            EMPLOYEES: '/reports.php?action=employees'
        },
        AUDIT: {
            LIST: '/audit.php?action=list',
            LOG: '/audit.php?action=log',
            STATS: '/audit.php?action=stats',
            ENTITY_HISTORY: '/audit.php?action=entity-history'
        }
    }
};

// Función helper para construir URLs completas
CONFIG.getUrl = function(endpoint) {
    return this.API_URL + endpoint;
};

// Función helper para obtener el token
CONFIG.getToken = function() {
    return localStorage.getItem(this.STORAGE_KEYS.TOKEN);
};

// Función helper para obtener el usuario
CONFIG.getUser = function() {
    const userData = localStorage.getItem(this.STORAGE_KEYS.USER);
    return userData ? JSON.parse(userData) : null;
};

// Función helper para verificar autenticación
CONFIG.isAuthenticated = function() {
    return !!this.getToken() && !!this.getUser();
};

// Exportar configuración
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

console.log('✅ Configuración cargada:', CONFIG.APP_NAME, 'v' + CONFIG.VERSION);
