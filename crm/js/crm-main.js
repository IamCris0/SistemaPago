/**
 * SISTEMA SEGUIMIENTO MAWEWE/ELPALACIO - CRM v4.0
 * Con cierre automático de sesión al cerrar pestaña
 */

// ========================================
// ESTADO GLOBAL
// ========================================
const CRMState = {
    currentUser: null,
    currentModule: 'dashboard',
    sidebarOpen: true,
    moduleInitialized: {},
    data: {
        employees: [],
        products: [],
        orders: [],
        attendance: [],
        audit: []
    },
    stats: {
        salesToday: 0,
        ordersMonth: 0,
        employeesPresent: 0,
        lowStock: 0
    }
};

// ========================================
// CONTENEDOR DE MÓDULOS
// ========================================
const Modules = {
    Employees: {},
    Products: {},
    Orders: {},
    Dashboard: {},
    Attendance: {},
    Audit: {}
};

// ========================================
// CIERRE DE SESIÓN AL CERRAR PESTAÑA
// ========================================
let sessionWarningShown = false;

// Detectar intento de cerrar pestaña
window.addEventListener('beforeunload', (e) => {
    if (!sessionWarningShown) {
        // Mostrar mensaje de confirmación
        const confirmationMessage = '⚠️ ¿Cerrar pestaña? Tu sesión se cerrará automáticamente.';
        e.preventDefault();
        e.returnValue = confirmationMessage;
        
        sessionWarningShown = true;
        
        return confirmationMessage;
    }
});

// Limpiar sesión al cerrar definitivamente
window.addEventListener('unload', () => {
    // Registrar cierre en auditoría (sin esperar respuesta)
    if (CRMState.currentUser) {
        navigator.sendBeacon(
            `${CONFIG.API_URL}/audit.php?action=log`,
            JSON.stringify({
                user_id: CRMState.currentUser.id,
                action: 'LOGOUT',
                entity_type: 'SESSION',
                description: 'Cierre de sesión por cierre de pestaña'
            })
        );
    }
    
    // Limpiar localStorage
    localStorage.clear();
});

