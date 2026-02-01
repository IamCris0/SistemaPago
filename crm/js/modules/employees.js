/**
 * MÓDULO DE EMPLEADOS - CRUD COMPLETO PROFESIONAL
 * Sistema de gestión de empleados con todas las funcionalidades
 */

Modules.Employees = {
    data: [],
    currentPage: 1,
    pageSize: 10,
    searchTerm: '',
    filterStatus: 'all',
    
    async load() {
        console.log('👥 Cargando módulo Empleados');
        await this.fetchEmployees();
        this.render();
    },
    
    async fetchEmployees() {
        try {
            const response = await fetch(`${CONFIG.API_URL}/employees.php?action=list`, {
                headers: {
                    'Authorization': `Bearer ${CONFIG.getToken()}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.data = data.employees;
                return data.employees;
            } else {
                throw new Error(data.message || 'Error al cargar empleados');
            }
        } catch (error) {
            console.error('Error fetching employees:', error);
            showToast('Error', 'No se pudieron cargar los empleados', 'error');
            return [];
        }
    },
    
    render() {
        const container = document.getElementById('module-employees');
        if (!container) return;
        
        const filteredData = this.getFilteredData();
        const paginatedData = this.getPaginatedData(filteredData);
        
        const activeCount = this.data.filter(e => e.active).length;
        const inactiveCount = this.data.filter(e => !e.active).length;
        const adminCount = this.data.filter(e => e.is_admin).length;
        
        container.innerHTML = `
            <div class="page-header">
                <div class="page-header-top">
                    <div>
                        <h1 class="page-title">👥 Gestión de Empleados</h1>
                        <p class="page-description">Administra el personal de la empresa</p>
                    </div>
                    <button class="btn btn-primary" onclick="Modules.Employees.openCreateModal()">
                        ➕ Nuevo Empleado
                    </button>
                </div>
            </div>
            
            <div class="stats-row">
                <div class="stat-box success">
                    <div class="stat-box-icon">✓</div>
                    <div class="stat-box-label">Activos</div>
                    <div class="stat-box-value">${activeCount}</div>
                </div>
                
                <div class="stat-box danger">
                    <div class="stat-box-icon">✕</div>
                    <div class="stat-box-label">Inactivos</div>
                    <div class="stat-box-value">${inactiveCount}</div>
                </div>
                
                <div class="stat-box primary">
                    <div class="stat-box-icon">👑</div>
                    <div class="stat-box-label">Administradores</div>
                    <div class="stat-box-value">${adminCount}</div>
                </div>
                
                <div class="stat-box info">
                    <div class="stat-box-icon">📊</div>
                    <div class="stat-box-label">Total</div>
                    <div class="stat-box-value">${this.data.length}</div>
                </div>
            </div>
            
            <div class="data-table-wrapper">
                <div class="table-header">
                    <div class="table-title">Lista de Empleados</div>
                    <div class="table-actions">
                        <div class="search-box">
                            <input type="text" 
                                   placeholder="Buscar..." 
                                   value="${this.searchTerm}"
                                   onkeyup="Modules.Employees.handleSearch(this.value)">
                        </div>
                        <select class="filter-dropdown" onchange="Modules.Employees.handleFilter(this.value)">
                            <option value="all" ${this.filterStatus === 'all' ? 'selected' : ''}>Todos</option>
                            <option value="active" ${this.filterStatus === 'active' ? 'selected' : ''}>Activos</option>
                            <option value="inactive" ${this.filterStatus === 'inactive' ? 'selected' : ''}>Inactivos</option>
                            <option value="admin" ${this.filterStatus === 'admin' ? 'selected' : ''}>Administradores</option>
                        </select>
                    </div>
                </div>
                
                <table class="data-table">
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
                        ${paginatedData.length > 0 ? paginatedData.map(emp => `
                            <tr>
                                <td><strong>${emp.nombre}</strong></td>
                                <td>${emp.cedula}</td>
                                <td>${emp.cargo}</td>
                                <td>${emp.sucursal}</td>
                                <td>
                                    <span class="chip ${emp.is_admin ? 'chip-primary' : 'chip-info'}">
                                        ${emp.is_admin ? '👑 Admin' : '👤 Empleado'}
                                    </span>
                                </td>
                                <td>
                                    <div class="col-status">
                                        <span class="status-dot ${emp.active ? 'active' : 'inactive'}"></span>
                                        <span>${emp.active ? 'Activo' : 'Inactivo'}</span>
                                    </div>
                                </td>
                                <td>
                                    <div class="col-actions">
                                        <button class="btn-icon btn-icon-view" 
                                                onclick="Modules.Employees.viewEmployee(${emp.id})"
                                                title="Ver">
                                            👁
                                        </button>
                                        <button class="btn-icon btn-icon-edit" 
                                                onclick="Modules.Employees.openEditModal(${emp.id})"
                                                title="Editar">
                                            ✏️
                                        </button>
                                        <button class="btn-icon ${emp.active ? 'btn-icon-delete' : 'btn-icon-view'}" 
                                                onclick="Modules.Employees.toggleStatus(${emp.id}, ${emp.active})"
                                                title="${emp.active ? 'Desactivar' : 'Activar'}">
                                            ${emp.active ? '🔒' : '🔓'}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="7" style="text-align: center; padding: 3rem; color: #6B7280;">
                                    <div style="font-size: 3rem; margin-bottom: 1rem;">👥</div>
                                    <div>No se encontraron empleados</div>
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
                
                ${this.renderPagination(filteredData.length)}
            </div>
        `;
    },
    
    getFilteredData() {
        let filtered = [...this.data];
        
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(emp => 
                emp.nombre.toLowerCase().includes(term) ||
                emp.cedula.includes(term) ||
                emp.cargo.toLowerCase().includes(term)
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
            <div class="pagination">
                <div class="pagination-info">Mostrando ${start} - ${end} de ${total}</div>
                <div class="pagination-buttons">
                    <button class="pagination-btn" 
                            onclick="Modules.Employees.goToPage(${this.currentPage - 1})"
                            ${this.currentPage === 1 ? 'disabled' : ''}>◀</button>
                    ${Array.from({length: Math.min(5, totalPages)}, (_, i) => {
                        let page = i + 1;
                        if (totalPages > 5 && this.currentPage > 3) {
                            page = this.currentPage - 2 + i;
                        }
                        if (page > totalPages) return '';
                        return `<button class="pagination-btn ${page === this.currentPage ? 'active' : ''}" 
                                onclick="Modules.Employees.goToPage(${page})">${page}</button>`;
                    }).join('')}
                    <button class="pagination-btn" 
                            onclick="Modules.Employees.goToPage(${this.currentPage + 1})"
                            ${this.currentPage === totalPages ? 'disabled' : ''}>▶</button>
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
    
    async openEditModal(id) {
        const employee = this.data.find(e => e.id === id);
        if (!employee) return;
        this.showEmployeeModal(employee);
    },
    
    showEmployeeModal(employee = null) {
        const isEdit = !!employee;
        
        const modalHTML = `
            <div class="modal-overlay active" id="employeeModal">
                <div class="modal-dialog">
                    <div class="modal-header">
                        <h3 class="modal-title">${isEdit ? '✏️ Editar Empleado' : '➕ Nuevo Empleado'}</h3>
                        <button class="modal-close" onclick="Modules.Employees.closeModal()">✕</button>
                    </div>
                    <div class="modal-body">
                        <form id="employeeForm">
                            ${isEdit ? `<input type="hidden" name="id" value="${employee.id}">` : ''}
                            
                            <div class="form-row">
                                <div class="form-field">
                                    <label class="required">Nombre Completo</label>
                                    <input type="text" name="nombre" 
                                           value="${employee?.nombre || ''}" 
                                           required 
                                           placeholder="Ej: Juan Pérez">
                                </div>
                                
                                <div class="form-field">
                                    <label class="required">Cédula</label>
                                    <input type="text" name="cedula" 
                                           value="${employee?.cedula || ''}" 
                                           required 
                                           maxlength="10"
                                           placeholder="1234567890">
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-field">
                                    <label class="required">Cargo</label>
                                    <input type="text" name="cargo" 
                                           value="${employee?.cargo || 'Vendedor'}" 
                                           required>
                                </div>
                                
                                <div class="form-field">
                                    <label class="required">Sucursal</label>
                                    <select name="sucursal" required>
                                        <option value="JOYERIA MATRIZ" ${employee?.sucursal === 'JOYERIA MATRIZ' ? 'selected' : ''}>JOYERIA MATRIZ</option>
                                        <option value="JOYERIA SUCURSAL 1" ${employee?.sucursal === 'JOYERIA SUCURSAL 1' ? 'selected' : ''}>JOYERIA SUCURSAL 1</option>
                                        <option value="EL PALACIO MATRIZ" ${employee?.sucursal === 'EL PALACIO MATRIZ' ? 'selected' : ''}>EL PALACIO MATRIZ</option>
                                        <option value="EL PALACIO SUCURSAL 1" ${employee?.sucursal === 'EL PALACIO SUCURSAL 1' ? 'selected' : ''}>EL PALACIO SUCURSAL 1</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-field">
                                    <label>
                                        <input type="checkbox" name="is_admin" 
                                               ${employee?.is_admin ? 'checked' : ''}>
                                        <span style="margin-left: 8px;">Es Administrador</span>
                                    </label>
                                    <div style="font-size: 12px; color: #6B7280; margin-top: 4px;">
                                        Los administradores tienen acceso completo al sistema
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="Modules.Employees.closeModal()">
                            Cancelar
                        </button>
                        <button class="btn btn-primary" onclick="Modules.Employees.saveEmployee()">
                            💾 ${isEdit ? 'Guardar Cambios' : 'Crear Empleado'}
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },
    
    closeModal() {
        const modal = document.getElementById('employeeModal');
        if (modal) modal.remove();
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
        
        if (!data.nombre || !data.cedula || !data.cargo) {
            showToast('Error', 'Todos los campos obligatorios deben estar llenos', 'error');
            return;
        }
        
        if (data.cedula.length !== 10) {
            showToast('Error', 'La cédula debe tener 10 dígitos', 'error');
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
                await this.load();
            } else {
                throw new Error(result.message || 'Error al guardar empleado');
            }
        } catch (error) {
            console.error('Error saving employee:', error);
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
                await this.load();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Error toggling status:', error);
            showToast('Error', error.message, 'error');
        } finally {
            hideLoading();
        }
    },
    
    viewEmployee(id) {
        const employee = this.data.find(e => e.id === id);
        if (!employee) return;
        
        const modalHTML = `
            <div class="modal-overlay active" id="employeeViewModal">
                <div class="modal-dialog">
                    <div class="modal-header">
                        <h3 class="modal-title">👤 Detalles del Empleado</h3>
                        <button class="modal-close" onclick="document.getElementById('employeeViewModal').remove()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div style="display: grid; gap: 20px;">
                            <div>
                                <div style="font-size: 12px; color: #6B7280; margin-bottom: 4px;">NOMBRE</div>
                                <div style="font-size: 18px; font-weight: 700;">${employee.nombre}</div>
                            </div>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                                <div>
                                    <div style="font-size: 12px; color: #6B7280; margin-bottom: 4px;">CÉDULA</div>
                                    <div style="font-weight: 600;">${employee.cedula}</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: #6B7280; margin-bottom: 4px;">CARGO</div>
                                    <div style="font-weight: 600;">${employee.cargo}</div>
                                </div>
                            </div>
                            
                            <div>
                                <div style="font-size: 12px; color: #6B7280; margin-bottom: 4px;">SUCURSAL</div>
                                <div style="font-weight: 600;">${employee.sucursal}</div>
                            </div>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                                <div>
                                    <div style="font-size: 12px; color: #6B7280; margin-bottom: 4px;">ROL</div>
                                    <span class="chip ${employee.is_admin ? 'chip-primary' : 'chip-info'}">
                                        ${employee.is_admin ? '👑 Administrador' : '👤 Empleado'}
                                    </span>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: #6B7280; margin-bottom: 4px;">ESTADO</div>
                                    <span class="chip ${employee.active ? 'chip-success' : 'chip-danger'}">
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
                        <button class="btn btn-primary" onclick="document.getElementById('employeeViewModal').remove(); Modules.Employees.openEditModal(${employee.id})">
                            ✏️ Editar
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
};

console.log('✅ Módulo Employees CRUD completo cargado');