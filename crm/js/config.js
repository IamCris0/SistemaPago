/**
 * Configuración Global - Mawewe CRM v3.0
 * Sistema profesional con auditoría y permisos
 */

const CONFIG = {
    // API URLs
    API_URL: 'https://mawewe.com.ec/api',
    VERSION: '3.0.0',
    
    // Endpoints
    ENDPOINTS: {
        AUTH: '/auth.php',
        AUDIT: '/audit.php',
        EMPLOYEES: '/employees-v3.php',
        PRODUCTS: '/products.php',
        ORDERS: '/save-order.php',
        ATTENDANCE: '/attendance.php',
        REPORTS: '/reports.php'
    },
    
    // Configuración de la aplicación
    APP: {
        NAME: 'Mawewe CRM',
        COMPANY: 'Joyería Mawewe',
        LOGO: '🏪'
    },
    
    // Configuración de sesión
    STORAGE_KEYS: {
        USER: 'mawewe_user_v3',
        TOKEN: 'mawewe_token_v3',
        PERMISSIONS: 'mawewe_permissions_v3'
    },
    
    // Configuración de UI
    UI: {
        TOAST_DURATION: 5000,
        ANIMATION_DURATION: 300,
        DEBOUNCE_DELAY: 500
    }
};

/**
 * Clase para manejar peticiones a la API
 */
class APIClient {
    constructor() {
        this.baseURL = CONFIG.API_URL;
        this.token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
    }
    
    getToken() {
        return localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
    }
    
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        return headers;
    }
    
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const config = {
            ...options,
            headers: {
                ...this.getHeaders(),
                ...options.headers
            }
        };
        
        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Error en la petición');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
    
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url, { method: 'GET' });
    }
    
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
    
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}

/**
 * Gestión de autenticación
 */
class AuthManager {
    static saveUser(userData) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(userData.employee));
        localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, userData.token);
        localStorage.setItem(CONFIG.STORAGE_KEYS.PERMISSIONS, JSON.stringify(userData.permissions));
    }
    
    static getUser() {
        const userData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
        return userData ? JSON.parse(userData) : null;
    }
    
    static getToken() {
        return localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
    }
    
    static getPermissions() {
        const perms = localStorage.getItem(CONFIG.STORAGE_KEYS.PERMISSIONS);
        return perms ? JSON.parse(perms) : {};
    }
    
    static hasPermission(permission) {
        const permissions = this.getPermissions();
        return permissions[permission] === true;
    }
    
    static isAdmin() {
        const user = this.getUser();
        return user ? user.is_admin : false;
    }
    
    static logout() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.PERMISSIONS);
        window.location.href = '/crm/index.html';
    }
    
    static checkAuth() {
        const user = this.getUser();
        const token = this.getToken();
        
        if (!user || !token) {
            window.location.href = '/crm/index.html';
            return false;
        }
        
        return true;
    }
}

/**
 * Sistema de notificaciones toast
 */
class Toast {
    static show(message, type = 'success') {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-icon">${icons[type]}</div>
            <div class="toast-message">${message}</div>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), CONFIG.UI.ANIMATION_DURATION);
        }, CONFIG.UI.TOAST_DURATION);
    }
    
    static success(message) {
        this.show(message, 'success');
    }
    
    static error(message) {
        this.show(message, 'error');
    }
    
    static warning(message) {
        this.show(message, 'warning');
    }
    
    static info(message) {
        this.show(message, 'info');
    }
}

/**
 * Utilidades
 */
const Utils = {
    formatDate(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            ...options
        };
        return new Date(date).toLocaleDateString('es-EC', defaultOptions);
    },
    
    formatTime(date) {
        return new Date(date).toLocaleTimeString('es-EC', {
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    formatDateTime(date) {
        return `${this.formatDate(date)} ${this.formatTime(date)}`;
    },
    
    formatCurrency(amount) {
        return new Intl.NumberFormat('es-EC', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    },
    
    debounce(func, delay = CONFIG.UI.DEBOUNCE_DELAY) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    },
    
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    },
    
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            Toast.success('Copiado al portapapeles');
        }).catch(() => {
            Toast.error('Error al copiar');
        });
    }
};

/**
 * Gestión de modales
 */
class Modal {
    constructor(id) {
        this.id = id;
        this.modal = document.getElementById(id);
        this.setupEvents();
    }
    
    setupEvents() {
        if (!this.modal) return;
        
        // Cerrar al hacer clic en overlay
        const overlay = this.modal.querySelector('.modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => this.close());
        }
        
        // Cerrar con botón X
        const closeBtn = this.modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
        
        // Cerrar con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen()) {
                this.close();
            }
        });
    }
    
    open() {
        if (this.modal) {
            this.modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
    
    close() {
        if (this.modal) {
            this.modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
    
    isOpen() {
        return this.modal && this.modal.classList.contains('active');
    }
}

/**
 * Loader global
 */
const Loader = {
    show() {
        let loader = document.getElementById('globalLoader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'globalLoader';
            loader.className = 'global-loader';
            loader.innerHTML = `
                <div class="loader-spinner"></div>
                <p>Cargando...</p>
            `;
            document.body.appendChild(loader);
        }
        loader.classList.add('active');
    },
    
    hide() {
        const loader = document.getElementById('globalLoader');
        if (loader) {
            loader.classList.remove('active');
        }
    }
};

// Instancia global del cliente API
const api = new APIClient();

// Verificar API al cargar
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch(`${CONFIG.API_URL}/employees.php?action=list`);
        const data = await response.json();
        
        if (data.success) {
            console.log('%c✅ API Conectada - Mawewe CRM v3.0', 'color: green; font-weight: bold; font-size: 14px;');
            console.log(`%c📊 Sistema: ${CONFIG.APP.NAME}`, 'color: #8C004B; font-weight: bold;');
            console.log(`%c🔧 Versión: ${CONFIG.VERSION}`, 'color: #666;');
        }
    } catch (error) {
        console.error('%c❌ Error de conexión con API', 'color: red; font-weight: bold;');
    }
});