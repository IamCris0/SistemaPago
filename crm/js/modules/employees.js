/**
 * MÓDULO DE EMPLEADOS - VERSIÓN CORREGIDA
 * Sistema de gestión de empleados con modales funcionales
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
        
        // Remover modal existente si hay
        const existingModal = document.getElementById('employeeModal');
        if (existingModal) existingModal.remove();
        
        const modalHTML = `
            <div class="modal-overlay" id="employeeModal" style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.2s ease;
            ">
                <div class="modal-dialog" style="
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    max-width: 600px;
                    width: 90%;
                    max-height: 90vh;
                    overflow: auto;
                    animation: slideUp 0.3s ease;
                ">
                    <div class="modal-header" style="
                        padding: 24px;
                        border-bottom: 1px solid #E5E7EB;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                    ">
                        <h3 class="modal-title" style="
                            font-size: 20px;
                            font-weight: 700;
                            color: #111827;
                            margin: 0;
                        ">${isEdit ? '✏️ Editar Empleado' : '➕ Nuevo Empleado'}</h3>
                        <button class="modal-close" onclick="Modules.Employees.closeModal()" style="
                            background: none;
                            border: none;
                            font-size: 24px;
                            cursor: pointer;
                            color: #6B7280;
                            padding: 0;
                            width: 32px;
                            height: 32px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            border-radius: 6px;
                            transition: all 0.2s;
                        " onmouseover="this.style.background='#F3F4F6'" onmouseout="this.style.background='none'">✕</button>
                    </div>
                    <div class="modal-body" style="padding: 24px;">
                        <form id="employeeForm">
                            ${isEdit ? `<input type="hidden" name="id" value="${employee.id}">` : ''}
                            
                            <div style="display: grid; gap: 20px;">
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                    <div class="form-field">
                                        <label style="
                                            display: block;
                                            font-size: 14px;
                                            font-weight: 600;
                                            color: #374151;
                                            margin-bottom: 8px;
                                        ">Nombre Completo <span style="color: #EF4444;">*</span></label>
                                        <input type="text" name="nombre" 
                                               value="${employee?.nombre || ''}" 
                                               required 
                                               placeholder="Ej: Juan Pérez"
                                               style="
                                                   width: 100%;
                                                   padding: 10px 12px;
                                                   border: 1px solid #D1D5DB;
                                                   border-radius: 6px;
                                                   font-size: 14px;
                                                   transition: all 0.2s;
                                                   box-sizing: border-box;
                                               "
                                               onfocus="this.style.borderColor='#3B82F6'; this.style.outline='none'; this.style.boxShadow='0 0 0 3px rgba(59, 130, 246, 0.1)'"
                                               onblur="this.style.borderColor='#D1D5DB'; this.style.boxShadow='none'">
                                    </div>
                                    
                                    <div class="form-field">
                                        <label style="
                                            display: block;
                                            font-size: 14px;
                                            font-weight: 600;
                                            color: #374151;
                                            margin-bottom: 8px;
                                        ">Cédula <span style="color: #EF4444;">*</span></label>
                                        <input type="text" name="cedula" 
                                               value="${employee?.cedula || ''}" 
                                               required 
                                               maxlength="10"
                                               placeholder="1234567890"
                                               style="
                                                   width: 100%;
                                                   padding: 10px 12px;
                                                   border: 1px solid #D1D5DB;
                                                   border-radius: 6px;
                                                   font-size: 14px;
                                                   transition: all 0.2s;
                                                   box-sizing: border-box;
                                               "
                                               onfocus="this.style.borderColor='#3B82F6'; this.style.outline='none'; this.style.boxShadow='0 0 0 3px rgba(59, 130, 246, 0.1)'"
                                               onblur="this.style.borderColor='#D1D5DB'; this.style.boxShadow='none'">
                                    </div>
                                </div>
                                
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                    <div class="form-field">
                                        <label style="
                                            display: block;
                                            font-size: 14px;
                                            font-weight: 600;
                                            color: #374151;
                                            margin-bottom: 8px;
                                        ">Cargo <span style="color: #EF4444;">*</span></label>
                                        <input type="text" name="cargo" 
                                               value="${employee?.cargo || 'Vendedor'}" 
                                               required
                                               style="
                                                   width: 100%;
                                                   padding: 10px 12px;
                                                   border: 1px solid #D1D5DB;
                                                   border-radius: 6px;
                                                   font-size: 14px;
                                                   transition: all 0.2s;
                                                   box-sizing: border-box;
                                               "
                                               onfocus="this.style.borderColor='#3B82F6'; this.style.outline='none'; this.style.boxShadow='0 0 0 3px rgba(59, 130, 246, 0.1)'"
                                               onblur="this.style.borderColor='#D1D5DB'; this.style.boxShadow='none'">
                                    </div>
                                    
                                    <div class="form-field">
                                        <label style="
                                            display: block;
                                            font-size: 14px;
                                            font-weight: 600;
                                            color: #374151;
                                            margin-bottom: 8px;
                                        ">Sucursal <span style="color: #EF4444;">*</span></label>
                                        <select name="sucursal" required
                                                style="
                                                    width: 100%;
                                                    padding: 10px 12px;
                                                    border: 1px solid #D1D5DB;
                                                    border-radius: 6px;
                                                    font-size: 14px;
                                                    transition: all 0.2s;
                                                    background: white;
                                                    box-sizing: border-box;
                                                "
                                                onfocus="this.style.borderColor='#3B82F6'; this.style.outline='none'; this.style.boxShadow='0 0 0 3px rgba(59, 130, 246, 0.1)'"
                                                onblur="this.style.borderColor='#D1D5DB'; this.style.boxShadow='none'">
                                            <option value="PALACIO/MAWEWE" ${employee?.sucursal === 'PALACIO/MAWEWE' ? 'selected' : ''}>PALACIO/MAWEWE</option>
                                            <option value="JOYERÍA MATRIZ" ${employee?.sucursal === 'JOYERÍA MATRIZ' ? 'selected' : ''}>JOYERÍA MATRIZ</option>
                                            <option value="JOYERÍA SUCURSAL 1" ${employee?.sucursal === 'JOYERÍA SUCURSAL 1' ? 'selected' : ''}>JOYERÍA SUCURSAL 1</option>
                                            <option value="EL PALACIO MATRIZ" ${employee?.sucursal === 'EL PALACIO MATRIZ' ? 'selected' : ''}>EL PALACIO MATRIZ</option>
                                            <option value="EL PALACIO SUCURSAL 1" ${employee?.sucursal === 'EL PALACIO SUCURSAL 1' ? 'selected' : ''}>EL PALACIO SUCURSAL 1</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div class="form-field">
                                    <label style="
                                        display: flex;
                                        align-items: center;
                                        cursor: pointer;
                                        user-select: none;
                                    ">
                                        <input type="checkbox" name="is_admin" 
                                               ${employee?.is_admin ? 'checked' : ''}
                                               style="
                                                   width: 18px;
                                                   height: 18px;
                                                   cursor: pointer;
                                               ">
                                        <span style="
                                            margin-left: 8px;
                                            font-size: 14px;
                                            font-weight: 600;
                                            color: #374151;
                                        ">Es Administrador</span>
                                    </label>
                                    <div style="font-size: 12px; color: #6B7280; margin-top: 4px; margin-left: 26px;">
                                        Los administradores tienen acceso completo al sistema
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer" style="
                        padding: 16px 24px;
                        border-top: 1px solid #E5E7EB;
                        display: flex;
                        gap: 12px;
                        justify-content: flex-end;
                        background: #F9FAFB;
                    ">
                        <button class="btn btn-secondary" onclick="Modules.Employees.closeModal()" style="
                            padding: 10px 20px;
                            border: 1px solid #D1D5DB;
                            background: white;
                            color: #374151;
                            border-radius: 6px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.2s;
                        " onmouseover="this.style.background='#F3F4F6'" onmouseout="this.style.background='white'">
                            Cancelar
                        </button>
                        <button class="btn btn-primary" onclick="Modules.Employees.saveEmployee()" style="
                            padding: 10px 20px;
                            border: none;
                            background: #3B82F6;
                            color: white;
                            border-radius: 6px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.2s;
                        " onmouseover="this.style.background='#2563EB'" onmouseout="this.style.background='#3B82F6'">
                            💾 ${isEdit ? 'Guardar Cambios' : 'Crear Empleado'}
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Agregar estilos de animación si no existen
        if (!document.getElementById('modal-animations')) {
            const style = document.createElement('style');
            style.id = 'modal-animations';
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { 
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to { 
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `;
            document.head.appendChild(style);
        }
    },
    
    closeModal() {
        const modal = document.getElementById('employeeModal');
        if (modal) {
            modal.style.animation = 'fadeOut 0.2s ease';
            setTimeout(() => modal.remove(), 200);
        }
        
        const viewModal = document.getElementById('employeeViewModal');
        if (viewModal) {
            viewModal.style.animation = 'fadeOut 0.2s ease';
            setTimeout(() => viewModal.remove(), 200);
        }
    },
    
    async saveEmployee() {
        const form = document.getElementById('employeeForm');
        const formData = new FormData(form);
        
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
        
        // Validaciones
        if (!data.nombre || !data.cedula || !data.cargo) {
            alert('❌ Todos los campos obligatorios deben estar llenos');
            return;
        }
        
        if (data.cedula.length !== 10 || !/^\d+$/.test(data.cedula)) {
            alert('❌ La cédula debe tener exactamente 10 dígitos numéricos');
            return;
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
                alert(`✅ Empleado ${isEdit ? 'actualizado' : 'creado'} correctamente`);
                this.closeModal();
                await this.load();
            } else {
                throw new Error(result.message || 'Error al guardar empleado');
            }
        } catch (error) {
            console.error('Error saving employee:', error);
            alert('❌ Error: ' + error.message);
        }
    },
    
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
                alert(`✅ Empleado ${action}do correctamente`);
                await this.load();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Error toggling status:', error);
            alert('❌ Error: ' + error.message);
        }
    },
    
    viewEmployee(id) {
        const employee = this.data.find(e => e.id === id);
        if (!employee) return;
        
        // Remover modal existente
        const existing = document.getElementById('employeeViewModal');
        if (existing) existing.remove();
        
        const modalHTML = `
            <div class="modal-overlay" id="employeeViewModal" style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.2s ease;
            ">
                <div class="modal-dialog" style="
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    max-width: 500px;
                    width: 90%;
                    animation: slideUp 0.3s ease;
                ">
                    <div class="modal-header" style="
                        padding: 24px;
                        border-bottom: 1px solid #E5E7EB;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                    ">
                        <h3 class="modal-title" style="
                            font-size: 20px;
                            font-weight: 700;
                            color: #111827;
                            margin: 0;
                        ">👤 Detalles del Empleado</h3>
                        <button onclick="document.getElementById('employeeViewModal').remove()" style="
                            background: none;
                            border: none;
                            font-size: 24px;
                            cursor: pointer;
                            color: #6B7280;
                            padding: 0;
                            width: 32px;
                            height: 32px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            border-radius: 6px;
                        ">✕</button>
                    </div>
                    <div class="modal-body" style="padding: 24px;">
                        <div style="display: grid; gap: 20px;">
                            <div>
                                <div style="font-size: 12px; color: #6B7280; margin-bottom: 4px; font-weight: 600;">NOMBRE</div>
                                <div style="font-size: 18px; font-weight: 700; color: #111827;">${employee.nombre}</div>
                            </div>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                                <div>
                                    <div style="font-size: 12px; color: #6B7280; margin-bottom: 4px; font-weight: 600;">CÉDULA</div>
                                    <div style="font-weight: 600; color: #374151;">${employee.cedula}</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: #6B7280; margin-bottom: 4px; font-weight: 600;">CARGO</div>
                                    <div style="font-weight: 600; color: #374151;">${employee.cargo}</div>
                                </div>
                            </div>
                            
                            <div>
                                <div style="font-size: 12px; color: #6B7280; margin-bottom: 4px; font-weight: 600;">SUCURSAL</div>
                                <div style="font-weight: 600; color: #374151;">${employee.sucursal}</div>
                            </div>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                                <div>
                                    <div style="font-size: 12px; color: #6B7280; margin-bottom: 8px; font-weight: 600;">ROL</div>
                                    <span style="
                                        display: inline-block;
                                        padding: 6px 12px;
                                        background: ${employee.is_admin ? '#DBEAFE' : '#E0E7FF'};
                                        color: ${employee.is_admin ? '#1E40AF' : '#4338CA'};
                                        border-radius: 6px;
                                        font-size: 13px;
                                        font-weight: 600;
                                    ">
                                        ${employee.is_admin ? '👑 Administrador' : '👤 Empleado'}
                                    </span>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: #6B7280; margin-bottom: 8px; font-weight: 600;">ESTADO</div>
                                    <span style="
                                        display: inline-block;
                                        padding: 6px 12px;
                                        background: ${employee.active ? '#D1FAE5' : '#FEE2E2'};
                                        color: ${employee.active ? '#065F46' : '#991B1B'};
                                        border-radius: 6px;
                                        font-size: 13px;
                                        font-weight: 600;
                                    ">
                                        ${employee.active ? '✓ Activo' : '✕ Inactivo'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer" style="
                        padding: 16px 24px;
                        border-top: 1px solid #E5E7EB;
                        display: flex;
                        gap: 12px;
                        justify-content: flex-end;
                        background: #F9FAFB;
                    ">
                        <button onclick="document.getElementById('employeeViewModal').remove()" style="
                            padding: 10px 20px;
                            border: 1px solid #D1D5DB;
                            background: white;
                            color: #374151;
                            border-radius: 6px;
                            font-weight: 600;
                            cursor: pointer;
                        ">
                            Cerrar
                        </button>
                        <button onclick="document.getElementById('employeeViewModal').remove(); Modules.Employees.openEditModal(${employee.id})" style="
                            padding: 10px 20px;
                            border: none;
                            background: #3B82F6;
                            color: white;
                            border-radius: 6px;
                            font-weight: 600;
                            cursor: pointer;
                        ">
                            ✏️ Editar
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
};

console.log('✅ Módulo Employees CORREGIDO cargado');