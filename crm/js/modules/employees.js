/**
 * MÓDULO DE EMPLEADOS - VERSIÓN PROFESIONAL
 * CRUD Completo: Crear, Leer, Actualizar, Eliminar
 * Sin emojis, diseño limpio y profesional
 */

const EmployeeModule = {
    data: [],
    currentPage: 1,
    pageSize: 15,
    searchTerm: '',
    filterStatus: 'all',
    sortBy: 'nombre',
    sortOrder: 'asc',
    
    /**
     * Inicializar módulo
     */
    async init() {
        console.log('Inicializando módulo de empleados');
        await this.loadData();
        this.render();
        this.attachEvents();
    },
    
    /**
     * Cargar datos desde API
     */
    async loadData() {
        try {
            const response = await fetch(`${CONFIG.API_URL}/employees.php?action=list`, {
                headers: {
                    'Authorization': `Bearer ${CONFIG.getToken()}`
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.data = result.employees;
                return true;
            } else {
                throw new Error(result.message || 'Error al cargar empleados');
            }
        } catch (error) {
            console.error('Error cargando empleados:', error);
            this.showNotification('Error al cargar datos', 'error');
            return false;
        }
    },
    
    /**
     * Renderizar interfaz completa
     */
    render() {
        const container = document.getElementById('employeesContainer');
        if (!container) return;
        
        const filtered = this.getFilteredData();
        const sorted = this.getSortedData(filtered);
        const paginated = this.getPaginatedData(sorted);
        
        container.innerHTML = `
            ${this.renderHeader()}
            ${this.renderStats()}
            ${this.renderFilters()}
            ${this.renderTable(paginated)}
            ${this.renderPagination(sorted.length)}
        `;
    },
    
    /**
     * Header con botón de nuevo empleado
     */
    renderHeader() {
        return `
            <div class="employee-header">
                <div class="employee-header-left">
                    <h2 class="employee-title">Gestión de Empleados</h2>
                    <p class="employee-subtitle">Administración del personal</p>
                </div>
                <div class="employee-header-right">
                    <button class="btn btn-primary" onclick="EmployeeModule.openCreateModal()">
                        <span class="btn-icon">+</span>
                        Nuevo Empleado
                    </button>
                </div>
            </div>
        `;
    },
    
    /**
     * Estadísticas resumidas
     */
    renderStats() {
        const total = this.data.length;
        const active = this.data.filter(e => e.active).length;
        const inactive = total - active;
        const admins = this.data.filter(e => e.is_admin).length;
        
        return `
            <div class="employee-stats">
                <div class="stat-card">
                    <div class="stat-label">Total</div>
                    <div class="stat-value">${total}</div>
                </div>
                <div class="stat-card stat-success">
                    <div class="stat-label">Activos</div>
                    <div class="stat-value">${active}</div>
                </div>
                <div class="stat-card stat-danger">
                    <div class="stat-label">Inactivos</div>
                    <div class="stat-value">${inactive}</div>
                </div>
                <div class="stat-card stat-info">
                    <div class="stat-label">Administradores</div>
                    <div class="stat-value">${admins}</div>
                </div>
            </div>
        `;
    },
    
    /**
     * Filtros y búsqueda
     */
    renderFilters() {
        return `
            <div class="employee-filters">
                <div class="filter-search">
                    <input 
                        type="text" 
                        class="form-input" 
                        placeholder="Buscar por nombre, cédula o cargo..."
                        value="${this.searchTerm}"
                        id="searchInput"
                    >
                </div>
                <div class="filter-controls">
                    <select class="form-select" id="filterStatus">
                        <option value="all" ${this.filterStatus === 'all' ? 'selected' : ''}>Todos</option>
                        <option value="active" ${this.filterStatus === 'active' ? 'selected' : ''}>Activos</option>
                        <option value="inactive" ${this.filterStatus === 'inactive' ? 'selected' : ''}>Inactivos</option>
                        <option value="admin" ${this.filterStatus === 'admin' ? 'selected' : ''}>Administradores</option>
                    </select>
                    <select class="form-select" id="sortBy">
                        <option value="nombre" ${this.sortBy === 'nombre' ? 'selected' : ''}>Ordenar por Nombre</option>
                        <option value="cedula" ${this.sortBy === 'cedula' ? 'selected' : ''}>Ordenar por Cédula</option>
                        <option value="cargo" ${this.sortBy === 'cargo' ? 'selected' : ''}>Ordenar por Cargo</option>
                        <option value="created_at" ${this.sortBy === 'created_at' ? 'selected' : ''}>Ordenar por Fecha</option>
                    </select>
                </div>
            </div>
        `;
    },
    
    /**
     * Tabla de empleados
     */
    renderTable(employees) {
        return `
            <div class="employee-table-wrapper">
                <table class="employee-table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Cédula</th>
                            <th>Cargo</th>
                            <th>Sucursal</th>
                            <th>Rol</th>
                            <th>Estado</th>
                            <th class="text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${employees.length > 0 ? employees.map(emp => this.renderEmployeeRow(emp)).join('') : this.renderEmptyState()}
                    </tbody>
                </table>
            </div>
        `;
    },
    
    /**
     * Fila individual de empleado
     */
    renderEmployeeRow(employee) {
        return `
            <tr>
                <td>
                    <div class="employee-name">${this.escapeHtml(employee.nombre)}</div>
                </td>
                <td>${this.escapeHtml(employee.cedula)}</td>
                <td>${this.escapeHtml(employee.cargo)}</td>
                <td>${this.escapeHtml(employee.sucursal)}</td>
                <td>
                    <span class="badge badge-${employee.is_admin ? 'primary' : 'secondary'}">
                        ${employee.is_admin ? 'Administrador' : 'Empleado'}
                    </span>
                </td>
                <td>
                    <span class="status-badge status-${employee.active ? 'active' : 'inactive'}">
                        ${employee.active ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td class="text-center">
                    <div class="action-buttons">
                        <button class="btn-action btn-view" onclick="EmployeeModule.viewEmployee(${employee.id})" title="Ver detalles">
                            Ver
                        </button>
                        <button class="btn-action btn-edit" onclick="EmployeeModule.openEditModal(${employee.id})" title="Editar">
                            Editar
                        </button>
                        <button class="btn-action btn-${employee.active ? 'disable' : 'enable'}" 
                                onclick="EmployeeModule.toggleStatus(${employee.id}, ${employee.active})" 
                                title="${employee.active ? 'Desactivar' : 'Activar'}">
                            ${employee.active ? 'Desactivar' : 'Activar'}
                        </button>
                    </div>
                </td>
            </tr>
        `;
    },
    
    /**
     * Estado vacío
     */
    renderEmptyState() {
        return `
            <tr>
                <td colspan="7" class="text-center">
                    <div class="empty-state">
                        <p>No se encontraron empleados</p>
                        <button class="btn btn-primary" onclick="EmployeeModule.openCreateModal()">
                            Agregar Primer Empleado
                        </button>
                    </div>
                </td>
            </tr>
        `;
    },
    
    /**
     * Paginación
     */
    renderPagination(total) {
        const totalPages = Math.ceil(total / this.pageSize);
        if (totalPages <= 1) return '';
        
        const start = (this.currentPage - 1) * this.pageSize + 1;
        const end = Math.min(this.currentPage * this.pageSize, total);
        
        return `
            <div class="employee-pagination">
                <div class="pagination-info">
                    Mostrando ${start} - ${end} de ${total}
                </div>
                <div class="pagination-buttons">
                    <button class="btn-pagination" 
                            onclick="EmployeeModule.goToPage(${this.currentPage - 1})"
                            ${this.currentPage === 1 ? 'disabled' : ''}>
                        Anterior
                    </button>
                    ${this.renderPageNumbers(totalPages)}
                    <button class="btn-pagination" 
                            onclick="EmployeeModule.goToPage(${this.currentPage + 1})"
                            ${this.currentPage === totalPages ? 'disabled' : ''}>
                        Siguiente
                    </button>
                </div>
            </div>
        `;
    },
    
    /**
     * Números de página
     */
    renderPageNumbers(totalPages) {
        let pages = '';
        const maxVisible = 5;
        let startPage = Math.max(1, this.currentPage - 2);
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            pages += `
                <button class="btn-pagination ${i === this.currentPage ? 'active' : ''}" 
                        onclick="EmployeeModule.goToPage(${i})">
                    ${i}
                </button>
            `;
        }
        
        return pages;
    },
    
    /**
     * Modal de creación
     */
    openCreateModal() {
        this.showModal({
            title: 'Nuevo Empleado',
            employee: null
        });
    },
    
    /**
     * Modal de edición
     */
    openEditModal(id) {
        const employee = this.data.find(e => e.id === id);
        if (!employee) {
            this.showNotification('Empleado no encontrado', 'error');
            return;
        }
        
        this.showModal({
            title: 'Editar Empleado',
            employee: employee
        });
    },
    
    /**
     * Ver detalles del empleado
     */
    viewEmployee(id) {
        const employee = this.data.find(e => e.id === id);
        if (!employee) return;
        
        const modalHTML = `
            <div class="modal-overlay" id="viewModal">
                <div class="modal-dialog modal-view">
                    <div class="modal-header">
                        <h3>Detalles del Empleado</h3>
                        <button class="btn-close" onclick="EmployeeModule.closeViewModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Nombre Completo</label>
                                <p>${this.escapeHtml(employee.nombre)}</p>
                            </div>
                            <div class="detail-item">
                                <label>Cédula</label>
                                <p>${this.escapeHtml(employee.cedula)}</p>
                            </div>
                            <div class="detail-item">
                                <label>Cargo</label>
                                <p>${this.escapeHtml(employee.cargo)}</p>
                            </div>
                            <div class="detail-item">
                                <label>Sucursal</label>
                                <p>${this.escapeHtml(employee.sucursal)}</p>
                            </div>
                            <div class="detail-item">
                                <label>Rol</label>
                                <p>
                                    <span class="badge badge-${employee.is_admin ? 'primary' : 'secondary'}">
                                        ${employee.is_admin ? 'Administrador' : 'Empleado'}
                                    </span>
                                </p>
                            </div>
                            <div class="detail-item">
                                <label>Estado</label>
                                <p>
                                    <span class="status-badge status-${employee.active ? 'active' : 'inactive'}">
                                        ${employee.active ? 'Activo' : 'Inactivo'}
                                    </span>
                                </p>
                            </div>
                            <div class="detail-item">
                                <label>Fecha de Registro</label>
                                <p>${this.formatDate(employee.created_at)}</p>
                            </div>
                            <div class="detail-item">
                                <label>Última Actualización</label>
                                <p>${this.formatDate(employee.updated_at)}</p>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="EmployeeModule.closeViewModal()">Cerrar</button>
                        <button class="btn btn-primary" onclick="EmployeeModule.closeViewModal(); EmployeeModule.openEditModal(${employee.id})">
                            Editar
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },
    
    /**
     * Mostrar modal de formulario
     */
    showModal(options) {
        const { title, employee } = options;
        const isEdit = !!employee;
        
        const modalHTML = `
            <div class="modal-overlay" id="employeeModal">
                <div class="modal-dialog">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        <button class="btn-close" onclick="EmployeeModule.closeModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <form id="employeeForm" class="employee-form">
                            ${isEdit ? `<input type="hidden" name="id" value="${employee.id}">` : ''}
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Nombre Completo *</label>
                                    <input type="text" 
                                           name="nombre" 
                                           class="form-input" 
                                           value="${employee ? this.escapeHtml(employee.nombre) : ''}"
                                           required
                                           placeholder="Ej: Juan Pérez">
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Cédula *</label>
                                    <input type="text" 
                                           name="cedula" 
                                           class="form-input" 
                                           value="${employee ? employee.cedula : ''}"
                                           required
                                           maxlength="10"
                                           pattern="[0-9]{10}"
                                           placeholder="1234567890">
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Cargo *</label>
                                    <input type="text" 
                                           name="cargo" 
                                           class="form-input" 
                                           value="${employee ? this.escapeHtml(employee.cargo) : ''}"
                                           required
                                           placeholder="Ej: Vendedor">
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Sucursal *</label>
                                    <select name="sucursal" class="form-select" required>
                                        <option value="">Seleccionar...</option>
                                        <option value="Matriz" ${employee?.sucursal === 'Matriz' ? 'selected' : ''}>Matriz</option>
                                        <option value="Sucursal 1" ${employee?.sucursal === 'Sucursal 1' ? 'selected' : ''}>Sucursal 1</option>
                                        <option value="Sucursal 2" ${employee?.sucursal === 'Sucursal 2' ? 'selected' : ''}>Sucursal 2</option>
                                        <option value="Bodega" ${employee?.sucursal === 'Bodega' ? 'selected' : ''}>Bodega</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-checkbox">
                                    <input type="checkbox" 
                                           name="is_admin" 
                                           ${employee?.is_admin ? 'checked' : ''}>
                                    <span>Es Administrador</span>
                                </label>
                                <p class="form-help">Los administradores tienen acceso completo al sistema</p>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="EmployeeModule.closeModal()">Cancelar</button>
                        <button class="btn btn-primary" onclick="EmployeeModule.saveEmployee()">
                            ${isEdit ? 'Guardar Cambios' : 'Crear Empleado'}
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },
    
    /**
     * Guardar empleado (crear o editar)
     */
    async saveEmployee() {
        const form = document.getElementById('employeeForm');
        const formData = new FormData(form);
        
        // Validar formulario
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const data = {
            nombre: formData.get('nombre').trim(),
            cedula: formData.get('cedula').trim(),
            cargo: formData.get('cargo').trim(),
            sucursal: formData.get('sucursal'),
            is_admin: formData.get('is_admin') ? 1 : 0
        };
        
        const id = formData.get('id');
        const isEdit = !!id;
        
        if (isEdit) {
            data.id = parseInt(id);
        }
        
        try {
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
                this.showNotification(
                    isEdit ? 'Empleado actualizado correctamente' : 'Empleado creado correctamente',
                    'success'
                );
                this.closeModal();
                await this.loadData();
                this.render();
            } else {
                throw new Error(result.message || 'Error al guardar');
            }
        } catch (error) {
            console.error('Error saving employee:', error);
            this.showNotification(error.message, 'error');
        }
    },
    
    /**
     * Cambiar estado (activar/desactivar)
     */
    async toggleStatus(id, currentStatus) {
        const action = currentStatus ? 'desactivar' : 'activar';
        
        if (!confirm(`¿Está seguro de ${action} este empleado?`)) return;
        
        try {
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
                this.showNotification(`Empleado ${action}do correctamente`, 'success');
                await this.loadData();
                this.render();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Error toggling status:', error);
            this.showNotification(error.message, 'error');
        }
    },
    
    /**
     * Filtrar datos
     */
    getFilteredData() {
        let filtered = [...this.data];
        
        // Búsqueda
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(emp => 
                emp.nombre.toLowerCase().includes(term) ||
                emp.cedula.includes(term) ||
                emp.cargo.toLowerCase().includes(term)
            );
        }
        
        // Filtro de estado
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
    
    /**
     * Ordenar datos
     */
    getSortedData(data) {
        return [...data].sort((a, b) => {
            let valA = a[this.sortBy];
            let valB = b[this.sortBy];
            
            // Convertir a minúsculas para comparación de strings
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            
            if (valA < valB) return this.sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return this.sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    },
    
    /**
     * Paginar datos
     */
    getPaginatedData(data) {
        const start = (this.currentPage - 1) * this.pageSize;
        return data.slice(start, start + this.pageSize);
    },
    
    /**
     * Ir a página
     */
    goToPage(page) {
        const totalPages = Math.ceil(this.getFilteredData().length / this.pageSize);
        if (page < 1 || page > totalPages) return;
        
        this.currentPage = page;
        this.render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    
    /**
     * Adjuntar eventos
     */
    attachEvents() {
        // Búsqueda
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.currentPage = 1;
                this.render();
            });
        }
        
        // Filtro de estado
        const filterStatus = document.getElementById('filterStatus');
        if (filterStatus) {
            filterStatus.addEventListener('change', (e) => {
                this.filterStatus = e.target.value;
                this.currentPage = 1;
                this.render();
            });
        }
        
        // Ordenamiento
        const sortBy = document.getElementById('sortBy');
        if (sortBy) {
            sortBy.addEventListener('change', (e) => {
                this.sortBy = e.target.value;
                this.render();
            });
        }
    },
    
    /**
     * Cerrar modal
     */
    closeModal() {
        const modal = document.getElementById('employeeModal');
        if (modal) modal.remove();
    },
    
    /**
     * Cerrar modal de vista
     */
    closeViewModal() {
        const modal = document.getElementById('viewModal');
        if (modal) modal.remove();
    },
    
    /**
     * Mostrar notificación
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },
    
    /**
     * Escapar HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    /**
     * Formatear fecha
     */
    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-EC', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
};

// Exportar módulo
window.EmployeeModule = EmployeeModule;

console.log('Módulo de empleados profesional cargado');