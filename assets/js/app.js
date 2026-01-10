/**
 * MAWEWE E-COMMERCE APPLICATION
 * Version: 2.0
 * Professional Edition
 */

// ==============================================
// CONFIGURATION
// ==============================================
const CONFIG = {
  api: {
    productsUrl: './data/products.json',
    ordersUrl: '/api/orders'
  },
  paypal: {
    clientId: 'AeKUZVm_-yxZRjygolPx21RgDuy3_K24uOrKWf3MpLAG8xErNCyu4S2GcIu27tJclkpabpv0HXAeBgrg',
    currency: 'USD',
    locale: 'es_EC'
  },
  shipping: {
    cost: 5.00,
    freeThreshold: 100.00
  },
  storage: {
    cartKey: 'mawewe_cart_v2',
    wishlistKey: 'mawewe_wishlist_v2'
  },
  ui: {
    productsPerPage: 20,
    animationDuration: 250
  }
};

// ==============================================
// STATE MANAGEMENT
// ==============================================
const state = {
  products: [],
  categories: [],
  cart: [],
  wishlist: [],
  filters: {
    category: 'all',
    subcategory: null,
    searchQuery: '',
    priceRange: { min: 0, max: Infinity },
    sortBy: 'featured'
  },
  ui: {
    isCartOpen: false,
    isLoading: false,
    currentPage: 1
  }
};

// ==============================================
// UTILITY FUNCTIONS
// ==============================================
const utils = {
  /**
   * Format price to currency
   */
  formatPrice(price) {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: CONFIG.paypal.currency
    }).format(price);
  },

  /**
   * Debounce function
   */
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

  /**
   * Generate unique ID
   */
  generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Safely parse JSON
   */
  safeJsonParse(str, fallback = null) {
    try {
      return JSON.parse(str);
    } catch (e) {
      console.error('JSON parse error:', e);
      return fallback;
    }
  },

  /**
   * Truncate text
   */
  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
  },

  /**
   * Calculate discount percentage
   */
  calculateDiscount(originalPrice, discountPrice) {
    return Math.round(((originalPrice - discountPrice) / originalPrice) * 100);
  }
};

// ==============================================
// STORAGE MANAGER
// ==============================================
const storage = {
  /**
   * Save cart to localStorage
   */
  saveCart() {
    try {
      localStorage.setItem(CONFIG.storage.cartKey, JSON.stringify(state.cart));
    } catch (e) {
      console.error('Error saving cart:', e);
    }
  },

  /**
   * Load cart from localStorage
   */
  loadCart() {
    try {
      const saved = localStorage.getItem(CONFIG.storage.cartKey);
      state.cart = utils.safeJsonParse(saved, []);
    } catch (e) {
      console.error('Error loading cart:', e);
      state.cart = [];
    }
  },

  /**
   * Clear cart
   */
  clearCart() {
    state.cart = [];
    this.saveCart();
  }
};

// ==============================================
// API SERVICE
// ==============================================
const api = {
  /**
   * Fetch products from API
   */
  async fetchProducts() {
    try {
      const response = await fetch(CONFIG.api.productsUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      state.products = data.products;
      state.categories = data.categories;
      return data;
    } catch (error) {
      console.error('Error fetching products:', error);
      ui.showNotification('Error al cargar productos. Por favor, recarga la página.', 'error');
      throw error;
    }
  },

  /**
   * Submit order to backend
   */
  async submitOrder(orderData) {
    try {
      const response = await fetch(CONFIG.api.ordersUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit order');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error submitting order:', error);
      // Don't show error to user - order was completed in PayPal
      return null;
    }
  }
};

// ==============================================
// PRODUCT FILTERING & SORTING
// ==============================================
const productFilters = {
  /**
   * Get filtered products based on current filters
   */
  getFilteredProducts() {
    let filtered = [...state.products];

    // Category filter
    if (state.filters.category !== 'all') {
      filtered = filtered.filter(p => p.category === state.filters.category);
    }

    // Subcategory filter
    if (state.filters.subcategory) {
      filtered = filtered.filter(p => p.subcategory === state.filters.subcategory);
    }

    // Search query
    if (state.filters.searchQuery) {
      const query = state.filters.searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.tags.some(tag => tag.includes(query))
      );
    }

    // Price range
    filtered = filtered.filter(p =>
      p.price >= state.filters.priceRange.min &&
      p.price <= state.filters.priceRange.max
    );

    // Sort
    filtered = this.sortProducts(filtered, state.filters.sortBy);

    return filtered;
  },

  /**
   * Sort products
   */
  sortProducts(products, sortBy) {
    const sorted = [...products];

    switch (sortBy) {
      case 'price-asc':
        return sorted.sort((a, b) => a.price - b.price);
      case 'price-desc':
        return sorted.sort((a, b) => b.price - a.price);
      case 'name-asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'rating':
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'featured':
      default:
        return sorted.sort((a, b) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return 0;
        });
    }
  },

  /**
   * Update category filter
   */
  setCategory(categoryId) {
    state.filters.category = categoryId;
    state.filters.subcategory = null;
    render.products();
  },

  /**
   * Update search query
   */
  setSearchQuery(query) {
    state.filters.searchQuery = query;
    render.products();
  }
};

