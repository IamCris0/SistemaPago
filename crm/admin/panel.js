// Admin Panel JavaScript - Mawewe CRM
const API_URL = 'https://mawewe.com.ec/api';

let currentAdmin = null;
let allProducts = [];
let allOrders = [];
let allEmployees = [];

// ========================================
// INICIALIZACIÓN
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initializeNavigation();
    loadDashboard();
    
    // Inicializar fechas para reportes
    const today = new Date().toISOString().split('T')[0];
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    document.getElementById('reportStartDate').value = firstDay;
    document.getElementById('reportEndDate').value = today;
    document.getElementById('attendanceDate').value = today;
});

// ========================================
// AUTENTICACIÓN
// ========================================

function checkAuth() {
    const employeeData = localStorage.getItem('mawewe_employee');
    if (!employeeData) {
        window.location.href = '../login.html';
        return;
    }

    currentAdmin = JSON.parse(employeeData);
    
    // Verificar que sea admin
    if (!currentAdmin.is_admin) {
        window.location.href = '../employee/panel.html';
        return;
    }

    // Mostrar nombre
    document.getElementById('adminName').textContent = currentAdmin.nombre;
}

function logout() {
    if (confirm('¿Estás seguro de cerrar sesión?')) {
        localStorage.removeItem('mawewe_employee');
        localStorage.removeItem('mawewe_token');
        window.location.href = '../login.html';
    }
}

// ========================================
// NAVEGACIÓN
// ========================================

function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remover active de todos
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Agregar active al clickeado
            item.classList.add('active');
            
            // Mostrar tab correspondiente
            const tabId = item.getAttribute('data-tab');
            showTab(tabId);
        });
    });
}

function showTab(tabId) {
    // Ocultar todos los tabs
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    // Mostrar el tab seleccionado
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) {
        selectedTab.classList.add('active');
        
        // Cargar datos según el tab
        switch(tabId) {
            case 'dashboard':
                loadDashboard();
                break;
            case 'products':
                loadProducts();
                break;
            case 'orders':
                loadOrders();
                break;
            case 'employees':
                loadEmployees();
                break;
            case 'attendance':
                loadAttendanceToday();
                break;
        }
    }
}

// ========================================
// DASHBOARD
// ========================================

async function loadDashboard() {
    try {
        const response = await fetch(`${API_URL}/reports.php?action=dashboard`);
        const data = await response.json();

        if (data.success) {
            // Actualizar estadísticas
            document.getElementById('salesToday').textContent = '$' + data.today.revenue.toFixed(2);
            document.getElementById('ordersToday').textContent = data.today.orders + ' órdenes';
            
            document.getElementById('salesMonth').textContent = '$' + data.month.revenue.toFixed(2);
            document.getElementById('ordersMonth').textContent = data.month.orders + ' órdenes';
            
            document.getElementById('employeesPresent').textContent = data.today.employees_present;
            
            document.getElementById('lowStock').textContent = data.alerts.low_stock;
            
            // Cargar órdenes recientes
            loadRecentOrders();
            
            // Cargar productos con bajo stock
            loadLowStockProducts();
        }
    } catch (error) {
        console.error('Error cargando dashboard:', error);
    }
}

async function loadRecentOrders() {
    try {
        const response = await fetch(`${API_URL}/products.php`);
        const data = await response.json();

        // Aquí necesitarías un endpoint específico para órdenes recientes
        // Por ahora mostramos un mensaje
        document.getElementById('recentOrders').innerHTML = `
            <div class="empty-state">
                <p>No hay órdenes recientes</p>
            </div>
        `;
    } catch (error) {
        console.error('Error:', error);
    }
}

