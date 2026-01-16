/**
 * MAWEWE E-COMMERCE - VERSIÓN COMPLETA
 * ✅ PayPal Sandbox totalmente funcional
 * ✅ Descuento automático de stock
 * ✅ Subcategorías de ropa (Americanino, Chevignon, Offcors)
 * ✅ Guardado de órdenes en base de datos
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
    cost: 5.00,
    freeThreshold: 50.00,
    expressCost: 10.00
  }
};

console.log('🚀 Mawewe iniciando con PayPal...');

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

const state = {
  products: [],
  categories: [],
  cart: [],
  currentFilter: 'all',
  currentSubcategory: null, // ✅ NUEVO: subcategoría activa
  searchQuery: '',
  shippingMethod: 'standard',
  checkoutData: {} // Datos del formulario de checkout
};

// =============================================================================
// API FUNCTIONS
// =============================================================================

const api = {
  async fetchProducts(filters = {}) {
    try {
      let url = `${CONFIG.api.baseUrl}${CONFIG.api.endpoints.products}`;
      
      const params = new URLSearchParams();
      if (filters.category && filters.category !== 'all') {
        params.append('category', filters.category);
      }
      // ✅ AGREGAR FILTRO DE SUBCATEGORÍA
      if (filters.subcategory) {
        params.append('subcategory', filters.subcategory);
      }
      if (filters.search) {
        params.append('search', filters.search);
      }
      
      if (params.toString()) {
        url += '?' + params.toString();
      }
      
      console.log('📡 Fetching:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Data received:', data);
      
      return data;
      
    } catch (error) {
      console.error('❌ API Error:', error);
      throw error;
    }
  },

  async saveOrder(orderData) {
    try {
      const response = await fetch(
        CONFIG.api.baseUrl + CONFIG.api.endpoints.saveOrder,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(orderData),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al guardar la orden');
      }

      return result;
    } catch (error) {
      console.error('Error saving order:', error);
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
    
    let shipping = 0;
    if (subtotal > 0) {
      if (state.shippingMethod === 'express') {
        shipping = CONFIG.shipping.expressCost;
      } else if (subtotal < CONFIG.shipping.freeThreshold) {
        shipping = CONFIG.shipping.cost;
      }
    }
    
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
      modal.classList.remove('open');
      overlay.classList.remove('active');
      document.body.style.overflow = '';
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
            <div class="product-category">${product.category}</div>
            ${product.subcategory ? `<div class="product-subcategory">${product.subcategory.toUpperCase()}</div>` : ''}
            
            <h2 class="modal-title">${product.name}</h2>
            <div class="modal-price">$${Number(product.price).toFixed(2)}</div>
            
            <p class="modal-description">${product.description}</p>
            
            <div class="product-details-list">
              <h3>Detalles del Producto</h3>
              <ul>
                <li><strong>SKU:</strong> ${product.sku}</li>
                <li><strong>Stock disponible:</strong> ${product.stock} unidades</li>
                <li><strong>Categoría:</strong> ${product.category}</li>
                ${product.subcategory ? `<li><strong>Subcategoría:</strong> ${product.subcategory}</li>` : ''}
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
  },
  
  close() {
    const modal = document.getElementById('product-detail-modal');
    if (modal) {
      modal.remove();
      document.body.style.overflow = '';
    }
    this.currentProduct = null;
    this.currentImageIndex = 0;
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
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 4rem;">
          <p style="font-size: 1.25rem; color: #666;">No se encontraron productos</p>
        </div>
      `;
      return;
    }
    
    grid.innerHTML = products.map(product => {
      const imageUrl = product.image || 'https://via.placeholder.com/400x400?text=Sin+Imagen';
      
      return `
      <article class="product-card" data-product-id="${product.id}">
        <div class="product-image-container" onclick="productModal.show(${product.id})" style="cursor: pointer;">
          <div class="product-carousel">
            <img 
              src="${imageUrl}" 
              alt="${product.name}" 
              class="product-image" 
              loading="eager"
              onerror="this.src='https://via.placeholder.com/400x400?text=Error+Imagen';"
            >
          </div>
        </div>
        
        <div class="product-content">
          <div class="product-category">${product.category || 'Sin categoría'}</div>
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
    
    console.log(`✅ ${products.length} productos renderizados`);
  },
  
  categories(categories) {
    const container = document.getElementById('category-filters');
    
    if (!container || !categories) return;
    
    const categoryOrder = [
      'all',
      'ropa',
      'juguetes',
      'peluches',
      'joyas',
      'perfumes',
      'relojes',
      'accesorios'
    ];
    
    const orderedCategories = [];
    orderedCategories.push({ id: 'all', name: 'Todos' });
    
    categoryOrder.forEach(id => {
      if (id !== 'all') {
        const cat = categories.find(c => c.id === id);
        if (cat) {
          orderedCategories.push(cat);
        }
      }
    });
    
    container.innerHTML = orderedCategories.map(cat => `
      <button class="filter-button ${state.currentFilter === cat.id ? 'active' : ''}" onclick="filters.setCategory('${cat.id}')">
        ${cat.name}
      </button>
    `).join('');
  },
  
  // ✅ NUEVO: Renderizar subcategorías de ropa
  subcategories() {
    const subcatContainer = document.getElementById('subcategory-container');
    
    if (!subcatContainer) return;
    
    // Solo mostrar si la categoría actual es "ropa"
    if (state.currentFilter === 'ropa') {
      subcatContainer.style.display = 'block';
      
      const subcategories = [
        { id: 'americanino', name: 'Americanino' },
        { id: 'chevignon', name: 'Chevignon' },
        { id: 'offcors', name: 'Offcors' }
      ];
      
      const subcatFilters = document.getElementById('subcategory-filters');
      if (subcatFilters) {
        subcatFilters.innerHTML = subcategories.map(subcat => `
          <button 
            class="subcategory-button ${state.currentSubcategory === subcat.id ? 'active' : ''}" 
            onclick="filters.setSubcategory('${subcat.id}')"
          >
            ${subcat.name}
          </button>
        `).join('');
      }
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
            src="${item.image || 'https://via.placeholder.com/90x90?text=Sin+Imagen'}" 
            alt="${item.name}" 
            class="cart-item-image"
            onerror="this.src='https://via.placeholder.com/90x90?text=Sin+Imagen'"
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
        <span class="amount ${shipping === 0 && subtotal > 0 ? 'free-shipping' : ''}">
          ${shipping === 0 && subtotal > 0 ? 'GRATIS' : '$' + shipping.toFixed(2)}
        </span>
      </div>
      <div class="summary-row total">
        <span>Total:</span>
        <span class="amount">$${total.toFixed(2)}</span>
      </div>
      ${subtotal > 0 && subtotal < CONFIG.shipping.freeThreshold ? `
        <p class="summary-note">
          Compra $${(CONFIG.shipping.freeThreshold - subtotal).toFixed(2)} más para envío gratis
        </p>
      ` : ''}
    `;
  }
};

// =============================================================================
// FILTERS
// =============================================================================

const filters = {
  setCategory(category) {
    state.currentFilter = category;
    state.currentSubcategory = null; // ✅ Resetear subcategoría
    
    document.querySelectorAll('.filter-button').forEach(btn => {
      btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    render.subcategories(); // ✅ Mostrar/ocultar subcategorías
    
    this.apply();
  },
  
  // ✅ NUEVO: Función para filtrar por subcategoría
  setSubcategory(subcategory) {
    // Si se hace clic en la misma subcategoría, desactivarla
    if (state.currentSubcategory === subcategory) {
      state.currentSubcategory = null;
    } else {
      state.currentSubcategory = subcategory;
    }
    
    render.subcategories(); // ✅ Actualizar botones activos
    this.apply();
  },
  
  setSearch(query) {
    state.searchQuery = query;
    this.apply();
  },
  
  apply() {
    ui.showLoading(true);
    
    const filters = {
      category: state.currentFilter,
      search: state.searchQuery
    };
    
    // ✅ Agregar subcategoría si está activa
    if (state.currentSubcategory) {
      filters.subcategory = state.currentSubcategory;
    }
    
    api.fetchProducts(filters)
    .then(data => {
      if (data.success) {
        state.products = data.products;
        render.products(data.products);
      }
    })
    .catch(error => {
      console.error('Error filtering:', error);
      ui.showNotification('Error al filtrar productos', 'error');
    })
    .finally(() => {
      ui.showLoading(false);
    });
  }
};

// =============================================================================
// CHECKOUT CON PAYPAL
// =============================================================================

const checkout = {
  openCheckout() {
    if (state.cart.length === 0) {
      ui.showNotification('El carrito está vacío', 'error');
      return;
    }
    
    const { subtotal, shipping, total } = cart.calculateTotals();
    
    const checkoutForm = `
      <div class="checkout-header">
        <button class="btn-back" onclick="checkout.closeCheckout()">
          ← Volver al carrito
        </button>
        <h2>Finalizar Compra</h2>
      </div>
      
      <div class="checkout-form">
        <div class="form-section">
          <h3>1. Información de Contacto</h3>
          <div class="form-group">
            <label for="email">Email*</label>
            <input type="email" id="email" required placeholder="tu@email.com">
          </div>
        </div>
        
        <div class="form-section">
          <h3>2. Datos de Envío</h3>
          <div class="form-row">
            <div class="form-group">
              <label for="firstName">Nombre*</label>
              <input type="text" id="firstName" required>
            </div>
            <div class="form-group">
              <label for="lastName">Apellido*</label>
              <input type="text" id="lastName" required>
            </div>
          </div>
          
          <div class="form-group">
            <label for="address">Dirección*</label>
            <input type="text" id="address" required>
          </div>
          
          <div class="form-group">
            <label for="apartment">Apartamento (opcional)</label>
            <input type="text" id="apartment">
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="city">Ciudad*</label>
              <input type="text" id="city" required>
            </div>
            <div class="form-group">
              <label for="postalCode">Código Postal</label>
              <input type="text" id="postalCode">
            </div>
          </div>
          
          <div class="form-group">
            <label for="phone">Teléfono*</label>
            <input type="tel" id="phone" required placeholder="0991234567">
          </div>
        </div>
        
        <div class="form-section">
          <h3>3. Método de Envío</h3>
          <div class="shipping-options">
            <label class="shipping-option selected" onclick="checkout.selectShipping('standard')">
              <input type="radio" name="shipping" value="standard" checked>
              <div class="shipping-info">
                <span class="shipping-name">Envío Standard (3-5 días)</span>
                <span class="shipping-cost">${shipping === 0 ? 'GRATIS' : '$' + shipping.toFixed(2)}</span>
              </div>
            </label>
            <label class="shipping-option" onclick="checkout.selectShipping('express')">
              <input type="radio" name="shipping" value="express">
              <div class="shipping-info">
                <span class="shipping-name">Envío Express (1-2 días)</span>
                <span class="shipping-cost">$${CONFIG.shipping.expressCost.toFixed(2)}</span>
              </div>
            </label>
          </div>
        </div>
        
        <div class="checkout-summary">
          <h3>Resumen del Pedido</h3>
          <div class="summary-items">
            ${state.cart.map(item => `
              <div class="summary-item">
                <img src="${item.image}" alt="${item.name}">
                <div class="summary-item-info">
                  <div>${item.name}</div>
                  <div class="quantity">Cantidad: ${item.quantity}</div>
                </div>
                <div class="summary-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
              </div>
            `).join('')}
          </div>
          
          <div class="summary-totals">
            <div class="summary-row">
              <span>Subtotal:</span>
              <span>$${subtotal.toFixed(2)}</span>
            </div>
            <div class="summary-row">
              <span>Envío:</span>
              <span id="checkout-shipping-cost">${shipping === 0 ? 'GRATIS' : '$' + shipping.toFixed(2)}</span>
            </div>
            <div class="summary-row total">
              <span>Total:</span>
              <span id="checkout-total">$${total.toFixed(2)}</span>
            </div>
          </div>
          
          <button class="btn-continue-payment" onclick="checkout.continueToPayment()">
            Continuar al Pago
          </button>
        </div>
      </div>
    `;
    
    const container = document.getElementById('checkout-form-container');
    const cartItems = document.getElementById('cart-items');
    const cartFooter = document.getElementById('cart-footer');
    
    if (container && cartItems && cartFooter) {
      container.innerHTML = checkoutForm;
      container.style.display = 'block';
      cartItems.style.display = 'none';
      cartFooter.style.display = 'none';
    }
  },
  
  closeCheckout() {
    const container = document.getElementById('checkout-form-container');
    const cartItems = document.getElementById('cart-items');
    const cartFooter = document.getElementById('cart-footer');
    
    if (container && cartItems && cartFooter) {
      container.style.display = 'none';
      cartItems.style.display = 'block';
      cartFooter.style.display = 'block';
    }
  },
  
  selectShipping(method) {
    state.shippingMethod = method;
    
    // Actualizar UI de opciones de envío
    document.querySelectorAll('.shipping-option').forEach(opt => {
      opt.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
    
    // Recalcular totales
    const { subtotal, shipping, total } = cart.calculateTotals();
    
    const shippingCostEl = document.getElementById('checkout-shipping-cost');
    const totalEl = document.getElementById('checkout-total');
    
    if (shippingCostEl) {
      shippingCostEl.textContent = shipping === 0 ? 'GRATIS' : '$' + shipping.toFixed(2);
    }
    if (totalEl) {
      totalEl.textContent = '$' + total.toFixed(2);
    }
  },
  
  continueToPayment() {
    // Validar formulario
    const email = document.getElementById('email').value;
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const address = document.getElementById('address').value;
    const city = document.getElementById('city').value;
    const phone = document.getElementById('phone').value;
    
    if (!email || !firstName || !lastName || !address || !city || !phone) {
      ui.showNotification('Por favor completa todos los campos requeridos', 'error');
      return;
    }
    
    // Guardar datos del checkout
    state.checkoutData = {
      email,
      firstName,
      lastName,
      address,
      apartment: document.getElementById('apartment').value,
      city,
      postalCode: document.getElementById('postalCode').value,
      phone,
      shippingMethod: state.shippingMethod
    };
    
    // Renderizar página de pago con PayPal
    this.renderPaymentPage();
  },
  
  renderPaymentPage() {
    const { subtotal, shipping, total } = cart.calculateTotals();
    
    const paymentHTML = `
      <div class="payment-container">
        <div class="checkout-header">
          <button class="btn-back" onclick="checkout.openCheckout()">
            ← Volver
          </button>
          <h2>Pago Seguro</h2>
        </div>
        
        <div class="payment-info">
          <div class="payment-section">
            <h3>Resumen del Pedido</h3>
            <p><strong>Subtotal:</strong> $${subtotal.toFixed(2)}</p>
            <p><strong>Envío:</strong> ${shipping === 0 ? 'GRATIS' : '$' + shipping.toFixed(2)}</p>
            <p><strong>Total a Pagar:</strong> $${total.toFixed(2)}</p>
          </div>
          
          <div class="payment-section">
            <h3>Información de Entrega</h3>
            <p><strong>Nombre:</strong> ${state.checkoutData.firstName} ${state.checkoutData.lastName}</p>
            <p><strong>Email:</strong> ${state.checkoutData.email}</p>
            <p><strong>Dirección:</strong> ${state.checkoutData.address}</p>
            <p><strong>Ciudad:</strong> ${state.checkoutData.city}</p>
            <p><strong>Teléfono:</strong> ${state.checkoutData.phone}</p>
          </div>
          
          <div class="payment-section">
            <h3>Pagar con PayPal</h3>
            <p>Serás redirigido a PayPal para completar el pago de forma segura.</p>
            <div id="paypal-button-container"></div>
          </div>
        </div>
      </div>
    `;
    
    const container = document.getElementById('checkout-form-container');
    if (container) {
      container.innerHTML = paymentHTML;
      
      // Cargar y renderizar botón de PayPal
      this.loadPayPalButton();
    }
  },
  
  // ✅ FUNCIÓN CLAVE: Cargar botón de PayPal
  loadPayPalButton() {
    // Verificar si el script ya está cargado
    if (window.paypal) {
      this.renderPayPalButton();
      return;
    }
    
    // Cargar script de PayPal
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${CONFIG.paypal.clientId}&currency=${CONFIG.paypal.currency}`;
    script.onload = () => {
      console.log('✅ PayPal SDK cargado');
      this.renderPayPalButton();
    };
    script.onerror = () => {
      console.error('❌ Error cargando PayPal SDK');
      ui.showNotification('Error al cargar PayPal', 'error');
    };
    
    document.body.appendChild(script);
  },
  
  // ✅ FUNCIÓN CLAVE: Renderizar botón de PayPal
  renderPayPalButton() {
    const { total } = cart.calculateTotals();
    
    paypal.Buttons({
      style: {
        layout: 'vertical',
        color: 'gold',
        shape: 'rect',
        label: 'paypal'
      },
      
      // ✅ Crear orden en PayPal
      createOrder: function(data, actions) {
        console.log('📦 Creando orden en PayPal...');
        
        return actions.order.create({
          purchase_units: [{
            description: `Compra en Mawewe - ${state.cart.length} productos`,
            amount: {
              value: total.toFixed(2),
              currency_code: CONFIG.paypal.currency,
              breakdown: {
                item_total: {
                  currency_code: CONFIG.paypal.currency,
                  value: cart.calculateTotals().subtotal.toFixed(2)
                },
                shipping: {
                  currency_code: CONFIG.paypal.currency,
                  value: cart.calculateTotals().shipping.toFixed(2)
                }
              }
            },
            items: state.cart.map(item => ({
              name: item.name,
              unit_amount: {
                currency_code: CONFIG.paypal.currency,
                value: item.price.toFixed(2)
              },
              quantity: item.quantity.toString(),
              sku: item.sku
            }))
          }],
          application_context: {
            shipping_preference: 'NO_SHIPPING'
          }
        });
      },
      
      // ✅ Procesar pago aprobado
      onApprove: async function(data, actions) {
        console.log('✅ Pago aprobado, capturando orden...');
        
        try {
          // Capturar orden en PayPal
          const order = await actions.order.capture();
          console.log('💰 Orden capturada:', order);
          
          // ✅ GUARDAR ORDEN EN BASE DE DATOS (CON DESCUENTO DE STOCK)
          const orderData = {
            paypalOrderId: order.id,
            email: state.checkoutData.email,
            firstName: state.checkoutData.firstName,
            lastName: state.checkoutData.lastName,
            address: state.checkoutData.address,
            apartment: state.checkoutData.apartment,
            city: state.checkoutData.city,
            postalCode: state.checkoutData.postalCode,
            phone: state.checkoutData.phone,
            shippingMethod: state.checkoutData.shippingMethod,
            items: state.cart.map(item => ({
              productId: item.productId,
              name: item.name,
              sku: item.sku,
              price: item.price,
              quantity: item.quantity
            })),
            totals: cart.calculateTotals()
          };
          
          console.log('💾 Guardando orden en BD...', orderData);
          
          const saveResult = await api.saveOrder(orderData);
          
          if (saveResult && saveResult.success) {
            console.log('✅ Orden guardada:', saveResult);
            
            // ✅ LIMPIAR CARRITO
            cart.clear();
            
            // Mostrar página de éxito
            checkout.showSuccessPage(order.id, saveResult.orderNumber);
          } else {
            throw new Error('Error al guardar la orden');
          }
          
        } catch (error) {
          console.error('❌ Error procesando pago:', error);
          ui.showNotification('Error al procesar el pago: ' + error.message, 'error');
        }
      },
      
      // Manejar cancelación
      onCancel: function(data) {
        console.log('⚠️ Pago cancelado');
        ui.showNotification('Pago cancelado', 'error');
      },
      
      // Manejar errores
      onError: function(err) {
        console.error('❌ Error de PayPal:', err);
        ui.showNotification('Error al procesar el pago', 'error');
      }
    }).render('#paypal-button-container');
    
    console.log('✅ Botón de PayPal renderizado');
  },
  
  // ✅ Mostrar página de éxito
  showSuccessPage(paypalOrderId, orderNumber) {
    const successHTML = `
      <div class="payment-container" style="text-align: center; padding: 3rem;">
        <div style="font-size: 80px; color: #4caf50; margin-bottom: 2rem;">✓</div>
        <h2 style="color: #4caf50; margin-bottom: 1rem;">¡Pago Exitoso!</h2>
        <p style="font-size: 1.2rem; margin-bottom: 2rem;">
          Tu orden ha sido procesada correctamente
        </p>
        
        <div style="background: #f5f5f5; padding: 2rem; border-radius: 12px; margin-bottom: 2rem;">
          <p><strong>Número de Orden:</strong> ${orderNumber}</p>
          <p><strong>ID de PayPal:</strong> ${paypalOrderId}</p>
          <p><strong>Email:</strong> ${state.checkoutData.email}</p>
          <p style="margin-top: 1rem; color: #666;">
            Recibirás un email de confirmación con los detalles de tu pedido.
          </p>
        </div>
        
        <button 
          onclick="checkout.closeCheckout(); ui.toggleCart();" 
          style="padding: 1rem 2rem; background: #8C004B; color: white; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer;"
        >
          Continuar Comprando
        </button>
      </div>
    `;
    
    const container = document.getElementById('checkout-form-container');
    if (container) {
      container.innerHTML = successHTML;
    }
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
    
    if (data.success) {
      state.products = data.products;
      state.categories = data.categories;
      
      render.products(data.products);
      render.categories(data.categories);
      render.subcategories(); // ✅ Renderizar subcategorías
      
      console.log(`✅ ${data.products.length} productos cargados`);
      
      cart.load();
    } else {
      throw new Error(data.message || 'Error al cargar productos');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    
    const grid = document.getElementById('products-grid');
    if (grid) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 4rem;">
          <p style="font-size: 1.25rem; color: #e53e3e; margin-bottom: 1rem;">
            Error al cargar productos
          </p>
          <p style="color: #666;">${error.message}</p>
          <button 
            onclick="location.reload()" 
            style="margin-top: 1rem; padding: 0.5rem 1rem; background: #8C004B; color: white; border: none; border-radius: 8px; cursor: pointer;"
          >
            Reintentar
          </button>
        </div>
      `;
    }
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
    let timeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        filters.setSearch(e.target.value);
      }, 300);
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
// GLOBAL NAMESPACE
// =============================================================================

window.mawewe = {
  cart,
  ui,
  filters,
  checkout,
  state,
  CONFIG
};

window.productModal = productModal;

console.log('✅ Mawewe con PayPal cargado');