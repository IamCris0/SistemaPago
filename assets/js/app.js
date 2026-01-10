/**
 * MAWEWE E-COMMERCE - PROFESSIONAL VERSION 3.0
 * With PayPal Fixed, Enhanced Product Details & Premium Design
 * Version: 3.0
 */

// ==============================================
// CONFIGURATION
// ==============================================
const CONFIG = {
  api: {
    productsUrl: './data/products.json'
  },
  paypal: {
    clientId: 'AeKUZVm_-yxZRjygolPx21RgDuy3_K24uOrKWf3MpLAG8xErNCyu4S2GcIu27tJclkpabpv0HXAeBgrg',
    currency: 'USD',
    locale: 'es_ES'  // FIXED: PayPal no soporta es_EC, usar es_ES
  },
  shipping: {
    cost: 5.00,
    freeThreshold: 50.00,
    expressCost: 10.00
  },
  storage: {
    cartKey: 'mawewe_cart_v3',
    checkoutKey: 'mawewe_checkout_data_v3'
  }
};

// ==============================================
// STATE MANAGEMENT
// ==============================================
const state = {
  products: [],
  categories: [],
  cart: [],
  filters: {
    category: 'all',
    searchQuery: ''
  },
  ui: {
    isCartOpen: false,
    isCheckoutOpen: false,
    currentStep: 'cart',
    selectedProductId: null
  },
  checkoutData: {
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    apartment: '',
    city: '',
    postalCode: '',
    phone: '',
    shippingMethod: 'standard'
  }
};

// ==============================================
// UTILITY FUNCTIONS
// ==============================================
const utils = {
  formatPrice(price) {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: CONFIG.paypal.currency
    }).format(price);
  },

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
};

