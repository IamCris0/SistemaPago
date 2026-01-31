/**
 * APP.JS - Sistema Principal CRM MAWEWE
 * Manejo de autenticación, permisos y enrutamiento
 */

// ========================================
// ESTADO GLOBAL DE LA APLICACIÓN
// ========================================
const App = {
    currentUser: null,
    permissions: null,
    currentModule: null,
    
    // Inicializar aplicación
    async init() {
        console.log('🚀 Iniciando App CRM MAWEWE v4.0');
        
        // Verificar autenticación
        if (!this.checkAuth()) {
            window.location.href = 'index.html';
            return;
        }
        
        // Cargar usuario y permisos
        this.loadUserData();
        
        // Configurar interfaz según permisos
        this.setupUI();
        
        // Cargar módulo inicial
        await this.loadModule('dashboard');
        
        // Configurar event listeners
        this.setupEventListeners();
        
        console.log('✅ App iniciada correctamente');
    },
    
    // Verificar autenticación
    checkAuth() {
        const token = CONFIG.getToken();
        const user = CONFIG.getUser();
        
        if (!token || !user) {
            return false;
        }
        
        this.currentUser = user;
        return true;
    },
    
    // Cargar datos del usuario
    loadUserData() {
        try {
            const permissionsData = localStorage.getItem(CONFIG.STORAGE_KEYS.PERMISSIONS);
            this.permissions = permissionsData ? JSON.parse(permissionsData) : {};
            
            // Actualizar UI con info del usuario
            document.getElementById('userName').textContent = this.currentUser.nombre;
            document.getElementById('userRole').textContent = this.currentUser.cargo;
            
            // Mostrar badge de admin si aplica
            if (this.currentUser.is_admin) {
                const userRole = document.getElementById('userRole');
                userRole.innerHTML = `${this.currentUser.cargo} <span style="background: gold; color: #000; padding: 2px 8px; border-radius: 4px; font-size: 10px; margin-left: 4px;">ADMIN</span>`;
            }
        } catch (error) {
            console.error('Error cargando datos del usuario:', error);
        }
    },
    
    // Configurar UI según permisos
    setupUI() {
        const isAdmin = this.currentUser.is_admin;
        
        // Ocultar opciones solo para admin
        if (!isAdmin) {
            // Ocultar gestión de empleados
            const employeesNav = document.querySelector('[href="#employees"]');
            if (employeesNav) {
                employeesNav.parentElement.style.display = 'none';
            }
            
            // Ocultar configuración
            const settingsNav = document.querySelector('[href="#settings"]');
            if (settingsNav) {
                settingsNav.parentElement.style.display = 'none';
            }
        }
        
        // Actualizar logo
        this.updateLogo();
    },
    
    // Actualizar logo
    updateLogo() {
        const logoIcon = document.querySelector('.sidebar-logo-icon');
        if (logoIcon) {
            // Reemplazar emoji con imagen
            logoIcon.innerHTML = '<img src="img/logo.png" alt="MAWEWE Logo" style="width: 100%; height: 100%; object-fit: contain;">';
        }
        
        // También actualizar topbar si existe
        const topbarLogo = document.querySelector('.topbar-logo');
        if (topbarLogo) {
            topbarLogo.innerHTML = '<img src="img/logo.png" alt="MAWEWE" style="height: 32px;">';
        }
    },
    
    // Cargar módulo dinámicamente
    async loadModule(moduleName) {
        try {
            showLoading();
            
            // Verificar permisos
            if (!this.hasPermission(moduleName)) {
                showToast('Acceso Denegado', 'No tienes permisos para acceder a este módulo', 'error');
                return;
            }
            
            // Ocultar todos los módulos
            document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
            
            // Mostrar módulo seleccionado
            const module = document.getElementById(`module-${moduleName}`);
            if (module) {
                module.classList.add('active');
            }
            
            // Actualizar navegación
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            const navItem = document.querySelector(`[onclick*="${moduleName}"]`);
            if (navItem) {
                navItem.classList.add('active');
            }
            
            // Actualizar título
            this.updatePageTitle(moduleName);
            
            // Cargar datos del módulo
            await this.loadModuleData(moduleName);
            
            this.currentModule = moduleName;
            
        } catch (error) {
            console.error('Error cargando módulo:', error);
            showToast('Error', 'No se pudo cargar el módulo', 'error');
        } finally {
            hideLoading();
        }
    },
    
    // Verificar permisos
    hasPermission(module) {
        // Admin tiene acceso a todo
        if (this.currentUser.is_admin) {
            return true;
        }
        
        // Módulos restringidos solo para admin
        const adminOnly = ['employees', 'settings'];
        if (adminOnly.includes(module)) {
            return false;
        }
        
        // Por defecto, permitir acceso
        return true;
    },
    
    // Actualizar título de página
    updatePageTitle(moduleName) {
        const titles = {
            'dashboard': { title: 'Dashboard', breadcrumb: 'Inicio', icon: '📊' },
            'employees': { title: 'Empleados', breadcrumb: 'Gestión > Empleados', icon: '👥' },
            'products': { title: 'Productos', breadcrumb: 'Gestión > Productos', icon: '🛍️' },
            'orders': { title: 'Órdenes', breadcrumb: 'Gestión > Órdenes', icon: '📦' },
            'attendance': { title: 'Asistencia', breadcrumb: 'Gestión > Asistencia', icon: '📅' },
            'reports': { title: 'Reportes', breadcrumb: 'Reportes > Dashboard', icon: '📈' },
            'audit': { title: 'Auditoría', breadcrumb: 'Sistema > Auditoría', icon: '📝' },
            'settings': { title: 'Configuración', breadcrumb: 'Sistema > Configuración', icon: '⚙️' }
        };
        
        const info = titles[moduleName] || { title: 'Sistema', breadcrumb: 'Inicio', icon: '🏪' };
        
        document.getElementById('pageTitle').textContent = info.title;
        document.getElementById('breadcrumb').textContent = info.breadcrumb;
        document.title = `${info.title} - Sistema MAWEWE`;
    },
    
    // Cargar datos del módulo
    async loadModuleData(moduleName) {
        switch (moduleName) {
            case 'dashboard':
                await Modules.Dashboard.load();
                break;
            case 'employees':
                await Modules.Employees.load();
                break;
            case 'products':
                await Modules.Products.load();
                break;
            case 'orders':
                await Modules.Orders.load();
                break;
            case 'attendance':
                await Modules.Attendance.load();
                break;
            case 'reports':
                await Modules.Reports.load();
                break;
            case 'audit':
                await Modules.Audit.load();
                break;
            default:
                console.log(`Módulo ${moduleName} no implementado`);
        }
    },
    
    // Configurar event listeners
    setupEventListeners() {
        // Búsqueda global
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.performGlobalSearch(e.target.value);
                }, 500);
            });
        }
        
        // Cerrar sesión
        window.logout = () => this.logout();
        
        // Toggle sidebar
        window.toggleSidebar = () => this.toggleSidebar();
        
        // Mostrar módulos
        window.showModule = (name) => this.loadModule(name);
    },
    
    // Búsqueda global
    performGlobalSearch(query) {
        if (!query || query.length < 2) return;
        
        console.log('Buscando:', query);
        // Implementar búsqueda según el módulo actual
        // ...
    },
    
    // Toggle sidebar
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('mainContent');
        
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('expanded');
    },
    
    // Cerrar sesión
    async logout() {
        if (!confirm('¿Está seguro de cerrar sesión?')) return;
        
        try {
            // Registrar logout en auditoría
            await fetch(`${CONFIG.API_URL}/audit.php?action=log`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.getToken()}`
                },
                body: JSON.stringify({
                    user_id: this.currentUser.id,
                    action: 'LOGOUT',
                    entity_type: 'SESSION',
                    description: 'Cierre de sesión'
                })
            });
        } catch (error) {
            console.error('Error registrando logout:', error);
        }
        
        // Limpiar storage
        localStorage.clear();
        
        // Redirigir
        window.location.href = 'index.html';
    }
};

// ========================================
// CONTENEDOR DE MÓDULOS
// ========================================
const Modules = {
    Dashboard: {},
    Employees: {},
    Products: {},
    Orders: {},
    Attendance: {},
    Reports: {},
    Audit: {}
};

// ========================================
// UTILIDADES GLOBALES
// ========================================
function showLoading() {
    let overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = '<div class="loading-spinner"></div>';
        document.body.appendChild(overlay);
    }
    overlay.classList.add('active');
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

function showToast(title, message, type = 'info') {
    const container = document.getElementById('toastContainer') || (() => {
        const c = document.createElement('div');
        c.id = 'toastContainer';
        c.className = 'toast-container';
        c.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10000;';
        document.body.appendChild(c);
        return c;
    })();
    
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.style.cssText = `
        min-width: 320px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        padding: 16px 20px;
        margin-bottom: 12px;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        animation: slideInRight 0.3s ease;
    `;
    
    toast.innerHTML = `
        <div style="width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; ${getToastIconStyle(type)}">
            ${icons[type]}
        </div>
        <div style="flex: 1;">
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px; color: #111827;">${title}</div>
            <div style="font-size: 13px; color: #6B7280;">${message}</div>
        </div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

function getToastIconStyle(type) {
    const styles = {
        success: 'background: #D1FAE5; color: #10B981;',
        error: 'background: #FEE2E2; color: #EF4444;',
        warning: 'background: #FEF3C7; color: #F59E0B;',
        info: 'background: #DBEAFE; color: #3B82F6;'
    };
    return styles[type] || styles.info;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-EC', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function formatDateTime(dateString) {
    return new Date(dateString).toLocaleString('es-EC', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatTime(dateString) {
    return new Date(dateString).toLocaleTimeString('es-EC', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ========================================
// INICIALIZAR AL CARGAR
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

console.log('✅ app.js cargado');
