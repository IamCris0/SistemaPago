/**
 * MÓDULO COMPLETO DE EMPLEADOS - MAWEWE CRM
 * CRUD Profesional con todas las funcionalidades
 * ✅ Búsqueda, filtros, paginación, modales, validaciones
 */

const EmployeesModule = {
    data: [],
    currentPage: 1,
    pageSize: 10,
    searchTerm: '',
    filterStatus: 'all',
    
    async init() {
        console.log('👥 Inicializando módulo de Empleados');
        await this.loadEmployees();
        this.render();
    },
    
    async loadEmployees() {
        try {
            const response = await fetch(`${CONFIG.API_URL}/employees.php?action=list`, {
                headers: {
                    'Authorization': `Bearer ${CONFIG.getToken()}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.data = data.employees;
                console.log(`✅ Cargados ${this.data.length} empleados`);
            } else {
                throw new Error(data.message || 'Error cargando empleados');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('Error', 'No se pudieron cargar los empleados', 'error');
        }
    },
    
    render() {
        const container = document.getElementById('employeesContent');
        if (!container) return;
        
        const filtered = this.getFilteredData();
        const paginated = this.getPaginatedData(filtered);
        
        const activeCount = this.data.filter(e => e.active).length;
        const inactiveCount = this.data.filter(e => !e.active).length;
        const adminCount = this.data.filter(e => e.is_admin).length;
        
        container.innerHTML = `
            <!-- Estadísticas -->
            <div class="stats-grid" style="grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 2rem;">
                <div class="stat-card success">
                    <div class="stat-card-icon">✓</div>
                    <div class="stat-card-title">Activos</div>
                    <div class="stat-card-value">${activeCount}</div>
                </div>
                <div class="stat-card danger">
                    <div class="stat-card-icon">✕</div>
                    <div class="stat-card-title">Inactivos</div>
                    <div class="stat-card-value">${inactiveCount}</div>
                </div>
                <div class="stat-card primary">
                    <div class="stat-card-icon">👑</div>
                    <div class="stat-card-title">Administradores</div>
                    <div class="stat-card-value">${adminCount}</div>
                </div>
                <div class="stat-card info">
                    <div class="stat-card-icon">📊</div>
                    <div class="stat-card-title">Total</div>
                    <div class="stat-card-value">${this.data.length}</div>
                </div>
            </div>
            
            <!-- Controles -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Lista de Empleados</h3>
                    <div style="display: flex; gap: 1rem;">
                        <input type="text" 
                               class="form-control" 
                               placeholder="Buscar por nombre o cédula..." 
                               value="${this.searchTerm}"
                               onkeyup="EmployeesModule.handleSearch(this.value)"
                               style="width: 300px;">
                        <select class="form-control" 
                                onchange="EmployeesModule.handleFilter(this.value)"
                                style="width: 200px;">
                            <option value="all" ${this.filterStatus === 'all' ? 'selected' : ''}>Todos</option>
                            <option value="active" ${this.filterStatus === 'active' ? 'selected' : ''}>Activos</option>
                            <option value="inactive" ${this.filterStatus === 'inactive' ? 'selected' : ''}>Inactivos</option>
                            <option value="admin" ${this.filterStatus === 'admin' ? 'selected' : ''}>Administradores</option>
                        </select>
                        <button class="btn btn-primary" onclick="EmployeesModule.openCreateModal()">
                            ➕ Nuevo Empleado
                        </button>
                    </div>
                </div>
                
                <div class="card-body">
                    ${paginated.length > 0 ? `
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
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${paginated.map(emp => `
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
                                            <td>
                                                <button class="btn btn-sm btn-outline" 
                                                        onclick="EmployeesModule.viewEmployee(${emp.id})"
                                                        title="Ver">
                                                    👁
                                                </button>
                                                <button class="btn btn-sm btn-outline" 
                                                        onclick="EmployeesModule.openEditModal(${emp.id})"
                                                        title="Editar">
                                                    ✏️
                                                </button>
                                                <button class="btn btn-sm ${emp.active ? 'btn-danger' : 'btn-success'}" 
                                                        onclick="EmployeesModule.toggleStatus(${emp.id}, ${emp.active})"
                                                        title="${emp.active ? 'Desactivar' : 'Activar'}">
                                                    ${emp.active ? '🔒' : '🔓'}
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                        ${this.renderPagination(filtered.length)}
                    ` : `
                        <div style="text-align: center; padding: 4rem; color: #666;">
                            <div style="font-size: 4rem; margin-bottom: 1rem;">👥</div>
                            <h3>No se encontraron empleados</h3>
                            ${this.searchTerm || this.filterStatus !== 'all' ? 
                                `<p>Intenta ajustar los filtros de búsqueda</p>` : 
                                `<button class="btn btn-primary" onclick="EmployeesModule.openCreateModal()" style="margin-top: 1rem;">
                                    ➕ Agregar Primer Empleado
                                </button>`
                            }
                        </div>
                    `}
                </div>
            </div>
        `;
    },
    
    getFilteredData() {
        let filtered = [...this.data];
        
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(e => 
                e.nombre.toLowerCase().includes(term) ||
                e.cedula.includes(term) ||
                e.cargo.toLowerCase().includes(term)
            );
        }
        
        if (this.filterStatus !== 'all') {
            if (this.filterStatus === 'active') {
                filtered = filtered.filter(e => e.active);
            } else if (this.filterStatus === 'inactive') {
                filtered = filtered.filter(e => !e.active);
            } else if (this.filterStatus === 'admin') {
                filtered = filtered.filter(e => e.is_admin);
            }
        }
        
        return filtered;
    },
    
    getPaginatedData(data) {
        const start = (this.currentPage - 1) * this.pageSize;
        return data.slice(start, start + this.pageSize);
    },
    
    renderPagination(total) {
        const totalPages = Math.ceil(total / this.pageSize);
        if (totalPages <= 1) return '';
        
        const start = (this.currentPage - 1) * this.pageSize + 1;
        const end = Math.min(this.currentPage * this.pageSize, total);
        
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #eee;">
                <div style="color: #666;">Mostrando ${start} - ${end} de ${total} empleados</div>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-sm btn-outline" 
                            onclick="EmployeesModule.goToPage(${this.currentPage - 1})"
                            ${this.currentPage === 1 ? 'disabled' : ''}>
                        ◀
                    </button>
                    ${Array.from({length: Math.min(5, totalPages)}, (_, i) => {
                        const page = i + 1;
                        return `
                            <button class="btn btn-sm ${page === this.currentPage ? 'btn-primary' : 'btn-outline'}" 
                                    onclick="EmployeesModule.goToPage(${page})">
                                ${page}
                            </button>
                        `;
                    }).join('')}
                    <button class="btn btn-sm btn-outline" 
                            onclick="EmployeesModule.goToPage(${this.currentPage + 1})"
                            ${this.currentPage === totalPages ? 'disabled' : ''}>
                        ▶
                    </button>
                </div>
            </div>
        `;
    },
    
    handleSearch(term) {
        this.searchTerm = term;
        this.currentPage = 1;
        this.render();
    },
    
    handleFilter(status) {
        this.filterStatus = status;
        this.currentPage = 1;
        this.render();
    },
    
    goToPage(page) {
        const totalPages = Math.ceil(this.getFilteredData().length / this.pageSize);
        if (page < 1 || page > totalPages) return;
        this.currentPage = page;
        this.render();
    },
    
    openCreateModal() {
        this.showEmployeeModal();
    },
    
    openEditModal(id) {
        const employee = this.data.find(e => e.id === id);
        if (employee) {
            this.showEmployeeModal(employee);
        }
    },
    
    showEmployeeModal(employee = null) {
        const isEdit = !!employee;
        
        const modalHTML = `
            <div class="modal-overlay" id="employeeModal" onclick="if(event.target === this) EmployeesModule.closeModal()">
                <div class="modal-dialog" style="max-width: 600px;">
                    <div class="modal-header">
                        <h3 class="modal-title">${isEdit ? '✏️ Editar Empleado' : '➕ Nuevo Empleado'}</h3>
                        <button class="modal-close" onclick="EmployeesModule.closeModal()">✕</button>
                    </div>
                    <div class="modal-body">
                        <form id="employeeForm">
                            ${isEdit ? `<input type="hidden" name="id" value="${employee.id}">` : ''}
                            
                            <div class="form-group">
                                <label class="form-label">Nombre Completo <span style="color: red;">*</span></label>
                                <input type="text" 
                                       name="nombre" 
                                       class="form-control" 
                                       value="${employee?.nombre || ''}" 
                                       required
                                       placeholder="Ej: Juan Pérez">
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Cédula <span style="color: red;">*</span></label>
                                <input type="text" 
                                       name="cedula" 
                                       class="form-control" 
                                       value="${employee?.cedula || ''}" 
                                       required
                                       maxlength="10"
                                       pattern="[0-9]{10}"
                                       placeholder="1234567890">
                                <small style="color: #666;">Debe tener exactamente 10 dígitos</small>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Cargo <span style="color: red;">*</span></label>
                                <input type="text" 
                                       name="cargo" 
                                       class="form-control" 
                                       value="${employee?.cargo || 'Vendedor'}" 
                                       required
                                       placeholder="Ej: Vendedor">
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Sucursal <span style="color: red;">*</span></label>
                                <select name="sucursal" class="form-control" required>
                                    <option value="JOYERIA MATRIZ" ${employee?.sucursal === 'JOYERIA MATRIZ' ? 'selected' : ''}>JOYERIA MATRIZ</option>
                                    <option value="JOYERIA SUCURSAL 1" ${employee?.sucursal === 'JOYERIA SUCURSAL 1' ? 'selected' : ''}>JOYERIA SUCURSAL 1</option>
                                    <option value="EL PALACIO MATRIZ" ${employee?.sucursal === 'EL PALACIO MATRIZ' ? 'selected' : ''}>EL PALACIO MATRIZ</option>
                                    <option value="EL PALACIO SUCURSAL 1" ${employee?.sucursal === 'EL PALACIO SUCURSAL 1' ? 'selected' : ''}>EL PALACIO SUCURSAL 1</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                                    <input type="checkbox" 
                                           name="is_admin" 
                                           ${employee?.is_admin ? 'checked' : ''}>
                                    <span>Es Administrador</span>
                                </label>
                                <small style="color: #666; display: block; margin-top: 0.5rem;">
                                    Los administradores tienen acceso completo al sistema
                                </small>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="EmployeesModule.closeModal()">
                            Cancelar
                        </button>
                        <button class="btn btn-primary" onclick="EmployeesModule.saveEmployee()">
                            💾 ${isEdit ? 'Guardar Cambios' : 'Crear Empleado'}
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        setTimeout(() => {
            document.getElementById('employeeModal').style.display = 'flex';
        }, 10);
    },
    
    closeModal() {
        const modal = document.getElementById('employeeModal');
        if (modal) {
            modal.style.opacity = '0';
            setTimeout(() => modal.remove(), 300);
        }
    },
    
    async saveEmployee() {
        const form = document.getElementById('employeeForm');
        const formData = new FormData(form);
        
        const data = {
            nombre: formData.get('nombre'),
            cedula: formData.get('cedula'),
            cargo: formData.get('cargo'),
            sucursal: formData.get('sucursal'),
            is_admin: formData.get('is_admin') ? 1 : 0
        };
        
        const id = formData.get('id');
        const isEdit = !!id;
        
        if (isEdit) {
            data.id = parseInt(id);
        }
        
        // Validaciones
        if (!data.nombre || !data.cedula || !data.cargo) {
            showToast('Error', 'Todos los campos obligatorios deben estar completos', 'error');
            return;
        }
        
        if (data.cedula.length !== 10 || !/^\d+$/.test(data.cedula)) {
            showToast('Error', 'La cédula debe tener exactamente 10 dígitos numéricos', 'error');
            return;
        }
        
        try {
            showLoading();
            
            const url = isEdit 
                ? `${CONFIG.API_URL}/employees.php?action=update`
                : `${CONFIG.API_URL}/employees.php?action=create`;
            
            const response = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.getToken()}`
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showToast('Éxito', `Empleado ${isEdit ? 'actualizado' : 'creado'} correctamente`, 'success');
                this.closeModal();
                await this.loadEmployees();
                this.render();
            } else {
                throw new Error(result.message || 'Error al guardar');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('Error', error.message, 'error');
        } finally {
            hideLoading();
        }
    },
    
    async toggleStatus(id, currentStatus) {
        const action = currentStatus ? 'desactivar' : 'activar';
        if (!confirm(`¿Está seguro de ${action} este empleado?`)) return;
        
        try {
            showLoading();
            
            const response = await fetch(`${CONFIG.API_URL}/employees.php?action=toggle-status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.getToken()}`
                },
                body: JSON.stringify({ id })
            });
            
            const result = await response.json();
            
            if (result.success) {
                showToast('Éxito', `Empleado ${action}do correctamente`, 'success');
                await this.loadEmployees();
                this.render();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            showToast('Error', error.message, 'error');
        } finally {
            hideLoading();
        }
    },
    
    viewEmployee(id) {
        const employee = this.data.find(e => e.id === id);
        if (!employee) return;
        
        const modalHTML = `
            <div class="modal-overlay" id="employeeViewModal" onclick="if(event.target === this) document.getElementById('employeeViewModal').remove()">
                <div class="modal-dialog">
                    <div class="modal-header">
                        <h3 class="modal-title">👤 Detalles del Empleado</h3>
                        <button class="modal-close" onclick="document.getElementById('employeeViewModal').remove()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div style="display: grid; gap: 1.5rem;">
                            <div>
                                <div style="font-size: 12px; color: #666; margin-bottom: 4px;">NOMBRE COMPLETO</div>
                                <div style="font-size: 20px; font-weight: 700;">${employee.nombre}</div>
                            </div>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                                <div>
                                    <div style="font-size: 12px; color: #666; margin-bottom: 4px;">CÉDULA</div>
                                    <div style="font-weight: 600;">${employee.cedula}</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: #666; margin-bottom: 4px;">CARGO</div>
                                    <div style="font-weight: 600;">${employee.cargo}</div>
                                </div>
                            </div>
                            
                            <div>
                                <div style="font-size: 12px; color: #666; margin-bottom: 4px;">SUCURSAL</div>
                                <div style="font-weight: 600;">${employee.sucursal}</div>
                            </div>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                                <div>
                                    <div style="font-size: 12px; color: #666; margin-bottom: 4px;">ROL</div>
                                    <span class="badge ${employee.is_admin ? 'badge-primary' : 'badge-secondary'}">
                                        ${employee.is_admin ? '👑 Administrador' : '👤 Empleado'}
                                    </span>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: #666; margin-bottom: 4px;">ESTADO</div>
                                    <span class="badge ${employee.active ? 'badge-success' : 'badge-danger'}">
                                        ${employee.active ? '✓ Activo' : '✕ Inactivo'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="document.getElementById('employeeViewModal').remove()">
                            Cerrar
                        </button>
                        <button class="btn btn-primary" onclick="document.getElementById('employeeViewModal').remove(); EmployeesModule.openEditModal(${employee.id})">
                            ✏️ Editar
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        setTimeout(() => {
            document.getElementById('employeeViewModal').style.display = 'flex';
        }, 10);
    }
};

// Inicializar cuando el módulo de empleados esté activo
if (typeof Modules !== 'undefined') {
    Modules.Employees = {
        async load() {
            await EmployeesModule.init();
        }
    };
}

console.log('✅ Módulo de Empleados COMPLETO cargado');