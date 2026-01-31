// config.js - Configuración del sistema

// Detectar entorno
const isDevelopment = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname === '';

// URLs de API según entorno
const API_CONFIG = {
    development: {
        baseURL: 'http://localhost:3000',
        apiURL: 'https://mawewe.com.ec/api', // En desarrollo local, apunta a producción
        timeout: 30000
    },
    production: {
        baseURL: 'https://mawewe.com.ec',
        apiURL: 'https://mawewe.com.ec/api',
        timeout: 10000
    }
};

// Configuración activa
const config = isDevelopment ? API_CONFIG.development : API_CONFIG.production;

// Exportar API_URL global
const API_URL = config.apiURL;

// Log de configuración (solo en desarrollo)
if (isDevelopment) {
    console.log('%c🔧 Configuración de Desarrollo', 'color: #8C004B; font-size: 16px; font-weight: bold;');
    console.log('Base URL:', config.baseURL);
    console.log('API URL:', config.apiURL);
    console.log('Timeout:', config.timeout, 'ms');
    console.log('\n💡 NOTA: En desarrollo local, la API apunta a producción.');
    console.log('Para usar API local, instala XAMPP/MAMP y cambia apiURL.');
}

// Función helper para hacer requests
async function apiRequest(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    
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

// Función para verificar conexión con API
async function checkAPIConnection() {
    try {
        const response = await fetch(`${API_URL}/employees.php?action=list`);
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

// Verificar conexión al cargar
if (isDevelopment) {
    checkAPIConnection();
}
