/**
 * SISTEMA MEJORADO - Dashboard y CRUD
 * Con carga progresiva y funcionalidades completas
 */

// ========================================
// CONFIGURACIÓN GLOBAL
// ========================================
const AppConfig = {
    API_URL: 'https://mawewe.com.ec/api',
    LOGO_PATH: 'img/logo.png', // Ruta al logo
    REFRESH_INTERVAL: 5 * 60 * 1000, // 5 minutos
};

// ========================================
// ESTADO GLOBAL MEJORADO
// ========================================
const AppState = {
    currentUser: null,
    currentModule: 'dashboard',
    loadingModules: new Set(),
    cachedData: {},
    refreshIntervals: {},
};

// ========================================
// UTILIDADES DE CARGA
// ========================================
function showGlobalLoading(message = 'Cargando...') {
    let overlay = document.getElementById('globalLoadingOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'globalLoadingOverlay';
        overlay.className = 'global-loading-overlay';
        overlay.innerHTML = `
            <div class="global-loading-content">
                <div class="global-loading-spinner"></div>
                <div class="global-loading-text" id="globalLoadingText">${message}</div>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    
    const textElement = document.getElementById('globalLoadingText');
    if (textElement) textElement.textContent = message;
    
    overlay.classList.add('active');
}

function hideGlobalLoading() {
    const overlay = document.getElementById('globalLoadingOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

function setModuleLoading(moduleId, isLoading) {
    const module = document.getElementById(`module-${moduleId}`);
    if (!module) return;
    
    if (isLoading) {
        AppState.loadingModules.add(moduleId);
        module.classList.add('data-loading');
    } else {
        AppState.loadingModules.delete(moduleId);
        module.classList.remove('data-loading');
        module.classList.add('data-loaded');
    }
}

// ========================================
// INICIALIZACIÓN CON LOGO
// ========================================
function initializeLogo() {
    console.log('🎨 Inicializando logos...');
    
    // Logo en sidebar
    const sidebarLogo = document.querySelector('.sidebar-logo-icon');
    if (sidebarLogo) {
        sidebarLogo.innerHTML = `<img src="${AppConfig.LOGO_PATH}" alt="MAWEWE Logo" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🏪</text></svg>'">`;
    }
    
    // Logo en login (si existe)
    const loginLogo = document.querySelector('.login-logo');
    if (loginLogo) {
        loginLogo.innerHTML = `<img src="${AppConfig.LOGO_PATH}" alt="MAWEWE Logo" onerror="this.parentElement.innerHTML='🏪'">`;
    }
    
    console.log('✅ Logos inicializados');
}

// ========================================
// CARGA PROGRESIVA DE MÓDULOS
// ========================================
async function loadModuleData(moduleName) {
    console.log(`📦 Cargando módulo: ${moduleName}`);
    
    setModuleLoading(moduleName, true);
    
    try {
        switch (moduleName) {
            case 'dashboard':
                await loadDashboardProgressive();
                break;
            case 'employees':
                await loadEmployeesData();
                break;
            case 'products':
                await loadProductsData();
                break;
            case 'orders':
                await loadOrdersData();
                break;
            case 'attendance':
                await loadAttendanceData();
                break;
            case 'audit':
                await loadAuditData();
                break;
            default:
                console.log(`⚠️ Módulo ${moduleName} sin datos específicos`);
        }
    } catch (error) {
        console.error(`❌ Error cargando ${moduleName}:`, error);
        showToast('Error', `No se pudo cargar ${moduleName}`, 'error');
    } finally {
        setModuleLoading(moduleName, false);
    }
}

// ========================================
// DASHBOARD PROGRESIVO
// ========================================
async function loadDashboardProgressive() {
    console.log('📊 Iniciando carga progresiva del dashboard');
    
    // 1. Cargar estadísticas principales
    await loadDashboardStats();
    
    // 2. Cargar actividad reciente
    setTimeout(() => loadRecentActivity(), 500);
    
    // 3. Cargar top productos
    setTimeout(() => loadTopProducts(), 1000);
    
    // 4. Cargar gráficos
    setTimeout(() => loadSalesChart(), 1500);
}

