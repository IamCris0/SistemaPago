/**
 * MÓDULO DE ÓRDENES - CRUD COMPLETO
 * Con funcionalidades reales de gestión
 */

Modules.Orders = {
    data: [],
    currentPage: 1,
    pageSize: 15,
    filterStatus: 'all',
    selectedOrder: null,
    
    async load() {
        console.log('📦 Cargando módulo Órdenes COMPLETO');
        await this.fetchOrders();
        this.render();
    },
    
    async fetchOrders() {
        try {
            showLoading();
            
            const response = await fetch(`${CONFIG.API_URL}/orders.php?action=list&page=${this.currentPage}&limit=${this.pageSize}&status=${this.filterStatus}`);
            const data = await response.json();
            
            if (data.success) {
                this.data = data.orders;
                console.log('✅ Órdenes cargadas:', this.data.length);
                return this.data;
            } else {
                throw new Error('No se pudieron cargar las órdenes');
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
            showToast('Error', 'No se pudieron cargar las órdenes', 'error');
            return [];
        } finally {
            hideLoading();
        }
    },
    
    render() {
        const container = document.getElementById('module-orders');
        if (!container) return;
        
        const completed = this.data.filter(o => o.status === 'completed').length;
        const pending = this.data.filter(o => o.status === 'pending_payment').length;
        const processing = this.data.filter(o => o.status === 'processing').length;
        const totalRevenue = this.data.reduce((sum, o) => sum + o.total, 0);
        
        container.innerHTML = `
            <div class="page-header">
                <div class="page-header-top">
                    <div>
                        <h1 class="page-title">📦 Gestión de Órdenes</h1>
                        <p class="page-description">Control completo de pedidos y ventas</p>
                    </div>
                    <button class="btn btn-outline" onclick="Modules.Orders.load()">
                        🔄 Actualizar
                    </button>
                </div>
            </div>
            
            <div class="stats-row">
                <div class="stat-box success">
                    <div class="stat-box-icon">✓</div>
                    <div class="stat-box-label">Completadas</div>
                    <div class="stat-box-value">${completed}</div>
                </div>
                <div class="stat-box warning">
                    <div class="stat-box-icon">⏱</div>
                    <div class="stat-box-label">Pendientes</div>
                    <div class="stat-box-value">${pending}</div>
                </div>
                <div class="stat-box info">
                    <div class="stat-box-icon">🔄</div>
                    <div class="stat-box-label">En Proceso</div>
                    <div class="stat-box-value">${processing}</div>
                </div>
                <div class="stat-box primary">
                    <div class="stat-box-icon">💰</div>
                    <div class="stat-box-label">Total Ventas</div>
                    <div class="stat-box-value">${formatCurrency(totalRevenue)}</div>
                </div>
            </div>
            
            <div class="data-table-wrapper">
                <div class="table-header">
                    <div class="table-title">Órdenes Recientes</div>
                    <div class="table-actions">
                        <div class="search-box">
                            <input type="text" 
                                   placeholder="Buscar órdenes..." 
                                   onkeyup="Modules.Orders.handleSearch(this.value)">
                        </div>
                        <select class="filter-dropdown" onchange="Modules.Orders.handleFilter(this.value)">
                            <option value="all" ${this.filterStatus === 'all' ? 'selected' : ''}>Todos los estados</option>
                            <option value="completed" ${this.filterStatus === 'completed' ? 'selected' : ''}>Completadas</option>
                            <option value="pending_payment" ${this.filterStatus === 'pending_payment' ? 'selected' : ''}>Pendientes</option>
                            <option value="processing" ${this.filterStatus === 'processing' ? 'selected' : ''}>En Proceso</option>
                            <option value="cancelled" ${this.filterStatus === 'cancelled' ? 'selected' : ''}>Canceladas</option>
                        </select>
                    </div>
                </div>
                
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Orden #</th>
                            <th>Cliente</th>
                            <th>Email</th>
                            <th>Items</th>
                            <th>Total</th>
                            <th>Estado</th>
                            <th>Fecha</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.data.length > 0 ? this.data.map(order => `
                            <tr>
                                <td><strong>${order.order_number}</strong></td>
                                <td>${order.first_name} ${order.last_name}</td>
                                <td>${order.email}</td>
                                <td>${order.item_count} items</td>
                                <td><strong>${formatCurrency(order.total)}</strong></td>
                                <td>
                                    <span class="chip ${this.getStatusClass(order.status)}">
                                        ${this.getStatusText(order.status)}
                                    </span>
                                </td>
                                <td>${formatDateTime(order.created_at)}</td>
                                <td>
                                    <div class="col-actions">
                                        <button class="btn-icon btn-icon-view" 
                                                onclick="Modules.Orders.viewOrder(${order.id})"
                                                title="Ver">
                                            👁
                                        </button>
                                        <button class="btn-icon btn-icon-edit" 
                                                onclick="Modules.Orders.changeStatus(${order.id}, '${order.status}')"
                                                title="Cambiar Estado">
                                            ✏️
                                        </button>
                                        <button class="btn-icon btn-icon-delete" 
                                                onclick="Modules.Orders.deleteOrder(${order.id})"
                                                title="Eliminar">
                                            🗑️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="8" style="text-align: center; padding: 3rem; color: #6B7280;">
                                    <div style="font-size: 3rem; margin-bottom: 1rem;">📦</div>
                                    <div>No hay órdenes disponibles</div>
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        `;
    },
    
    getStatusClass(status) {
        const classes = {
            'completed': 'chip-success',
            'pending_payment': 'chip-warning',
            'processing': 'chip-info',
            'cancelled': 'chip-danger'
        };
        return classes[status] || 'chip-secondary';
    },
    
    getStatusText(status) {
        const texts = {
            'completed': '✓ Completada',
            'pending_payment': '⏱ Pendiente Pago',
            'processing': '🔄 En Proceso',
            'cancelled': '✕ Cancelada'
        };
        return texts[status] || status;
    },
    
    handleSearch(term) {
        console.log('Buscando:', term);
        // Implementar búsqueda local
    },
    
    async handleFilter(status) {
        this.filterStatus = status;
        this.currentPage = 1;
        await this.load();
    },
    
    async viewOrder(orderId) {
        try {
            showLoading();
            
            const response = await fetch(`${CONFIG.API_URL}/orders.php?action=get&id=${orderId}`);
            const data = await response.json();
            
            if (data.success) {
                this.showOrderModal(data.order);
            }
        } catch (error) {
            showToast('Error', error.message, 'error');
        } finally {
            hideLoading();
        }
    },
    
    showOrderModal(order) {
        const modalHTML = `
            <div class="modal-overlay active" id="orderViewModal">
                <div class="modal-dialog" style="max-width: 800px;">
                    <div class="modal-header">
                        <h3 class="modal-title">📦 Orden ${order.order_number}</h3>
                        <button class="modal-close" onclick="document.getElementById('orderViewModal').remove()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div style="display: grid; gap: 24px;">
                            <!-- Información del Cliente -->
                            <div style="background: #F9FAFB; padding: 20px; border-radius: 8px;">
                                <h4 style="margin-bottom: 16px; color: #111827;">👤 Cliente</h4>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                    <div>
                                        <div style="font-size: 12px; color: #6B7280; margin-bottom: 4px;">NOMBRE</div>
                                        <div style="font-weight: 600;">${order.first_name} ${order.last_name}</div>
                                    </div>
                                    <div>
                                        <div style="font-size: 12px; color: #6B7280; margin-bottom: 4px;">EMAIL</div>
                                        <div style="font-weight: 600;">${order.email}</div>
                                    </div>
                                    <div>
                                        <div style="font-size: 12px; color: #6B7280; margin-bottom: 4px;">TELÉFONO</div>
                                        <div style="font-weight: 600;">${order.phone || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <div style="font-size: 12px; color: #6B7280; margin-bottom: 4px;">CIUDAD</div>
                                        <div style="font-weight: 600;">${order.city || 'N/A'}</div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Productos -->
                            <div>
                                <h4 style="margin-bottom: 16px; color: #111827;">🛍️ Productos (${order.items?.length || 0})</h4>
                                <div style="border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
                                    ${order.items?.map(item => `
                                        <div style="display: flex; align-items: center; gap: 16px; padding: 16px; border-bottom: 1px solid #F3F4F6;">
                                            <img src="${item.image || 'assets/img/no-image.png'}" 
                                                 style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;">
                                            <div style="flex: 1;">
                                                <div style="font-weight: 600; margin-bottom: 4px;">${item.product_name}</div>
                                                <div style="font-size: 13px; color: #6B7280;">SKU: ${item.product_sku}</div>
                                            </div>
                                            <div style="text-align: right;">
                                                <div style="font-weight: 600;">${item.quantity} x ${formatCurrency(item.price)}</div>
                                                <div style="font-size: 14px; color: #10B981; font-weight: 700;">${formatCurrency(item.subtotal)}</div>
                                            </div>
                                        </div>
                                    `).join('') || '<div style="padding: 20px; text-align: center; color: #999;">Sin items</div>'}
                                </div>
                            </div>
                            
                            <!-- Totales -->
                            <div style="background: #F9FAFB; padding: 20px; border-radius: 8px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                                    <span>Subtotal:</span>
                                    <strong>${formatCurrency(order.subtotal)}</strong>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                                    <span>Envío:</span>
                                    <strong>${formatCurrency(order.shipping_cost)}</strong>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding-top: 12px; border-top: 2px solid #E5E7EB; font-size: 18px;">
                                    <strong>Total:</strong>
                                    <strong style="color: #10B981;">${formatCurrency(order.total)}</strong>
                                </div>
                            </div>
                            
                            <!-- Estado y Método de Pago -->
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                <div>
                                    <div style="font-size: 12px; color: #6B7280; margin-bottom: 4px;">ESTADO</div>
                                    <span class="chip ${this.getStatusClass(order.status)}">${this.getStatusText(order.status)}</span>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: #6B7280; margin-bottom: 4px;">MÉTODO DE PAGO</div>
                                    <div style="font-weight: 600; text-transform: uppercase;">${order.payment_method}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="document.getElementById('orderViewModal').remove()">Cerrar</button>
                        <button class="btn btn-primary" onclick="document.getElementById('orderViewModal').remove(); Modules.Orders.changeStatus(${order.id}, '${order.status}')">
                            ✏️ Cambiar Estado
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },
    
    async changeStatus(orderId, currentStatus) {
        const statuses = [
            { value: 'pending_payment', label: 'Pendiente Pago' },
            { value: 'processing', label: 'En Proceso' },
            { value: 'completed', label: 'Completada' },
            { value: 'cancelled', label: 'Cancelada' }
        ];
        
        const modalHTML = `
            <div class="modal-overlay active" id="statusModal">
                <div class="modal-dialog" style="max-width: 400px;">
                    <div class="modal-header">
                        <h3 class="modal-title">✏️ Cambiar Estado</h3>
                        <button class="modal-close" onclick="document.getElementById('statusModal').remove()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-field">
                            <label>Nuevo Estado</label>
                            <select id="newStatus" class="form-control">
                                ${statuses.map(s => `
                                    <option value="${s.value}" ${s.value === currentStatus ? 'selected' : ''}>
                                        ${s.label}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="document.getElementById('statusModal').remove()">Cancelar</button>
                        <button class="btn btn-primary" onclick="Modules.Orders.saveStatus(${orderId})">💾 Guardar</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },
    
    async saveStatus(orderId) {
        const newStatus = document.getElementById('newStatus').value;
        
        try {
            showLoading();
            
            const response = await fetch(`${CONFIG.API_URL}/orders.php?action=update-status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.getToken()}`
                },
                body: JSON.stringify({
                    id: orderId,
                    status: newStatus
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast('Éxito', 'Estado actualizado correctamente', 'success');
                document.getElementById('statusModal')?.remove();
                await this.load();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            showToast('Error', error.message, 'error');
        } finally {
            hideLoading();
        }
    },
    
    async deleteOrder(orderId) {
        if (!confirm('¿Está seguro de eliminar esta orden? Esta acción no se puede deshacer.')) return;
        
        try {
            showLoading();
            
            const response = await fetch(`${CONFIG.API_URL}/orders.php?action=delete&id=${orderId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${CONFIG.getToken()}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast('Éxito', 'Orden eliminada correctamente', 'success');
                await this.load();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            showToast('Error', error.message, 'error');
        } finally {
            hideLoading();
        }
    }
};

console.log('✅ Módulo Orders CRUD completo cargado');