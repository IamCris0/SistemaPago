/**
 * MAWEWE E-COMMERCE - VERSIÓN CORREGIDA
 * ✅ FIX: Búsqueda funcionando correctamente
 * ✅ FIX: Filtros de categoría funcionando
 * ✅ FIX: Routing integrado para URLs compartibles
 * ✅ FIX: Categorías ordenadas por cantidad de productos
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  api: {
    baseUrl: 'https://mawewe.com.ec/api',
    endpoints: {
      products: '/products.php',
      saveOrder: '/save-order.php'
    }
  },
  
  paypal: {
    clientId: 'AeKUZVm_-yxZRjygolPx21RgDuy3_K24uOrKWf3MpLAG8xErNCyu4S2GcIu27tJclkpabpv0HXAeBgrg',
    currency: 'USD'
  },
  
  shipping: {
    cost: 0.00,
    freeThreshold: 0.00,
    expressCost: 0.00
  },
  
  search: {
    minChars: 2,
    debounceTime: 500
  }
};

console.log('🚀 Mawewe iniciando...');
console.log('📡 API URL:', CONFIG.api.baseUrl);

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

const state = {
  products: [],
  allProducts: [],
  categories: [],
  subcategoriesByCategory: {},
  cart: [],
  currentFilter: 'all',
  currentSubcategory: null,
  searchQuery: '',
  shippingMethod: 'standard',
  checkoutData: {},
  isSearching: false
};

// =============================================================================
// API FUNCTIONS
// =============================================================================

const api = {
  async fetchProducts(filters = {}) {
    try {
      let url = `${CONFIG.api.baseUrl}${CONFIG.api.endpoints.products}`;
      
      const params = new URLSearchParams();
      
      // Solo agregar categoría si no es 'all'
      if (filters.category && filters.category !== 'all') {
        params.append('category', filters.category.toLowerCase().trim());
        console.log('📂 Filtrando categoría:', filters.category);
      }
      
      // Agregar subcategoría si existe
      if (filters.subcategory && filters.subcategory !== '') {
        params.append('subcategory', filters.subcategory.toLowerCase().trim());
        console.log('📁 Filtrando subcategoría:', filters.subcategory);
      }
      
      // Agregar búsqueda si cumple requisitos
      if (filters.search && filters.search.trim().length >= CONFIG.search.minChars) {
        params.append('search', filters.search.trim());
        console.log('🔍 Búsqueda:', filters.search);
      }
      
      if (params.toString()) {
        url += '?' + params.toString();
      }
      
      console.log('📡 Fetching:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        mode: 'cors',
        cache: 'no-cache'
      });
      
      console.log('📥 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌ Respuesta no es JSON:', text.substring(0, 500));
        throw new Error('La API no está respondiendo con JSON');
      }
      
      const data = await response.json();
      
      if (!data || typeof data !== 'object') {
        throw new Error('Respuesta inválida del servidor');
      }
      
      console.log('✅ Data received:', data);
      
      if (data.success && data.products && Array.isArray(data.products)) {
        data.products.sort((a, b) => a.id - b.id);
        console.log(`✅ ${data.products.length} productos activos cargados`);
      }
      
      return data;
      
    } catch (error) {
      console.error('❌ API Error:', error);
      throw error;
    }
  },

  async saveOrder(orderData) {
    try {
      const url = CONFIG.api.baseUrl + CONFIG.api.endpoints.saveOrder;
      
      console.log('💾 Guardando orden en:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(orderData),
        mode: 'cors'
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌ save-order.php no respondió JSON:', text.substring(0, 500));
        throw new Error('Error en save-order.php');
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al guardar la orden');
      }

      return result;
    } catch (error) {
      console.error('❌ Error saving order:', error);
      throw error;
    }
  }
};

// =============================================================================
// CART FUNCTIONS
// =============================================================================

const cart = {
  load() {
    try {
      const saved = localStorage.getItem('mawewe_cart_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        state.cart = Array.isArray(parsed) 
          ? parsed.filter(item => item && item.price && item.name && item.productId)
          : [];
      } else {
        state.cart = [];
      }
    } catch (error) {
      console.error('❌ Error loading cart:', error);
      state.cart = [];
    }
    
    this.updateUI();
  },
  
  save() {
    localStorage.setItem('mawewe_cart_v3', JSON.stringify(state.cart));
  },
  
  addItem(productId) {
    const product = state.products.find(p => p.id === productId);
    
    if (!product) {
      ui.showNotification('Producto no encontrado', 'error');
      return;
    }
    
    if (product.stock < 1) {
      ui.showNotification('Producto sin stock disponible', 'error');
      return;
    }
    
    const existingItem = state.cart.find(item => item.productId === productId);
    
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        ui.showNotification('Stock máximo alcanzado', 'error');
        return;
      }
      existingItem.quantity++;
    } else {
      state.cart.push({
        productId,
        name: product.name,
        price: product.price,
        image: product.image,
        sku: product.sku,
        quantity: 1,
        stock: product.stock
      });
    }
    
    this.save();
    this.updateUI();
    ui.showNotification('Producto agregado al carrito ✓');
  },
  
  updateQuantity(productId, change) {
    const item = state.cart.find(i => i.productId === productId);
    if (!item) return;
    
    const newQuantity = item.quantity + change;
    
    if (newQuantity < 1) {
      this.removeItem(productId);
      return;
    }
    
    if (newQuantity > item.stock) {
      ui.showNotification('Stock máximo alcanzado', 'error');
      return;
    }
    
    item.quantity = newQuantity;
    this.save();
    this.updateUI();
  },
  
  removeItem(productId) {
    state.cart = state.cart.filter(item => item.productId !== productId);
    this.save();
    this.updateUI();
    ui.showNotification('Producto eliminado');
  },
  
  clear() {
    state.cart = [];
    this.save();
    this.updateUI();
  },
  
  getItemCount() {
    return state.cart.reduce((sum, item) => sum + item.quantity, 0);
  },
  
  calculateTotals() {
    const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = 0.00;
    const total = subtotal + shipping;
    
    return { subtotal, shipping, total };
  },
  
  updateUI() {
    const count = this.getItemCount();
    const badge = document.getElementById('cart-count');
    
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
    
    render.cartItems();
    render.cartSummary();
  }
};

// =============================================================================
// UI FUNCTIONS
// =============================================================================

const ui = {
  toggleCart() {
    const modal = document.getElementById('cart-modal');
    const overlay = document.getElementById('cart-overlay');
    
    if (!modal || !overlay) return;
    
    const isOpen = modal.classList.contains('open');
    
    if (isOpen) {
      console.log('🔄 Cerrando carrito, actualizando productos...');
      modal.classList.remove('open');
      overlay.classList.remove('active');
      document.body.style.overflow = '';
      
      // Refrescar productos
      filters.apply();
    } else {
      modal.classList.add('open');
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },
  
  showNotification(message, type = 'success') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 6L9 17l-5-5"/>
      </svg>
      <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  },
  
  showLoading(show = true) {
    if (show) {
      document.body.style.cursor = 'wait';
    } else {
      document.body.style.cursor = '';
    }
  },
  
  updateSearchPlaceholder(count) {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;
    
    if (count === 0) {
      searchInput.placeholder = 'No se encontraron productos...';
    } else if (state.searchQuery && state.searchQuery.length >= CONFIG.search.minChars) {
      searchInput.placeholder = `${count} producto${count !== 1 ? 's' : ''} encontrado${count !== 1 ? 's' : ''}`;
    } else {
      searchInput.placeholder = 'Buscar productos...';
    }
  }
};

// =============================================================================
// PRODUCT MODAL
// =============================================================================

const productModal = {
  currentImageIndex: 0,
  currentProduct: null,
  
  show(productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;
    
    this.currentProduct = product;
    this.currentImageIndex = 0;
    
    const images = product.images && Array.isArray(product.images) && product.images.length > 0
      ? product.images.slice(0, 3)
      : [product.image, product.image, product.image];
    
    const productURL = window.location.origin + '/?product=' + productId;
    const shareTitle = `${product.name} - Mawewe`;
    const shareText = `Mira este producto: ${product.name} - $${Number(product.price).toFixed(2)}`;
    
    const modal = document.createElement('div');
    modal.className = 'product-modal-overlay';
    modal.id = 'product-detail-modal';
    modal.innerHTML = `
      <div class="product-modal">
        <button class="modal-close" onclick="productModal.close()">&times;</button>
        
        <div class="modal-content">
          <div class="modal-image-section">
            <div class="modal-main-image">
              <img id="modal-main-img" src="${images[0]}" alt="${product.name}">
              
              <button class="modal-carousel-btn prev" onclick="productModal.prevImage()">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              <button class="modal-carousel-btn next" onclick="productModal.nextImage()">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>
            
            <div class="modal-thumbnails">
              ${images.map((img, index) => `
                <img 
                  src="${img}" 
                  alt="${product.name} - imagen ${index + 1}"
                  class="thumbnail ${index === 0 ? 'active' : ''}"
                  onclick="productModal.selectImage(${index})"
                >
              `).join('')}
            </div>
          </div>
          
          <div class="modal-info">
            <div class="product-category">${product.category ? product.category.toUpperCase() : ''}</div>
            ${product.subcategory ? `<div class="product-subcategory">${product.subcategory.toUpperCase()}</div>` : ''}
            
            <h2 class="modal-title">${product.name}</h2>
            <div class="modal-price">$${Number(product.price).toFixed(2)}</div>
            
            <p class="modal-description">${product.description}</p>
            
            <div class="share-section" style="margin: var(--spacing-lg) 0; padding: var(--spacing-md); background: var(--gray-50); border-radius: var(--radius-lg); border: 1px solid var(--gray-200);">
              <p style="font-size: var(--font-size-sm); font-weight: 600; margin-bottom: var(--spacing-sm); color: var(--gray-700);">
                📤 Compartir este producto:
              </p>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--spacing-sm);">
                <button 
                  onclick="routing.copyToClipboard('${productURL}')"
                  style="padding: var(--spacing-sm); background: var(--gray-200); border: none; border-radius: var(--radius-md); cursor: pointer; font-size: var(--font-size-xs); font-weight: 600; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 4px;"
                >
                  🔗 Copiar
                </button>
                
                <button 
                  onclick="routing.shareOn('whatsapp', '${productURL}', '${encodeURIComponent(shareTitle)}', '${encodeURIComponent(shareText)}')"
                  style="padding: var(--spacing-sm); background: #25D366; color: white; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: var(--font-size-xs); font-weight: 600; transition: all 0.2s;"
                >
                  📱 WhatsApp
                </button>
                
                <button 
                  onclick="routing.shareOn('facebook', '${productURL}', '${encodeURIComponent(shareTitle)}')"
                  style="padding: var(--spacing-sm); background: #1877F2; color: white; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: var(--font-size-xs); font-weight: 600; transition: all 0.2s;"
                >
                  📘 Facebook
                </button>
                
                <button 
                  onclick="routing.shareOn('twitter', '${productURL}', '${encodeURIComponent(shareTitle)}')"
                  style="padding: var(--spacing-sm); background: #1DA1F2; color: white; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: var(--font-size-xs); font-weight: 600; transition: all 0.2s;"
                >
                  🐦 Twitter
                </button>
              </div>
            </div>
            
            <div class="product-details-list">
              <h3>Detalles del Producto</h3>
              <ul>
                <li><strong>SKU:</strong> ${product.sku}</li>
                <li><strong>Stock disponible:</strong> ${product.stock} unidades</li>
                <li><strong>Categoría:</strong> ${product.category ? product.category.toUpperCase() : ''}</li>
                ${product.subcategory ? `<li><strong>Subcategoría:</strong> ${product.subcategory.toUpperCase()}</li>` : ''}
                <li><strong>URL:</strong> <a href="${productURL}" style="color: var(--primary-800); text-decoration: none; word-break: break-all;">${productURL}</a></li>
              </ul>
            </div>
            
            <div class="modal-actions">
              <button 
                class="btn-add-to-cart-large" 
                onclick="cart.addItem(${product.id}); productModal.close();"
                ${product.stock === 0 ? 'disabled' : ''}
              >
                ${product.stock === 0 ? 'Sin Stock' : 'Agregar al Carrito'}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.close();
      }
    });
    
    // Actualizar URL con routing
    if (window.routing) {
      window.routing.updateURL({ product: productId });
    }
  },
  
  close() {
    const modal = document.getElementById('product-detail-modal');
    if (modal) {
      modal.remove();
      document.body.style.overflow = '';
    }
    this.currentProduct = null;
    this.currentImageIndex = 0;
    
    // Limpiar parámetro de producto de la URL
    if (window.routing) {
      window.routing.updateURL({
        category: state.currentFilter !== 'all' ? state.currentFilter : null,
        subcategory: state.currentSubcategory
      });
    }
  },
  
  selectImage(index) {
    if (!this.currentProduct) return;
    
    const images = this.currentProduct.images && Array.isArray(this.currentProduct.images) && this.currentProduct.images.length > 0
      ? this.currentProduct.images.slice(0, 3)
      : [this.currentProduct.image, this.currentProduct.image, this.currentProduct.image];
    
    this.currentImageIndex = index;
    const mainImg = document.getElementById('modal-main-img');
    if (mainImg) {
      mainImg.src = images[index];
    }
    
    document.querySelectorAll('.modal-thumbnails .thumbnail').forEach((thumb, i) => {
      thumb.classList.toggle('active', i === index);
    });
  },
  
  nextImage() {
    if (!this.currentProduct) return;
    
    const images = this.currentProduct.images && Array.isArray(this.currentProduct.images) && this.currentProduct.images.length > 0
      ? this.currentProduct.images.slice(0, 3)
      : [this.currentProduct.image, this.currentProduct.image, this.currentProduct.image];
    
    this.currentImageIndex = (this.currentImageIndex + 1) % images.length;
    this.selectImage(this.currentImageIndex);
  },
  
  prevImage() {
    if (!this.currentProduct) return;
    
    const images = this.currentProduct.images && Array.isArray(this.currentProduct.images) && this.currentProduct.images.length > 0
      ? this.currentProduct.images.slice(0, 3)
      : [this.currentProduct.image, this.currentProduct.image, this.currentProduct.image];
    
    this.currentImageIndex = (this.currentImageIndex - 1 + images.length) % images.length;
    this.selectImage(this.currentImageIndex);
  }
};

// =============================================================================
// RENDER FUNCTIONS
// =============================================================================

const render = {
  products(products) {
    const grid = document.getElementById('products-grid');
    
    if (!grid) {
      console.error('❌ products-grid not found');
      return;
    }
    
    if (!products || products.length === 0) {
      const searchTerm = state.searchQuery;
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 4rem;">
          <p style="font-size: 1.25rem; color: #666; margin-bottom: 1rem;">
            ${searchTerm ? `No se encontraron productos para "${searchTerm}"` : 'No se encontraron productos'}
          </p>
          ${searchTerm ? `
            <button 
              onclick="filters.clearSearch()" 
              style="padding: 0.75rem 1.5rem; background: var(--primary-800); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.9rem;"
            >
              Ver todos los productos
            </button>
          ` : ''}
        </div>
      `;
      ui.updateSearchPlaceholder(0);
      return;
    }
    
    const sortedProducts = [...products].sort((a, b) => a.id - b.id);
    
    grid.innerHTML = sortedProducts.map(product => {
      const imageUrl = product.image || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiB2aWV3Qm94PSIwIDAgNDAwIDQwMCI+CiAgPHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9IiNmMGYwZjAiIHJ4PSIxMiIvPgogIDxyZWN0IHg9IjE0MCIgeT0iMTQwIiB3aWR0aD0iMTIwIiBoZWlnaHQ9IjkwIiByeD0iOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYmJiIiBzdHJva2Utd2lkdGg9IjMiLz4KICA8Y2lyY2xlIGN4PSIxNzAiIGN5PSIxNzAiIHI9IjEyIiBmaWxsPSJub25lIiBzdHJva2U9IiNiYmIiIHN0cm9rZS13aWR0aD0iMyIvPgogIDxwb2x5Z29uIHBvaW50cz0iMTQwLDIzMCAxODUsMTg1IDIxMCwyMTAgMjQwLDE5MCAyNjAsMjMwIiBmaWxsPSIjYmJiIi8+CiAgPHRleHQgeD0iMjAwIiB5PSIyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjIyIiBmaWxsPSIjOTk5Ij5TaW4gSW1hZ2VuPC90ZXh0Pgo8L3N2Zz4=';
      
      return `
      <article class="product-card" data-product-id="${product.id}">
        <div class="product-image-container" onclick="productModal.show(${product.id})" style="cursor: pointer;">
          <div class="product-carousel">
            <img 
              src="${imageUrl}" 
              alt="${product.name}" 
              class="product-image" 
              loading="eager"
              onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiB2aWV3Qm94PSIwIDAgNDAwIDQwMCI+CiAgPHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9IiNmMGYwZjAiIHJ4PSIxMiIvPgogIDxyZWN0IHg9IjE0MCIgeT0iMTQwIiB3aWR0aD0iMTIwIiBoZWlnaHQ9IjkwIiByeD0iOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYmJiIiBzdHJva2Utd2lkdGg9IjMiLz4KICA8Y2lyY2xlIGN4PSIxNzAiIGN5PSIxNzAiIHI9IjEyIiBmaWxsPSJub25lIiBzdHJva2U9IiNiYmIiIHN0cm9rZS13aWR0aD0iMyIvPgogIDxwb2x5Z29uIHBvaW50cz0iMTQwLDIzMCAxODUsMTg1IDIxMCwyMTAgMjQwLDE5MCAyNjAsMjMwIiBmaWxsPSIjYmJiIi8+CiAgPHRleHQgeD0iMjAwIiB5PSIyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjIyIiBmaWxsPSIjOTk5Ij5TaW4gSW1hZ2VuPC90ZXh0Pgo8L3N2Zz4=';"
            >
          </div>
        </div>
        
        <div class="product-content">
          <div class="product-category">${product.category ? product.category.toUpperCase() : 'SIN CATEGORÍA'}</div>
          ${product.subcategory ? `<div class="product-subcategory">${product.subcategory.toUpperCase()}</div>` : ''}
          <h3 class="product-title">${product.name}</h3>
          <p class="product-description">${(product.description || '').substring(0, 80)}...</p>
          
          <div class="product-footer">
            <span class="product-price">$${Number(product.price).toFixed(2)}</span>
            <button 
              class="btn-add-to-cart" 
              onclick="event.stopPropagation(); cart.addItem(${product.id})"
              ${product.stock < 1 ? 'disabled' : ''}
            >
              ${product.stock > 0 ? 'Añadir' : 'Sin Stock'}
            </button>
          </div>
          
          <div class="stock-indicator ${product.stock < 5 ? 'low' : ''} ${product.stock < 1 ? 'out' : ''}">
            ${
              product.stock < 1 
                ? 'No Disponible' 
                : product.stock < 5 
                  ? `Solo ${product.stock} disponibles` 
                  : `${product.stock} disponibles`
            }
          </div>
          
          <button class="btn-details" onclick="event.stopPropagation(); productModal.show(${product.id})">
            Ver detalles
          </button>
        </div>
      </article>
    `;
    }).join('');
    
    console.log(`✅ ${sortedProducts.length} productos renderizados`);
    ui.updateSearchPlaceholder(sortedProducts.length);
  },
  
  categories(categories) {
    const container = document.getElementById('category-filters');
    
    if (!container || !categories) return;
    
    // ✅ ORDENAR CATEGORÍAS POR CANTIDAD DE PRODUCTOS (descendente)
    const sortedCategories = [...categories].sort((a, b) => {
      // "Todos" siempre primero
      if (a.id === 'all') return -1;
      if (b.id === 'all') return 1;
      
      // Luego por cantidad de productos
      return (b.count || 0) - (a.count || 0);
    });
    
    container.innerHTML = sortedCategories.map(cat => `
      <button 
        class="filter-button ${state.currentFilter === cat.id ? 'active' : ''}" 
        onclick="filters.setCategory('${cat.id}')"
      >
        ${cat.name} ${cat.count ? `(${cat.count})` : ''}
      </button>
    `).join('');
    
    console.log('✅ Categorías renderizadas (ordenadas por cantidad):', sortedCategories);
  },
  
  subcategories() {
    const subcatContainer = document.getElementById('subcategory-container');
    
    if (!subcatContainer) return;
    
    const currentSubcategories = state.subcategoriesByCategory[state.currentFilter] || [];
    
    if (state.currentFilter !== 'all' && currentSubcategories.length > 0) {
      subcatContainer.style.display = 'block';
      
      const labelMap = {
        'ropa': 'Marcas de Ropa:',
        'belleza': 'Líneas de Belleza:',
        'perfumes': 'Marcas de Perfumes:',
        'juguetes': 'Tipos de Juguetes:',
        'peluches': 'Tipos de Peluches:',
        'joyas': 'Tipos de Joyas:',
        'relojes': 'Tipos de Relojes:',
        'deportes': 'Categorías Deportivas:',
        'accesorios': 'Tipos de Accesorios:'
      };
      
      const label = subcatContainer.querySelector('.subcategory-label');
      if (label) {
        label.textContent = labelMap[state.currentFilter] || 'Subcategorías:';
      }
      
      const subcatFilters = document.getElementById('subcategory-filters');
      if (subcatFilters) {
        subcatFilters.innerHTML = currentSubcategories.map(subcat => `
          <button 
            class="subcategory-button ${state.currentSubcategory === subcat.id ? 'active' : ''}" 
            onclick="filters.setSubcategory('${subcat.id}')"
          >
            ${subcat.name}
          </button>
        `).join('');
      }
      
      console.log(`✅ Subcategorías de ${state.currentFilter} renderizadas:`, currentSubcategories);
    } else {
      subcatContainer.style.display = 'none';
      state.currentSubcategory = null;
    }
  },
  
  cartItems() {
    const container = document.getElementById('cart-items');
    
    if (!container) return;
    
    if (state.cart.length === 0) {
      container.innerHTML = `
        <div class="empty-cart">
          <div class="empty-cart-icon">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
          </div>
          <p>Tu carrito está vacío</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = state.cart.map(item => {
      if (!item || !item.price || !item.name) {
        return '';
      }
      
      return `
        <div class="cart-item">
          <img 
            src="${item.image || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiB2aWV3Qm94PSIwIDAgNDAwIDQwMCI+CiAgPHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9IiNmMGYwZjAiIHJ4PSIxMiIvPgogIDxyZWN0IHg9IjE0MCIgeT0iMTQwIiB3aWR0aD0iMTIwIiBoZWlnaHQ9IjkwIiByeD0iOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYmJiIiBzdHJva2Utd2lkdGg9IjMiLz4KICA8Y2lyY2xlIGN4PSIxNzAiIGN5PSIxNzAiIHI9IjEyIiBmaWxsPSJub25lIiBzdHJva2U9IiNiYmIiIHN0cm9rZS13aWR0aD0iMyIvPgogIDxwb2x5Z29uIHBvaW50cz0iMTQwLDIzMCAxODUsMTg1IDIxMCwyMTAgMjQwLDE5MCAyNjAsMjMwIiBmaWxsPSIjYmJiIi8+CiAgPHRleHQgeD0iMjAwIiB5PSIyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjIyIiBmaWxsPSIjOTk5Ij5TaW4gSW1hZ2VuPC90ZXh0Pgo8L3N2Zz4='}" 
            alt="${item.name}" 
            class="cart-item-image"
            onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiB2aWV3Qm94PSIwIDAgNDAwIDQwMCI+CiAgPHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9IiNmMGYwZjAiIHJ4PSIxMiIvPgogIDxyZWN0IHg9IjE0MCIgeT0iMTQwIiB3aWR0aD0iMTIwIiBoZWlnaHQ9IjkwIiByeD0iOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYmJiIiBzdHJva2Utd2lkdGg9IjMiLz4KICA8Y2lyY2xlIGN4PSIxNzAiIGN5PSIxNzAiIHI9IjEyIiBmaWxsPSJub25lIiBzdHJva2U9IiNiYmIiIHN0cm9rZS13aWR0aD0iMyIvPgogIDxwb2x5Z29uIHBvaW50cz0iMTQwLDIzMCAxODUsMTg1IDIxMCwyMTAgMjQwLDE5MCAyNjAsMjMwIiBmaWxsPSIjYmJiIi8+CiAgPHRleHQgeD0iMjAwIiB5PSIyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjIyIiBmaWxsPSIjOTk5Ij5TaW4gSW1hZ2VuPC90ZXh0Pgo8L3N2Zz4='"
          >
          <div class="cart-item-info">
            <h4 class="cart-item-title">${item.name}</h4>
            <div class="cart-item-price">$${Number(item.price).toFixed(2)}</div>
            <div class="cart-item-controls">
              <button class="btn-quantity" onclick="cart.updateQuantity(${item.productId}, -1)">-</button>
              <span class="quantity-display">${item.quantity || 1}</span>
              <button class="btn-quantity" onclick="cart.updateQuantity(${item.productId}, 1)">+</button>
              <button class="btn-remove" onclick="cart.removeItem(${item.productId})">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      `;
    }).filter(Boolean).join('');
  },
  
  cartSummary() {
    const container = document.getElementById('cart-summary');
    
    if (!container) return;
    
    const { subtotal, shipping, total } = cart.calculateTotals();
    
    container.innerHTML = `
      <div class="summary-row">
        <span>Subtotal:</span>
        <span class="amount">$${subtotal.toFixed(2)}</span>
      </div>
      <div class="summary-row">
        <span>Envío:</span>
        <span class="amount free-shipping">GRATIS</span>
      </div>
      <div class="summary-row total">
        <span>Total:</span>
        <span class="amount">$${total.toFixed(2)}</span>
      </div>
      <p class="summary-note" style="background: #d4edda; color: #155724; border: 1px solid #c3e6cb;">
        ✓ Envío gratis en todos los pedidos
      </p>
    `;
  }
};

// =============================================================================
// FILTERS - CORREGIDO
// =============================================================================

const filters = {
  setCategory(category) {
    state.currentFilter = category;
    state.currentSubcategory = null;
    
    // Actualizar botones activos
    document.querySelectorAll('.filter-button').forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Encontrar y activar el botón correcto
    document.querySelectorAll('.filter-button').forEach(btn => {
      const btnText = btn.textContent.toLowerCase();
      const categoryName = state.categories.find(c => c.id === category)?.name.toLowerCase() || category.toLowerCase();
      if (btnText.includes(categoryName) || (btnText === 'todos' && category === 'all')) {
        btn.classList.add('active');
      }
    });
    
    render.subcategories();
    this.apply();
    
    // Actualizar URL
    if (window.routing) {
      window.routing.updateURL({
        category: category !== 'all' ? category : null,
        subcategory: null
      });
    }
  },
  
  setSubcategory(subcategory) {
    if (state.currentSubcategory === subcategory) {
      state.currentSubcategory = null;
    } else {
      state.currentSubcategory = subcategory;
    }
    
    render.subcategories();
    this.apply();
    
    // Actualizar URL
    if (window.routing) {
      window.routing.updateURL({
        category: state.currentFilter !== 'all' ? state.currentFilter : null,
        subcategory: state.currentSubcategory
      });
    }
  },
  
  setSearch(query) {
    const trimmedQuery = query ? query.trim() : '';
    
    state.searchQuery = trimmedQuery;
    console.log('🔍 Búsqueda:', state.searchQuery || '(vacía)');
    
    // Aplicar búsqueda
    this.apply();
    
    // Actualizar URL
    if (window.routing && trimmedQuery) {
      window.routing.updateURL({
        search: trimmedQuery
      });
    } else if (window.routing && !trimmedQuery) {
      window.routing.updateURL({
        category: state.currentFilter !== 'all' ? state.currentFilter : null,
        subcategory: state.currentSubcategory
      });
    }
  },
  
  clearSearch() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.value = '';
    }
    state.searchQuery = '';
    this.apply();
    
    // Limpiar URL
    if (window.routing) {
      window.routing.updateURL({
        category: state.currentFilter !== 'all' ? state.currentFilter : null,
        subcategory: state.currentSubcategory
      });
    }
  },
  
  apply() {
    if (state.isSearching) {
      console.log('⏳ Búsqueda en progreso, esperando...');
      return;
    }
    
    state.isSearching = true;
    ui.showLoading(true);
    
    // Construir filtros
    const filterParams = {};
    
    // Solo agregar categoría si no es 'all'
    if (state.currentFilter && state.currentFilter !== 'all') {
      filterParams.category = state.currentFilter;
    }
    
    // Agregar subcategoría si existe
    if (state.currentSubcategory) {
      filterParams.subcategory = state.currentSubcategory;
    }
    
    // Agregar búsqueda si existe y cumple requisitos
    if (state.searchQuery && state.searchQuery.length >= CONFIG.search.minChars) {
      filterParams.search = state.searchQuery;
    }
    
    console.log('📊 Aplicando filtros:', filterParams);
    
    api.fetchProducts(filterParams)
      .then(data => {
        if (data && data.success) {
          state.products = data.products || [];
          console.log(`✅ ${state.products.length} productos encontrados`);
          render.products(state.products);
          
          if (state.products.length === 0) {
            console.log('ℹ️ No se encontraron productos con estos filtros');
          }
        } else {
          throw new Error(data.message || 'Error en la respuesta');
        }
      })
      .catch(error => {
        console.error('❌ Error filtering:', error);
        ui.showNotification('Error al buscar productos', 'error');
        
        const grid = document.getElementById('products-grid');
        if (grid) {
          grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 4rem;">
              <p style="font-size: 1.25rem; color: #e53e3e; margin-bottom: 1rem;">
                Error al cargar productos
              </p>
              <p style="color: #666; margin-bottom: 1rem;">${error.message}</p>
              <button 
                onclick="filters.apply()" 
                style="padding: 0.75rem 1.5rem; background: var(--primary-800); color: white; border: none; border-radius: 8px; cursor: pointer;"
              >
                Reintentar
              </button>
            </div>
          `;
        }
      })
      .finally(() => {
        state.isSearching = false;
        ui.showLoading(false);
      });
  }
};

// =============================================================================
// INITIALIZATION
// =============================================================================

async function init() {
  console.log('🚀 Mawewe iniciando...');
  
  try {
    ui.showLoading(true);
    
    const data = await api.fetchProducts();
    
    if (data && data.success) {
      state.products = data.products || [];
      state.allProducts = data.products || [];
      state.categories = data.categories || [];
      state.subcategoriesByCategory = data.subcategoriesByCategory || {};
      
      render.products(state.products);
      render.categories(state.categories);
      render.subcategories();
      
      console.log(`✅ ${state.products.length} productos cargados`);
      console.log(`✅ ${state.categories.length} categorías cargadas`);
      
      cart.load();
      
      // Procesar URL inicial si hay routing
      if (window.routing) {
        window.routing.handleInitialURL();
      }
    } else {
      throw new Error(data?.message || 'Error al cargar productos');
    }
    
  } catch (error) {
    console.error('❌ Error de inicialización:', error);
    
    const grid = document.getElementById('products-grid');
    if (grid) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 4rem;">
          <p style="font-size: 1.25rem; color: #e53e3e; margin-bottom: 1rem;">
            Error al cargar la tienda
          </p>
          <p style="color: #666; margin-bottom: 1rem;">${error.message}</p>
          <button 
            onclick="location.reload()" 
            style="padding: 0.75rem 1.5rem; background: #8C004B; color: white; border: none; border-radius: 8px; cursor: pointer;"
          >
            Recargar página
          </button>
        </div>
      `;
    }
    
    ui.showNotification('Error al inicializar la tienda', 'error');
  } finally {
    ui.showLoading(false);
  }
}

// =============================================================================
// EVENT LISTENERS
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search-input');
  
  if (searchInput) {
    let searchTimeout;
    
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      
      const query = e.target.value.trim();
      
      searchTimeout = setTimeout(() => {
        filters.setSearch(query);
      }, CONFIG.search.debounceTime);
    });
    
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        filters.clearSearch();
      }
    });
  }
  
  const overlay = document.getElementById('cart-overlay');
  if (overlay) {
    overlay.addEventListener('click', () => {
      ui.toggleCart();
    });
  }
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      productModal.close();
    }
  });
  
  init();
});

// =============================================================================
// CHECKOUT SYSTEM
// =============================================================================

window.checkout = {
  openCheckout: function() {
    console.log('⚠️ Esperando carga de checkout.js...');
    alert('Sistema de checkout cargando. Por favor intenta de nuevo en un momento.');
  }
};

// =============================================================================
// GLOBAL NAMESPACE
// =============================================================================

window.mawewe = {
  cart,
  ui,
  filters,
  state,
  CONFIG,
  checkout: window.checkout
};

window.productModal = productModal;

console.log('✅ Mawewe cargado (búsqueda + filtros + routing + categorías ordenadas)');