// ==============================================
// STORAGE
// ==============================================
const storage = {
  saveCart() {
    try {
      localStorage.setItem(CONFIG.storage.cartKey, JSON.stringify(state.cart));
    } catch (e) {
      console.error('Error saving cart:', e);
    }
  },

  loadCart() {
    try {
      const saved = localStorage.getItem(CONFIG.storage.cartKey);
      state.cart = saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Error loading cart:', e);
      state.cart = [];
    }
  },

  saveCheckoutData() {
    try {
      localStorage.setItem(CONFIG.storage.checkoutKey, JSON.stringify(state.checkoutData));
    } catch (e) {
      console.error('Error saving checkout data:', e);
    }
  },

  loadCheckoutData() {
    try {
      const saved = localStorage.getItem(CONFIG.storage.checkoutKey);
      if (saved) {
        state.checkoutData = { ...state.checkoutData, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Error loading checkout data:', e);
    }
  },

  clearCart() {
    state.cart = [];
    this.saveCart();
  }
};

// ==============================================
// API
// ==============================================
const api = {
  async fetchProducts() {
    try {
      const response = await fetch(CONFIG.api.productsUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      state.products = data.products;
      state.categories = data.categories;
      
      if (data.shippingConfig) {
        CONFIG.shipping = { ...CONFIG.shipping, ...data.shippingConfig };
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching products:', error);
      ui.showNotification('Error al cargar productos', 'error');
      throw error;
    }
  }
};

// ==============================================
// CART MANAGEMENT
// ==============================================
const cart = {
  addItem(productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product || product.stock === 0) {
      ui.showNotification('Producto no disponible', 'error');
      return;
    }

    const existingItem = state.cart.find(item => item.productId === productId);

    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        existingItem.quantity++;
      } else {
        ui.showNotification('Stock máximo alcanzado', 'error');
        return;
      }
    } else {
      state.cart.push({
        productId: productId,
        quantity: 1
      });
    }

    storage.saveCart();
    render.cart();
    render.cartBadge();
    ui.showNotification(`${product.name} agregado al carrito`);
  },

  updateQuantity(productId, change) {
    const item = state.cart.find(i => i.productId === productId);
    const product = state.products.find(p => p.id === productId);

    if (!item || !product) return;

    const newQuantity = item.quantity + change;

    if (newQuantity <= 0) {
      this.removeItem(productId);
      return;
    }

    if (newQuantity > product.stock) {
      ui.showNotification('Stock máximo alcanzado', 'error');
      return;
    }

    item.quantity = newQuantity;
    storage.saveCart();
    render.cart();
    render.cartBadge();
  },

  removeItem(productId) {
    state.cart = state.cart.filter(item => item.productId !== productId);
    storage.saveCart();
    render.cart();
    render.cartBadge();
    ui.showNotification('Producto eliminado');
  },

  calculateTotals() {
    const subtotal = state.cart.reduce((sum, item) => {
      const product = state.products.find(p => p.id === item.productId);
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);

    const shippingCost = state.checkoutData.shippingMethod === 'express' 
      ? CONFIG.shipping.expressCost 
      : CONFIG.shipping.cost;

    const shipping = subtotal >= CONFIG.shipping.freeThreshold ? 0 : shippingCost;
    const total = subtotal + shipping;

    return { subtotal, shipping, total, isFreeShipping: subtotal >= CONFIG.shipping.freeThreshold };
  },

  getItemCount() {
    return state.cart.reduce((sum, item) => sum + item.quantity, 0);
  }
};

// ==============================================
// RENDER FUNCTIONS
// ==============================================
const render = {
  products() {
    const container = document.getElementById('products-grid');
    if (!container) return;

    let filteredProducts = [...state.products];

    if (state.filters.category !== 'all') {
      filteredProducts = filteredProducts.filter(p => p.category === state.filters.category);
    }

    if (state.filters.searchQuery) {
      const query = state.filters.searchQuery.toLowerCase();
      filteredProducts = filteredProducts.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
      );
    }

    if (filteredProducts.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 4rem;">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin: 0 auto 1rem; opacity: 0.3;">
            <circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path>
          </svg>
          <h3>No se encontraron productos</h3>
          <p style="color: var(--gray-600);">Intenta con otra búsqueda o categoría</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filteredProducts.map(product => `
      <article class="product-card" data-product-id="${product.id}">
        ${product.featured ? '<div class="product-badge">Destacado</div>' : ''}
        
        <div class="product-image-container" onclick="productDetails.show(${product.id})">
          <img src="${product.image}" alt="${product.name}" class="product-image" loading="lazy" />
        </div>
        
        <div class="product-content">
          <div class="product-category">${this.getCategoryName(product.category)}</div>
          <h3 class="product-title">${product.name}</h3>
          <p class="product-description">${product.description}</p>
          
          ${product.rating ? `
            <div class="product-rating">
              <span class="rating-stars">${this.renderStars(product.rating)}</span>
              <span class="rating-count">(${product.reviewCount || 0})</span>
            </div>
          ` : ''}
          
          <div class="product-footer">
            <div class="product-price-container">
              <div class="product-price">${utils.formatPrice(product.price)}</div>
            </div>
            
            <button 
              class="btn-add-to-cart" 
              onclick="cart.addItem(${product.id})"
              ${product.stock === 0 ? 'disabled' : ''}
            >
              ${product.stock === 0 ? 'Agotado' : 'Agregar'}
            </button>
          </div>
          
          <div class="stock-indicator ${product.stock < 5 ? 'low' : product.stock === 0 ? 'out' : ''}">
            ${product.stock === 0 ? 'Sin stock' : product.stock < 5 ? `Solo ${product.stock} disponibles` : `${product.stock} disponibles`}
          </div>
          
          <button class="btn-details" onclick="productDetails.show(${product.id})">
            Ver detalles
          </button>
        </div>
      </article>
    `).join('');
  },

  categories() {
    const container = document.getElementById('category-filters');
    if (!container) return;

    const categories = [
      { id: 'all', name: 'Todos' },
      ...state.categories
    ];

    container.innerHTML = categories.map(cat => `
      <button 
        class="filter-button ${state.filters.category === cat.id ? 'active' : ''}" 
        onclick="productFilters.setCategory('${cat.id}')"
      >
        ${cat.name}
      </button>
    `).join('');
  },

  cart() {
    const container = document.getElementById('cart-items');
    if (!container) return;

    if (state.cart.length === 0) {
      container.innerHTML = `
        <div class="empty-cart">
          <div class="empty-cart-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
          </div>
          <h3>Tu carrito está vacío</h3>
          <p>Agrega productos para comenzar</p>
        </div>
      `;
      return;
    }

    container.innerHTML = state.cart.map(item => {
      const product = state.products.find(p => p.id === item.productId);
      if (!product) return '';

      return `
        <div class="cart-item">
          <img src="${product.image}" alt="${product.name}" class="cart-item-image" />
          <div class="cart-item-info">
            <div class="cart-item-title">${product.name}</div>
            <div class="cart-item-price">${utils.formatPrice(product.price)}</div>
            <div class="cart-item-controls">
              <button class="btn-quantity" onclick="cart.updateQuantity(${item.productId}, -1)">−</button>
              <span class="quantity-display">${item.quantity}</span>
              <button class="btn-quantity" onclick="cart.updateQuantity(${item.productId}, 1)">+</button>
              <button class="btn-remove" onclick="cart.removeItem(${item.productId})">Eliminar</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    this.cartSummary();
  },

  cartSummary() {
    const container = document.getElementById('cart-summary');
    if (!container) return;

    const totals = cart.calculateTotals();

    container.innerHTML = `
      <div class="summary-row">
        <span>Subtotal:</span>
        <span class="amount">${utils.formatPrice(totals.subtotal)}</span>
      </div>
      <div class="summary-row">
        <span>Envío:</span>
        <span class="amount ${totals.isFreeShipping ? 'free-shipping' : ''}">
          ${totals.isFreeShipping ? 'GRATIS' : utils.formatPrice(totals.shipping)}
        </span>
      </div>
      ${!totals.isFreeShipping ? `
        <div class="summary-note">
          Compra ${utils.formatPrice(CONFIG.shipping.freeThreshold - totals.subtotal)} más para envío gratis
        </div>
      ` : ''}
      <div class="summary-row total">
        <span>Total:</span>
        <span class="amount">${utils.formatPrice(totals.total)}</span>
      </div>
    `;
  },

  checkoutForm() {
    const container = document.getElementById('checkout-form-container');
    if (!container) return;

    const totals = cart.calculateTotals();

    container.innerHTML = `
      <div class="checkout-header">
        <button class="btn-back" onclick="checkout.goBack()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Volver al carrito
        </button>
        <h2>Información de Envío</h2>
      </div>

      <form class="checkout-form" onsubmit="checkout.handleSubmit(event)">
        
        <div class="form-section">
          <h3>Contacto</h3>
          <div class="form-group">
            <label for="email">Email o número de teléfono móvil</label>
            <input 
              type="text" 
              id="email" 
              name="email" 
              value="${state.checkoutData.email}"
              required 
              placeholder="tu@email.com"
            />
          </div>
          <div class="form-checkbox">
            <input type="checkbox" id="newsletter" />
            <label for="newsletter">Enviarme novedades y ofertas por correo electrónico</label>
          </div>
        </div>

        <div class="form-section">
          <h3>Entrega</h3>
          
          <div class="form-row">
            <div class="form-group">
              <label for="country">País / Región</label>
              <select id="country" name="country" required>
                <option value="EC" selected>Ecuador</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="firstName">Nombre</label>
              <input 
                type="text" 
                id="firstName" 
                name="firstName" 
                value="${state.checkoutData.firstName}"
                required 
              />
            </div>
            <div class="form-group">
              <label for="lastName">Apellidos</label>
              <input 
                type="text" 
                id="lastName" 
                name="lastName" 
                value="${state.checkoutData.lastName}"
                required 
              />
            </div>
          </div>

          <div class="form-group">
            <label for="address">Dirección</label>
            <input 
              type="text" 
              id="address" 
              name="address" 
              value="${state.checkoutData.address}"
              required 
              placeholder="Calle, número, etc."
            />
          </div>

          <div class="form-group">
            <label for="apartment">Casa, apartamento, etc. (opcional)</label>
            <input 
              type="text" 
              id="apartment" 
              name="apartment" 
              value="${state.checkoutData.apartment}"
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="postalCode">Código postal (opcional)</label>
              <input 
                type="text" 
                id="postalCode" 
                name="postalCode" 
                value="${state.checkoutData.postalCode}"
              />
            </div>
            <div class="form-group">
              <label for="city">Ciudad</label>
              <input 
                type="text" 
                id="city" 
                name="city" 
                value="${state.checkoutData.city}"
                required 
              />
            </div>
          </div>

          <div class="form-group">
            <label for="phone">Teléfono</label>
            <input 
              type="tel" 
              id="phone" 
              name="phone" 
              value="${state.checkoutData.phone}"
              required 
              placeholder="0991234567"
            />
          </div>

          <div class="form-checkbox">
            <input type="checkbox" id="saveInfo" checked />
            <label for="saveInfo">Guardar mi información y consultar más rápidamente la próxima vez</label>
          </div>
        </div>

        <div class="form-section">
          <h3>Métodos de envío</h3>
          <div class="shipping-options">
            <label class="shipping-option ${state.checkoutData.shippingMethod === 'standard' ? 'selected' : ''}">
              <input 
                type="radio" 
                name="shippingMethod" 
                value="standard" 
                ${state.checkoutData.shippingMethod === 'standard' ? 'checked' : ''}
                onchange="checkout.updateShipping('standard')"
              />
              <div class="shipping-info">
                <span class="shipping-name">Standard</span>
                <span class="shipping-cost">${totals.subtotal >= CONFIG.shipping.freeThreshold ? 'GRATIS' : utils.formatPrice(CONFIG.shipping.cost)}</span>
              </div>
            </label>
            <label class="shipping-option ${state.checkoutData.shippingMethod === 'express' ? 'selected' : ''}">
              <input 
                type="radio" 
                name="shippingMethod" 
                value="express" 
                ${state.checkoutData.shippingMethod === 'express' ? 'checked' : ''}
                onchange="checkout.updateShipping('express')"
              />
              <div class="shipping-info">
                <span class="shipping-name">Express (1-2 días)</span>
                <span class="shipping-cost">${utils.formatPrice(CONFIG.shipping.expressCost)}</span>
              </div>
            </label>
          </div>
        </div>

        <div class="checkout-summary">
          <h3>Resumen del Pedido</h3>
          <div class="summary-items">
            ${state.cart.map(item => {
              const product = state.products.find(p => p.id === item.productId);
              if (!product) return '';
              return `
                <div class="summary-item">
                  <img src="${product.image}" alt="${product.name}" />
                  <div class="summary-item-info">
                    <span>${product.name}</span>
                    <span class="quantity">× ${item.quantity}</span>
                  </div>
                  <span class="summary-item-price">${utils.formatPrice(product.price * item.quantity)}</span>
                </div>
              `;
            }).join('')}
          </div>
          <div class="summary-totals">
            <div class="summary-row">
              <span>Subtotal:</span>
              <span>${utils.formatPrice(totals.subtotal)}</span>
            </div>
            <div class="summary-row">
              <span>Envío:</span>
              <span>${totals.isFreeShipping ? 'GRATIS' : utils.formatPrice(totals.shipping)}</span>
            </div>
            <div class="summary-row total">
              <span>Total:</span>
              <span>${utils.formatPrice(totals.total)}</span>
            </div>
          </div>
        </div>

        <button type="submit" class="btn-continue-payment">
          Continuar al Pago
        </button>
      </form>
    `;
  },

  cartBadge() {
    const badge = document.getElementById('cart-count');
    if (!badge) return;

    const count = cart.getItemCount();
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  },

  renderStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return '★'.repeat(fullStars) + 
           (hasHalfStar ? '☆' : '') + 
           '☆'.repeat(emptyStars);
  },

  getCategoryName(categoryId) {
    const category = state.categories.find(c => c.id === categoryId);
    return category ? category.name : categoryId;
  }
};

// ==============================================
// PRODUCT DETAILS MODAL
// ==============================================
const productDetails = {
  show(productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;

    const modal = document.createElement('div');
    modal.className = 'product-modal-overlay';
    modal.innerHTML = `
      <div class="product-modal">
        <button class="modal-close" onclick="productDetails.close()">×</button>
        <div class="modal-content">
          <div class="modal-image">
            <img src="${product.image}" alt="${product.name}" />
          </div>
          <div class="modal-info">
            <div class="product-category">${render.getCategoryName(product.category)}</div>
            <h2 class="modal-title">${product.name}</h2>
            <div class="product-rating">
              <span class="rating-stars">${render.renderStars(product.rating || 0)}</span>
              <span class="rating-count">(${product.reviewCount || 0} reseñas)</span>
            </div>
            <div class="modal-price">${utils.formatPrice(product.price)}</div>
            <p class="modal-description">${product.description}</p>
            
            <div class="product-details-list">
              <h3>Detalles del Producto</h3>
              <ul>
                <li><strong>SKU:</strong> ${product.sku}</li>
                <li><strong>Stock disponible:</strong> ${product.stock} unidades</li>
                <li><strong>Categoría:</strong> ${render.getCategoryName(product.category)}</li>
                ${product.subcategory ? `<li><strong>Subcategoría:</strong> ${product.subcategory}</li>` : ''}
              </ul>
            </div>
            
            <div class="modal-actions">
              <button 
                class="btn-add-to-cart-large" 
                onclick="cart.addItem(${product.id}); productDetails.close();"
                ${product.stock === 0 ? 'disabled' : ''}
              >
                ${product.stock === 0 ? 'Agotado' : 'Agregar al Carrito'}
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
    const modal = document.querySelector('.product-modal-overlay');
    if (modal) {
      modal.remove();
      document.body.style.overflow = '';
    }
  }
};

// ==============================================
// PRODUCT FILTERS
// ==============================================
const productFilters = {
  setCategory(categoryId) {
    state.filters.category = categoryId;
    render.products();
    render.categories();
  },

  setSearchQuery(query) {
    state.filters.searchQuery = query;
    render.products();
  }
};

// ==============================================
// UI INTERACTIONS
// ==============================================
const ui = {
  toggleCart() {
    state.ui.isCartOpen = !state.ui.isCartOpen;
    
    const modal = document.getElementById('cart-modal');
    const overlay = document.getElementById('cart-overlay');
    
    if (state.ui.isCartOpen) {
      modal.classList.add('open');
      overlay.classList.add('active');
      render.cart();
      document.body.style.overflow = 'hidden';
    } else {
      modal.classList.remove('open');
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${type === 'success' ? 
          '<path d="M20 6L9 17l-5-5"/>' : 
          '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
        }
      </svg>
      <span>${message}</span>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideInFromRight 250ms ease-out reverse';
      setTimeout(() => notification.remove(), 250);
    }, 3000);
  }
};

// ==============================================
// CHECKOUT FLOW
// ==============================================
const checkout = {
  openCheckout() {
    if (state.cart.length === 0) {
      ui.showNotification('El carrito está vacío', 'error');
      return;
    }

    state.ui.currentStep = 'checkout';
    const cartModal = document.getElementById('cart-modal');
    const checkoutContainer = document.getElementById('checkout-form-container');
    
    cartModal.classList.add('checkout-mode');
    checkoutContainer.style.display = 'block';
    
    render.checkoutForm();
  },

  goBack() {
    state.ui.currentStep = 'cart';
    const cartModal = document.getElementById('cart-modal');
    const checkoutContainer = document.getElementById('checkout-form-container');
    
    cartModal.classList.remove('checkout-mode');
    checkoutContainer.style.display = 'none';
    
    render.cart();
  },

  updateShipping(method) {
    state.checkoutData.shippingMethod = method;
    storage.saveCheckoutData();
    render.checkoutForm();
  },

  handleSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    
    state.checkoutData = {
      email: formData.get('email'),
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      address: formData.get('address'),
      apartment: formData.get('apartment'),
      city: formData.get('city'),
      postalCode: formData.get('postalCode'),
      phone: formData.get('phone'),
      shippingMethod: formData.get('shippingMethod')
    };

    storage.saveCheckoutData();
    this.openPayment();
  },

  openPayment() {
    state.ui.currentStep = 'payment';
    
    const container = document.getElementById('checkout-form-container');
    container.innerHTML = `
      <div class="payment-container">
        <div class="checkout-header">
          <button class="btn-back" onclick="checkout.goBack()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Volver
          </button>
          <h2>Método de Pago</h2>
        </div>

        <div class="payment-info">
          <div class="payment-section">
            <h3>Información de Entrega</h3>
            <p><strong>${state.checkoutData.firstName} ${state.checkoutData.lastName}</strong></p>
            <p>${state.checkoutData.address}${state.checkoutData.apartment ? ', ' + state.checkoutData.apartment : ''}</p>
            <p>${state.checkoutData.city}, Ecuador</p>
            <p>Tel: ${state.checkoutData.phone}</p>
            <p>Email: ${state.checkoutData.email}</p>
          </div>

          <div class="payment-section">
            <h3>Pagar con PayPal</h3>
            <p>Serás redirigido a PayPal para completar tu pago de forma segura.</p>
            <div id="paypal-button-container"></div>
          </div>
        </div>
      </div>
    `;

    paypal.init();
  }
};

// ==============================================
// PAYPAL INTEGRATION - FIXED
// ==============================================
const paypal = {
  init() {
    if (document.getElementById('paypal-sdk')) {
      this.renderButton();
      return;
    }

    const script = document.createElement('script');
    script.id = 'paypal-sdk';
    script.src = `https://www.paypal.com/sdk/js?client-id=${CONFIG.paypal.clientId}&currency=${CONFIG.paypal.currency}&locale=${CONFIG.paypal.locale}`;
    script.onload = () => this.renderButton();
    script.onerror = () => {
      console.error('Error loading PayPal SDK');
      ui.showNotification('Error al cargar PayPal. Intenta de nuevo.', 'error');
    };
    document.head.appendChild(script);
  },

  renderButton() {
    if (typeof window.paypal === 'undefined') {
      console.error('PayPal SDK not loaded');
      ui.showNotification('Error: PayPal no está disponible', 'error');
      return;
    }

    const container = document.getElementById('paypal-button-container');
    if (!container) {
      console.error('PayPal button container not found');
      return;
    }

    container.innerHTML = '';

    window.paypal.Buttons({
      style: {
        layout: 'vertical',
        color: 'gold',
        shape: 'pill',
        label: 'checkout',
        height: 45
      },

      createOrder: (data, actions) => {
        const items = state.cart.map(item => {
          const product = state.products.find(p => p.id === item.productId);
          return {
            name: product.name,
            description: product.description.substring(0, 127),
            sku: product.sku,
            unit_amount: {
              currency_code: CONFIG.paypal.currency,
              value: product.price.toFixed(2)
            },
            quantity: item.quantity
          };
        });

        const totals = cart.calculateTotals();

        return actions.order.create({
          purchase_units: [{
            description: 'Compra en Mawewe',
            amount: {
              currency_code: CONFIG.paypal.currency,
              value: totals.total.toFixed(2),
              breakdown: {
                item_total: {
                  currency_code: CONFIG.paypal.currency,
                  value: totals.subtotal.toFixed(2)
                },
                shipping: {
                  currency_code: CONFIG.paypal.currency,
                  value: totals.shipping.toFixed(2)
                }
              }
            },
            items: items,
            shipping: {
              name: {
                full_name: `${state.checkoutData.firstName} ${state.checkoutData.lastName}`
              },
              address: {
                address_line_1: state.checkoutData.address,
                address_line_2: state.checkoutData.apartment || '',
                admin_area_2: state.checkoutData.city,
                postal_code: state.checkoutData.postalCode || '000000',
                country_code: 'EC'
              }
            }
          }],
          application_context: {
            shipping_preference: 'GET_FROM_FILE',
            brand_name: 'Mawewe'
            // REMOVED locale - this was causing the error
          }
        });
      },

      onApprove: async (data, actions) => {
        try {
          const order = await actions.order.capture();
          
          console.log('✅ Order completed:', {
            orderId: order.id,
            customer: state.checkoutData,
            items: state.cart,
            totals: cart.calculateTotals()
          });
          
          ui.showNotification('¡Pago completado exitosamente!');
          
          storage.clearCart();
          state.checkoutData = {};
          storage.saveCheckoutData();
          
          ui.toggleCart();
          render.cartBadge();
          
        } catch (error) {
          console.error('❌ Error processing payment:', error);
          ui.showNotification('Error al procesar el pago', 'error');
        }
      },

      onError: (err) => {
        console.error('❌ PayPal error:', err);
        ui.showNotification('Error con PayPal. Intenta de nuevo.', 'error');
      },

      onCancel: () => {
        ui.showNotification('Pago cancelado', 'error');
      }
    }).render('#paypal-button-container');
  }
};

// ==============================================
// EVENT LISTENERS
// ==============================================
function setupEventListeners() {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', 
      utils.debounce((e) => productFilters.setSearchQuery(e.target.value), 300)
    );
  }

  const overlay = document.getElementById('cart-overlay');
  if (overlay) {
    overlay.addEventListener('click', () => {
      if (state.ui.currentStep === 'cart') {
        ui.toggleCart();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (state.ui.isCartOpen) {
        if (state.ui.currentStep === 'cart') {
          ui.toggleCart();
        } else {
          checkout.goBack();
        }
      }
      productDetails.close();
    }
  });
}

// ==============================================
// INITIALIZATION
// ==============================================
async function init() {
  try {
    await api.fetchProducts();
    storage.loadCart();
    storage.loadCheckoutData();
    
    render.categories();
    render.products();
    render.cartBadge();
    
    setupEventListeners();
    
    console.log('✅ Mawewe E-commerce v3.0 initialized successfully');
  } catch (error) {
    console.error('❌ Initialization error:', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

window.mawewe = {
  cart,
  checkout,
  productFilters,
  productDetails,
  ui,
  state
};