// ========================================
// SISTEMA DE ROUTING INTERNO
// ========================================
const Router = {
    routes: {},
    
    register(moduleName, initFunction) {
        this.routes[moduleName] = initFunction;
        console.log(`✅ Ruta registrada: ${moduleName}`);
    },
    
    async navigate(moduleName) {
        console.log(`🧭 Navegando a: ${moduleName}`);
        
        // Resetear advertencia de cierre
        sessionWarningShown = false;
        
        // Ocultar todos los módulos
        document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
        
        // Mostrar módulo seleccionado
        const targetModule = document.getElementById(`module-${moduleName}`);
        if (targetModule) {
            targetModule.classList.add('active');
        }
        
        // Actualizar navegación activa
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        const activeNavItem = document.querySelector(`[onclick*="${moduleName}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }
        
        // Actualizar título y breadcrumb
        updatePageTitle(moduleName);
        
        // Inicializar módulo si es la primera vez
        if (!CRMState.moduleInitialized[moduleName]) {
            await this.initializeModule(moduleName);
            CRMState.moduleInitialized[moduleName] = true;
        } else {
            await this.loadModuleData(moduleName);
        }
        
        // Actualizar estado y URL
        CRMState.currentModule = moduleName;
        window.location.hash = moduleName;
        
        // Cerrar sidebar en móvil
        if (window.innerWidth < 1024) {
            toggleSidebar();
        }
    },
    
    async initializeModule(moduleName) {
        console.log(`🚀 Inicializando módulo: ${moduleName}`);
        
        try {
            showLoading();
            
            if (this.routes[moduleName]) {
                await this.routes[moduleName]();
            } else {
                await this.loadModuleData(moduleName);
            }
        } catch (error) {
            console.error(`Error inicializando ${moduleName}:`, error);
            showToast('Error', `No se pudo cargar ${moduleName}`, 'error');
        } finally {
            hideLoading();
        }
    },
    
    async loadModuleData(moduleName) {
        try {
            switch (moduleName) {
                case 'dashboard':
                    await loadDashboardData();
                    break;
                case 'employees':
                    if (typeof EmployeeModule !== 'undefined' && EmployeeModule.init) {
                        await EmployeeModule.init();
                    }
                    break;
                case 'attendance':
                    await loadAttendanceData();
                    break;
                case 'products':
                    // Usar el nuevo ProductsModule
                    if (typeof ProductsModule !== 'undefined' && ProductsModule.init) {
                        await ProductsModule.init();
                    }
                    break;
                case 'orders':
                    await loadOrdersData();
                    break;
                case 'audit':
                    await loadAuditData();
                    break;
                default:
                    console.log(`Módulo ${moduleName} no tiene carga de datos específica`);
            }
        } catch (error) {
            console.error(`Error cargando datos de ${moduleName}:`, error);
        }
    }
};

// ========================================
// FUNCIONES GLOBALES
// ========================================
function showToast(title, message, type = 'info') {
    console.log(`[${type}] ${title}: ${message}`);
    
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    const colors = {
        success: '#10B981',
        error: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6'
    };
    
    const toast = document.createElement('div');
    toast.style.cssText = `
        background: white;
        border-left: 4px solid ${colors[type]};
        padding: 16px 20px;
        margin-bottom: 12px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 12px;
        animation: slideIn 0.3s ease;
        min-width: 300px;
    `;
    
    toast.innerHTML = `
        <span style="font-size: 24px;">${icons[type]}</span>
        <div style="flex: 1;">
            <div style="font-weight: 600; margin-bottom: 4px;">${title}</div>
            <div style="font-size: 14px; color: #666;">${message}</div>
        </div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

function showLoading() {
    let overlay = document.getElementById('loadingOverlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
        `;
        
        overlay.innerHTML = `
            <div style="background: white; padding: 2rem; border-radius: 12px; text-align: center;">
                <div style="width: 50px; height: 50px; border: 4px solid #E5E7EB; border-top-color: #3B82F6; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
                <div style="color: #374151; font-weight: 600;">Cargando...</div>
            </div>
        `;
        
        document.body.appendChild(overlay);
    }
    
    overlay.style.display = 'flex';
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// ========================================
// INICIALIZACIÓN
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Iniciando Sistema Seguimiento MAWEWE/ELPALACIO v4.0');
    
    // Verificar autenticación
    if (!checkAuth()) {
        window.location.href = 'index.html';
        return;
    }
    
    // Cargar información del usuario
    loadUserInfo();
    
    // Registrar rutas de módulos
    Router.register('employees', async () => {
        if (typeof EmployeeModule !== 'undefined' && EmployeeModule.init) {
            await EmployeeModule.init();
        }
    });
    
    Router.register('products', async () => {
        if (typeof ProductsModule !== 'undefined' && ProductsModule.init) {
            await ProductsModule.init();
        }
    });
    
    // Verificar hash en URL
    const hash = window.location.hash.substring(1);
    if (hash && document.getElementById(`module-${hash}`)) {
        await Router.navigate(hash);
    } else {
        await Router.navigate('dashboard');
    }
    
    // Configurar búsqueda global
    setupGlobalSearch();
    
    // Configurar auto-refresh
    startAutoRefresh();
    
    console.log('✅ Sistema iniciado correctamente');
});

// ========================================
// FUNCIÓN showModule
// ========================================
async function showModule(moduleName) {
    await Router.navigate(moduleName);
}

// ========================================
// AUTENTICACIÓN
// ========================================
function checkAuth() {
    const userData = localStorage.getItem('mawewe_user_v3');
    const token = localStorage.getItem('mawewe_token_v3');
    
    if (!userData || !token) {
        return false;
    }
    
    try {
        CRMState.currentUser = JSON.parse(userData);
        return true;
    } catch (e) {
        console.error('Error parsing user data:', e);
        return false;
    }
}

function loadUserInfo() {
    if (!CRMState.currentUser) return;
    
    document.getElementById('userName').textContent = CRMState.currentUser.nombre;
    document.getElementById('userRole').textContent = CRMState.currentUser.cargo;
}

function logout() {
    if (confirm('¿Está seguro de cerrar sesión?')) {
        // Registrar logout en auditoría
        logAuditAction('LOGOUT', 'SESSION', null, 'Cierre de sesión manual');
        
        // Limpiar storage
        localStorage.clear();
        
        // Redirigir
        window.location.href = 'index.html';
    }
}

// ========================================
// NAVEGACIÓN
// ========================================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    
    CRMState.sidebarOpen = !CRMState.sidebarOpen;
    
    if (CRMState.sidebarOpen) {
        sidebar.classList.remove('collapsed');
        mainContent.classList.remove('expanded');
    } else {
        sidebar.classList.add('collapsed');
        mainContent.classList.add('expanded');
    }
}

function updatePageTitle(moduleName) {
    const titles = {
        'dashboard': { title: 'Dashboard', breadcrumb: 'Inicio' },
        'analytics': { title: 'Análisis', breadcrumb: 'Análisis > Dashboard' },
        'employees': { title: 'Empleados', breadcrumb: 'Gestión > Empleados' },
        'attendance': { title: 'Asistencia', breadcrumb: 'Gestión > Asistencia' },
        'products': { title: 'Productos', breadcrumb: 'Gestión > Productos' },
        'orders': { title: 'Órdenes', breadcrumb: 'Gestión > Órdenes' },
        'reports-sales': { title: 'Reportes de Ventas', breadcrumb: 'Reportes > Ventas' },
        'reports-inventory': { title: 'Reportes de Inventario', breadcrumb: 'Reportes > Inventario' },
        'reports-employees': { title: 'Reportes de RRHH', breadcrumb: 'Reportes > RRHH' },
        'audit': { title: 'Auditoría', breadcrumb: 'Sistema > Auditoría' },
        'settings': { title: 'Configuración', breadcrumb: 'Sistema > Configuración' }
    };
    
    const info = titles[moduleName] || { title: 'Sistema', breadcrumb: 'Inicio' };
    
    document.getElementById('pageTitle').textContent = info.title;
    document.getElementById('breadcrumb').textContent = info.breadcrumb;
}

// ========================================
// DASHBOARD
// ========================================
async function loadDashboardData() {
    try {
        showLoading();
        
        const response = await fetch(`${CONFIG.API_URL}/reports.php?action=dashboard`);
        const data = await response.json();
        
        if (data.success) {
            updateDashboardStats(data);
            await loadRecentActivity();
            await loadTopProducts();
        } else {
            throw new Error(data.message || 'Error cargando dashboard');
        }
        
    } catch (error) {
        console.error('Error en loadDashboardData:', error);
        showToast('Error', 'No se pudo cargar el dashboard', 'error');
    } finally {
        hideLoading();
    }
}

function updateDashboardStats(data) {
    const salesToday = data.today?.revenue || 0;
    document.getElementById('salesToday').textContent = formatCurrency(salesToday);
    
    const ordersMonth = data.month?.orders || 0;
    document.getElementById('ordersMonth').textContent = ordersMonth;
    document.getElementById('orderCount').textContent = ordersMonth;
    
    const employeesPresent = data.today?.employees_present || 0;
    document.getElementById('employeesToday').textContent = employeesPresent;
    document.getElementById('employeesPresent').textContent = employeesPresent;
    
    const lowStock = data.alerts?.low_stock || 0;
    const outStock = data.alerts?.pending_orders || 0;
    document.getElementById('lowStockCount').textContent = lowStock;
    document.getElementById('outStockCount').textContent = outStock;
    
    CRMState.stats = {
        salesToday,
        ordersMonth,
        employeesPresent,
        lowStock
    };
}

// Stubs para otros módulos
async function loadProductsData() { console.log('Cargando productos...'); }
async function loadAttendanceData() { console.log('Cargando asistencia...'); }
async function loadOrdersData() { console.log('Cargando órdenes...'); }
async function loadAuditData() { console.log('Cargando auditoría...'); }
async function loadRecentActivity() { console.log('Cargando actividad reciente...'); }
async function loadTopProducts() { console.log('Cargando top productos...'); }

// ========================================
// BÚSQUEDA GLOBAL
// ========================================
function setupGlobalSearch() {
    const searchInput = document.getElementById('globalSearch');
    let searchTimeout;
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                performGlobalSearch(e.target.value);
            }, 500);
        });
    }
}

function performGlobalSearch(query) {
    if (!query || query.length < 2) return;
    console.log('Buscando:', query);
    showToast('Búsqueda', `Buscando: ${query}`, 'info');
}

// ========================================
// NOTIFICACIONES Y PERFIL
// ========================================
function showNotifications() {
    showToast('Notificaciones', 'Tienes 3 notificaciones nuevas', 'info');
}

function showProfile() {
    showToast('Perfil', `${CRMState.currentUser.nombre}`, 'info');
}

function refreshDashboard() {
    showToast('Actualización', 'Actualizando datos...', 'info');
    loadDashboardData();
}

function exportDashboard() {
    showToast('Exportar', 'Preparando exportación...', 'info');
}

// ========================================
// UTILIDADES
// ========================================
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-EC', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('es-EC', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-EC', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

async function logAuditAction(action, entityType, entityId, description) {
    try {
        await fetch(`${CONFIG.API_URL}/audit.php?action=log`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('mawewe_token_v3')}`
            },
            body: JSON.stringify({
                user_id: CRMState.currentUser?.id,
                action,
                entity_type: entityType,
                entity_id: entityId,
                description
            })
        });
    } catch (error) {
        console.error('Error logging audit:', error);
    }
}

// ========================================
// AUTO-REFRESH
// ========================================
function startAutoRefresh() {
    setInterval(() => {
        if (CRMState.currentModule === 'dashboard') {
            console.log('🔄 Auto-refresh dashboard');
            loadDashboardData();
        }
    }, 5 * 60 * 1000);
}

// ========================================
// HASH EN URL
// ========================================
window.addEventListener('hashchange', async () => {
    const hash = window.location.hash.substring(1);
    if (hash && hash !== CRMState.currentModule) {
        await Router.navigate(hash);
    }
});

// ========================================
// RESPONSIVE
// ========================================
window.addEventListener('resize', () => {
    if (window.innerWidth < 1024) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && !sidebar.classList.contains('collapsed')) {
            sidebar.classList.add('collapsed');
        }
    }
});

// Agregar estilos para animaciones
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    #toastContainer {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 100000;
        pointer-events: none;
    }
`;
document.head.appendChild(style);

console.log('✅ CRM Main con Cierre de Sesión Automático cargado');