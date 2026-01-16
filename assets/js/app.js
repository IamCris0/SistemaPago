/**
 * MAWEWE E-COMMERCE - VERSIÓN COMPLETA Y FUNCIONAL
 * ✅ Conecta con API PHP
 * ✅ Carrito funcional
 * ✅ Filtros y búsqueda
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

console.log('🚀 Mawewe iniciando...');
console.log('🌐 API URL:', CONFIG.api.baseUrl);

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

const state = {
  products: [],
  categories: [],
  cart: [],
  currentFilter: 'all',
  searchQuery: '',
  shippingMethod: 'standard'
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
  }
};

// =============================================================================
// CART FUNCTIONS
// =============================================================================

const cart = {
  load() {
    const saved = localStorage.getItem('mawewe_cart_v3');
    state.cart = saved ? JSON.parse(saved) : [];
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
      ui.showNotification('Producto sin stock', 'error');
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
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
      spinner.style.display = show ? 'flex' : 'none';
    }
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
    
    grid.innerHTML = products.map(product => `
      <article class="product-card" data-product-id="${product.id}">
        <div class="product-image-container">
          <div class="product-carousel">
            <img src="${product.image}" alt="${product.name}" class="product-image" loading="lazy">
          </div>
          ${product.featured ? '<span class="product-badge">Destacado</span>' : ''}
        </div>
        
        <div class="product-content">
          <div class="product-category">${product.category}</div>
          <h3 class="product-title">${product.name}</h3>
          <p class="product-description">${product.description.substring(0, 80)}...</p>
          
          <div class="product-footer">
            <span class="product-price">$${product.price.toFixed(2)}</span>
            <button 
              class="btn-add-to-cart" 
              onclick="cart.addItem(${product.id})"
              ${product.stock < 1 ? 'disabled' : ''}
            >
              ${product.stock > 0 ? 'Añadir' : 'Sin Stock'}
            </button>
          </div>
          
          <div class="stock-indicator ${product.stock < 5 ? 'low' : ''} ${product.stock < 1 ? 'out' : ''}">
            ${product.stock > 0 ? `${product.stock} disponibles` : 'Agotado'}
          </div>
        </div>
      </article>
    `).join('');
    
    console.log(`✅ ${products.length} productos renderizados`);
  },
  
  categories(categories) {
    const container = document.getElementById('category-filters');
    
    if (!container || !categories) return;
    
    container.innerHTML = `
      <button class="filter-button active" onclick="filters.setCategory('all')">
        Todos
      </button>
      ${categories.map(cat => `
        <button class="filter-button" onclick="filters.setCategory('${cat.id}')">
          ${cat.name} (${cat.count})
        </button>
      `).join('')}
    `;
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
    
    container.innerHTML = state.cart.map(item => `
      <div class="cart-item">
        <img src="${item.image}" alt="${item.name}" class="cart-item-image">
        <div class="cart-item-info">
          <h4 class="cart-item-title">${item.name}</h4>
          <div class="cart-item-price">$${item.price.toFixed(2)}</div>
          <div class="cart-item-controls">
            <button class="btn-quantity" onclick="cart.updateQuantity(${item.productId}, -1)">-</button>
            <span class="quantity-display">${item.quantity}</span>
            <button class="btn-quantity" onclick="cart.updateQuantity(${item.productId}, 1)">+</button>
            <button class="btn-remove" onclick="cart.removeItem(${item.productId})">
              Eliminar
            </button>
          </div>
        </div>
      </div>
    `).join('');
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
    
    document.querySelectorAll('.filter-button').forEach(btn => {
      btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    this.apply();
  },
  
  setSearch(query) {
    state.searchQuery = query;
    this.apply();
  },
  
  apply() {
    ui.showLoading(true);
    
    api.fetchProducts({
      category: state.currentFilter,
      search: state.searchQuery
    })
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
// CHECKOUT
// =============================================================================

const checkout = {
  openCheckout() {
    if (state.cart.length === 0) {
      ui.showNotification('El carrito está vacío', 'error');
      return;
    }
    
    ui.showNotification('Función de checkout en desarrollo');
    console.log('Checkout data:', {
      cart: state.cart,
      totals: cart.calculateTotals()
    });
  }
};

// =============================================================================
// INITIALIZATION
// =============================================================================

async function init() {
  console.log('🚀 Mawewe starting...');
  console.log('🌐 API URL:', CONFIG.api.baseUrl);
  
  try {
    ui.showLoading(true);
    
    cart.load();
    
    const data = await api.fetchProducts();
    
    if (data.success) {
      state.products = data.products;
      state.categories = data.categories;
      
      render.products(data.products);
      render.categories(data.categories);
      
      console.log(`✅ ${data.products.length} productos cargados`);
    } else {
      throw new Error(data.message || 'Error al cargar productos');
    }
    
  } catch (error) {
    console.error('❌ Initialization error:', error);
    
    const grid = document.getElementById('products-grid');
    if (grid) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 4rem;">
          <p style="font-size: 1.25rem; color: #e53e3e; margin-bottom: 1rem;">
            Error al cargar productos
          </p>
          <p style="color: #666;">
            ${error.message}
          </p>
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

console.log('✅ Mawewe script loaded');