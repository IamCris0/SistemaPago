/**
 * MÓDULO DE PRODUCTOS - VERSIÓN SIMPLE PARA EMPLEADOS
 * Mawewe CRM v4.0
 * Interfaz clara, intuitiva y fácil de usar
 */

const ProductsModule = {
    products: [],
    filteredProducts: [],
    currentPage: 1,
    itemsPerPage: 12,
    currentFilter: { search: '', category: '', stockStatus: '' },
    categories: [],
    editingId: null,

    // ─────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────
    async init() {
        const container = document.getElementById('productsContainer');
        if (!container) return;

        container.innerHTML = this.tplLoading();

        try {
            await this.fetchProducts();
            this.render();
        } catch (e) {
            container.innerHTML = this.tplError(e.message);
        }
    },

    // ─────────────────────────────────────────
    // FETCH
    // ─────────────────────────────────────────
    async fetchProducts() {
        const r = await fetch(`${CONFIG.API_URL}/products_crud.php?action=list&limit=1000`, {
            headers: { 'Authorization': `Bearer ${CONFIG.getToken()}` }
        });
        if (!r.ok) throw new Error(`Error HTTP ${r.status}`);
        const d = await r.json();
        if (!d.success) throw new Error(d.message || 'No se pudo cargar');
        this.products = d.products || [];
        this.filteredProducts = [...this.products];
        this.categories = [...new Set(this.products.map(p => p.category).filter(Boolean))].sort();
    },

    // ─────────────────────────────────────────
    // RENDER PRINCIPAL
    // ─────────────────────────────────────────
    render() {
        const container = document.getElementById('productsContainer');
        if (!container) return;

        const stats = this.calcStats();
        const paged  = this.getPagedProducts();
        const totalPages = Math.ceil(this.filteredProducts.length / this.itemsPerPage);

        container.innerHTML = `
        <div class="pm-root">

            <!-- ENCABEZADO -->
            <div class="pm-header">
                <div class="pm-header-left">
                    <h2 class="pm-title">🛍️ Productos</h2>
                    <p class="pm-subtitle">Gestiona el catálogo de la tienda</p>
                </div>
                <button class="pm-btn pm-btn-add" onclick="ProductsModule.openForm()">
                    <span class="pm-btn-icon">+</span> Agregar Producto
                </button>
            </div>

            <!-- STATS RÁPIDAS -->
            <div class="pm-stats">
                ${this.tplStat('📦', 'Total', stats.total, 'blue')}
                ${this.tplStat('✅', 'Con stock', stats.inStock, 'green')}
                ${this.tplStat('⚠️', 'Stock bajo', stats.lowStock, 'yellow')}
                ${this.tplStat('❌', 'Sin stock', stats.outStock, 'red')}
            </div>

            <!-- BUSCADOR Y FILTROS -->
            <div class="pm-filters">
                <div class="pm-search-wrap">
                    <span class="pm-search-icon">🔍</span>
                    <input
                        id="pm-search"
                        class="pm-search-input"
                        type="text"
                        placeholder="Buscar por nombre, código..."
                        value="${this.escHtml(this.currentFilter.search)}"
                        oninput="ProductsModule.onSearch(this.value)"
                    >
                    ${this.currentFilter.search
                        ? `<button class="pm-search-clear" onclick="ProductsModule.clearSearch()">✕</button>`
                        : ''}
                </div>

                <select class="pm-filter-select" onchange="ProductsModule.onCategory(this.value)">
                    <option value="">Todas las categorías</option>
                    ${this.categories.map(c =>
                        `<option value="${c}" ${this.currentFilter.category === c ? 'selected' : ''}>${this.capFirst(c)}</option>`
                    ).join('')}
                </select>

                <select class="pm-filter-select" onchange="ProductsModule.onStock(this.value)">
                    <option value="">Todo el stock</option>
                    <option value="in"    ${this.currentFilter.stockStatus==='in'    ?'selected':''}>Con stock</option>
                    <option value="low"   ${this.currentFilter.stockStatus==='low'   ?'selected':''}>Stock bajo (&lt;10)</option>
                    <option value="out"   ${this.currentFilter.stockStatus==='out'   ?'selected':''}>Sin stock</option>
                </select>

                ${(this.currentFilter.search || this.currentFilter.category || this.currentFilter.stockStatus)
                    ? `<button class="pm-btn pm-btn-ghost" onclick="ProductsModule.clearFilters()">🔄 Limpiar</button>`
                    : ''}
            </div>

            <!-- RESULTADO -->
            <div class="pm-result-bar">
                <span>${this.filteredProducts.length} producto${this.filteredProducts.length!==1?'s':''} encontrado${this.filteredProducts.length!==1?'s':''}</span>
                ${totalPages > 1 ? `<span>Página ${this.currentPage} de ${totalPages}</span>` : ''}
            </div>

            <!-- GRID DE PRODUCTOS -->
            ${paged.length === 0
                ? this.tplEmpty()
                : `<div class="pm-grid">${paged.map(p => this.tplCard(p)).join('')}</div>`
            }

            <!-- PAGINACIÓN -->
            ${totalPages > 1 ? this.tplPagination(totalPages) : ''}
        </div>

        <!-- MODAL -->
        <div id="pm-modal-overlay" class="pm-modal-overlay" onclick="ProductsModule.closeForm(event)">
            <div class="pm-modal" onclick="event.stopPropagation()">
                <div class="pm-modal-header">
                    <h3 id="pm-modal-title">Nuevo Producto</h3>
                    <button class="pm-modal-close" onclick="ProductsModule.closeForm()">✕</button>
                </div>
                <div id="pm-modal-body" class="pm-modal-body"></div>
            </div>
        </div>

        <style>${this.css()}</style>
        `;
    },

    // ─────────────────────────────────────────
    // TEMPLATES
    // ─────────────────────────────────────────
    tplStat(icon, label, value, color) {
        return `
        <div class="pm-stat pm-stat-${color}">
            <span class="pm-stat-icon">${icon}</span>
            <div>
                <div class="pm-stat-value">${value}</div>
                <div class="pm-stat-label">${label}</div>
            </div>
        </div>`;
    },

    tplCard(p) {
        const stockBadge = p.stock === 0
            ? `<span class="pm-badge pm-badge-red">Sin stock</span>`
            : p.stock < 10
                ? `<span class="pm-badge pm-badge-yellow">⚠ Stock: ${p.stock}</span>`
                : `<span class="pm-badge pm-badge-green">Stock: ${p.stock}</span>`;

        const statusBadge = p.active
            ? `<span class="pm-badge pm-badge-green-light">Activo</span>`
            : `<span class="pm-badge pm-badge-gray">Inactivo</span>`;

        return `
        <div class="pm-card ${!p.active ? 'pm-card-inactive' : ''}">
            <div class="pm-card-top">
                <div class="pm-card-badges">
                    ${stockBadge}
                    ${statusBadge}
                </div>
                <div class="pm-card-sku">${this.escHtml(p.sku || '—')}</div>
            </div>

            <div class="pm-card-body">
                <h3 class="pm-card-name" title="${this.escHtml(p.name)}">${this.escHtml(p.name)}</h3>
                <div class="pm-card-cat">
                    ${p.category ? `<span class="pm-tag">${this.capFirst(p.category)}</span>` : ''}
                    ${p.subcategory ? `<span class="pm-tag pm-tag-sub">${this.capFirst(p.subcategory)}</span>` : ''}
                </div>
                <div class="pm-card-price">$${parseFloat(p.price).toFixed(2)}</div>
                ${p.description
                    ? `<p class="pm-card-desc">${this.escHtml(p.description).slice(0,90)}${p.description.length>90?'…':''}</p>`
                    : ''}
            </div>

            <div class="pm-card-actions">
                <button class="pm-action-btn pm-action-edit" onclick="ProductsModule.openForm(${p.id})" title="Editar">
                    ✏️ Editar
                </button>
                <button class="pm-action-btn pm-action-stock" onclick="ProductsModule.openStock(${p.id})" title="Ajustar stock">
                    📦 Stock
                </button>
                <button class="pm-action-btn pm-action-toggle ${p.active?'pm-action-deact':'pm-action-act'}"
                        onclick="ProductsModule.toggleStatus(${p.id})"
                        title="${p.active?'Desactivar':'Activar'}">
                    ${p.active ? '⏸' : '▶️'}
                </button>
            </div>
        </div>`;
    },

    tplEmpty() {
        return `
        <div class="pm-empty">
            <div class="pm-empty-icon">🔍</div>
            <h3>No se encontraron productos</h3>
            <p>Intenta con otro término o limpia los filtros</p>
            <button class="pm-btn pm-btn-add" onclick="ProductsModule.openForm()">+ Agregar Producto</button>
        </div>`;
    },

    tplPagination(totalPages) {
        const pages = [];
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || Math.abs(i - this.currentPage) <= 1) {
                pages.push(`<button class="pm-page-btn ${i===this.currentPage?'pm-page-active':''}"
                    onclick="ProductsModule.goPage(${i})">${i}</button>`);
            } else if (Math.abs(i - this.currentPage) === 2) {
                pages.push(`<span class="pm-page-dots">…</span>`);
            }
        }
        return `
        <div class="pm-pagination">
            <button class="pm-page-btn" onclick="ProductsModule.goPage(${this.currentPage-1})"
                ${this.currentPage===1?'disabled':''}>← Anterior</button>
            <div class="pm-page-nums">${pages.join('')}</div>
            <button class="pm-page-btn" onclick="ProductsModule.goPage(${this.currentPage+1})"
                ${this.currentPage===totalPages?'disabled':''}>Siguiente →</button>
        </div>`;
    },

    tplLoading() {
        return `
        <div class="pm-loading">
            <div class="pm-spinner"></div>
            <p>Cargando productos...</p>
        </div>
        <style>${this.css()}</style>`;
    },

    tplError(msg) {
        return `
        <div class="pm-empty">
            <div class="pm-empty-icon">⚠️</div>
            <h3>Error al cargar</h3>
            <p>${this.escHtml(msg)}</p>
            <button class="pm-btn pm-btn-add" onclick="ProductsModule.init()">🔄 Reintentar</button>
        </div>
        <style>${this.css()}</style>`;
    },

    // FORMULARIO DE PRODUCTO
    tplForm(p) {
        const isEdit = !!p;
        return `
        <form id="pm-form" onsubmit="event.preventDefault(); ProductsModule.saveProduct()">

            <div class="pm-form-section">
                <div class="pm-form-section-title">📋 Información básica</div>
                <div class="pm-form-row">
                    <div class="pm-form-group pm-form-group-full">
                        <label class="pm-label pm-required">Nombre del producto</label>
                        <input class="pm-input" type="text" name="name" required
                            placeholder="Ej: Polo Slim Fit Azul"
                            value="${isEdit ? this.escHtml(p.name) : ''}">
                    </div>
                </div>
                <div class="pm-form-row pm-form-row-2">
                    <div class="pm-form-group">
                        <label class="pm-label pm-required">Código / SKU</label>
                        <input class="pm-input" type="text" name="sku" required
                            placeholder="Ej: ROP-AME-001"
                            value="${isEdit ? this.escHtml(p.sku) : ''}">
                        <span class="pm-hint">Código único para identificar el producto</span>
                    </div>
                    <div class="pm-form-group">
                        <label class="pm-label pm-required">Precio (USD)</label>
                        <div class="pm-input-prefix-wrap">
                            <span class="pm-input-prefix">$</span>
                            <input class="pm-input pm-input-with-prefix" type="number"
                                name="price" step="0.01" min="0" required
                                placeholder="0.00"
                                value="${isEdit ? p.price : ''}">
                        </div>
                    </div>
                </div>
            </div>

            <div class="pm-form-section">
                <div class="pm-form-section-title">📂 Categoría</div>
                <div class="pm-form-row pm-form-row-2">
                    <div class="pm-form-group">
                        <label class="pm-label pm-required">Categoría principal</label>
                        <input class="pm-input" type="text" name="category" required
                            list="pm-cat-list"
                            placeholder="Ej: ropa, peluches..."
                            value="${isEdit ? this.escHtml(p.category) : ''}">
                        <datalist id="pm-cat-list">
                            ${this.categories.map(c=>`<option value="${c}">`).join('')}
                        </datalist>
                    </div>
                    <div class="pm-form-group">
                        <label class="pm-label">Subcategoría</label>
                        <input class="pm-input" type="text" name="subcategory"
                            placeholder="Ej: americanino, chevignon..."
                            value="${isEdit ? this.escHtml(p.subcategory||'') : ''}">
                    </div>
                </div>
            </div>

            <div class="pm-form-section">
                <div class="pm-form-section-title">📦 Inventario y estado</div>
                <div class="pm-form-row pm-form-row-2">
                    <div class="pm-form-group">
                        <label class="pm-label">Stock inicial</label>
                        <input class="pm-input" type="number" name="stock" min="0"
                            placeholder="0"
                            value="${isEdit ? p.stock : '0'}">
                        ${isEdit ? `<span class="pm-hint">Para ajustar usa el botón 📦 Stock</span>` : ''}
                    </div>
                    <div class="pm-form-group">
                        <label class="pm-label">Estado</label>
                        <div class="pm-toggle-group">
                            <label class="pm-toggle-opt">
                                <input type="radio" name="active" value="1" ${!isEdit || p.active ? 'checked' : ''}>
                                <span class="pm-toggle-label pm-toggle-active">✅ Activo</span>
                            </label>
                            <label class="pm-toggle-opt">
                                <input type="radio" name="active" value="0" ${isEdit && !p.active ? 'checked' : ''}>
                                <span class="pm-toggle-label pm-toggle-inactive">❌ Inactivo</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <div class="pm-form-section">
                <div class="pm-form-section-title">🖼️ Imagen y descripción</div>
                <div class="pm-form-group pm-form-group-full">
                    <label class="pm-label">URL de la imagen principal</label>
                    <input class="pm-input" type="text" name="image"
                        placeholder="assets/img/categoria/PRODUCTO/img-001.jpeg"
                        value="${isEdit ? this.escHtml(p.image||'') : ''}">
                    <span class="pm-hint">Ruta relativa a la carpeta de imágenes del servidor</span>
                </div>
                <div class="pm-form-group pm-form-group-full">
                    <label class="pm-label">Descripción del producto</label>
                    <textarea class="pm-input pm-textarea" name="description"
                        placeholder="Describe el producto: material, talla, características..."
                        rows="4">${isEdit ? this.escHtml(p.description||'') : ''}</textarea>
                </div>
            </div>

            <div class="pm-form-footer">
                <button type="button" class="pm-btn pm-btn-ghost" onclick="ProductsModule.closeForm()">Cancelar</button>
                <button type="submit" class="pm-btn pm-btn-add" id="pm-save-btn">
                    ${isEdit ? '💾 Guardar cambios' : '✅ Crear producto'}
                </button>
            </div>
        </form>`;
    },

    // FORMULARIO DE STOCK
    tplStockForm(p) {
        return `
        <div class="pm-stock-info">
            <div class="pm-stock-product">${this.escHtml(p.name)}</div>
            <div class="pm-stock-current">
                Stock actual: <strong>${p.stock}</strong> unidades
            </div>
        </div>

        <form id="pm-stock-form" onsubmit="event.preventDefault(); ProductsModule.saveStock(${p.id})">
            <div class="pm-form-section">
                <div class="pm-form-group">
                    <label class="pm-label">¿Qué quieres hacer?</label>
                    <div class="pm-stock-options">
                        <label class="pm-stock-opt">
                            <input type="radio" name="type" value="add" checked>
                            <span class="pm-stock-opt-label pm-stock-add">
                                <span class="pm-stock-opt-icon">➕</span>
                                <strong>Agregar</strong>
                                <small>Recibí mercadería</small>
                            </span>
                        </label>
                        <label class="pm-stock-opt">
                            <input type="radio" name="type" value="subtract">
                            <span class="pm-stock-opt-label pm-stock-sub">
                                <span class="pm-stock-opt-icon">➖</span>
                                <strong>Restar</strong>
                                <small>Salida / venta manual</small>
                            </span>
                        </label>
                        <label class="pm-stock-opt">
                            <input type="radio" name="type" value="set">
                            <span class="pm-stock-opt-label pm-stock-set">
                                <span class="pm-stock-opt-icon">📝</span>
                                <strong>Establecer</strong>
                                <small>Hacer inventario</small>
                            </span>
                        </label>
                    </div>
                </div>

                <div class="pm-form-row pm-form-row-2">
                    <div class="pm-form-group">
                        <label class="pm-label pm-required">Cantidad</label>
                        <input class="pm-input pm-input-lg" type="number"
                            name="quantity" min="0" required value="0"
                            placeholder="0">
                    </div>
                    <div class="pm-form-group">
                        <label class="pm-label">Motivo (opcional)</label>
                        <input class="pm-input" type="text" name="reason"
                            placeholder="Ej: Compra bodega, devolución...">
                    </div>
                </div>
            </div>

            <div class="pm-form-footer">
                <button type="button" class="pm-btn pm-btn-ghost" onclick="ProductsModule.closeForm()">Cancelar</button>
                <button type="submit" class="pm-btn pm-btn-add">✅ Actualizar stock</button>
            </div>
        </form>`;
    },

    // ─────────────────────────────────────────
    // ACCIONES
    // ─────────────────────────────────────────
    openForm(id) {
        this.editingId = id || null;
        const overlay = document.getElementById('pm-modal-overlay');
        const title   = document.getElementById('pm-modal-title');
        const body    = document.getElementById('pm-modal-body');

        if (!overlay) return;

        if (id) {
            const p = this.products.find(x => x.id === id);
            if (!p) return;
            title.textContent = '✏️ Editar Producto';
            body.innerHTML = this.tplForm(p);
        } else {
            title.textContent = '➕ Nuevo Producto';
            body.innerHTML = this.tplForm(null);
        }

        overlay.classList.add('pm-modal-visible');
        document.body.style.overflow = 'hidden';
    },

    openStock(id) {
        const p = this.products.find(x => x.id === id);
        if (!p) return;

        const overlay = document.getElementById('pm-modal-overlay');
        const title   = document.getElementById('pm-modal-title');
        const body    = document.getElementById('pm-modal-body');

        title.textContent = '📦 Ajustar Stock';
        body.innerHTML = this.tplStockForm(p);
        overlay.classList.add('pm-modal-visible');
        document.body.style.overflow = 'hidden';
    },

    closeForm(event) {
        if (event && event.target !== document.getElementById('pm-modal-overlay')) return;
        const overlay = document.getElementById('pm-modal-overlay');
        if (overlay) overlay.classList.remove('pm-modal-visible');
        document.body.style.overflow = '';
        this.editingId = null;
    },

    async saveProduct() {
        const form = document.getElementById('pm-form');
        if (!form || !form.checkValidity()) { form?.reportValidity(); return; }

        const fd = new FormData(form);
        const data = Object.fromEntries(fd.entries());

        const saveBtn = document.getElementById('pm-save-btn');
        if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Guardando...'; }

        try {
            const isEdit = !!this.editingId;
            if (isEdit) data.id = this.editingId;

            const url = `${CONFIG.API_URL}/products_crud.php?action=${isEdit ? 'update' : 'create'}`;
            const r = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.getToken()}`
                },
                body: JSON.stringify(data)
            });

            const result = await r.json();

            if (result.success) {
                this.closeForm();
                await this.fetchProducts();
                this.applyFilters();
                this.showToast('success', isEdit ? '✅ Producto actualizado' : '✅ Producto creado correctamente');
            } else {
                this.showToast('error', result.message || 'Error al guardar');
            }
        } catch (e) {
            this.showToast('error', 'Error de conexión');
        } finally {
            if (saveBtn) { saveBtn.disabled = false; }
        }
    },

    async saveStock(productId) {
        const form = document.getElementById('pm-stock-form');
        if (!form) return;

        const fd = new FormData(form);
        const type     = fd.get('type');
        const quantity = parseInt(fd.get('quantity'));
        const reason   = fd.get('reason');

        if (isNaN(quantity) || quantity < 0) {
            this.showToast('error', 'Ingresa una cantidad válida'); return;
        }

        // Calcular nuevo stock
        const p = this.products.find(x => x.id === productId);
        let newStock = p.stock;
        if (type === 'add')      newStock = p.stock + quantity;
        else if (type === 'subtract') newStock = Math.max(0, p.stock - quantity);
        else if (type === 'set') newStock = quantity;

        try {
            const r = await fetch(`${CONFIG.API_URL}/products_crud.php?action=update-stock`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.getToken()}`
                },
                body: JSON.stringify({ id: productId, stock: newStock, reason })
            });

            const result = await r.json();

            if (result.success) {
                this.closeForm();
                await this.fetchProducts();
                this.applyFilters();
                this.showToast('success', `✅ Stock actualizado a ${newStock} unidades`);
            } else {
                this.showToast('error', result.message || 'Error al actualizar stock');
            }
        } catch (e) {
            this.showToast('error', 'Error de conexión');
        }
    },

    async toggleStatus(id) {
        const p = this.products.find(x => x.id === id);
        if (!p) return;

        const confirm_msg = p.active
            ? `¿Desactivar "${p.name}"? No aparecerá en la tienda.`
            : `¿Activar "${p.name}"?`;

        if (!confirm(confirm_msg)) return;

        try {
            const r = await fetch(`${CONFIG.API_URL}/products_crud.php?action=toggle-status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.getToken()}`
                },
                body: JSON.stringify({ id })
            });

            const result = await r.json();

            if (result.success) {
                await this.fetchProducts();
                this.applyFilters();
                this.showToast('success', p.active ? '⏸ Producto desactivado' : '▶️ Producto activado');
            } else {
                this.showToast('error', result.message);
            }
        } catch (e) {
            this.showToast('error', 'Error de conexión');
        }
    },

    // ─────────────────────────────────────────
    // FILTROS Y PAGINACIÓN
    // ─────────────────────────────────────────
    onSearch(val) {
        this.currentFilter.search = val;
        this.currentPage = 1;
        this.applyFilters();
    },

    onCategory(val) {
        this.currentFilter.category = val;
        this.currentPage = 1;
        this.applyFilters();
    },

    onStock(val) {
        this.currentFilter.stockStatus = val;
        this.currentPage = 1;
        this.applyFilters();
    },

    clearSearch() {
        this.currentFilter.search = '';
        this.currentPage = 1;
        this.applyFilters();
    },

    clearFilters() {
        this.currentFilter = { search: '', category: '', stockStatus: '' };
        this.currentPage = 1;
        this.applyFilters();
    },

    applyFilters() {
        const { search, category, stockStatus } = this.currentFilter;
        const s = search.toLowerCase();

        this.filteredProducts = this.products.filter(p => {
            const matchSearch = !s ||
                p.name.toLowerCase().includes(s) ||
                (p.sku||'').toLowerCase().includes(s) ||
                (p.category||'').toLowerCase().includes(s);

            const matchCat = !category || p.category === category;

            let matchStock = true;
            if (stockStatus === 'in')  matchStock = p.stock > 0;
            if (stockStatus === 'low') matchStock = p.stock > 0 && p.stock < 10;
            if (stockStatus === 'out') matchStock = p.stock === 0;

            return matchSearch && matchCat && matchStock;
        });

        this.render();
    },

    goPage(n) {
        const totalPages = Math.ceil(this.filteredProducts.length / this.itemsPerPage);
        if (n < 1 || n > totalPages) return;
        this.currentPage = n;
        this.render();
        document.querySelector('.pm-root')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    getPagedProducts() {
        const start = (this.currentPage - 1) * this.itemsPerPage;
        return this.filteredProducts.slice(start, start + this.itemsPerPage);
    },

    // ─────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────
    calcStats() {
        return {
            total:    this.products.length,
            inStock:  this.products.filter(p => p.stock > 9).length,
            lowStock: this.products.filter(p => p.stock > 0 && p.stock < 10).length,
            outStock: this.products.filter(p => p.stock === 0).length,
        };
    },

    escHtml(str) {
        return String(str||'')
            .replace(/&/g,'&amp;').replace(/</g,'&lt;')
            .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    },

    capFirst(str) {
        return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
    },

    showToast(type, msg) {
        if (typeof showToast === 'function') {
            const titles = { success:'Éxito', error:'Error', info:'Info' };
            showToast(titles[type]||'', msg, type);
            return;
        }
        // Fallback propio
        const t = document.createElement('div');
        t.style.cssText = `
            position:fixed;bottom:24px;right:24px;z-index:99999;
            background:${type==='success'?'#10b981':type==='error'?'#ef4444':'#3b82f6'};
            color:#fff;padding:14px 20px;border-radius:10px;font-weight:600;
            font-size:14px;box-shadow:0 4px 16px rgba(0,0,0,.2);
            animation:pm-slide-in .3s ease;
        `;
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(()=>t.remove(), 4000);
    },

    // ─────────────────────────────────────────
    // CSS
    // ─────────────────────────────────────────
    css() {
        return `
        /* ── ROOT ── */
        .pm-root { font-family: 'Inter',-apple-system,sans-serif; color:#1e293b; }
        @keyframes pm-slide-in { from{transform:translateX(120px);opacity:0} to{transform:none;opacity:1} }
        @keyframes pm-fade-in  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes pm-spin     { to{transform:rotate(360deg)} }

        /* ── HEADER ── */
        .pm-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px; }
        .pm-title  { font-size:26px;font-weight:800;color:#003d82;margin:0 0 4px; }
        .pm-subtitle { font-size:14px;color:#64748b;margin:0; }

        /* ── BOTONES ── */
        .pm-btn { display:inline-flex;align-items:center;gap:6px;padding:10px 20px;
            border-radius:8px;border:none;font-size:14px;font-weight:700;cursor:pointer;
            transition:all .2s; }
        .pm-btn-add  { background:#003d82;color:#fff; }
        .pm-btn-add:hover { background:#002d61;transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,61,130,.3); }
        .pm-btn-ghost { background:#f1f5f9;color:#475569;border:1px solid #e2e8f0; }
        .pm-btn-ghost:hover { background:#e2e8f0; }
        .pm-btn-icon { font-size:18px;font-weight:900; }

        /* ── STATS ── */
        .pm-stats { display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px; }
        @media(max-width:768px){ .pm-stats{grid-template-columns:repeat(2,1fr);} }
        .pm-stat { background:#fff;border-radius:12px;padding:18px;display:flex;align-items:center;
            gap:14px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,.06); }
        .pm-stat-icon { font-size:32px;line-height:1; }
        .pm-stat-value { font-size:28px;font-weight:800;line-height:1;margin-bottom:2px; }
        .pm-stat-label { font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase; }
        .pm-stat-blue   .pm-stat-value { color:#003d82; }
        .pm-stat-green  .pm-stat-value { color:#059669; }
        .pm-stat-yellow .pm-stat-value { color:#d97706; }
        .pm-stat-red    .pm-stat-value { color:#dc2626; }

        /* ── FILTROS ── */
        .pm-filters { display:flex;gap:10px;flex-wrap:wrap;align-items:center;
            background:#fff;padding:16px;border-radius:12px;border:1px solid #e2e8f0;
            margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,.06); }
        .pm-search-wrap { position:relative;flex:1;min-width:220px; }
        .pm-search-icon { position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:16px;color:#94a3b8; }
        .pm-search-clear { position:absolute;right:10px;top:50%;transform:translateY(-50%);
            background:none;border:none;color:#94a3b8;cursor:pointer;font-size:16px; }
        .pm-search-input { width:100%;padding:10px 36px;border:1px solid #cbd5e1;border-radius:8px;
            font-size:14px;transition:.2s; }
        .pm-search-input:focus { outline:none;border-color:#003d82;box-shadow:0 0 0 3px rgba(0,61,130,.08); }
        .pm-filter-select { padding:10px 14px;border:1px solid #cbd5e1;border-radius:8px;
            font-size:14px;background:#fff;cursor:pointer;min-width:170px; }
        .pm-filter-select:focus { outline:none;border-color:#003d82; }

        /* ── RESULT BAR ── */
        .pm-result-bar { display:flex;justify-content:space-between;align-items:center;
            font-size:13px;color:#64748b;font-weight:600;margin-bottom:16px;padding:0 4px; }

        /* ── GRID ── */
        .pm-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:16px; }

        /* ── CARD ── */
        .pm-card { background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;
            display:flex;flex-direction:column;transition:box-shadow .2s,transform .2s;
            animation:pm-fade-in .25s ease both; }
        .pm-card:hover { box-shadow:0 6px 20px rgba(0,61,130,.12);transform:translateY(-2px); }
        .pm-card-inactive { opacity:.65; }

        .pm-card-top { padding:12px 14px 8px;display:flex;justify-content:space-between;align-items:flex-start;
            border-bottom:1px solid #f1f5f9; }
        .pm-card-badges { display:flex;gap:6px;flex-wrap:wrap; }
        .pm-card-sku { font-size:11px;color:#94a3b8;font-weight:600;font-family:monospace;
            background:#f8fafc;padding:2px 7px;border-radius:4px; }

        .pm-card-body { padding:14px;flex:1; }
        .pm-card-name { font-size:15px;font-weight:700;color:#1e293b;margin:0 0 8px;
            display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden; }
        .pm-card-cat { display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px; }
        .pm-tag { background:#eff6ff;color:#1d4ed8;font-size:11px;font-weight:600;
            padding:2px 8px;border-radius:20px; }
        .pm-tag-sub { background:#f0fdf4;color:#15803d; }
        .pm-card-price { font-size:22px;font-weight:800;color:#003d82;margin-bottom:8px; }
        .pm-card-desc { font-size:12px;color:#64748b;line-height:1.5;margin:0; }

        .pm-card-actions { display:grid;grid-template-columns:1fr 1fr 44px;border-top:1px solid #f1f5f9; }
        .pm-action-btn { padding:10px 6px;border:none;background:#fff;cursor:pointer;
            font-size:13px;font-weight:600;transition:background .15s;display:flex;
            align-items:center;justify-content:center;gap:4px; }
        .pm-action-btn:not(:last-child) { border-right:1px solid #f1f5f9; }
        .pm-action-edit:hover  { background:#dbeafe;color:#1e40af; }
        .pm-action-stock:hover { background:#d1fae5;color:#065f46; }
        .pm-action-toggle { font-size:16px; }
        .pm-action-deact:hover { background:#fee2e2;color:#991b1b; }
        .pm-action-act:hover   { background:#d1fae5;color:#065f46; }

        /* ── BADGES ── */
        .pm-badge { font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px; }
        .pm-badge-green  { background:#d1fae5;color:#065f46; }
        .pm-badge-yellow { background:#fef3c7;color:#92400e; }
        .pm-badge-red    { background:#fee2e2;color:#991b1b; }
        .pm-badge-green-light { background:#f0fdf4;color:#15803d; }
        .pm-badge-gray   { background:#f1f5f9;color:#475569; }

        /* ── EMPTY / LOADING ── */
        .pm-empty { text-align:center;padding:80px 40px;background:#fff;
            border-radius:12px;border:1px solid #e2e8f0; }
        .pm-empty-icon { font-size:64px;margin-bottom:16px; }
        .pm-empty h3  { font-size:20px;margin:0 0 8px;color:#1e293b; }
        .pm-empty p   { color:#64748b;margin:0 0 20px; }
        .pm-loading   { text-align:center;padding:80px 20px; }
        .pm-spinner   { width:50px;height:50px;border:4px solid #e2e8f0;border-top-color:#003d82;
            border-radius:50%;animation:pm-spin .8s linear infinite;margin:0 auto 16px; }
        .pm-loading p { color:#64748b;font-size:15px; }

        /* ── PAGINACIÓN ── */
        .pm-pagination { display:flex;justify-content:center;align-items:center;gap:8px;
            margin-top:24px;flex-wrap:wrap; }
        .pm-page-nums  { display:flex;gap:4px;align-items:center; }
        .pm-page-btn   { padding:8px 14px;border:1px solid #e2e8f0;background:#fff;
            border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:.2s;color:#475569; }
        .pm-page-btn:hover:not(:disabled) { border-color:#003d82;color:#003d82; }
        .pm-page-btn:disabled { opacity:.4;cursor:default; }
        .pm-page-active { background:#003d82;color:#fff;border-color:#003d82; }
        .pm-page-dots  { color:#94a3b8;padding:0 4px; }

        /* ── MODAL ── */
        .pm-modal-overlay { display:none;position:fixed;inset:0;background:rgba(15,23,42,.55);
            backdrop-filter:blur(4px);z-index:10000;align-items:center;justify-content:center;padding:16px; }
        .pm-modal-overlay.pm-modal-visible { display:flex;animation:pm-fade-in .25s ease; }
        .pm-modal { background:#fff;border-radius:16px;width:100%;max-width:680px;
            max-height:90vh;display:flex;flex-direction:column;
            box-shadow:0 24px 48px rgba(0,61,130,.2); }
        .pm-modal-header { padding:20px 24px;background:linear-gradient(135deg,#003d82,#0052b0);
            color:#fff;display:flex;justify-content:space-between;align-items:center;
            border-radius:16px 16px 0 0;flex-shrink:0; }
        .pm-modal-header h3 { margin:0;font-size:18px;font-weight:700; }
        .pm-modal-close { background:rgba(255,255,255,.2);border:none;color:#fff;
            width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:18px;
            display:flex;align-items:center;justify-content:center;transition:.2s; }
        .pm-modal-close:hover { background:rgba(255,255,255,.35); }
        .pm-modal-body { padding:24px;overflow-y:auto;flex:1; }
        .pm-modal-body::-webkit-scrollbar { width:8px; }
        .pm-modal-body::-webkit-scrollbar-thumb { background:#cbd5e1;border-radius:4px; }

        /* ── FORM ── */
        .pm-form-section { background:#f8fafc;border-radius:10px;padding:16px;margin-bottom:16px;
            border:1px solid #e2e8f0; }
        .pm-form-section-title { font-size:13px;font-weight:700;color:#475569;
            text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px; }
        .pm-form-row { display:flex;gap:12px;flex-wrap:wrap; }
        .pm-form-row-2 > .pm-form-group { flex:1;min-width:180px; }
        .pm-form-group { display:flex;flex-direction:column;gap:6px; }
        .pm-form-group-full { width:100%; }
        .pm-label { font-size:13px;font-weight:600;color:#374151; }
        .pm-required::after { content:' *';color:#ef4444; }
        .pm-input { padding:10px 12px;border:1.5px solid #cbd5e1;border-radius:8px;
            font-size:14px;font-family:inherit;transition:.2s; }
        .pm-input:focus { outline:none;border-color:#003d82;box-shadow:0 0 0 3px rgba(0,61,130,.08); }
        .pm-textarea { resize:vertical;min-height:90px; }
        .pm-input-lg { font-size:22px;font-weight:700;text-align:center; }
        .pm-input-prefix-wrap { position:relative; }
        .pm-input-prefix { position:absolute;left:12px;top:50%;transform:translateY(-50%);
            font-weight:700;color:#475569; }
        .pm-input-with-prefix { padding-left:24px; }
        .pm-hint { font-size:11px;color:#94a3b8;font-style:italic; }

        /* Toggle radio */
        .pm-toggle-group { display:flex;gap:10px; }
        .pm-toggle-opt { cursor:pointer; }
        .pm-toggle-opt input { display:none; }
        .pm-toggle-label { display:flex;align-items:center;gap:6px;padding:8px 14px;
            border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;
            border:2px solid #e2e8f0;transition:.2s; }
        .pm-toggle-opt input:checked + .pm-toggle-active  { border-color:#059669;background:#d1fae5;color:#065f46; }
        .pm-toggle-opt input:checked + .pm-toggle-inactive { border-color:#ef4444;background:#fee2e2;color:#991b1b; }

        /* Stock options */
        .pm-stock-info { background:#eff6ff;border-radius:10px;padding:16px;margin-bottom:16px;border:1px solid #bfdbfe; }
        .pm-stock-product { font-weight:700;font-size:15px;color:#1e40af;margin-bottom:4px; }
        .pm-stock-current { font-size:14px;color:#1d4ed8; }
        .pm-stock-current strong { font-size:24px; }
        .pm-stock-options { display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px; }
        .pm-stock-opt { cursor:pointer; }
        .pm-stock-opt input { display:none; }
        .pm-stock-opt-label { display:flex;flex-direction:column;align-items:center;gap:4px;
            padding:14px 10px;border-radius:10px;border:2px solid #e2e8f0;
            text-align:center;transition:.2s;cursor:pointer; }
        .pm-stock-opt-label:hover { border-color:#003d82;background:#eff6ff; }
        .pm-stock-opt input:checked + .pm-stock-add { border-color:#059669;background:#d1fae5; }
        .pm-stock-opt input:checked + .pm-stock-sub { border-color:#dc2626;background:#fee2e2; }
        .pm-stock-opt input:checked + .pm-stock-set { border-color:#d97706;background:#fef3c7; }
        .pm-stock-opt-icon { font-size:24px; }
        .pm-stock-opt-label strong { font-size:13px;font-weight:700; }
        .pm-stock-opt-label small { font-size:11px;color:#64748b; }

        .pm-form-footer { display:flex;justify-content:flex-end;gap:10px;
            padding-top:16px;border-top:1px solid #e2e8f0;margin-top:4px; }

        @media(max-width:600px){
            .pm-grid { grid-template-columns:1fr; }
            .pm-stock-options { grid-template-columns:1fr; }
            .pm-form-row-2 > .pm-form-group { min-width:100%; }
        }
        `;
    }
};

// Registrar en Router si existe
if (typeof Router !== 'undefined') {
    Router.register('products', () => ProductsModule.init());
}

window.ProductsModule = ProductsModule;
console.log('✅ ProductsModule (simple) cargado');