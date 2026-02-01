/**
 * SISTEMA SEGUIMIENTO MAWEWE/ELPALACIO - CRM v4.0
 * JavaScript Principal con Funcionalidades Completas
 * © 2026 Joyería Mawewe
 */

// ========================================
// ESTADO GLOBAL
// ========================================
const CRMState = {
    currentUser: null,
    currentModule: 'dashboard',
    sidebarOpen: true,
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
// CONTENEDOR DE MÓDULOS - IMPORTANTE!
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
// FUNCIONES GLOBALES REQUERIDAS
// ========================================
function showToast(title, message, type = 'info') {
    console.log(`[${type}] ${title}: ${message}`);
    
    // Crear toast visual
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
    
    // Cargar dashboard inicial
    await loadDashboardData();
    
    // Configurar búsqueda global
    setupGlobalSearch();
    
    // Configurar auto-refresh
    startAutoRefresh();
    
    console.log('✅ Sistema iniciado correctamente');
});

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
        logAuditAction('LOGOUT', 'SESSION', null, 'Cierre de sesión');
        
        // Limpiar storage
        localStorage.clear();
        
        // Redirigir
        window.location.href = 'index.html';
    }
}

// ========================================
// NAVEGACIÓN Y MÓDULOS
// ========================================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    
    CRMState.sidebarOpen = !CRMState.sidebarOpen;
    
    if (CRMState.sidebarOpen) {
        sidebar.classList.remove('collapsed');
        mainContent.classList.remove('expanded');
        document.getElementById('menuIcon').textContent = '☰';
    } else {
        sidebar.classList.add('collapsed');
        mainContent.classList.add('expanded');
        document.getElementById('menuIcon').textContent = '☰';
    }
}

function showModule(moduleName) {
    // Ocultar todos los módulos
    document.querySelectorAll('.module').forEach(module => {
        module.classList.remove('active');
    });
    
    // Mostrar módulo seleccionado
    const targetModule = document.getElementById(`module-${moduleName}`);
    if (targetModule) {
        targetModule.classList.add('active');
    }
    
    // Actualizar navegación activa
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Encontrar y activar el nav-item correspondiente
    const activeNavItem = document.querySelector(`[href="#${moduleName}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
    
    // Actualizar título y breadcrumb
    updatePageTitle(moduleName);
    
    // Cargar datos del módulo
    loadModuleData(moduleName);
    
    // Actualizar estado
    CRMState.currentModule = moduleName;
    
    // Cerrar sidebar en móvil
    if (window.innerWidth < 1024) {
        toggleSidebar();
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

async function loadModuleData(moduleName) {
    try {
        switch (moduleName) {
            case 'dashboard':
                await loadDashboardData();
                break;
            case 'employees':
                if (Modules.Employees && Modules.Employees.load) {
                    await Modules.Employees.load();
                } else {
                    await loadEmployeesData();
                }
                break;
            case 'attendance':
                await loadAttendanceData();
                break;
            case 'products':
                await loadProductsData();
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
        console.error(`Error cargando datos del módulo ${moduleName}:`, error);
        showToast('Error', 'No se pudieron cargar los datos', 'error');
    }
}

// ========================================
// DASHBOARD
// ========================================
async function loadDashboardData() {
    try {
        showLoading();
        
        // Cargar estadísticas del dashboard
        const response = await fetch(`${CONFIG.API_URL}/reports.php?action=dashboard`);
        const data = await response.json();
        
        if (data.success) {
            // Actualizar estadísticas
            updateDashboardStats(data);
            
            // Cargar actividad reciente
            await loadRecentActivity();
            
            // Cargar top productos
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
    // Ventas de hoy
    const salesToday = data.today?.revenue || 0;
    document.getElementById('salesToday').textContent = formatCurrency(salesToday);
    
    // Órdenes del mes
    const ordersMonth = data.month?.orders || 0;
    document.getElementById('ordersMonth').textContent = ordersMonth;
    document.getElementById('orderCount').textContent = ordersMonth;
    
    // Empleados presentes
    const employeesPresent = data.today?.employees_present || 0;
    document.getElementById('employeesToday').textContent = employeesPresent;
    document.getElementById('employeesPresent').textContent = employeesPresent;
    
    // Alertas de stock
    const lowStock = data.alerts?.low_stock || 0;
    const outStock = data.alerts?.pending_orders || 0;
    document.getElementById('lowStockCount').textContent = lowStock;
    document.getElementById('outStockCount').textContent = outStock;
    
    // Guardar en estado
    CRMState.stats = {
        salesToday,
        ordersMonth,
        employeesPresent,
        lowStock
    };
}

async function loadRecentActivity() {
    try {
        const response = await fetch(`${CONFIG.API_URL}/audit.php?action=list&limit=10`);
        const data = await response.json();
        
        if (data.success && data.logs) {
            displayRecentActivity(data.logs);
        }
    } catch (error) {
        console.error('Error cargando actividad reciente:', error);
    }
}

function displayRecentActivity(logs) {
    const tbody = document.getElementById('recentActivityTable');
    
    if (!logs || logs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 2rem; color: #999;">
                    No hay actividad reciente
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = logs.map(log => `
        <tr>
            <td>${formatDateTime(log.created_at)}</td>
            <td>${log.user_name || 'Sistema'}</td>
            <td><span class="badge badge-${getActionBadgeClass(log.action)}">${log.action}</span></td>
            <td>${log.entity_type || '-'}</td>
            <td>${log.description || '-'}</td>
        </tr>
    `).join('');
}

function getActionBadgeClass(action) {
    const classes = {
        'CREATE': 'success',
        'UPDATE': 'info',
        'DELETE': 'danger',
        'LOGIN': 'primary',
        'LOGOUT': 'secondary'
    };
    return classes[action] || 'secondary';
}

async function loadTopProducts() {
    try {
        const response = await fetch(`${CONFIG.API_URL}/reports.php?action=sales`);
        const data = await response.json();
        
        if (data.success && data.top_products) {
            displayTopProducts(data.top_products);
        }
    } catch (error) {
        console.error('Error cargando top productos:', error);
    }
}

function displayTopProducts(products) {
    const container = document.getElementById('topProducts');
    
    if (!products || products.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #999;">
                No hay datos de productos
            </div>
        `;
        return;
    }
    
    container.innerHTML = products.slice(0, 5).map((product, index) => `
        <div style="padding: 0.75rem; border-bottom: 1px solid #eee; display: flex; align-items: center; gap: 1rem;">
            <div style="width: 24px; height: 24px; background: ${getTopColor(index)}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 0.75rem;">
                ${index + 1}
            </div>
            <div style="flex: 1;">
                <div style="font-weight: 600; font-size: 0.875rem; margin-bottom: 0.25rem;">${product.product_name}</div>
                <div style="font-size: 0.75rem; color: #666;">${product.total_sold} unidades vendidas</div>
            </div>
            <div style="font-weight: 700; color: #27AE60;">
                ${formatCurrency(parseFloat(product.total_revenue))}
            </div>
        </div>
    `).join('');
}