async function loadLowStockProducts() {
    try {
        const response = await fetch(`${API_URL}/reports.php?action=products`);
        const data = await response.json();

        if (data.success && data.low_stock.length > 0) {
            const html = `
                <table>
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>SKU</th>
                            <th>Stock</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.low_stock.slice(0, 5).map(product => `
                            <tr>
                                <td>${product.name}</td>
                                <td>${product.sku}</td>
                                <td>
                                    <span class="badge ${product.stock === 0 ? 'danger' : 'warning'}">
                                        ${product.stock} unidades
                                    </span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            
            document.getElementById('lowStockProducts').innerHTML = html;
        } else {
            document.getElementById('lowStockProducts').innerHTML = `
                <div class="empty-state">
                    <p>✅ Todos los productos tienen stock suficiente</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// ========================================
// PRODUCTOS
// ========================================

async function loadProducts() {
    try {
        showLoading('productsTable');
        
        const response = await fetch(`${API_URL}/products.php`);
        const data = await response.json();

        if (data.success) {
            allProducts = data.products;
            
            // Llenar filtro de categorías
            const categories = [...new Set(allProducts.map(p => p.category))];
            const filterCategory = document.getElementById('filterCategory');
            filterCategory.innerHTML = '<option value="">Todas las categorías</option>' +
                categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
            
            displayProducts(allProducts);
            
            // Eventos de búsqueda y filtro
            document.getElementById('searchProducts').addEventListener('input', filterProducts);
            document.getElementById('filterCategory').addEventListener('change', filterProducts);
        }
    } catch (error) {
        console.error('Error cargando productos:', error);
        document.getElementById('productsTable').innerHTML = `
            <div class="empty-state">
                <h3>❌ Error al cargar productos</h3>
            </div>
        `;
    }
}

function displayProducts(products) {
    if (products.length === 0) {
        document.getElementById('productsTable').innerHTML = `
            <div class="empty-state">
                <h3>No se encontraron productos</h3>
            </div>
        `;
        return;
    }

    const html = `
        <table>
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
                ${products.map(product => `
                    <tr>
                        <td><strong>${product.sku}</strong></td>
                        <td>${product.name}</td>
                        <td><span class="badge info">${product.category}</span></td>
                        <td><strong>$${product.price.toFixed(2)}</strong></td>
                        <td>
                            <span class="badge ${product.stock === 0 ? 'danger' : product.stock < 10 ? 'warning' : 'success'}">
                                ${product.stock}
                            </span>
                        </td>
                        <td>
                            <span class="badge ${product.featured ? 'success' : 'info'}">
                                ${product.featured ? 'Destacado' : 'Normal'}
                            </span>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    document.getElementById('productsTable').innerHTML = html;
}

function filterProducts() {
    const search = document.getElementById('searchProducts').value.toLowerCase();
    const category = document.getElementById('filterCategory').value.toLowerCase();
    
    let filtered = allProducts;
    
    if (search) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(search) ||
            p.sku.toLowerCase().includes(search)
        );
    }
    
    if (category) {
        filtered = filtered.filter(p => p.category.toLowerCase() === category);
    }
    
    displayProducts(filtered);
}

// Continúa en la siguiente parte...
// Admin Panel JavaScript - Parte 2: Órdenes, Empleados y Asistencia

// ========================================
// ÓRDENES
// ========================================

async function loadOrders() {
    try {
        showLoading('ordersTable');
        
        // Nota: Necesitarías crear un endpoint específico para obtener todas las órdenes
        // Por ahora simularemos con datos de ejemplo
        
        const html = `
            <div class="empty-state">
                <h3>📦 Sistema de Órdenes</h3>
                <p>Conecta con tu endpoint de órdenes para ver toda la información</p>
            </div>
        `;
        
        document.getElementById('ordersTable').innerHTML = html;
        
    } catch (error) {
        console.error('Error cargando órdenes:', error);
    }
}

// ========================================
// EMPLEADOS
// ========================================

async function loadEmployees() {
    try {
        showLoading('employeesTable');
        
        const response = await fetch(`${API_URL}/employees.php?action=list`);
        const data = await response.json();

        if (data.success) {
            allEmployees = data.employees;
            displayEmployees(allEmployees);
        }
    } catch (error) {
        console.error('Error cargando empleados:', error);
        document.getElementById('employeesTable').innerHTML = `
            <div class="empty-state">
                <h3>❌ Error al cargar empleados</h3>
            </div>
        `;
    }
}

function displayEmployees(employees) {
    if (employees.length === 0) {
        document.getElementById('employeesTable').innerHTML = `
            <div class="empty-state">
                <h3>No hay empleados registrados</h3>
            </div>
        `;
        return;
    }

    const html = `
        <table>
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Cédula</th>
                    <th>Cargo</th>
                    <th>Sucursal</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th>Acciones</th>
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
                            <span class="badge ${emp.is_admin ? 'danger' : 'info'}">
                                ${emp.is_admin ? 'Admin' : 'Empleado'}
                            </span>
                        </td>
                        <td>
                            <span class="badge ${emp.active ? 'success' : 'danger'}">
                                ${emp.active ? 'Activo' : 'Inactivo'}
                            </span>
                        </td>
                        <td>
                            <button class="btn-secondary btn-sm" onclick="toggleEmployeeStatus(${emp.id})">
                                ${emp.active ? 'Desactivar' : 'Activar'}
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    document.getElementById('employeesTable').innerHTML = html;
}

// Modal de empleado
function showAddEmployeeModal() {
    document.getElementById('employeeModal').classList.add('show');
    document.getElementById('employeeForm').reset();
}

function closeEmployeeModal() {
    document.getElementById('employeeModal').classList.remove('show');
}

// Manejar submit del formulario de empleado
document.addEventListener('DOMContentLoaded', () => {
    const employeeForm = document.getElementById('employeeForm');
    if (employeeForm) {
        employeeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const employeeData = {
                nombre: document.getElementById('empName').value.trim().toUpperCase(),
                cedula: document.getElementById('empCedula').value.trim(),
                cargo: document.getElementById('empCargo').value,
                sucursal: document.getElementById('empSucursal').value.trim(),
                is_admin: document.getElementById('empIsAdmin').checked ? 1 : 0
            };

            try {
                const response = await fetch(`${API_URL}/employees.php?action=create`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(employeeData)
                });

                const data = await response.json();

                if (data.success) {
                    showAlert('✅ Empleado creado exitosamente', 'success');
                    closeEmployeeModal();
                    loadEmployees();
                } else {
                    showAlert('❌ ' + data.message, 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showAlert('❌ Error al crear empleado', 'error');
            }
        });
    }
});

async function toggleEmployeeStatus(employeeId) {
    if (!confirm('¿Estás seguro de cambiar el estado de este empleado?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/employees.php?action=toggle-status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: employeeId })
        });

        const data = await response.json();

        if (data.success) {
            showAlert('✅ Estado actualizado', 'success');
            loadEmployees();
        } else {
            showAlert('❌ ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('❌ Error al actualizar estado', 'error');
    }
}

// ========================================
// ASISTENCIA
// ========================================

async function loadAttendanceToday() {
    try {
        showLoading('attendanceTable');
        
        const response = await fetch(`${API_URL}/attendance.php?action=today`);
        const data = await response.json();

        if (data.success) {
            displayAttendance(data.records);
        }
    } catch (error) {
        console.error('Error cargando asistencia:', error);
        document.getElementById('attendanceTable').innerHTML = `
            <div class="empty-state">
                <h3>❌ Error al cargar asistencia</h3>
            </div>
        `;
    }
}

async function loadAttendanceByDate() {
    const date = document.getElementById('attendanceDate').value;
    
    try {
        showLoading('attendanceTable');
        
        const response = await fetch(
            `${API_URL}/attendance.php?action=history&start_date=${date}&end_date=${date}`
        );
        const data = await response.json();

        if (data.success) {
            displayAttendance(data.records);
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('attendanceTable').innerHTML = `
            <div class="empty-state">
                <h3>❌ Error al cargar asistencia</h3>
            </div>
        `;
    }
}

function displayAttendance(records) {
    if (records.length === 0) {
        document.getElementById('attendanceTable').innerHTML = `
            <div class="empty-state">
                <h3>No hay registros de asistencia</h3>
            </div>
        `;
        return;
    }

    const html = `
        <table>
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
                ${records.map(record => {
                    const checkIn = record.check_in ? new Date(record.check_in) : null;
                    const checkOut = record.check_out ? new Date(record.check_out) : null;
                    
                    return `
                        <tr>
                            <td><strong>${record.nombre}</strong></td>
                            <td>${record.cargo}</td>
                            <td>${checkIn ? formatTime(checkIn) : '-'}</td>
                            <td>${checkOut ? formatTime(checkOut) : '-'}</td>
                            <td><strong>${record.hours_worked ? record.hours_worked.toFixed(1) + 'h' : '-'}</strong></td>
                            <td>
                                <span class="badge ${checkOut ? 'success' : 'warning'}">
                                    ${checkOut ? 'Completo' : 'En curso'}
                                </span>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    
    document.getElementById('attendanceTable').innerHTML = html;
}

// ========================================
// REPORTES
// ========================================

async function generateReport() {
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;
    
    if (!startDate || !endDate) {
        showAlert('Por favor selecciona ambas fechas', 'error');
        return;
    }

    try {
        showLoading('reportContent');
        
        // Obtener reporte de ventas
        const salesResponse = await fetch(
            `${API_URL}/reports.php?action=sales&start_date=${startDate}&end_date=${endDate}`
        );
        const salesData = await salesResponse.json();
        
        // Obtener reporte de productos
        const productsResponse = await fetch(`${API_URL}/reports.php?action=products`);
        const productsData = await productsResponse.json();
        
        // Obtener reporte de empleados
        const month = startDate.slice(0, 7);
        const employeesResponse = await fetch(
            `${API_URL}/reports.php?action=employees&month=${month}`
        );
        const employeesData = await employeesResponse.json();

        if (salesData.success && productsData.success && employeesData.success) {
            displayReport(salesData, productsData, employeesData, startDate, endDate);
        }
    } catch (error) {
        console.error('Error generando reporte:', error);
        document.getElementById('reportContent').innerHTML = `
            <div class="empty-state">
                <h3>❌ Error al generar reporte</h3>
            </div>
        `;
    }
}

function displayReport(salesData, productsData, employeesData, startDate, endDate) {
    const html = `
        <div class="report-container">
            <div class="report-header">
                <h2>📊 Reporte del ${formatDate(new Date(startDate))} al ${formatDate(new Date(endDate))}</h2>
            </div>

            <!-- Ventas -->
            <div class="card">
                <h3>💰 Resumen de Ventas</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-label">Total de Órdenes</div>
                        <div class="stat-value">${salesData.totals.total_orders}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Ingresos Totales</div>
                        <div class="stat-value">$${salesData.totals.total_revenue.toFixed(2)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Valor Promedio</div>
                        <div class="stat-value">$${salesData.totals.avg_order_value.toFixed(2)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Órdenes Completadas</div>
                        <div class="stat-value">${salesData.totals.completed_orders}</div>
                    </div>
                </div>

                ${salesData.top_products.length > 0 ? `
                    <h4 style="margin-top: 30px;">🏆 Productos Más Vendidos</h4>
                    <table>
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>SKU</th>
                                <th>Vendidos</th>
                                <th>Ingresos</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${salesData.top_products.slice(0, 5).map(product => `
                                <tr>
                                    <td>${product.product_name}</td>
                                    <td>${product.product_sku}</td>
                                    <td><strong>${product.total_sold}</strong></td>
                                    <td><strong>$${parseFloat(product.total_revenue).toFixed(2)}</strong></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : '<p style="text-align: center; color: #666;">No hay ventas en este período</p>'}
            </div>

            <!-- Inventario -->
            <div class="card">
                <h3>📦 Estado del Inventario</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-label">Total Productos</div>
                        <div class="stat-value">${productsData.inventory.total_products}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">En Stock</div>
                        <div class="stat-value">${productsData.inventory.in_stock}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Sin Stock</div>
                        <div class="stat-value">${productsData.inventory.out_of_stock}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Bajo Stock</div>
                        <div class="stat-value">${productsData.inventory.low_stock}</div>
                    </div>
                </div>
            </div>

            <!-- Empleados -->
            <div class="card">
                <h3>👥 Asistencia de Empleados</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Empleado</th>
                            <th>Cargo</th>
                            <th>Días Trabajados</th>
                            <th>Horas Totales</th>
                            <th>Promedio</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${employeesData.attendance.map(emp => `
                            <tr>
                                <td><strong>${emp.nombre}</strong></td>
                                <td>${emp.cargo}</td>
                                <td>${emp.days_worked}</td>
                                <td><strong>${emp.total_hours}h</strong></td>
                                <td>${emp.avg_hours}h/día</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    document.getElementById('reportContent').innerHTML = html;
}

// ========================================
// UTILIDADES
// ========================================

function showLoading(elementId) {
    document.getElementById(elementId).innerHTML = `
        <div class="empty-state">
            <h3>⏳ Cargando...</h3>
        </div>
    `;
}

function formatDate(date) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('es-EC', options);
}

function formatTime(date) {
    return date.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
}

function showAlert(message, type) {
    const alertBox = document.getElementById('alert');
    alertBox.textContent = message;
    alertBox.className = `alert ${type} show`;

    setTimeout(() => {
        alertBox.classList.remove('show');
    }, 5000);
}
