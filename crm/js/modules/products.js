/**
 * MÓDULO DE PRODUCTOS - MAWEWE CRM v4.0
 * Gestión completa de productos con imágenes
 * 
 * IMPORTANTE - Campos que NUNCA se envían en formularios:
 * - id: Auto-generado por la BD
 * - created_at: Auto-generado por la BD
 * - updated_at: Auto-generado por la BD
 */

const ProductsModule = {
    // Estado del módulo
    products: [],
    categories: [],
    currentPage: 1,
    pageSize: 50,
    totalPages: 1,
    searchTerm: '',
    filterCategory: '',
    filterSubcategory: '',
    filterStockStatus: '',
    
    // Inicializar módulo
    async init() {
        console.log('🎯 Inicializando módulo de productos...');
        
        try {
            await this.loadCategories();
            await this.loadProducts();
            this.render();
            this.attachEvents();
            
            console.log('✅ Módulo de productos iniciado correctamente');
        } catch (error) {
            console.error('❌ Error al inicializar productos:', error);
            this.showError('Error al cargar productos: ' + error.message);
        }
    },
    
    // Cargar categorías únicas
    async loadCategories() {
        try {
            const response = await fetch(`${CONFIG.API_URL}/products_crud.php?action=list&limit=1000`);
            const data = await response.json();
            
            if (data.success && data.products) {
                const uniqueCategories = [...new Set(data.products.map(p => p.category))].filter(Boolean);
                this.categories = uniqueCategories.sort();
            }
        } catch (error) {
            console.error('Error cargando categorías:', error);
        }
    },
    
    // Cargar productos desde la API
    async loadProducts() {
        console.log('📦 Cargando productos desde API...');
        
        try {
            const params = new URLSearchParams({
                action: 'list',
                page: this.currentPage,
                limit: this.pageSize
            });
            
            if (this.searchTerm) params.append('search', this.searchTerm);
            if (this.filterCategory) params.append('category', this.filterCategory);
            if (this.filterSubcategory) params.append('subcategory', this.filterSubcategory);
            if (this.filterStockStatus) params.append('stock_status', this.filterStockStatus);
            
            const response = await fetch(`${CONFIG.API_URL}/products_crud.php?${params}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Error al cargar productos');
            }
            
            this.products = data.products || [];
            this.totalPages = data.pages || 1;
            
            console.log(`✅ ${this.products.length} productos cargados`);
            
        } catch (error) {
            console.error('❌ Error al cargar productos:', error);
            this.products = [];
            throw error;
        }
    },
    
    // Renderizar el módulo completo
    render() {
        const container = document.getElementById('productsContainer');
        if (!container) {
            console.error('❌ Contenedor #productsContainer no encontrado');
            return;
        }
        
        container.innerHTML = `
            ${this.renderHeader()}
            ${this.renderStats()}
            ${this.renderFilters()}
            ${this.renderGrid()}
            ${this.renderPagination()}
        `;
    },
    
    // Header con botón de nuevo producto
    renderHeader() {
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <div>
                    <h2 style="margin: 0; font-size: 28px; font-weight: 800; color: #0f172a;">
                        📦 Productos
                    </h2>
                    <p style="margin: 4px 0 0 0; color: #64748b; font-size: 14px;">
                        Gestión de inventario y catálogo
                    </p>
                </div>
                <button onclick="ProductsModule.openCreateModal()" 
                        style="background: linear-gradient(135deg, #003d82, #002952); color: white; border: none; 
                               padding: 12px 24px; border-radius: 10px; font-weight: 700; cursor: pointer;
                               box-shadow: 0 4px 12px rgba(0,61,130,0.3); transition: all 0.3s;">
                    ➕ Nuevo Producto
                </button>
            </div>
        `;
    },
    
    // Estadísticas
    renderStats() {
        const total = this.products.length;
        const lowStock = this.products.filter(p => p.stock > 0 && p.stock < 10).length;
        const outStock = this.products.filter(p => p.stock === 0).length;
        const totalValue = this.products.reduce((sum, p) => sum + (p.price * p.stock), 0);
        
        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 24px;">
                <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                    <div style="color: #64748b; font-size: 13px; font-weight: 600; margin-bottom: 8px;">TOTAL PRODUCTOS</div>
                    <div style="font-size: 32px; font-weight: 800; color: #0f172a;">${total}</div>
                </div>
                
                <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                    <div style="color: #64748b; font-size: 13px; font-weight: 600; margin-bottom: 8px;">STOCK BAJO</div>
                    <div style="font-size: 32px; font-weight: 800; color: #f59e0b;">${lowStock}</div>
                </div>
                
                <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                    <div style="color: #64748b; font-size: 13px; font-weight: 600; margin-bottom: 8px;">AGOTADOS</div>
                    <div style="font-size: 32px; font-weight: 800; color: #ef4444;">${outStock}</div>
                </div>
                
                <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                    <div style="color: #64748b; font-size: 13px; font-weight: 600; margin-bottom: 8px;">VALOR INVENTARIO</div>
                    <div style="font-size: 32px; font-weight: 800; color: #10b981;">$${totalValue.toFixed(2)}</div>
                </div>
            </div>
        `;
    },
    
    // Filtros
    renderFilters() {
        const categoryOptions = this.categories.map(cat => 
            `<option value="${cat}" ${this.filterCategory === cat ? 'selected' : ''}>${cat.toUpperCase()}</option>`
        ).join('');
        
        return `
            <div style="background: white; padding: 20px; border-radius: 12px; margin-bottom: 24px; 
                        box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                    <div>
                        <label style="display: block; font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">
                            🔍 Buscar
                        </label>
                        <input type="text" id="searchInput" placeholder="SKU, nombre o descripción..."
                               value="${this.searchTerm}"
                               style="width: 100%; padding: 10px 14px; border: 2px solid #e2e8f0; border-radius: 8px;
                                      font-size: 14px; transition: all 0.3s;">
                    </div>
                    
                    <div>
                        <label style="display: block; font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">
                            📁 Categoría
                        </label>
                        <select id="categoryFilter"
                                style="width: 100%; padding: 10px 14px; border: 2px solid #e2e8f0; border-radius: 8px;
                                       font-size: 14px; cursor: pointer;">
                            <option value="">Todas las categorías</option>
                            ${categoryOptions}
                        </select>
                    </div>
                    
                    <div>
                        <label style="display: block; font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">
                            📊 Stock
                        </label>
                        <select id="stockFilter"
                                style="width: 100%; padding: 10px 14px; border: 2px solid #e2e8f0; border-radius: 8px;
                                       font-size: 14px; cursor: pointer;">
                            <option value="">Todos</option>
                            <option value="ok" ${this.filterStockStatus === 'ok' ? 'selected' : ''}>Stock OK (≥10)</option>
                            <option value="low" ${this.filterStockStatus === 'low' ? 'selected' : ''}>Stock Bajo (1-9)</option>
                            <option value="out" ${this.filterStockStatus === 'out' ? 'selected' : ''}>Agotado (0)</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    },
    
    // Grid de productos
    renderGrid() {
        if (this.products.length === 0) {
            return `
                <div style="background: white; padding: 60px; text-align: center; border-radius: 12px;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                    <div style="font-size: 64px; margin-bottom: 16px;">📦</div>
                    <h3 style="color: #0f172a; margin-bottom: 8px;">No hay productos</h3>
                    <p style="color: #64748b; margin-bottom: 24px;">Comienza agregando tu primer producto</p>
                    <button onclick="ProductsModule.openCreateModal()"
                            style="background: linear-gradient(135deg, #003d82, #002952); color: white; border: none;
                                   padding: 12px 24px; border-radius: 10px; font-weight: 700; cursor: pointer;">
                        ➕ Crear Producto
                    </button>
                </div>
            `;
        }
        
        const productsHTML = this.products.map(p => this.renderProductCard(p)).join('');
        
        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); 
                        gap: 20px; margin-bottom: 24px;">
                ${productsHTML}
            </div>
        `;
    },
    
    // Tarjeta de producto
    renderProductCard(product) {
        const stockColor = product.stock === 0 ? '#ef4444' : product.stock < 10 ? '#f59e0b' : '#10b981';
        const stockText = product.stock === 0 ? 'AGOTADO' : product.stock < 10 ? `BAJO (${product.stock})` : `${product.stock}`;
        
        const imageUrl = product.image || 'https://via.placeholder.com/300x300?text=Sin+Imagen';
        
        return `
            <div onclick="ProductsModule.viewProduct(${product.id})"
                 style="background: white; border-radius: 12px; overflow: hidden; cursor: pointer;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: all 0.3s;
                        position: relative;"
                 onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 24px rgba(0,0,0,0.15)';"
                 onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)';">
                
                <!-- Imagen -->
                <div style="width: 100%; height: 200px; background: #f1f5f9; position: relative; overflow: hidden;">
                    <img src="${imageUrl}" 
                         alt="${product.name}"
                         style="width: 100%; height: 100%; object-fit: cover;"
                         onerror="this.src='https://via.placeholder.com/300x300?text=Sin+Imagen'">
                    
                    <!-- Badge de stock -->
                    <div style="position: absolute; top: 12px; right: 12px; background: ${stockColor}; 
                                color: white; padding: 6px 12px; border-radius: 20px; font-size: 11px; 
                                font-weight: 700; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                        ${stockText}
                    </div>
                </div>
                
                <!-- Info -->
                <div style="padding: 16px;">
                    <div style="color: #64748b; font-size: 12px; font-weight: 600; margin-bottom: 4px;">
                        ${product.sku}
                    </div>
                    <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 700; color: #0f172a;
                               overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${product.name}
                    </h3>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <span style="color: #64748b; font-size: 13px; text-transform: capitalize;">
                            📁 ${product.category}
                        </span>
                        <span style="font-size: 20px; font-weight: 800; color: #003d82;">
                            $${parseFloat(product.price).toFixed(2)}
                        </span>
                    </div>
                    
                    <button onclick="event.stopPropagation(); ProductsModule.openEditModal(${product.id})"
                            style="width: 100%; padding: 10px; background: linear-gradient(135deg, #003d82, #002952);
                                   color: white; border: none; border-radius: 8px; font-weight: 700;
                                   cursor: pointer; font-size: 13px; transition: all 0.3s;"
                            onmouseover="this.style.transform='scale(1.02)'"
                            onmouseout="this.style.transform='scale(1)'">
                        ✏️ Editar
                    </button>
                </div>
            </div>
        `;
    },
    
    // Paginación
    renderPagination() {
        if (this.totalPages <= 1) return '';
        
        let pages = '';
        for (let i = 1; i <= this.totalPages; i++) {
            const isActive = i === this.currentPage;
            pages += `
                <button onclick="ProductsModule.goToPage(${i})"
                        style="padding: 8px 16px; border: 2px solid ${isActive ? '#003d82' : '#e2e8f0'};
                               background: ${isActive ? '#003d82' : 'white'}; 
                               color: ${isActive ? 'white' : '#64748b'};
                               border-radius: 8px; font-weight: 700; cursor: pointer; margin: 0 4px;">
                    ${i}
                </button>
            `;
        }
        
        return `
            <div style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 24px;">
                <button onclick="ProductsModule.goToPage(${this.currentPage - 1})" 
                        ${this.currentPage === 1 ? 'disabled' : ''}
                        style="padding: 8px 16px; border: 2px solid #e2e8f0; background: white; 
                               border-radius: 8px; font-weight: 700; cursor: pointer;">
                    ← Anterior
                </button>
                ${pages}
                <button onclick="ProductsModule.goToPage(${this.currentPage + 1})" 
                        ${this.currentPage === this.totalPages ? 'disabled' : ''}
                        style="padding: 8px 16px; border: 2px solid #e2e8f0; background: white; 
                               border-radius: 8px; font-weight: 700; cursor: pointer;">
                    Siguiente →
                </button>
            </div>
        `;
    },
    
    // Adjuntar eventos
    attachEvents() {
        // Búsqueda con debounce
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            let timeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    this.searchTerm = e.target.value;
                    this.currentPage = 1;
                    this.loadProducts().then(() => this.render());
                }, 500);
            });
        }
        
        // Filtro de categoría
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.filterCategory = e.target.value;
                this.currentPage = 1;
                this.loadProducts().then(() => this.render());
            });
        }
        
        // Filtro de stock
        const stockFilter = document.getElementById('stockFilter');
        if (stockFilter) {
            stockFilter.addEventListener('change', (e) => {
                this.filterStockStatus = e.target.value;
                this.currentPage = 1;
                this.loadProducts().then(() => this.render());
            });
        }
    },
    
    // Ir a página
    async goToPage(page) {
        if (page < 1 || page > this.totalPages) return;
        this.currentPage = page;
        await this.loadProducts();
        this.render();
        this.attachEvents();
    },
    
    // Ver detalles del producto
    async viewProduct(id) {
        try {
            const response = await fetch(`${CONFIG.API_URL}/products_crud.php?action=get&id=${id}`);
            const data = await response.json();
            
            if (!data.success) throw new Error(data.message);
            
            const p = data.product;
            
            // Galería de imágenes
            const allImages = [p.image, ...(p.images || [])].filter(Boolean);
            const galleryHTML = allImages.map(img => `
                <img src="${img}" alt="${p.name}" 
                     style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px;"
                     onerror="this.src='https://via.placeholder.com/300x300?text=Sin+Imagen'">
            `).join('');
            
            this.showModal({
                title: `📦 ${p.name}`,
                content: `
                    <div style="display: grid; gap: 20px;">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                            ${galleryHTML || '<div style="text-align:center; padding: 40px; color: #64748b;">Sin imágenes</div>'}
                        </div>
                        
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
                            <div>
                                <label style="font-size: 12px; color: #64748b; font-weight: 600;">SKU</label>
                                <div style="font-size: 16px; font-weight: 700; color: #0f172a;">${p.sku}</div>
                            </div>
                            <div>
                                <label style="font-size: 12px; color: #64748b; font-weight: 600;">Precio</label>
                                <div style="font-size: 20px; font-weight: 800; color: #003d82;">$${parseFloat(p.price).toFixed(2)}</div>
                            </div>
                            <div>
                                <label style="font-size: 12px; color: #64748b; font-weight: 600;">Categoría</label>
                                <div style="font-size: 16px; font-weight: 700; color: #0f172a; text-transform: capitalize;">${p.category}</div>
                            </div>
                            <div>
                                <label style="font-size: 12px; color: #64748b; font-weight: 600;">Stock</label>
                                <div style="font-size: 16px; font-weight: 700; color: ${p.stock === 0 ? '#ef4444' : p.stock < 10 ? '#f59e0b' : '#10b981'};">
                                    ${p.stock} unidades
                                </div>
                            </div>
                        </div>
                        
                        ${p.description ? `
                            <div>
                                <label style="font-size: 12px; color: #64748b; font-weight: 600;">Descripción</label>
                                <div style="font-size: 14px; color: #0f172a; margin-top: 4px;">${p.description}</div>
                            </div>
                        ` : ''}
                    </div>
                `,
                actions: `
                    <button onclick="ProductsModule.openEditModal(${p.id}); document.getElementById('globalModal').style.display='none';"
                            style="background: linear-gradient(135deg, #003d82, #002952); color: white; border: none;
                                   padding: 12px 24px; border-radius: 8px; font-weight: 700; cursor: pointer;">
                        ✏️ Editar
                    </button>
                    <button onclick="document.getElementById('globalModal').style.display='none'"
                            style="background: #e2e8f0; color: #64748b; border: none;
                                   padding: 12px 24px; border-radius: 8px; font-weight: 700; cursor: pointer;">
                        Cerrar
                    </button>
                `
            });
            
        } catch (error) {
            console.error('Error al ver producto:', error);
            this.showError('Error al cargar detalles del producto');
        }
    },
    
    // Abrir modal de crear
    openCreateModal() {
        const categoryOptions = this.categories.map(cat => 
            `<option value="${cat}">${cat.toUpperCase()}</option>`
        ).join('');
        
        this.showModal({
            title: '➕ Crear Producto',
            content: `
                <form id="productForm" style="display: grid; gap: 16px;">
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
                        <div>
                            <label style="font-size: 13px; font-weight: 700; color: #0f172a; display: block; margin-bottom: 8px;">
                                SKU * <span style="color: #64748b; font-weight: 400; font-size: 11px;">(único)</span>
                            </label>
                            <input type="text" name="sku" required
                                   placeholder="Ej: ROP-AME-001"
                                   style="width: 100%; padding: 10px 14px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 14px;">
                        </div>
                        <div>
                            <label style="font-size: 13px; font-weight: 700; color: #0f172a; display: block; margin-bottom: 8px;">
                                Precio *
                            </label>
                            <input type="number" name="price" required step="0.01" min="0"
                                   placeholder="0.00"
                                   style="width: 100%; padding: 10px 14px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 14px;">
                        </div>
                    </div>
                    
                    <div>
                        <label style="font-size: 13px; font-weight: 700; color: #0f172a; display: block; margin-bottom: 8px;">
                            Nombre *
                        </label>
                        <input type="text" name="name" required
                               placeholder="Ej: POLO LINEA COLOR BLANCO"
                               style="width: 100%; padding: 10px 14px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 14px;">
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
                        <div>
                            <label style="font-size: 13px; font-weight: 700; color: #0f172a; display: block; margin-bottom: 8px;">
                                Categoría *
                            </label>
                            <input type="text" name="category" required list="categoriesList"
                                   placeholder="Ej: ropa"
                                   style="width: 100%; padding: 10px 14px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 14px;">
                            <datalist id="categoriesList">
                                ${categoryOptions}
                            </datalist>
                        </div>
                        <div>
                            <label style="font-size: 13px; font-weight: 700; color: #0f172a; display: block; margin-bottom: 8px;">
                                Subcategoría
                            </label>
                            <input type="text" name="subcategory"
                                   placeholder="Ej: americanino"
                                   style="width: 100%; padding: 10px 14px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 14px;">
                        </div>
                    </div>
                    
                    <div>
                        <label style="font-size: 13px; font-weight: 700; color: #0f172a; display: block; margin-bottom: 8px;">
                            Stock
                        </label>
                        <input type="number" name="stock" min="0" value="0"
                               style="width: 100%; padding: 10px 14px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 14px;">
                    </div>
                    
                    <div>
                        <label style="font-size: 13px; font-weight: 700; color: #0f172a; display: block; margin-bottom: 8px;">
                            Descripción
                        </label>
                        <textarea name="description" rows="3"
                                  placeholder="Descripción del producto..."
                                  style="width: 100%; padding: 10px 14px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 14px; resize: vertical;"></textarea>
                    </div>
                    
                    <div>
                        <label style="font-size: 13px; font-weight: 700; color: #0f172a; display: block; margin-bottom: 8px;">
                            Imagen Principal (URL)
                        </label>
                        <input type="text" name="image"
                               placeholder="assets/img/ropa/AMERICANINO/producto.jpg"
                               style="width: 100%; padding: 10px 14px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 14px;">
                        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
                            💡 Ejemplo: assets/img/productos/foto.jpg
                        </div>
                    </div>
                    
                    <div>
                        <label style="font-size: 13px; font-weight: 700; color: #0f172a; display: block; margin-bottom: 8px;">
                            Imágenes Adicionales (URLs separadas por coma)
                        </label>
                        <input type="text" name="images"
                               placeholder="url1.jpg, url2.jpg, url3.jpg"
                               style="width: 100%; padding: 10px 14px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 14px;">
                        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
                            💡 Separa múltiples URLs con comas
                        </div>
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" name="active" id="activeCheck" checked
                               style="width: 20px; height: 20px; cursor: pointer;">
                        <label for="activeCheck" style="font-size: 14px; font-weight: 600; color: #0f172a; cursor: pointer;">
                            Producto activo
                        </label>
                    </div>
                </form>
            `,
            actions: `
                <button onclick="ProductsModule.saveProduct()"
                        style="background: linear-gradient(135deg, #003d82, #002952); color: white; border: none;
                               padding: 12px 32px; border-radius: 8px; font-weight: 700; cursor: pointer;">
                    💾 Guardar
                </button>
                <button onclick="document.getElementById('globalModal').style.display='none'"
                        style="background: #e2e8f0; color: #64748b; border: none;
                               padding: 12px 24px; border-radius: 8px; font-weight: 700; cursor: pointer;">
                    Cancelar
                </button>
            `
        });
    },
    
    // Abrir modal de editar
    async openEditModal(id) {
        try {
            const response = await fetch(`${CONFIG.API_URL}/products_crud.php?action=get&id=${id}`);
            const data = await response.json();
            
            if (!data.success) throw new Error(data.message);
            
            const p = data.product;
            
            // Convertir array de images a string separado por comas
            const imagesString = (p.images || []).join(', ');
            
            const categoryOptions = this.categories.map(cat => 
                `<option value="${cat}">${cat.toUpperCase()}</option>`
            ).join('');
            
            this.showModal({
                title: `✏️ Editar: ${p.name}`,
                content: `
                    <form id="productForm" style="display: grid; gap: 16px;">
                        <input type="hidden" name="id" value="${p.id}">
                        
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
                            <div>
                                <label style="font-size: 13px; font-weight: 700; color: #0f172a; display: block; margin-bottom: 8px;">
                                    SKU *
                                </label>
                                <input type="text" name="sku" required value="${p.sku}"
                                       style="width: 100%; padding: 10px 14px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 14px;">
                            </div>
                            <div>
                                <label style="font-size: 13px; font-weight: 700; color: #0f172a; display: block; margin-bottom: 8px;">
                                    Precio *
                                </label>
                                <input type="number" name="price" required step="0.01" min="0" value="${p.price}"
                                       style="width: 100%; padding: 10px 14px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 14px;">
                            </div>
                        </div>
                        
                        <div>
                            <label style="font-size: 13px; font-weight: 700; color: #0f172a; display: block; margin-bottom: 8px;">
                                Nombre *
                            </label>
                            <input type="text" name="name" required value="${p.name}"
                                   style="width: 100%; padding: 10px 14px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 14px;">
                        </div>
                        
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
                            <div>
                                <label style="font-size: 13px; font-weight: 700; color: #0f172a; display: block; margin-bottom: 8px;">
                                    Categoría *
                                </label>
                                <input type="text" name="category" required value="${p.category}" list="categoriesList"
                                       style="width: 100%; padding: 10px 14px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 14px;">
                                <datalist id="categoriesList">
                                    ${categoryOptions}
                                </datalist>
                            </div>
                            <div>
                                <label style="font-size: 13px; font-weight: 700; color: #0f172a; display: block; margin-bottom: 8px;">
                                    Subcategoría
                                </label>
                                <input type="text" name="subcategory" value="${p.subcategory || ''}"
                                       style="width: 100%; padding: 10px 14px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 14px;">
                            </div>
                        </div>
                        
                        <div>
                            <label style="font-size: 13px; font-weight: 700; color: #0f172a; display: block; margin-bottom: 8px;">
                                Stock
                            </label>
                            <input type="number" name="stock" min="0" value="${p.stock}"
                                   style="width: 100%; padding: 10px 14px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 14px;">
                        </div>
                        
                        <div>
                            <label style="font-size: 13px; font-weight: 700; color: #0f172a; display: block; margin-bottom: 8px;">
                                Descripción
                            </label>
                            <textarea name="description" rows="3"
                                      style="width: 100%; padding: 10px 14px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 14px; resize: vertical;">${p.description || ''}</textarea>
                        </div>
                        
                        <div>
                            <label style="font-size: 13px; font-weight: 700; color: #0f172a; display: block; margin-bottom: 8px;">
                                Imagen Principal (URL)
                            </label>
                            <input type="text" name="image" value="${p.image || ''}"
                                   style="width: 100%; padding: 10px 14px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 14px;">
                        </div>
                        
                        <div>
                            <label style="font-size: 13px; font-weight: 700; color: #0f172a; display: block; margin-bottom: 8px;">
                                Imágenes Adicionales (URLs separadas por coma)
                            </label>
                            <input type="text" name="images" value="${imagesString}"
                                   style="width: 100%; padding: 10px 14px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 14px;">
                        </div>
                        
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <input type="checkbox" name="active" id="activeCheck" ${p.active ? 'checked' : ''}
                                   style="width: 20px; height: 20px; cursor: pointer;">
                            <label for="activeCheck" style="font-size: 14px; font-weight: 600; color: #0f172a; cursor: pointer;">
                                Producto activo
                            </label>
                        </div>
                    </form>
                `,
                actions: `
                    <button onclick="ProductsModule.saveProduct(${p.id})"
                            style="background: linear-gradient(135deg, #003d82, #002952); color: white; border: none;
                                   padding: 12px 32px; border-radius: 8px; font-weight: 700; cursor: pointer;">
                        💾 Actualizar
                    </button>
                    <button onclick="ProductsModule.deleteProduct(${p.id})"
                            style="background: #ef4444; color: white; border: none;
                                   padding: 12px 24px; border-radius: 8px; font-weight: 700; cursor: pointer;">
                        🗑️ Eliminar
                    </button>
                    <button onclick="document.getElementById('globalModal').style.display='none'"
                            style="background: #e2e8f0; color: #64748b; border: none;
                                   padding: 12px 24px; border-radius: 8px; font-weight: 700; cursor: pointer;">
                        Cancelar
                    </button>
                `
            });
            
        } catch (error) {
            console.error('Error al cargar producto:', error);
            this.showError('Error al cargar producto para editar');
        }
    },
    
    // Guardar producto (crear o actualizar)
    async saveProduct(id = null) {
        const form = document.getElementById('productForm');
        const formData = new FormData(form);
        
        // Construir objeto de producto
        // IMPORTANTE: NO enviar id, created_at, updated_at (auto-gestionados)
        const product = {
            sku: formData.get('sku').trim(),
            name: formData.get('name').trim(),
            category: formData.get('category').trim(),
            subcategory: formData.get('subcategory')?.trim() || '',
            price: parseFloat(formData.get('price')),
            description: formData.get('description')?.trim() || '',
            image: formData.get('image')?.trim() || '',
            stock: parseInt(formData.get('stock')) || 0,
            active: formData.get('active') ? 1 : 0
        };
        
        // Procesar imágenes adicionales (convertir string separado por comas a array)
        const imagesString = formData.get('images')?.trim() || '';
        if (imagesString) {
            product.images = imagesString.split(',').map(img => img.trim()).filter(Boolean);
        } else {
            product.images = [];
        }
        
        // Si es edición, agregar el ID
        if (id) {
            product.id = id;
        }
        
        try {
            const action = id ? 'update' : 'create';
            const method = id ? 'PUT' : 'POST';
            
            const response = await fetch(`${CONFIG.API_URL}/products_crud.php?action=${action}`, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('mawewe_token_v3')}`
                },
                body: JSON.stringify(product)
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Error al guardar producto');
            }
            
            this.showSuccess(id ? 'Producto actualizado exitosamente' : 'Producto creado exitosamente');
            
            // Cerrar modal y recargar
            document.getElementById('globalModal').style.display = 'none';
            await this.loadProducts();
            await this.loadCategories();
            this.render();
            this.attachEvents();
            
        } catch (error) {
            console.error('Error al guardar producto:', error);
            this.showError(error.message);
        }
    },
    
    // Eliminar producto
    async deleteProduct(id) {
        if (!confirm('¿Estás seguro de eliminar este producto?')) return;
        
        try {
            const response = await fetch(`${CONFIG.API_URL}/products_crud.php?action=delete&id=${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('mawewe_token_v3')}`
                }
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Error al eliminar producto');
            }
            
            this.showSuccess('Producto eliminado exitosamente');
            
            document.getElementById('globalModal').style.display = 'none';
            await this.loadProducts();
            this.render();
            this.attachEvents();
            
        } catch (error) {
            console.error('Error al eliminar producto:', error);
            this.showError(error.message);
        }
    },
    
    // Modal genérico
    showModal(options) {
        let modal = document.getElementById('globalModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'globalModal';
            modal.style.cssText = `
                display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5);
                z-index: 10000; overflow: auto; padding: 20px;
            `;
            document.body.appendChild(modal);
        }
        
        modal.innerHTML = `
            <div style="background: white; max-width: 700px; margin: 40px auto; border-radius: 16px; 
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3); animation: modalSlide 0.3s;">
                <div style="padding: 24px; border-bottom: 2px solid #e2e8f0;">
                    <h2 style="margin: 0; font-size: 24px; font-weight: 800; color: #0f172a;">
                        ${options.title}
                    </h2>
                </div>
                <div style="padding: 24px; max-height: 70vh; overflow-y: auto;">
                    ${options.content}
                </div>
                <div style="padding: 24px; border-top: 2px solid #e2e8f0; display: flex; gap: 12px; justify-content: flex-end;">
                    ${options.actions}
                </div>
            </div>
        `;
        
        modal.style.display = 'flex';
        
        // Cerrar al hacer clic fuera
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        };
    },
    
    // Mostrar error
    showError(message) {
        alert('❌ ' + message);
    },
    
    // Mostrar éxito
    showSuccess(message) {
        alert('✅ ' + message);
    }
};

// Exponer globalmente
window.ProductsModule = ProductsModule;

console.log('✅ Módulo Products cargado');