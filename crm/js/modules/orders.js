/**
 * MÓDULO DE ÓRDENES - SISTEMA MAWEWE
 * ✅ Visualización completa de órdenes
 * ✅ Filtros por estado, búsqueda y fechas
 * ✅ Actualización de estado y seguimiento
 * ✅ Vista detallada de orden
 * ✅ Estadísticas en tiempo real
 */

const OrdersModule = {
    
    API_URL: 'api/orders.php',
    currentOrders: [],
    filteredOrders: [],
    
    // Estados disponibles
    statuses: {
        'pending': { label: 'Pendiente', color: 'warning', icon: 'clock' },
        'confirmed': { label: 'Confirmado', color: 'info', icon: 'check-circle' },
        'processing': { label: 'Procesando', color: 'primary', icon: 'cog' },
        'shipped': { label: 'Enviado', color: 'success', icon: 'truck' },
        'delivered': { label: 'Entregado', color: 'success', icon: 'check-double' },
        'cancelled': { label: 'Cancelado', color: 'danger', icon: 'times-circle' }
    },
    
    // Estados de pago
    paymentStatuses: {
        'pending': { label: 'Pendiente', color: 'warning' },
        'paid': { label: 'Pagado', color: 'success' },
        'refunded': { label: 'Reembolsado', color: 'info' },
        'failed': { label: 'Fallido', color: 'danger' }
    },
    
    /**
     * Inicializar módulo
     */
    init() {
        console.log('🚀 Inicializando módulo de órdenes...');
        this.attachEventListeners();
        this.loadOrders();
    },
    
    /**
     * Adjuntar event listeners
     */
    attachEventListeners() {
        // Filtro de estado
        const statusFilter = document.getElementById('orderStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.applyFilters());
        }
        
        // Búsqueda
        const searchInput = document.getElementById('orderSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => this.applyFilters(), 300);
            });
        }
        
        // Filtros de fecha
        const dateFrom = document.getElementById('orderDateFrom');
        const dateTo = document.getElementById('orderDateTo');
        if (dateFrom) dateFrom.addEventListener('change', () => this.applyFilters());
        if (dateTo) dateTo.addEventListener('change', () => this.applyFilters());
        
        // Botón refrescar
        const refreshBtn = document.getElementById('refreshOrders');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadOrders());
        }
    },
    
    /**
     * Cargar órdenes desde la API
     */
    async loadOrders() {
        const container = document.getElementById('ordersTableBody');
        const statsContainer = document.getElementById('ordersStats');
        
        if (!container) {
            console.error('Container de órdenes no encontrado');
            return;
        }
        
        try {
            // Mostrar loading
            container.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-4">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Cargando...</span>
                        </div>
                        <p class="mt-2 mb-0">Cargando órdenes...</p>
                    </td>
                </tr>
            `;
            
            // Obtener filtros actuales
            const params = new URLSearchParams();
            
            const statusFilter = document.getElementById('orderStatusFilter');
            if (statusFilter && statusFilter.value !== 'all') {
                params.append('status', statusFilter.value);
            }
            
            const searchInput = document.getElementById('orderSearch');
            if (searchInput && searchInput.value.trim()) {
                params.append('search', searchInput.value.trim());
            }
            
            const dateFrom = document.getElementById('orderDateFrom');
            if (dateFrom && dateFrom.value) {
                params.append('date_from', dateFrom.value);
            }
            
            const dateTo = document.getElementById('orderDateTo');
            if (dateTo && dateTo.value) {
                params.append('date_to', dateTo.value);
            }
            
            const url = params.toString() ? `${this.API_URL}?${params.toString()}` : this.API_URL;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'Error al cargar órdenes');
            }
            
            this.currentOrders = result.data || [];
            this.filteredOrders = this.currentOrders;
            
            console.log(`✅ ${this.currentOrders.length} órdenes cargadas`);
            
            // Renderizar
            this.renderOrders();
            this.updateStats();
            
        } catch (error) {
            console.error('❌ Error al cargar órdenes:', error);
            container.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-4 text-danger">
                        <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                        <p class="mb-0">Error al cargar órdenes: ${error.message}</p>
                        <button class="btn btn-sm btn-primary mt-2" onclick="OrdersModule.loadOrders()">
                            <i class="fas fa-redo"></i> Reintentar
                        </button>
                    </td>
                </tr>
            `;
        }
    },
    
    /**
     * Aplicar filtros locales
     */
    applyFilters() {
        // Reload desde API con filtros
        this.loadOrders();
    },
    
    /**
     * Renderizar órdenes en la tabla
     */
    renderOrders() {
        const container = document.getElementById('ordersTableBody');
        
        if (!container) return;
        
        if (this.filteredOrders.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-4 text-muted">
                        <i class="fas fa-inbox fa-3x mb-3 opacity-50"></i>
                        <p class="mb-0">No se encontraron órdenes</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        container.innerHTML = this.filteredOrders.map(order => `
            <tr>
                <td>
                    <strong class="text-primary">${this.escapeHtml(order.order_number)}</strong>
                </td>
                <td>
                    <div>${this.escapeHtml(order.customer_name)}</div>
                    <small class="text-muted">${this.escapeHtml(order.customer_email)}</small>
                </td>
                <td class="text-center">
                    <span class="badge bg-secondary">${order.items_count || 0}</span>
                </td>
                <td class="text-end">
                    <strong>$${this.formatMoney(order.total)}</strong>
                </td>
                <td class="text-center">
                    ${this.renderStatusBadge(order.status)}
                </td>
                <td class="text-center">
                    ${this.renderPaymentStatusBadge(order.payment_status)}
                </td>
                <td>
                    <small>${this.formatDate(order.created_at)}</small>
                </td>
                <td class="text-center">
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-outline-primary" onclick="OrdersModule.viewOrder(${order.id})" title="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-success" onclick="OrdersModule.updateOrderStatus(${order.id})" title="Actualizar estado">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    },
    
    /**
     * Actualizar estadísticas
     */
    updateStats() {
        const statsContainer = document.getElementById('ordersStats');
        if (!statsContainer) return;
        
        const total = this.currentOrders.length;
        const pending = this.currentOrders.filter(o => o.status === 'pending').length;
        const processing = this.currentOrders.filter(o => o.status === 'processing').length;
        const shipped = this.currentOrders.filter(o => o.status === 'shipped').length;
        const delivered = this.currentOrders.filter(o => o.status === 'delivered').length;
        
        const totalRevenue = this.currentOrders
            .filter(o => o.payment_status === 'paid')
            .reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
        
        statsContainer.innerHTML = `
            <div class="row g-3">
                <div class="col-md-2">
                    <div class="card border-0 bg-primary bg-opacity-10">
                        <div class="card-body text-center">
                            <i class="fas fa-shopping-cart fa-2x text-primary mb-2"></i>
                            <h3 class="mb-0">${total}</h3>
                            <small class="text-muted">Total Órdenes</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-2">
                    <div class="card border-0 bg-warning bg-opacity-10">
                        <div class="card-body text-center">
                            <i class="fas fa-clock fa-2x text-warning mb-2"></i>
                            <h3 class="mb-0">${pending}</h3>
                            <small class="text-muted">Pendientes</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-2">
                    <div class="card border-0 bg-info bg-opacity-10">
                        <div class="card-body text-center">
                            <i class="fas fa-cog fa-2x text-info mb-2"></i>
                            <h3 class="mb-0">${processing}</h3>
                            <small class="text-muted">Procesando</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-2">
                    <div class="card border-0 bg-primary bg-opacity-10">
                        <div class="card-body text-center">
                            <i class="fas fa-truck fa-2x text-primary mb-2"></i>
                            <h3 class="mb-0">${shipped}</h3>
                            <small class="text-muted">Enviados</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-2">
                    <div class="card border-0 bg-success bg-opacity-10">
                        <div class="card-body text-center">
                            <i class="fas fa-check-double fa-2x text-success mb-2"></i>
                            <h3 class="mb-0">${delivered}</h3>
                            <small class="text-muted">Entregados</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-2">
                    <div class="card border-0 bg-success bg-opacity-10">
                        <div class="card-body text-center">
                            <i class="fas fa-dollar-sign fa-2x text-success mb-2"></i>
                            <h3 class="mb-0">$${this.formatMoney(totalRevenue)}</h3>
                            <small class="text-muted">Ingresos</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    
    /**
     * Ver detalles de una orden
     */
    async viewOrder(orderId) {
        const order = this.currentOrders.find(o => o.id === orderId);
        if (!order) {
            alert('Orden no encontrada');
            return;
        }
        
        const modalHtml = `
            <div class="modal fade" id="orderDetailModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-file-invoice"></i> Detalles de Orden ${this.escapeHtml(order.order_number)}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row mb-4">
                                <div class="col-md-6">
                                    <h6 class="border-bottom pb-2 mb-3">Información del Cliente</h6>
                                    <p><strong>Nombre:</strong> ${this.escapeHtml(order.customer_name)}</p>
                                    <p><strong>Email:</strong> ${this.escapeHtml(order.customer_email)}</p>
                                    <p><strong>Teléfono:</strong> ${this.escapeHtml(order.customer_phone)}</p>
                                    ${order.customer_cedula ? `<p><strong>Cédula:</strong> ${this.escapeHtml(order.customer_cedula)}</p>` : ''}
                                    <p><strong>Dirección:</strong><br>${this.escapeHtml(order.customer_address)}</p>
                                </div>
                                <div class="col-md-6">
                                    <h6 class="border-bottom pb-2 mb-3">Información de Envío y Pago</h6>
                                    <p><strong>Método de envío:</strong> ${this.escapeHtml(order.shipping_method)}</p>
                                    <p><strong>Costo de envío:</strong> $${this.formatMoney(order.shipping_cost)}</p>
                                    <p><strong>Método de pago:</strong> ${this.escapeHtml(order.payment_method)}</p>
                                    <p><strong>Estado:</strong> ${this.renderStatusBadge(order.status)}</p>
                                    <p><strong>Pago:</strong> ${this.renderPaymentStatusBadge(order.payment_status)}</p>
                                    ${order.tracking_number ? `<p><strong>Tracking:</strong> ${this.escapeHtml(order.tracking_number)}</p>` : ''}
                                </div>
                            </div>
                            
                            <h6 class="border-bottom pb-2 mb-3">Productos</h6>
                            <div class="table-responsive">
                                <table class="table table-sm">
                                    <thead>
                                        <tr>
                                            <th>Producto</th>
                                            <th class="text-center">Cantidad</th>
                                            <th class="text-end">Precio Unit.</th>
                                            <th class="text-end">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${this.renderOrderItems(order.items)}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colspan="3" class="text-end"><strong>Subtotal:</strong></td>
                                            <td class="text-end">$${this.formatMoney(order.subtotal)}</td>
                                        </tr>
                                        <tr>
                                            <td colspan="3" class="text-end"><strong>Envío:</strong></td>
                                            <td class="text-end">$${this.formatMoney(order.shipping_cost)}</td>
                                        </tr>
                                        ${order.tax > 0 ? `
                                        <tr>
                                            <td colspan="3" class="text-end"><strong>IVA:</strong></td>
                                            <td class="text-end">$${this.formatMoney(order.tax)}</td>
                                        </tr>
                                        ` : ''}
                                        <tr class="fw-bold">
                                            <td colspan="3" class="text-end"><strong>TOTAL:</strong></td>
                                            <td class="text-end text-primary">$${this.formatMoney(order.total)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                            
                            ${order.notes ? `
                            <div class="mt-3">
                                <h6>Notas:</h6>
                                <p class="text-muted">${this.escapeHtml(order.notes)}</p>
                            </div>
                            ` : ''}
                            
                            <div class="mt-3">
                                <small class="text-muted">
                                    <strong>Creado:</strong> ${this.formatDate(order.created_at)} | 
                                    <strong>Actualizado:</strong> ${this.formatDate(order.updated_at)}
                                </small>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                            <button type="button" class="btn btn-primary" onclick="OrdersModule.updateOrderStatus(${order.id})">
                                <i class="fas fa-edit"></i> Actualizar Estado
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Eliminar modal previo si existe
        const existingModal = document.getElementById('orderDetailModal');
        if (existingModal) existingModal.remove();
        
        // Insertar y mostrar modal
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('orderDetailModal'));
        modal.show();
    },
    
    /**
     * Actualizar estado de orden
     */
    async updateOrderStatus(orderId) {
        const order = this.currentOrders.find(o => o.id === orderId);
        if (!order) {
            alert('Orden no encontrada');
            return;
        }
        
        const modalHtml = `
            <div class="modal fade" id="updateStatusModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Actualizar Estado - ${this.escapeHtml(order.order_number)}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="updateStatusForm">
                                <div class="mb-3">
                                    <label class="form-label">Estado de la Orden</label>
                                    <select class="form-select" id="orderStatus" required>
                                        ${Object.entries(this.statuses).map(([value, config]) => `
                                            <option value="${value}" ${order.status === value ? 'selected' : ''}>
                                                ${config.label}
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Estado de Pago</label>
                                    <select class="form-select" id="paymentStatus" required>
                                        ${Object.entries(this.paymentStatuses).map(([value, config]) => `
                                            <option value="${value}" ${order.payment_status === value ? 'selected' : ''}>
                                                ${config.label}
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Número de Seguimiento (Opcional)</label>
                                    <input type="text" class="form-control" id="trackingNumber" 
                                           value="${order.tracking_number || ''}" 
                                           placeholder="Ej: ABC123456789">
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Notas (Opcional)</label>
                                    <textarea class="form-control" id="orderNotes" rows="3">${order.notes || ''}</textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-primary" onclick="OrdersModule.saveStatusUpdate(${orderId})">
                                <i class="fas fa-save"></i> Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Eliminar modal previo si existe
        const existingModal = document.getElementById('updateStatusModal');
        if (existingModal) existingModal.remove();
        
        // Insertar y mostrar modal
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('updateStatusModal'));
        modal.show();
    },
    
    /**
     * Guardar actualización de estado
     */
    async saveStatusUpdate(orderId) {
        const statusInput = document.getElementById('orderStatus');
        const paymentInput = document.getElementById('paymentStatus');
        const trackingInput = document.getElementById('trackingNumber');
        const notesInput = document.getElementById('orderNotes');
        
        if (!statusInput || !paymentInput) {
            alert('Error: campos no encontrados');
            return;
        }
        
        try {
            const data = {
                id: orderId,
                status: statusInput.value,
                payment_status: paymentInput.value,
                tracking_number: trackingInput ? trackingInput.value.trim() : null,
                notes: notesInput ? notesInput.value.trim() : null
            };
            
            const response = await fetch(this.API_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'Error al actualizar');
            }
            
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('updateStatusModal'));
            if (modal) modal.hide();
            
            // Recargar órdenes
            await this.loadOrders();
            
            // Mostrar mensaje
            alert('✅ Estado actualizado correctamente');
            
        } catch (error) {
            console.error('Error:', error);
            alert('❌ Error al actualizar: ' + error.message);
        }
    },
    
    /**
     * Renderizar items de orden
     */
    renderOrderItems(items) {
        if (!Array.isArray(items) || items.length === 0) {
            return '<tr><td colspan="4" class="text-center text-muted">Sin productos</td></tr>';
        }
        
        return items.map(item => `
            <tr>
                <td>${this.escapeHtml(item.name || 'Producto')}</td>
                <td class="text-center">${item.quantity || 1}</td>
                <td class="text-end">$${this.formatMoney(item.price || 0)}</td>
                <td class="text-end">$${this.formatMoney((item.price || 0) * (item.quantity || 1))}</td>
            </tr>
        `).join('');
    },
    
    /**
     * Renderizar badge de estado
     */
    renderStatusBadge(status) {
        const config = this.statuses[status] || { label: status, color: 'secondary', icon: 'question' };
        return `<span class="badge bg-${config.color}">
            <i class="fas fa-${config.icon}"></i> ${config.label}
        </span>`;
    },
    
    /**
     * Renderizar badge de estado de pago
     */
    renderPaymentStatusBadge(status) {
        const config = this.paymentStatuses[status] || { label: status, color: 'secondary' };
        return `<span class="badge bg-${config.color}">${config.label}</span>`;
    },
    
    /**
     * Formatear dinero
     */
    formatMoney(amount) {
        return parseFloat(amount || 0).toFixed(2);
    },
    
    /**
     * Formatear fecha
     */
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString('es-EC', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    /**
     * Escapar HTML
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('ordersTableBody')) {
        OrdersModule.init();
    }
});