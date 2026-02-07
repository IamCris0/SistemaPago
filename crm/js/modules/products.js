/**
 * MÓDULO DE PRODUCTOS - MAWEWE CRM v5.0 COMPLETO
 * ✅ CRUD Completo: Crear, Leer, Actualizar, Eliminar
 * ✅ Gestión de stock
 * ✅ Categorías
 * ✅ Búsqueda y filtros
 * ✅ Sin imágenes (foco en gestión de datos)
 */

const ProductsModule = {
    products: [],
    categories: [],
    filteredProducts: [],
    currentFilter: {
        search: '',
        category: '',
        status: ''
    },
    
    /**
     * Inicializar módulo
     */
    async init() {
        console.log('🎯 ProductsModule.init() ejecutado');
        
        const container = document.getElementById('productsContainer');
        if (!container) {
            console.error('❌ #productsContainer no encontrado');
            return;
        }
        
        try {
            container.innerHTML = this.renderLoading();
            await this.loadProducts();
            this.render();
            this.attachEvents();
            console.log('✅ ProductsModule inicializado');
        } catch (error) {
            console.error('❌ Error:', error);
            this.showError(error.message);
        }
    },
    
    /**
     * Cargar productos desde API
     */
    async loadProducts() {
        const response = await fetch(`${CONFIG.API_URL}/products_crud.php?action=list&limit=1000`);
        const data = await response.json();
        
        if (!data.success) throw new Error(data.message || 'Error al cargar productos');
        
        this.products = data.products || [];
        this.filteredProducts = [...this.products];
        this.categories = [...new Set(this.products.map(p => p.category))].filter(Boolean);
        
        console.log(`✅ ${this.products.length} productos cargados`);
    },
    
    /**
     * Renderizar módulo completo
     */
    render() {
        const container = document.getElementById('productsContainer');
        if (!container) return;
        
        container.innerHTML = `
            ${this.renderHeader()}
            ${this.renderStats()}
            ${this.renderFilters()}
            ${this.renderProductsGrid()}
        `;
    },
    
    /**
     * Renderizar encabezado
     */
    renderHeader() {
        return `
            <div class="products-header">
                <div class="header-left">
                    <h2>📦 Productos (${this.filteredProducts.length})</h2>
                    <p>Gestión completa de inventario</p>
                </div>
                <div class="header-right">
                    <button class="btn btn-primary" onclick="ProductsModule.openCreateModal()">
                        ➕ Nuevo Producto
                    </button>
                </div>
            </div>
        `;
    },
    
    /**
     * Renderizar estadísticas
     */
    renderStats() {
        const total = this.products.length;
        const active = this.products.filter(p => p.status === 'active').length;
        const lowStock = this.products.filter(p => p.stock > 0 && p.stock < 10).length;
        const outStock = this.products.filter(p => p.stock === 0).length;
        
        return `
            <div class="products-stats">
                <div class="stat-card stat-primary">
                    <div class="stat-icon">📦</div>
                    <div class="stat-info">
                        <p class="stat-label">Total Productos</p>
                        <p class="stat-value">${total}</p>
                    </div>
                </div>
                <div class="stat-card stat-success">
                    <div class="stat-icon">✅</div>
                    <div class="stat-info">
                        <p class="stat-label">Activos</p>
                        <p class="stat-value">${active}</p>
                    </div>
                </div>
                <div class="stat-card stat-warning">
                    <div class="stat-icon">⚠️</div>
                    <div class="stat-info">
                        <p class="stat-label">Stock Bajo</p>
                        <p class="stat-value">${lowStock}</p>
                    </div>
                </div>
                <div class="stat-card stat-danger">
                    <div class="stat-icon">❌</div>
                    <div class="stat-info">
                        <p class="stat-label">Sin Stock</p>
                        <p class="stat-value">${outStock}</p>
                    </div>
                </div>
            </div>
        `;
    },
    
    /**
     * Renderizar filtros
     */
    renderFilters() {
        return `
            <div class="products-filters">
                <div class="filter-group">
                    <input 
                        type="text" 
                        id="searchInput" 
                        class="filter-input" 
                        placeholder="🔍 Buscar producto..."
                        value="${this.currentFilter.search}"
                    >
                </div>
                <div class="filter-group">
                    <select id="categoryFilter" class="filter-select">
                        <option value="">📂 Todas las categorías</option>
                        ${this.categories.map(cat => `
                            <option value="${cat}" ${this.currentFilter.category === cat ? 'selected' : ''}>
                                ${cat}
                            </option>
                        `).join('')}
                    </select>
                </div>
                <div class="filter-group">
                    <select id="statusFilter" class="filter-select">
                        <option value="">📊 Todos los estados</option>
                        <option value="active" ${this.currentFilter.status === 'active' ? 'selected' : ''}>✅ Activos</option>
                        <option value="inactive" ${this.currentFilter.status === 'inactive' ? 'selected' : ''}>❌ Inactivos</option>
                        <option value="low-stock" ${this.currentFilter.status === 'low-stock' ? 'selected' : ''}>⚠️ Stock Bajo</option>
                        <option value="out-stock" ${this.currentFilter.status === 'out-stock' ? 'selected' : ''}>🚫 Sin Stock</option>
                    </select>
                </div>
                <button class="btn btn-secondary" onclick="ProductsModule.clearFilters()">
                    🔄 Limpiar
                </button>
            </div>
        `;
    },
    
    /**
     * Renderizar grid de productos
     */
    renderProductsGrid() {
        if (this.filteredProducts.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <h3>No hay productos</h3>
                    <p>Comienza agregando tu primer producto</p>
                    <button class="btn btn-primary" onclick="ProductsModule.openCreateModal()">
                        ➕ Crear Producto
                    </button>
                </div>
            `;
        }
        
        return `
            <div class="products-grid">
                ${this.filteredProducts.map(product => this.renderProductCard(product)).join('')}
            </div>
        `;
    },
    
    /**
     * Renderizar tarjeta de producto
     */
    renderProductCard(product) {
        const stockClass = product.stock === 0 ? 'stock-out' : product.stock < 10 ? 'stock-low' : 'stock-ok';
        const stockText = product.stock === 0 ? 'Sin stock' : product.stock < 10 ? `Stock bajo: ${product.stock}` : `Stock: ${product.stock}`;
        const statusClass = product.status === 'active' ? 'status-active' : 'status-inactive';
        
        return `
            <div class="product-card" data-id="${product.id}">
                <div class="product-header">
                    <span class="product-badge ${stockClass}">${stockText}</span>
                    <span class="product-status ${statusClass}">
                        ${product.status === 'active' ? '✅' : '❌'}
                    </span>
                </div>
                <div class="product-body">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-category">📂 ${product.category || 'Sin categoría'}</p>
                    <p class="product-code">🏷️ Código: ${product.code || 'N/A'}</p>
                    <div class="product-price">$${parseFloat(product.price || 0).toFixed(2)}</div>
                    ${product.description ? `<p class="product-description">${product.description}</p>` : ''}
                </div>
                <div class="product-actions">
                    <button class="btn-action btn-edit" onclick="ProductsModule.openEditModal(${product.id})" title="Editar">
                        ✏️
                    </button>
                    <button class="btn-action btn-stock" onclick="ProductsModule.openStockModal(${product.id})" title="Ajustar Stock">
                        📦
                    </button>
                    <button class="btn-action btn-toggle" onclick="ProductsModule.toggleStatus(${product.id})" title="Activar/Desactivar">
                        ${product.status === 'active' ? '⏸️' : '▶️'}
                    </button>
                    <button class="btn-action btn-delete" onclick="ProductsModule.deleteProduct(${product.id})" title="Eliminar">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    },
    
    /**
     * Adjuntar eventos
     */
    attachEvents() {
        const searchInput = document.getElementById('searchInput');
        const categoryFilter = document.getElementById('categoryFilter');
        const statusFilter = document.getElementById('statusFilter');
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentFilter.search = e.target.value;
                this.applyFilters();
            });
        }
        
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.currentFilter.category = e.target.value;
                this.applyFilters();
            });
        }
        
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.currentFilter.status = e.target.value;
                this.applyFilters();
            });
        }
    },
    
    /**
     * Aplicar filtros
     */
    applyFilters() {
        this.filteredProducts = this.products.filter(product => {
            const matchSearch = !this.currentFilter.search || 
                product.name.toLowerCase().includes(this.currentFilter.search.toLowerCase()) ||
                (product.code && product.code.toLowerCase().includes(this.currentFilter.search.toLowerCase()));
            
            const matchCategory = !this.currentFilter.category || product.category === this.currentFilter.category;
            
            let matchStatus = true;
            if (this.currentFilter.status === 'active') matchStatus = product.status === 'active';
            else if (this.currentFilter.status === 'inactive') matchStatus = product.status === 'inactive';
            else if (this.currentFilter.status === 'low-stock') matchStatus = product.stock > 0 && product.stock < 10;
            else if (this.currentFilter.status === 'out-stock') matchStatus = product.stock === 0;
            
            return matchSearch && matchCategory && matchStatus;
        });
        
        this.render();
        this.attachEvents();
    },
    
    /**
     * Limpiar filtros
     */
    clearFilters() {
        this.currentFilter = { search: '', category: '', status: '' };
        this.applyFilters();
    },
    
    /**
     * Abrir modal de creación
     */
    openCreateModal() {
        const modalBody = `
            <form id="productForm" class="product-form">
                <div class="form-row">
                    <div class="form-group">
                        <label>Nombre del Producto *</label>
                        <input type="text" name="name" required placeholder="Ej: Laptop Dell XPS 15">
                    </div>
                    <div class="form-group">
                        <label>Código</label>
                        <input type="text" name="code" placeholder="Ej: PROD-001">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Categoría *</label>
                        <input type="text" name="category" required placeholder="Ej: Electrónica" list="categories">
                        <datalist id="categories">
                            ${this.categories.map(cat => `<option value="${cat}">`).join('')}
                        </datalist>
                    </div>
                    <div class="form-group">
                        <label>Precio *</label>
                        <input type="number" name="price" step="0.01" required placeholder="0.00">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Stock Inicial *</label>
                        <input type="number" name="stock" required value="0">
                    </div>
                    <div class="form-group">
                        <label>Estado</label>
                        <select name="status">
                            <option value="active">Activo</option>
                            <option value="inactive">Inactivo</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Descripción</label>
                    <textarea name="description" rows="3" placeholder="Descripción del producto..."></textarea>
                </div>
            </form>
        `;
        
        this.openModal('Crear Producto', modalBody, () => this.saveProduct());
    },
    
    /**
     * Abrir modal de edición
     */
    async openEditModal(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        
        const modalBody = `
            <form id="productForm" class="product-form">
                <input type="hidden" name="id" value="${product.id}">
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Nombre del Producto *</label>
                        <input type="text" name="name" required value="${product.name}">
                    </div>
                    <div class="form-group">
                        <label>Código</label>
                        <input type="text" name="code" value="${product.code || ''}">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Categoría *</label>
                        <input type="text" name="category" required value="${product.category || ''}" list="categories">
                        <datalist id="categories">
                            ${this.categories.map(cat => `<option value="${cat}">`).join('')}
                        </datalist>
                    </div>
                    <div class="form-group">
                        <label>Precio *</label>
                        <input type="number" name="price" step="0.01" required value="${product.price}">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Stock Actual</label>
                        <input type="number" name="stock" required value="${product.stock}" readonly>
                        <small>Para ajustar stock usa el botón 📦</small>
                    </div>
                    <div class="form-group">
                        <label>Estado</label>
                        <select name="status">
                            <option value="active" ${product.status === 'active' ? 'selected' : ''}>Activo</option>
                            <option value="inactive" ${product.status === 'inactive' ? 'selected' : ''}>Inactivo</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Descripción</label>
                    <textarea name="description" rows="3">${product.description || ''}</textarea>
                </div>
            </form>
        `;
        
        this.openModal('Editar Producto', modalBody, () => this.saveProduct(productId));
    },
    
    /**
     * Abrir modal de ajuste de stock
     */
    openStockModal(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        
        const modalBody = `
            <form id="stockForm" class="product-form">
                <div class="stock-info">
                    <h3>${product.name}</h3>
                    <p>Stock actual: <strong>${product.stock}</strong> unidades</p>
                </div>
                
                <div class="form-group">
                    <label>Tipo de Ajuste</label>
                    <select id="stockType" name="type">
                        <option value="add">➕ Agregar Stock (Compra/Entrada)</option>
                        <option value="subtract">➖ Restar Stock (Venta/Salida)</option>
                        <option value="set">📝 Establecer Stock (Inventario)</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Cantidad</label>
                    <input type="number" name="quantity" required min="0" value="0">
                </div>
                
                <div class="form-group">
                    <label>Motivo</label>
                    <input type="text" name="reason" placeholder="Ej: Compra de mercadería">
                </div>
            </form>
        `;
        
        this.openModal('Ajustar Stock', modalBody, () => this.updateStock(productId));
    },
    
    /**
     * Guardar producto (crear o editar)
     */
    async saveProduct(productId = null) {
        const form = document.getElementById('productForm');
        if (!form || !form.checkValidity()) {
            form?.reportValidity();
            return;
        }
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        try {
            const action = productId ? 'update' : 'create';
            const response = await fetch(`${CONFIG.API_URL}/products_crud.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...data })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.closeModal();
                await this.loadProducts();
                this.render();
                this.attachEvents();
                this.showNotification(`Producto ${productId ? 'actualizado' : 'creado'} exitosamente`, 'success');
            } else {
                this.showNotification(result.message || 'Error al guardar', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showNotification('Error al guardar el producto', 'error');
        }
    },
    
    /**
     * Actualizar stock
     */
    async updateStock(productId) {
        const form = document.getElementById('stockForm');
        if (!form || !form.checkValidity()) {
            form?.reportValidity();
            return;
        }
        
        const formData = new FormData(form);
        const type = formData.get('type');
        const quantity = parseInt(formData.get('quantity'));
        const reason = formData.get('reason');
        
        if (quantity <= 0) {
            this.showNotification('La cantidad debe ser mayor a 0', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${CONFIG.API_URL}/products_crud.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update-stock',
                    id: productId,
                    type,
                    quantity,
                    reason
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.closeModal();
                await this.loadProducts();
                this.render();
                this.attachEvents();
                this.showNotification('Stock actualizado exitosamente', 'success');
            } else {
                this.showNotification(result.message || 'Error al actualizar stock', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showNotification('Error al actualizar el stock', 'error');
        }
    },
    
    /**
     * Cambiar estado del producto
     */
    async toggleStatus(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        
        const newStatus = product.status === 'active' ? 'inactive' : 'active';
        
        try {
            const response = await fetch(`${CONFIG.API_URL}/products_crud.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'toggle-status',
                    id: productId
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                await this.loadProducts();
                this.render();
                this.attachEvents();
                this.showNotification(`Producto ${newStatus === 'active' ? 'activado' : 'desactivado'}`, 'success');
            } else {
                this.showNotification(result.message || 'Error al cambiar estado', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showNotification('Error al cambiar el estado', 'error');
        }
    },
    
    /**
     * Eliminar producto
     */
    async deleteProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        
        if (!confirm(`¿Estás seguro de eliminar "${product.name}"?\n\nEsta acción no se puede deshacer.`)) {
            return;
        }
        
        try {
            const response = await fetch(`${CONFIG.API_URL}/products_crud.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'delete',
                    id: productId
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                await this.loadProducts();
                this.render();
                this.attachEvents();
                this.showNotification('Producto eliminado exitosamente', 'success');
            } else {
                this.showNotification(result.message || 'Error al eliminar', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showNotification('Error al eliminar el producto', 'error');
        }
    },
    
    /**
     * Abrir modal genérico
     */
    openModal(title, bodyHtml, onSave) {
        const modal = document.getElementById('globalModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        const modalFooter = document.getElementById('modalFooter');
        
        if (!modal) return;
        
        modalTitle.textContent = title;
        modalBody.innerHTML = bodyHtml;
        modalFooter.innerHTML = `
            <button class="btn btn-secondary" onclick="ProductsModule.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="event.preventDefault(); (${onSave.toString()})()">Guardar</button>
        `;
        
        modal.classList.add('active');
    },
    
    /**
     * Cerrar modal
     */
    closeModal() {
        const modal = document.getElementById('globalModal');
        if (modal) {
            modal.classList.remove('active');
        }
    },
    
    /**
     * Mostrar notificación
     */
    showNotification(message, type = 'info') {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 99999;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },
    
    /**
     * Renderizar loading
     */
    renderLoading() {
        return `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Cargando productos...</p>
            </div>
        `;
    },
    
    /**
     * Mostrar error
     */
    showError(message) {
        const container = document.getElementById('productsContainer');
        if (!container) return;
        
        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">❌</div>
                <h3>Error al cargar productos</h3>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="ProductsModule.init()">
                    🔄 Reintentar
                </button>
            </div>
        `;
    }
};

// Registrar en el Router - Pasar solo la función init vinculada al módulo
if (typeof Router !== 'undefined') {
    Router.register('products', () => ProductsModule.init());
    console.log('✅ products registrado en Router');
}

// Exportar globalmente
window.ProductsModule = ProductsModule;
console.log('✅ products.js cargado');