function getTopColor(index) {
    const colors = ['#8C004B', '#2C3E50', '#27AE60', '#F39C12', '#E74C3C'];
    return colors[index] || '#999';
}

function refreshDashboard() {
    showToast('Actualización', 'Actualizando datos del dashboard...', 'info');
    loadDashboardData();
}

function exportDashboard() {
    showToast('Exportar', 'Preparando exportación...', 'info');
    // Implementar exportación a Excel/PDF
}

// ========================================
// EMPLEADOS (Fallback si no hay módulo)
// ========================================
async function loadEmployeesData() {
    try {
        showLoading();
        
        const response = await fetch(`${CONFIG.API_URL}/employees.php?action=list`);
        const data = await response.json();
        
        if (data.success) {
            CRMState.data.employees = data.employees;
            displayEmployees(data.employees);
            
            // Actualizar contador
            document.getElementById('employeeCount').textContent = data.total;
        }
    } catch (error) {
        console.error('Error cargando empleados:', error);
        showToast('Error', 'No se pudieron cargar los empleados', 'error');
    } finally {
        hideLoading();
    }
}

function displayEmployees(employees) {
    const container = document.getElementById('employeesContent');
    
    if (!employees || employees.length === 0) {
        container.innerHTML = `
            <div class="card-body" style="text-align: center; padding: 4rem;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">👥</div>
                <h3 style="margin-bottom: 0.5rem;">No hay empleados registrados</h3>
                <p style="color: #666; margin-bottom: 2rem;">Comienza agregando tu primer empleado</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="card-body">
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Cédula</th>
                            <th>Cargo</th>
                            <th>Sucursal</th>
                            <th>Rol</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${employees.map(emp => `
                            <tr>
                                <td><strong>${emp.nombre}</strong></td>
                                <td>${emp.cedula}</td>
                                <td>${emp.cargo}</td>
                                <td>${emp.sucursal}</td>
                                <td>
                                    <span class="badge ${emp.is_admin ? 'badge-primary' : 'badge-secondary'}">
                                        ${emp.is_admin ? '👑 Admin' : '👤 Empleado'}
                                    </span>
                                </td>
                                <td>
                                    <span class="badge ${emp.active ? 'badge-success' : 'badge-danger'}">
                                        ${emp.active ? '✓ Activo' : '✕ Inactivo'}
                                    </span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// ========================================
// PRODUCTOS
// ========================================
async function loadProductsData() {
    try {
        showLoading();
        
        const response = await fetch(`${CONFIG.API_URL}/products.php`);
        const data = await response.json();
        
        if (data.success) {
            CRMState.data.products = data.products;
            displayProducts(data.products);
            
            // Actualizar contador
            document.getElementById('productCount').textContent = data.total;
        }
    } catch (error) {
        console.error('Error cargando productos:', error);
        showToast('Error', 'No se pudieron cargar los productos', 'error');
    } finally {
        hideLoading();
    }
}

function displayProducts(products) {
    const container = document.getElementById('productsContent');
    
    if (!products || products.length === 0) {
        container.innerHTML = `
            <div class="card-body" style="text-align: center; padding: 4rem;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">🛍️</div>
                <h3>No hay productos</h3>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="card-body">
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>SKU</th>
                            <th>Nombre</th>
                            <th>Categoría</th>
                            <th>Precio</th>
                            <th>Stock</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${products.slice(0, 50).map(product => `
                            <tr>
                                <td><code>${product.sku}</code></td>
                                <td><strong>${product.name}</strong></td>
                                <td>
                                    <span class="badge badge-info">${product.category}</span>
                                </td>
                                <td><strong>${formatCurrency(product.price)}</strong></td>
                                <td>
                                    <span class="badge ${product.stock > 10 ? 'badge-success' : product.stock > 0 ? 'badge-warning' : 'badge-danger'}">
                                        ${product.stock}
                                    </span>
                                </td>
                                <td>
                                    <span class="badge ${product.active ? 'badge-success' : 'badge-danger'}">
                                        ${product.active ? '✓ Activo' : '✕ Inactivo'}
                                    </span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// ========================================
// ASISTENCIA
// ========================================
async function loadAttendanceData() {
    try {
        showLoading();
        
        const response = await fetch(`${CONFIG.API_URL}/attendance.php?action=today`);
        const data = await response.json();
        
        if (data.success) {
            displayAttendance(data.records);
        }
    } catch (error) {
        console.error('Error cargando asistencia:', error);
        showToast('Error', 'No se pudo cargar la asistencia', 'error');
    } finally {
        hideLoading();
    }
}

function displayAttendance(records) {
    const container = document.getElementById('attendanceContent');
    
    container.innerHTML = `
        <div class="card-body">
            <h4 style="margin-bottom: 1rem;">Asistencia de Hoy - ${new Date().toLocaleDateString('es-EC')}</h4>
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Empleado</th>
                            <th>Cargo</th>
                            <th>Entrada</th>
                            <th>Salida</th>
                            <th>Horas</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${records && records.length > 0 ? records.map(record => `
                            <tr>
                                <td><strong>${record.nombre}</strong></td>
                                <td>${record.cargo}</td>
                                <td>${record.check_in ? formatTime(record.check_in) : '-'}</td>
                                <td>${record.check_out ? formatTime(record.check_out) : '-'}</td>
                                <td><strong>${record.hours_worked ? record.hours_worked.toFixed(1) + 'h' : '-'}</strong></td>
                                <td>
                                    <span class="badge ${record.check_out ? 'badge-success' : 'badge-warning'}">
                                        ${record.check_out ? '✓ Completado' : '⏱ En curso'}
                                    </span>
                                </td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="6" style="text-align: center; padding: 2rem; color: #999;">
                                    No hay registros de asistencia hoy
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// ========================================
// ÓRDENES
// ========================================
async function loadOrdersData() {
    try {
        showLoading();
        
        const container = document.getElementById('ordersContent');
        container.innerHTML = `
            <div class="card-body">
                <div style="text-align: center; padding: 2rem;">
                    Cargando órdenes...
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error cargando órdenes:', error);
    } finally {
        hideLoading();
    }
}

// ========================================
// AUDITORÍA
// ========================================
async function loadAuditData() {
    try {
        showLoading();
        
        const response = await fetch(`${CONFIG.API_URL}/audit.php?action=list&limit=50`);
        const data = await response.json();
        
        if (data.success) {
            displayAuditLogs(data.logs);
        }
    } catch (error) {
        console.error('Error cargando auditoría:', error);
        showToast('Error', 'No se pudo cargar la auditoría', 'error');
    } finally {
        hideLoading();
    }
}

function displayAuditLogs(logs) {
    const container = document.getElementById('auditContent');
    
    container.innerHTML = `
        <div class="card-body">
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Fecha/Hora</th>
                            <th>Usuario</th>
                            <th>Acción</th>
                            <th>Entidad</th>
                            <th>ID</th>
                            <th>Descripción</th>
                            <th>IP</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${logs && logs.length > 0 ? logs.map(log => `
                            <tr>
                                <td>${formatDateTime(log.created_at)}</td>
                                <td>${log.user_name || 'Sistema'}</td>
                                <td><span class="badge badge-${getActionBadgeClass(log.action)}">${log.action}</span></td>
                                <td>${log.entity_type || '-'}</td>
                                <td>${log.entity_id || '-'}</td>
                                <td>${log.description || '-'}</td>
                                <td><code>${log.ip_address || '-'}</code></td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="7" style="text-align: center; padding: 2rem; color: #999;">
                                    No hay registros de auditoría
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>
    `;
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

console.log('✅ CRM JavaScript con Módulos cargado correctamente');