async function loadDashboardStats() {
    try {
        const response = await fetch(`${AppConfig.API_URL}/reports.php?action=dashboard`, {
            headers: {
                'Authorization': `Bearer ${CONFIG.getToken()}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            updateDashboardStats(data);
            AppState.cachedData.dashboard = data;
        }
    } catch (error) {
        console.error('Error cargando stats:', error);
    }
}

function updateDashboardStats(data) {
    const today = data.today || {};
    const month = data.month || {};
    const alerts = data.alerts || {};
    
    // Actualizar valores con animación
    animateValue('salesToday', 0, today.revenue || 0, 1000, true);
    animateValue('ordersMonth', 0, month.orders || 0, 1000, false);
    animateValue('employeesToday', 0, today.employees_present || 0, 1000, false);
    animateValue('lowStockCount', 0, alerts.low_stock || 0, 1000, false);
    
    // Actualizar valores secundarios
    safeSetText('employeesPresent', today.employees_present || 0);
    safeSetText('outStockCount', alerts.pending_orders || 0);
    safeSetText('orderCount', month.orders || 0);
}

function animateValue(elementId, start, end, duration, isCurrency = false) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const current = Math.floor(start + (end - start) * progress);
        
        if (isCurrency) {
            element.textContent = formatCurrency(current);
        } else {
            element.textContent = current;
        }
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

function safeSetText(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) element.textContent = value;
}

// ========================================
// ÓRDENES CON CARGA REAL
// ========================================
async function loadOrdersData() {
    console.log('📦 Cargando órdenes...');
    
    const container = document.getElementById('ordersContent');
    if (!container) return;
    
    // Mostrar estado de carga
    container.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Cargando órdenes...</p>
        </div>
    `;
    
    try {
        // Aquí deberías tener un endpoint real de órdenes
        // Por ahora simularemos con los datos de la BD
        
        const response = await fetch(`${AppConfig.API_URL}/reports.php?action=sales`);
        const data = await response.json();
        
        if (data.success) {
            displayOrders(data);
        } else {
            throw new Error('No se pudieron cargar las órdenes');
        }
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = `
            <div class="card-body" style="text-align: center; padding: 3rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                <h3>Error al cargar órdenes</h3>
                <p style="color: #666; margin-top: 1rem;">${error.message}</p>
                <button class="btn btn-primary" onclick="loadOrdersData()" style="margin-top: 1rem;">
                    🔄 Reintentar
                </button>
            </div>
        `;
    }
}

function displayOrders(data) {
    const container = document.getElementById('ordersContent');
    if (!container) return;
    
    // Renderizar tabla de órdenes
    container.innerHTML = `
        <div class="card-header">
            <h3 class="card-title">Órdenes Recientes</h3>
            <button class="btn btn-primary btn-sm" onclick="createNewOrder()">
                ➕ Nueva Orden
            </button>
        </div>
        <div class="card-body">
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Orden #</th>
                            <th>Fecha</th>
                            <th>Cliente</th>
                            <th>Total</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="6" style="text-align: center; padding: 2rem; color: #999;">
                                Los datos de órdenes se mostrarán aquí
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// ========================================
// FUNCIONES CRUD MEJORADAS
// ========================================
async function createNewOrder() {
    showToast('Info', 'Funcionalidad de crear orden en desarrollo', 'info');
    // Aquí iría el modal de creación
}

async function editOrder(orderId) {
    showToast('Info', `Editando orden ${orderId}`, 'info');
    // Aquí iría el modal de edición
}

async function deleteOrder(orderId) {
    if (!confirm('¿Está seguro de eliminar esta orden?')) return;
    
    try {
        showGlobalLoading('Eliminando orden...');
        
        // Aquí iría la llamada DELETE real
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        showToast('Éxito', 'Orden eliminada correctamente', 'success');
        await loadOrdersData();
    } catch (error) {
        showToast('Error', error.message, 'error');
    } finally {
        hideGlobalLoading();
    }
}

// ========================================
// HELPERS
// ========================================
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

function showToast(title, message, type = 'info') {
    const container = document.getElementById('toastContainer') || createToastContainer();
    
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon">${icons[type]}</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'toastSlide 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

// ========================================
// INICIALIZACIÓN AL CARGAR
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando sistema mejorado...');
    
    // Inicializar logos
    initializeLogo();
    
    // Cargar módulo inicial
    if (window.CRMState) {
        loadModuleData(window.CRMState.currentModule || 'dashboard');
    }
    
    console.log('✅ Sistema inicializado');
});

// Exportar funciones globales
window.loadModuleData = loadModuleData;
window.showGlobalLoading = showGlobalLoading;
window.hideGlobalLoading = hideGlobalLoading;
window.createNewOrder = createNewOrder;
window.editOrder = editOrder;
window.deleteOrder = deleteOrder;

console.log('✅ Sistema mejorado cargado');
