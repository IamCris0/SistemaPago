let currentAdmin = null;

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadDashboard();
});

function checkAuth() {
    const employeeData = localStorage.getItem(CONFIG.SESSION.EMPLOYEE_KEY);
    if (!employeeData) {
        window.location.href = 'index.html';
        return;
    }
    currentAdmin = JSON.parse(employeeData);
    if (!currentAdmin.is_admin) {
        window.location.href = 'employee.html';
        return;
    }
    document.getElementById('adminName').textContent = currentAdmin.nombre;
}

function logout() {
    if (confirm('¿Cerrar sesión?')) {
        localStorage.clear();
        window.location.href = 'index.html';
    }
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    event.target.classList.add('active');
    
    if (sectionId === 'employees') loadEmployees();
    if (sectionId === 'attendance') loadAttendance();
    if (sectionId === 'products') loadProducts();
}

async function loadDashboard() {
    try {
        const res = await fetch(`${CONFIG.API_URL}/reports.php?action=dashboard`);
        const data = await res.json();
        if (data.success) {
            document.getElementById('salesToday').textContent = '$' + data.today.revenue.toFixed(2);
            document.getElementById('ordersMonth').textContent = data.month.orders;
            document.getElementById('employeesPresent').textContent = data.today.employees_present;
            document.getElementById('lowStock').textContent = data.alerts.low_stock;
        }
    } catch (e) {
        console.error('Error dashboard:', e);
    }
}

async function loadEmployees() {
    try {
        const res = await fetch(`${CONFIG.API_URL}/employees.php?action=list`);
        const data = await res.json();
        if (data.success) {
            document.getElementById('employeesTable').innerHTML = `
                <table>
                    <thead><tr><th>Nombre</th><th>Cédula</th><th>Cargo</th><th>Estado</th></tr></thead>
                    <tbody>
                        ${data.employees.map(e => `
                            <tr>
                                <td><strong>${e.nombre}</strong></td>
                                <td>${e.cedula}</td>
                                <td>${e.cargo}</td>
                                <td><span class="badge ${e.active ? 'success' : 'warning'}">${e.active ? 'Activo' : 'Inactivo'}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
    } catch (e) {
        document.getElementById('employeesTable').innerHTML = '<p>Error cargando empleados</p>';
    }
}

async function loadAttendance() {
    try {
        const res = await fetch(`${CONFIG.API_URL}/attendance.php?action=today`);
        const data = await res.json();
        if (data.success) {
            document.getElementById('attendanceTable').innerHTML = `
                <table>
                    <thead><tr><th>Empleado</th><th>Entrada</th><th>Salida</th><th>Horas</th></tr></thead>
                    <tbody>
                        ${data.records.map(r => `
                            <tr>
                                <td><strong>${r.nombre}</strong></td>
                                <td>${new Date(r.check_in).toLocaleTimeString('es-EC', {hour: '2-digit', minute:'2-digit'})}</td>
                                <td>${r.check_out ? new Date(r.check_out).toLocaleTimeString('es-EC', {hour: '2-digit', minute:'2-digit'}) : '-'}</td>
                                <td><strong>${r.hours_worked ? r.hours_worked.toFixed(1)+'h' : '-'}</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
    } catch (e) {
        document.getElementById('attendanceTable').innerHTML = '<p>Error cargando asistencia</p>';
    }
}

async function loadProducts() {
    try {
        const res = await fetch(`${CONFIG.API_URL}/products.php`);
        const data = await res.json();
        if (data.success) {
            document.getElementById('productsTable').innerHTML = `
                <table>
                    <thead><tr><th>SKU</th><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Stock</th></tr></thead>
                    <tbody>
                        ${data.products.slice(0, 50).map(p => `
                            <tr>
                                <td>${p.sku}</td>
                                <td>${p.name}</td>
                                <td><span class="badge" style="background: #e3f2fd; color: #0d47a1;">${p.category}</span></td>
                                <td><strong>$${p.price.toFixed(2)}</strong></td>
                                <td><span class="badge ${p.stock > 10 ? 'success' : 'warning'}">${p.stock}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
    } catch (e) {
        document.getElementById('productsTable').innerHTML = '<p>Error cargando productos</p>';
    }
}
