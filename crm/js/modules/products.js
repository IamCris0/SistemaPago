/**
 * MÓDULO DE PRODUCTOS - VERSIÓN MEJORADA Y PROFESIONAL
 * Sistema CRUD completo y fácil de usar
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
        console.log('🎯 Inicializando módulo de productos...');
        
        const container = document.getElementById('productsContainer');
        if (!container) {
            console.error('❌ Contenedor de productos no encontrado');
            return;
        }
        
        try {
            // Mostrar loading
            container.innerHTML = this.renderLoading();
            
            // Cargar productos
            await this.loadProducts();
            
            // Renderizar interfaz
            this.render();
            
            // Adjuntar eventos
            this.attachEvents();
            
            console.log('✅ Módulo de productos listo');
        } catch (error) {
            console.error('❌ Error al inicializar productos:', error);
            this.showError(container, error.message);
        }
    },
    
    /**
     * Cargar productos desde la API
     */
    async loadProducts() {
        try {
            const response = await fetch(`${CONFIG.API_URL}/products_crud.php?action=list&limit=1000`);
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Error al cargar productos');
            }
            
            this.products = data.products || [];
            this.filteredProducts = [...this.products];
            this.categories = [...new Set(this.products.map(p => p.category).filter(Boolean))];
            
            console.log(`✅ ${this.products.length} productos cargados`);
            
        } catch (error) {
            console.error('Error cargando productos:', error);
            throw new Error('No se pudieron cargar los productos. Verifica tu conexión.');
        }
    },
    
    /**
     * Renderizar interfaz completa
     */
    render() {
        const container = document.getElementById('productsContainer');
        if (!container) return;
        
        container.innerHTML = `
            ${this.renderHeader()}
            ${this.renderStats()}
            ${this.renderFilters()}
            ${this.renderProductsGrid()}
            ${this.renderModal()}
        `;
    },
    
    /**
     * Renderizar encabezado
     */
    renderHeader() {
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #e5e7eb;">
                <div>
                    <h2 style="font-size: 28px; font-weight: 700; color: #003d82; margin: 0 0 4px 0;">
                        📦 Productos (${this.filteredProducts.length})
                    </h2>
                    <p style="font-size: 14px; color: #6b7280; margin: 0;">
                        Gestión simple de inventario
                    </p>
                </div>
                <button class="btn btn-primary" onclick="ProductsModule.openCreateModal()">
                    ➕ Nuevo Producto
                </button>
            </div>
        `;
    },
    
    /**
     * Renderizar estadísticas
     */
    renderStats() {
        const total = this.products.length;
        const active = this.products.filter(p => p.active).length;
        const lowStock = this.products.filter(p => p.stock > 0 && p.stock < 10).length;
        const outStock = this.products.filter(p => p.stock === 0).length;
        
        return `
            <div class="stats-row" style="margin-bottom: 24px;">
                <div class="stat-box primary">
                    <div class="stat-box-header">
                        <div class="stat-box-icon">📦</div>
                    </div>
                    <div class="stat-box-label">Total</div>
                    <div class="stat-box-value">${total}</div>
                </div>
                
                <div class="stat-box success">
                    <div class="stat-box-header">
                        <div class="stat-box-icon">✅</div>
                    </div>
                    <div class="stat-box-label">Activos</div>
                    <div class="stat-box-value">${active}</div>
                </div>
                
                <div class="stat-box warning">
                    <div class="stat-box-header">
                        <div class="stat-box-icon">⚠️</div>
                    </div>
                    <div class="stat-box-label">Stock Bajo</div>
                    <div class="stat-box-value">${lowStock}</div>
                </div>
                
                <div class="stat-box danger">
                    <div class="stat-box-header">
                        <div class="stat-box-icon">❌</div>
                    </div>
                    <div class="stat-box-label">Sin Stock</div>
                    <div class="stat-box-value">${outStock}</div>
                </div>
            </div>
        `;
    },
    
    /**
     * Renderizar filtros
     */
    renderFilters() {
        return `
            <div style="background: white; padding: 20px; border-radius: 12px; border: 2px solid #e5e7eb; margin-bottom: 24px; display: flex; gap: 12px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 200px;">
                    <input 
                        type="text" 
                        id="searchInput" 
                        placeholder="🔍 Buscar producto..."
                        value="${this.currentFilter.search}"
                        style="width: 100%; padding: 10px 14px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px;"
                    >
                </div>
                
                <div style="flex: 1; min-width: 200px;">
                    <select id="categoryFilter" style="width: 100%; padding: 10px 14px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px; cursor: pointer;">
                        <option value="">📂 Todas las categorías</option>
                        ${this.categories.map(cat => `
                            <option value="${cat}" ${this.currentFilter.category === cat ? 'selected' : ''}>
                                ${cat}
                            </option>
                        `).join('')}
                    </select>
                </div>
                
                <div style="flex: 1; min-width: 200px;">
                    <select id="statusFilter" style="width: 100%; padding: 10px 14px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px; cursor: pointer;">
                        <option value="">📊 Todos</option>
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
                <div style="text-align: center; padding: 80px 40px; background: white; border-radius: 12px; border: 2px solid #e5e7eb;">
                    <div style="font-size: 80px; margin-bottom: 20px;">📭</div>
                    <h3 style="font-size: 24px; color: #1f2937; margin-bottom: 12px;">No hay productos</h3>
                    <p style="font-size: 16px; color: #6b7280; margin-bottom: 24px;">Comienza agregando tu primer producto</p>
                    <button class="btn btn-primary" onclick="ProductsModule.openCreateModal()">
                        ➕ Crear Producto
                    </button>
                </div>
            `;
        }
        
        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px;">
                ${this.filteredProducts.map(product => this.renderProductCard(product)).join('')}
            </div>
        `;
    },
    
    /**
     * Renderizar tarjeta de producto
     */
    renderProductCard(product) {
        const stockStatus = product.stock === 0 ? 'out' : product.stock < 10 ? 'low' : 'ok';
        const stockClass = `stock-${stockStatus}`;
        const stockText = product.stock === 0 ? 'Sin stock' : product.stock < 10 ? `⚠️ ${product.stock}` : `✅ ${product.stock}`;
        
        return `
            <div style="background: white; border: 2px solid #e5e7eb; border-radius: 12px; overflow: hidden; transition: all 0.3s;">
                <!-- Header -->
                <div style="padding: 16px; background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); border-bottom: 2px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
                    <span style="padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; ${this.getStockStyle(stockStatus)}">
                        ${stockText}
                    </span>
                    <span style="font-size: 20px;">
                        ${product.active ? '✅' : '❌'}
                    </span>
                </div>
                
                <!-- Body -->
                <div style="padding: 20px;">
                    <h3 style="font-size: 18px; font-weight: 700; color: #1f2937; margin: 0 0 8px 0;">
                        ${product.name}
                    </h3>
                    <p style="font-size: 13px; color: #6b7280; margin: 4px 0;">
                        📂 ${product.category || 'Sin categoría'}
                    </p>
                    <p style="font-size: 13px; color: #6b7280; margin: 4px 0;">
                        🏷️ ${product.sku || 'Sin código'}
                    </p>
                    <div style="font-size: 28px; font-weight: 800; color: #003d82; margin: 12px 0;">
                        $${parseFloat(product.price || 0).toFixed(2)}
                    </div>
                    ${product.description ? `
                        <p style="font-size: 13px; color: #6b7280; margin: 12px 0 0 0; padding-top: 12px; border-top: 1px solid #e5e7eb;">
                            ${product.description}
                        </p>
                    ` : ''}
                </div>
                
                <!-- Actions -->
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); border-top: 2px solid #e5e7eb;">
                    <button onclick="ProductsModule.openEditModal(${product.id})" 
                            style="padding: 12px; border: none; background: white; cursor: pointer; font-size: 18px; border-right: 1px solid #e5e7eb; transition: all 0.2s;"
                            onmouseover="this.style.background='#dbeafe'; this.style.color='#1e40af'"
                            onmouseout="this.style.background='white'; this.style.color='inherit'"
                            title="Editar">
                        ✏️
                    </button>
                    <button onclick="ProductsModule.openStockModal(${product.id})" 
                            style="padding: 12px; border: none; background: white; cursor: pointer; font-size: 18px; border-right: 1px solid #e5e7eb; transition: all 0.2s;"
                            onmouseover="this.style.background='#d1fae5'; this.style.color='#065f46'"
                            onmouseout="this.style.background='white'; this.style.color='inherit'"
                            title="Stock">
                        📦
                    </button>
                    <button onclick="ProductsModule.toggleStatus(${product.id})" 
                            style="padding: 12px; border: none; background: white; cursor: pointer; font-size: 18px; border-right: 1px solid #e5e7eb; transition: all 0.2s;"
                            onmouseover="this.style.background='#fef3c7'; this.style.color='#92400e'"
                            onmouseout="this.style.background='white'; this.style.color='inherit'"
                            title="${product.active ? 'Desactivar' : 'Activar'}">
                        ${product.active ? '⏸️' : '▶️'}
                    </button>
                    <button onclick="ProductsModule.deleteProduct(${product.id})" 
                            style="padding: 12px; border: none; background: white; cursor: pointer; font-size: 18px; transition: all 0.2s;"
                            onmouseover="this.style.background='#fee2e2'; this.style.color='#991b1b'"
                            onmouseout="this.style.background='white'; this.style.color='inherit'"
                            title="Eliminar">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    },
    
    /**
     * Obtener estilos de stock
     */
    getStockStyle(status) {
        const styles = {
            ok: 'background: linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(5, 150, 105, 0.9)); color: white;',
            low: 'background: linear-gradient(135deg, rgba(245, 158, 11, 0.9), rgba(217, 119, 6, 0.9)); color: white;',
            out: 'background: linear-gradient(135deg, rgba(239, 68, 68, 0.9), rgba(220, 38, 38, 0.9)); color: white;'
        };
        return styles[status] || styles.ok;
    },
    
    /**
     * Renderizar modal
     */
    renderModal() {
        return `
            <div id="productModal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.6); z-index: 10000; align-items: center; justify-content: center;">
                <div style="background: white; border-radius: 16px; max-width: 700px; width: 90%; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);">
                    <!-- Header -->
                    <div style="padding: 24px 28px; background: linear-gradient(135deg, #003d82 0%, #0052b0 100%); color: white; display: flex; justify-content: space-between; align-items: center; border-radius: 16px 16px 0 0;">
                        <h3 id="modalTitle" style="margin: 0; font-size: 20px; font-weight: 700;">Modal</h3>
                        <button onclick="ProductsModule.closeModal()" style="background: rgba(255, 255, 255, 0.2); border: none; color: white; font-size: 28px; width: 36px; height: 36px; border-radius: 50%; cursor: pointer;">
                            ×
                        </button>
                    </div>
                    
                    <!-- Body -->
                    <div id="modalBody" style="padding: 28px; overflow-y: auto; flex: 1;"></div>
                    
                    <!-- Footer -->
                    <div id="modalFooter" style="padding: 20px 28px; background: #f9fafb; border-top: 2px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 12px; border-radius: 0 0 16px 16px;"></div>
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
                (product.sku && product.sku.toLowerCase().includes(this.currentFilter.search.toLowerCase()));
            
            const matchCategory = !this.currentFilter.category || product.category === this.currentFilter.category;
            
            let matchStatus = true;
            if (this.currentFilter.status === 'active') matchStatus = product.active;
            else if (this.currentFilter.status === 'inactive') matchStatus = !product.active;
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
            <form id="productForm">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <label style="font-size: 13px; font-weight: 600; color: #374151; display: block; margin-bottom: 8px;">
                            Nombre *
                        </label>
                        <input type="text" name="name" required placeholder="Ej: Laptop Dell"
                               style="width: 100%; padding: 10px 14px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px;">
                    </div>
                    <div>
                        <label style="font-size: 13px; font-weight: 600; color: #374151; display: block; margin-bottom: 8px;">
                            Código/SKU
                        </label>
                        <input type="text" name="sku" placeholder="Ej: PROD-001"
                               style="width: 100%; padding: 10px 14px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px;">
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <label style="font-size: 13px; font-weight: 600; color: #374151; display: block; margin-bottom: 8px;">
                            Categoría *
                        </label>
                        <input type="text" name="category" required placeholder="Ej: Electrónica" list="categories"
                               style="width: 100%; padding: 10px 14px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px;">
                        <datalist id="categories">
                            ${this.categories.map(cat => `<option value="${cat}">`).join('')}
                        </datalist>
                    </div>
                    <div>
                        <label style="font-size: 13px; font-weight: 600; color: #374151; display: block; margin-bottom: 8px;">
                            Precio *
                        </label>
                        <input type="number" name="price" step="0.01" required placeholder="0.00"
                               style="width: 100%; padding: 10px 14px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px;">
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <label style="font-size: 13px; font-weight: 600; color: #374151; display: block; margin-bottom: 8px;">
                            Stock Inicial *
                        </label>
                        <input type="number" name="stock" required value="0"
                               style="width: 100%; padding: 10px 14px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px;">
                    </div>
                    <div>
                        <label style="font-size: 13px; font-weight: 600; color: #374151; display: block; margin-bottom: 8px;">
                            Estado
                        </label>
                        <select name="active" style="width: 100%; padding: 10px 14px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px; cursor: pointer;">
                            <option value="1">Activo</option>
                            <option value="0">Inactivo</option>
                        </select>
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="font-size: 13px; font-weight: 600; color: #374151; display: block; margin-bottom: 8px;">
                        Descripción
                    </label>
                    <textarea name="description" rows="3" placeholder="Descripción del producto..."
                              style="width: 100%; padding: 10px 14px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px; resize: vertical;"></textarea>
                </div>
            </form>
        `;
        
        this.showModal('Crear Producto', modalBody, () => this.saveProduct());
    },
    
    /**
     * Abrir modal de edición
     */
    async openEditModal(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        
        const modalBody = `
            <form id="productForm">
                <input type="hidden" name="id" value="${product.id}">
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <label style="font-size: 13px; font-weight: 600; color: #374151; display: block; margin-bottom: 8px;">
                            Nombre *
                        </label>
                        <input type="text" name="name" required value="${product.name}"
                               style="width: 100%; padding: 10px 14px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px;">
                    </div>
                    <div>
                        <label style="font-size: 13px; font-weight: 600; color: #374151; display: block; margin-bottom: 8px;">
                            Código/SKU
                        </label>
                        <input type="text" name="sku" value="${product.sku || ''}"
                               style="width: 100%; padding: 10px 14px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px;">
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <label style="font-size: 13px; font-weight: 600; color: #374151; display: block; margin-bottom: 8px;">
                            Categoría *
                        </label>
                        <input type="text" name="category" required value="${product.category || ''}" list="categories"
                               style="width: 100%; padding: 10px 14px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px;">
                        <datalist id="categories">
                            ${this.categories.map(cat => `<option value="${cat}">`).join('')}
                        </datalist>
                    </div>
                    <div>
                        <label style="font-size: 13px; font-weight: 600; color: #374151; display: block; margin-bottom: 8px;">
                            Precio *
                        </label>
                        <input type="number" name="price" step="0.01" required value="${product.price}"
                               style="width: 100%; padding: 10px 14px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px;">
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <label style="font-size: 13px; font-weight: 600; color: #374151; display: block; margin-bottom: 8px;">
                            Stock
                        </label>
                        <input type="number" name="stock" value="${product.stock}" readonly
                               style="width: 100%; padding: 10px 14px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px; background: #f3f4f6;">
                        <small style="font-size: 12px; color: #6b7280; font-style: italic;">Usa el botón 📦 para ajustar stock</small>
                    </div>
                    <div>
                        <label style="font-size: 13px; font-weight: 600; color: #374151; display: block; margin-bottom: 8px;">
                            Estado
                        </label>
                        <select name="active" style="width: 100%; padding: 10px 14px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px; cursor: pointer;">
                            <option value="1" ${product.active ? 'selected' : ''}>Activo</option>
                            <option value="0" ${!product.active ? 'selected' : ''}>Inactivo</option>
                        </select>
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="font-size: 13px; font-weight: 600; color: #374151; display: block; margin-bottom: 8px;">
                        Descripción
                    </label>
                    <textarea name="description" rows="3"
                              style="width: 100%; padding: 10px 14px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px; resize: vertical;">${product.description || ''}</textarea>
                </div>
            </form>
        `;
        
        this.showModal('Editar Producto', modalBody, () => this.saveProduct(productId));
    },
    
    /**
     * Abrir modal de stock
     */
    openStockModal(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        
        const modalBody = `
            <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 20px; border-radius: 12px; border: 2px solid #bae6fd; margin-bottom: 20px;">
                <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #0c4a6e;">${product.name}</h3>
                <p style="margin: 0; font-size: 14px; color: #075985;">
                    Stock actual: <strong style="font-size: 24px; color: #003d82;">${product.stock}</strong> unidades
                </p>
            </div>
            
            <form id="stockForm">
                <div style="margin-bottom: 20px;">
                    <label style="font-size: 13px; font-weight: 600; color: #374151; display: block; margin-bottom: 8px;">
                        Tipo de Ajuste
                    </label>
                    <select name="type" style="width: 100%; padding: 10px 14px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px; cursor: pointer;">
                        <option value="add">➕ Agregar (Compra/Entrada)</option>
                        <option value="subtract">➖ Restar (Venta/Salida)</option>
                        <option value="set">📝 Establecer (Inventario)</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="font-size: 13px; font-weight: 600; color: #374151; display: block; margin-bottom: 8px;">
                        Cantidad
                    </label>
                    <input type="number" name="quantity" required min="0" value="0"
                           style="width: 100%; padding: 10px 14px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px;">
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="font-size: 13px; font-weight: 600; color: #374151; display: block; margin-bottom: 8px;">
                        Motivo
                    </label>
                    <input type="text" name="reason" placeholder="Ej: Compra de mercadería"
                           style="width: 100%; padding: 10px 14px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px;">
                </div>
            </form>
        `;
        
        this.showModal('Ajustar Stock', modalBody, () => this.updateStock(productId));
    },
    
    /**
     * Guardar producto
     */
    async saveProduct(productId = null) {
        const form = document.getElementById('productForm');
        if (!form || !form.checkValidity()) {
            form?.reportValidity();
            return;
        }
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        data.action = productId ? 'update' : 'create';
        
        try {
            showLoading();
            
            const response = await fetch(`${CONFIG.API_URL}/products_crud.php`, {
                method: productId ? 'PUT' : 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.getToken()}`
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.closeModal();
                await this.loadProducts();
                this.render();
                this.attachEvents();
                showToast('Éxito', `Producto ${productId ? 'actualizado' : 'creado'} correctamente`, 'success');
            } else {
                showToast('Error', result.message || 'Error al guardar', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('Error', 'No se pudo guardar el producto', 'error');
        } finally {
            hideLoading();
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
            showToast('Error', 'La cantidad debe ser mayor a 0', 'error');
            return;
        }
        
        try {
            showLoading();
            
            const response = await fetch(`${CONFIG.API_URL}/products_crud.php`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.getToken()}`
                },
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
                showToast('Éxito', 'Stock actualizado correctamente', 'success');
            } else {
                showToast('Error', result.message || 'Error al actualizar stock', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('Error', 'No se pudo actualizar el stock', 'error');
        } finally {
            hideLoading();
        }
    },
    
    /**
     * Cambiar estado
     */
    async toggleStatus(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        
        try {
            showLoading();
            
            const response = await fetch(`${CONFIG.API_URL}/products_crud.php`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.getToken()}`
                },
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
                showToast('Éxito', `Producto ${result.active ? 'activado' : 'desactivado'}`, 'success');
            } else {
                showToast('Error', result.message || 'Error al cambiar estado', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('Error', 'No se pudo cambiar el estado', 'error');
        } finally {
            hideLoading();
        }
    },
    
    /**
     * Eliminar producto
     */
    async deleteProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        
        if (!confirm(`¿Eliminar "${product.name}"?\n\nEsta acción no se puede deshacer.`)) {
            return;
        }
        
        try {
            showLoading();
            
            const response = await fetch(`${CONFIG.API_URL}/products_crud.php`, {
                method: 'DELETE',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.getToken()}`
                },
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
                showToast('Éxito', 'Producto eliminado correctamente', 'success');
            } else {
                showToast('Error', result.message || 'Error al eliminar', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('Error', 'No se pudo eliminar el producto', 'error');
        } finally {
            hideLoading();
        }
    },
    
    /**
     * Mostrar modal
     */
    showModal(title, bodyHtml, onSave) {
        const modal = document.getElementById('productModal');
        if (!modal) return;
        
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalBody').innerHTML = bodyHtml;
        document.getElementById('modalFooter').innerHTML = `
            <button class="btn btn-secondary" onclick="ProductsModule.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="event.preventDefault(); (${onSave.toString()})()">Guardar</button>
        `;
        
        modal.style.display = 'flex';
    },
    
    /**
     * Cerrar modal
     */
    closeModal() {
        const modal = document.getElementById('productModal');
        if (modal) {
            modal.style.display = 'none';
        }
    },
    
    /**
     * Renderizar loading
     */
    renderLoading() {
        return `
            <div style="text-align: center; padding: 80px 40px;">
                <div style="width: 60px; height: 60px; border: 6px solid #e5e7eb; border-top-color: #003d82; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
                <p style="font-size: 16px; color: #6b7280;">Cargando productos...</p>
            </div>
        `;
    },
    
    /**
     * Mostrar error
     */
    showError(container, message) {
        container.innerHTML = `
            <div style="text-align: center; padding: 80px 40px;">
                <div style="font-size: 80px; margin-bottom: 20px; color: #ef4444;">❌</div>
                <h3 style="font-size: 24px; color: #1f2937; margin-bottom: 12px;">Error al cargar productos</h3>
                <p style="font-size: 16px; color: #6b7280; margin-bottom: 24px;">${message}</p>
                <button class="btn btn-primary" onclick="ProductsModule.init()">
                    🔄 Reintentar
                </button>
            </div>
        `;
    }
};

// Registrar en Router
if (typeof Router !== 'undefined') {
    Router.register('products', () => ProductsModule.init());
}

// Exportar globalmente
window.ProductsModule = ProductsModule;

console.log('✅ Módulo de Productos v2.0 cargado');