// ==============================================
// CART MANAGEMENT
// ==============================================
const cart = {
  /**
   * Add product to cart
   */
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
        quantity: 1,
        addedAt: Date.now()
      });
    }

    storage.saveCart();
    render.cart();
    render.cartBadge();
    ui.showNotification(`${product.name} agregado al carrito`);
  },

  /**
   * Update item quantity
   */
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

  /**
   * Remove item from cart
   */
  removeItem(productId) {
    state.cart = state.cart.filter(item => item.productId !== productId);
    storage.saveCart();
    render.cart();
    render.cartBadge();
    ui.showNotification('Producto eliminado del carrito');
  },

  /**
   * Calculate cart totals
   */
  calculateTotals() {
    const subtotal = state.cart.reduce((sum, item) => {
      const product = state.products.find(p => p.id === item.productId);
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);

    const shipping = subtotal >= CONFIG.shipping.freeThreshold ? 0 : CONFIG.shipping.cost;
    const total = subtotal + shipping;

    return { subtotal, shipping, total };
  },

  /**
   * Get cart item count
   */
  getItemCount() {
    return state.cart.reduce((sum, item) => sum + item.quantity, 0);
  }
};

// ==============================================
// RENDER FUNCTIONS
// ==============================================
const render = {
  /**
   * Render products grid
   */
  products() {
    const container = document.getElementById('products-grid');
    if (!container) return;

    const filteredProducts = productFilters.getFilteredProducts();

    if (filteredProducts.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 4rem;">
          <h3>No se encontraron productos</h3>
          <p style="color: var(--text-secondary); margin-top: 1rem;">
            Intenta ajustar tus filtros de búsqueda
          </p>
        </div>
      `;
      return;
    }

    container.innerHTML = filteredProducts.map(product => {
      const discount = product.comparePrice ? 
        utils.calculateDiscount(product.comparePrice, product.price) : null;

      return `
        <article class="product-card" data-product-id="${product.id}">
          ${product.featured ? `
            <div class="product-badge">Destacado</div>
          ` : discount ? `
            <div class="product-badge">${discount}% Off</div>
          ` : ''}
          
          <div class="product-image-container">
            <img 
              src="${product.image}" 
              alt="${product.name}" 
              class="product-image"
              loading="lazy"
            />
          </div>
          
          <div class="product-content">
            <div class="product-category">${this.getCategoryName(product.category)}</div>
            <h3 class="product-title">${product.name}</h3>
            <p class="product-description">${utils.truncateText(product.description, 80)}</p>
            
            ${product.rating ? `
              <div class="product-rating">
                <span class="rating-stars">${this.renderStars(product.rating)}</span>
                <span class="rating-count">(${product.reviewCount || 0})</span>
              </div>
            ` : ''}
            
            <div class="product-footer">
              <div class="product-price-container">
                <div class="product-price">${utils.formatPrice(product.price)}</div>
                ${product.comparePrice ? `
                  <div class="product-compare-price">${utils.formatPrice(product.comparePrice)}</div>
                ` : ''}
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
              ${product.stock === 0 ? 'Sin stock' : `${product.stock} disponibles`}
            </div>
          </div>
        </article>
      `;
    }).join('');
  },

  /**
   * Render category filters
   */
  categories() {
    const container = document.getElementById('category-filters');
    if (!container) return;

    const categories = [
      { id: 'all', name: 'Todos los Productos' },
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

  /**
   * Render cart items
   */
  cart() {
    const container = document.getElementById('cart-items');
    if (!container) return;

    if (state.cart.length === 0) {
      container.innerHTML = `
        <div class="empty-cart">
          <div class="empty-cart-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
          </div>
          <h3>Tu carrito está vacío</h3>
          <p>Agrega productos para comenzar tu compra</p>
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

  /**
   * Render cart summary
   */
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
        <span class="amount">
          ${totals.shipping === 0 ? 'GRATIS' : utils.formatPrice(totals.shipping)}
        </span>
      </div>
      <div class="summary-row total">
        <span>Total:</span>
        <span class="amount">${utils.formatPrice(totals.total)}</span>
      </div>
    `;
  },

  /**
   * Render cart badge
   */
  cartBadge() {
    const badge = document.getElementById('cart-count');
    if (!badge) return;

    const count = cart.getItemCount();
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  },

  /**
   * Render star rating
   */
  renderStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return '★'.repeat(fullStars) + 
           (hasHalfStar ? '☆' : '') + 
           '☆'.repeat(emptyStars);
  },

  /**
   * Get category name
   */
  getCategoryName(categoryId) {
    const category = state.categories.find(c => c.id === categoryId);
    return category ? category.name : categoryId;
  }
};

// ==============================================
// UI INTERACTIONS
// ==============================================
const ui = {
  /**
   * Toggle cart modal
   */
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

  /**
   * Show notification
   */
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
  },

  /**
   * Show loading state
   */
  setLoading(isLoading) {
    state.ui.isLoading = isLoading;
    const container = document.getElementById('products-grid');
    
    if (isLoading && container) {
      container.innerHTML = `
        <div class="loading-state" style="grid-column: 1/-1;">
          <div class="loading-spinner"></div>
          <p>Cargando productos...</p>
        </div>
      `;
    }
  }
};

// ==============================================
// PAYPAL INTEGRATION
// ==============================================
const paypal = {
  /**
   * Initialize PayPal SDK
   */
  init() {
    if (document.getElementById('paypal-sdk')) return;

    const script = document.createElement('script');
    script.id = 'paypal-sdk';
    script.src = `https://www.paypal.com/sdk/js?client-id=${CONFIG.paypal.clientId}&currency=${CONFIG.paypal.currency}&locale=${CONFIG.paypal.locale}`;
    script.onload = () => this.renderButton();
    document.head.appendChild(script);
  },

  /**
   * Render PayPal button
   */
  renderButton() {
    if (typeof window.paypal === 'undefined') {
      console.error('PayPal SDK not loaded');
      return;
    }

    const container = document.getElementById('paypal-button-container');
    if (!container) return;

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
            items: items
          }],
          application_context: {
            shipping_preference: 'GET_FROM_FILE',
            brand_name: 'Mawewe',
            locale: CONFIG.paypal.locale
          }
        });
      },

      onApprove: async (data, actions) => {
        try {
          const order = await actions.order.capture();
          await this.processOrder(order);
          
          ui.showNotification('Pago completado exitosamente');
          storage.clearCart();
          render.cart();
          render.cartBadge();
          ui.toggleCart();
        } catch (error) {
          console.error('Error processing payment:', error);
          ui.showNotification('Error al procesar el pago', 'error');
        }
      },

      onError: (err) => {
        console.error('PayPal error:', err);
        ui.showNotification('Error con PayPal', 'error');
      },

      onCancel: () => {
        ui.showNotification('Pago cancelado', 'error');
      }
    }).render('#paypal-button-container');
  },

  /**
   * Process completed order
   */
  async processOrder(orderData) {
    const orderDetails = {
      orderId: orderData.id,
      status: orderData.status,
      items: state.cart.map(item => {
        const product = state.products.find(p => p.id === item.productId);
        return {
          productId: item.productId,
          sku: product.sku,
          name: product.name,
          price: product.price,
          quantity: item.quantity
        };
      }),
      totals: cart.calculateTotals(),
      customer: orderData.payer,
      timestamp: new Date().toISOString()
    };

    console.log('Order processed:', orderDetails);

    // Submit to backend if available
    try {
      await api.submitOrder(orderDetails);
    } catch (error) {
      console.error('Backend submission failed:', error);
    }

    return orderDetails;
  }
};

