/**
 * MÓDULO DE PRODUCTOS
 * CRUD completo con gestión de inventario
 */

Modules.Products = {
    data: [],
    categories: [],
    currentPage: 1,
    pageSize: 12,
    searchTerm: '',
    filterCategory: 'all',
    
    async load() {
        console.log('🛍️ Cargando módulo Productos');
        await this.fetchProducts();
        this.render();
    },
    
    async fetchProducts() {
        try {
            const response = await fetch(`${CONFIG.API_URL}/products.php`);
            const data = await response.json();
            
            if (data.success) {
                this.data = data.products;
                this.categories = data.categories || [];
                return data.products;
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            showToast('Error', 'No se pudieron cargar los productos', 'error');
            return [];
        }
    },
    
    render() {
        const container = document.getElementById('module-products');
        if (!container) return;
        
        const filtered = this.getFilteredData();
        const paginated = this.getPaginatedData(filtered);
        
        const lowStock = this.data.filter(p => p.stock > 0 && p.stock < 10).length;
        const outStock = this.data.filter(p => p.stock === 0).length;
        const totalValue = this.data.reduce((sum, p) => sum + (p.price * p.stock), 0);
        
        container.innerHTML = `
            <div class="page-header">
                <div class="page-header-top">
                    <div>
                        <h1 class="page-title">🛍️ Gestión de Productos</h1>
                        <p class="page-description">Control de inventario y catálogo</p>
                    </div>
                    <button class="btn btn-primary" onclick="Modules.Products.openCreateModal()">
                        ➕ Nuevo Producto
                    </button>
                </div>
            </div>
            
            <div class="stats-row">
                <div class="stat-box info">
                    <div class="stat-box-icon">📦</div>
                    <div class="stat-box-label">Total Productos</div>
                    <div class="stat-box-value">${this.data.length}</div>
                </div>
                
                <div class="stat-box warning">
                    <div class="stat-box-icon">⚠️</div>
                    <div class="stat-box-label">Stock Bajo</div>
                    <div class="stat-box-value">${lowStock}</div>
                    <div class="stat-box-change">Menos de 10 unidades</div>
                </div>
                
                <div class="stat-box danger">
                    <div class="stat-box-icon">📛</div>
                    <div class="stat-box-label">Sin Stock</div>
                    <div class="stat-box-value">${outStock}</div>
                    <div class="stat-box-change">Requieren reabastecimiento</div>
                </div>
                
                <div class="stat-box success">
                    <div class="stat-box-icon">💰</div>
                    <div class="stat-box-label">Valor Inventario</div>
                    <div class="stat-box-value">${formatCurrency(totalValue)}</div>
                </div>
            </div>
            
            <div class="data-table-wrapper">
                <div class="table-header">
                    <div class="table-title">Catálogo de Productos</div>
                    <div class="table-actions">
                        <div class="search-box">
                            <input type="text" 
                                   placeholder="Buscar productos..." 
                                   value="${this.searchTerm}"
                                   onkeyup="Modules.Products.handleSearch(this.value)">
                        </div>
                        <select class="filter-dropdown" onchange="Modules.Products.handleFilter(this.value)">
                            <option value="all">Todas las categorías</option>
                            ${this.categories.map(cat => `
                                <option value="${cat.id}" ${this.filterCategory === cat.id ? 'selected' : ''}>
                                    ${cat.name} (${cat.count})
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Imagen</th>
                            <th>SKU</th>
                            <th>Nombre</th>
                            <th>Categoría</th>
                            <th>Precio</th>
                            <th>Stock</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paginated.map(product => `
                            <tr>
                                <td>
                                    <img src="${product.image}" 
                                         alt="${product.name}" 
                                         style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;">
                                </td>
                                <td><code style="font-size: 12px;">${product.sku}</code></td>
                                <td>
                                    <strong style="display: block; max-width: 200px;" class="text-truncate" title="${product.name}">
                                        ${product.name}
                                    </strong>
                                </td>
                                <td>
                                    <span class="chip chip-info">${product.category}</span>
                                </td>
                                <td><strong>${formatCurrency(product.price)}</strong></td>
                                <td>
                                    <span class="chip ${product.stock > 10 ? 'chip-success' : product.stock > 0 ? 'chip-warning' : 'chip-danger'}">
                                        ${product.stock} uds
                                    </span>
                                </td>
                                <td>
                                    <div class="col-status">
                                        <span class="status-dot ${product.active ? 'active' : 'inactive'}"></span>
                                        <span>${product.active ? 'Activo' : 'Inactivo'}</span>
                                    </div>
                                </td>
                                <td>
                                    <div class="col-actions">
                                        <button class="btn-icon btn-icon-view" 
                                                onclick="Modules.Products.viewProduct(${product.id})"
                                                title="Ver">
                                            👁
                                        </button>
                                        <button class="btn-icon btn-icon-edit" 
                                                onclick="Modules.Products.openEditModal(${product.id})"
                                                title="Editar">
                                            ✏️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                ${this.renderPagination(filtered.length)}
            </div>
        `;
    },
    
    getFilteredData() {
        let filtered = [...this.data];
        
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(term) ||
                p.sku.toLowerCase().includes(term) ||
                p.category.toLowerCase().includes(term)
            );
        }
        
        if (this.filterCategory !== 'all') {
            filtered = filtered.filter(p => p.category === this.filterCategory);
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
                <div class="pagination-info">Mostrando ${start} - ${end} de ${total} productos</div>
                <div class="pagination-buttons">
                    <button class="pagination-btn" 
                            onclick="Modules.Products.goToPage(${this.currentPage - 1})"
                            ${this.currentPage === 1 ? 'disabled' : ''}>◀</button>
                    ${Array.from({length: Math.min(5, totalPages)}, (_, i) => {
                        const page = i + 1;
                        return `<button class="pagination-btn ${page === this.currentPage ? 'active' : ''}" 
                                onclick="Modules.Products.goToPage(${page})">${page}</button>`;
                    }).join('')}
                    <button class="pagination-btn" 
                            onclick="Modules.Products.goToPage(${this.currentPage + 1})"
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
    
    handleFilter(category) {
        this.filterCategory = category;
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
        showToast('Info', 'Funcionalidad de creación de productos en desarrollo', 'info');
    },
    
    openEditModal(id) {
        showToast('Info', 'Funcionalidad de edición de productos en desarrollo', 'info');
    },
    
    viewProduct(id) {
        const product = this.data.find(p => p.id === id);
        if (!product) return;
        
        const modalHTML = `
            <div class="modal-overlay active" id="productViewModal">
                <div class="modal-dialog" style="max-width: 700px;">
                    <div class="modal-header">
                        <h3 class="modal-title">🛍️ Detalles del Producto</h3>
                        <button class="modal-close" onclick="document.getElementById('productViewModal').remove()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div style="display: grid; grid-template-columns: 200px 1fr; gap: 24px;">
                            <div>
                                <img src="${product.image}" 
                                     alt="${product.name}" 
                                     style="width: 100%; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                            </div>
                            <div style="display: grid; gap: 16px;">
                                <div>
                                    <div style="font-size: 12px; color: #6B7280; margin-bottom: 4px;">NOMBRE</div>
                                    <div style="font-size: 18px; font-weight: 700;">${product.name}</div>
                                </div>
                                
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                    <div>
                                        <div style="font-size: 12px; color: #6B7280; margin-bottom: 4px;">SKU</div>
                                        <code style="font-weight: 600;">${product.sku}</code>
                                    </div>
                                    <div>
                                        <div style="font-size: 12px; color: #6B7280; margin-bottom: 4px;">CATEGORÍA</div>
                                        <span class="chip chip-info">${product.category}</span>
                                    </div>
                                </div>
                                
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                    <div>
                                        <div style="font-size: 12px; color: #6B7280; margin-bottom: 4px;">PRECIO</div>
                                        <div style="font-size: 24px; font-weight: 700; color: #10B981;">${formatCurrency(product.price)}</div>
                                    </div>
                                    <div>
                                        <div style="font-size: 12px; color: #6B7280; margin-bottom: 4px;">STOCK</div>
                                        <div style="font-size: 24px; font-weight: 700; color: ${product.stock > 10 ? '#10B981' : product.stock > 0 ? '#F59E0B' : '#EF4444'};">
                                            ${product.stock} unidades
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
                            <div style="font-size: 12px; color: #6B7280; margin-bottom: 8px;">DESCRIPCIÓN</div>
                            <div style="font-size: 14px; line-height: 1.6; color: #374151;">${product.description || 'Sin descripción'}</div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="document.getElementById('productViewModal').remove()">Cerrar</button>
                        <button class="btn btn-primary" onclick="Modules.Products.openEditModal(${product.id})">✏️ Editar</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
};

console.log('✅ Módulo Products cargado');