// ==============================================
// EVENT LISTENERS
// ==============================================
function setupEventListeners() {
  // Search input with debounce
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', 
      utils.debounce((e) => productFilters.setSearchQuery(e.target.value), 300)
    );
  }

  // Cart overlay click
  const overlay = document.getElementById('cart-overlay');
  if (overlay) {
    overlay.addEventListener('click', ui.toggleCart);
  }

  // ESC key to close cart
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.ui.isCartOpen) {
      ui.toggleCart();
    }
  });

  // Prevent cart close on modal click
  const cartModal = document.getElementById('cart-modal');
  if (cartModal) {
    cartModal.addEventListener('click', (e) => e.stopPropagation());
  }
}

// ==============================================
// INITIALIZATION
// ==============================================
async function init() {
  try {
    ui.setLoading(true);
    
    // Load data
    await api.fetchProducts();
    storage.loadCart();
    
    // Render initial state
    render.categories();
    render.products();
    render.cartBadge();
    
    // Setup interactions
    setupEventListeners();
    paypal.init();
    
    ui.setLoading(false);
    
    console.log('Mawewe E-commerce initialized successfully');
  } catch (error) {
    console.error('Initialization error:', error);
    ui.setLoading(false);
  }
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ==============================================
// GLOBAL EXPORTS
// ==============================================
window.mawewe = {
  cart,
  productFilters,
  ui,
  state
};