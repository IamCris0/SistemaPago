/**
 * MAWEWE E-COMMERCE - VERSIÓN CORREGIDA CON MODAL Y CARRUSEL
 * ✅ Imágenes visibles en grid principal
 * ✅ Sin spinner de carga molesto
 * ✅ Modal de detalles con carrusel de 3 imágenes
 * ✅ Orden correcto de categorías
 * ✅ Sistema de stock funcional
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
      return null;
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
      
      if (state.cart.length === 0 && saved) {
        console.warn('⚠️ Carrito corrupto detectado, limpiando...');
        localStorage.removeItem('mawewe_cart_v3');
      }
    } catch (error) {
      console.error('❌ Error loading cart:', error);
      state.cart = [];
      localStorage.removeItem('mawewe_cart_v3');
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
    
    // ✅ VALIDAR STOCK
    if (product.stock < 1) {
      ui.showNotification('Producto sin stock disponible', 'error');
      return;
    }
    
    const existingItem = state.cart.find(item => item.productId === productId);
    
    if (existingItem) {
      // ✅ VALIDAR STOCK AL INCREMENTAR
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
    
    // ✅ VALIDAR STOCK
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
  
  // ✅ FUNCIÓN DE LOADING MEJORADA - NO MOLESTA
  showLoading(show = true) {
    // Ya no mostramos el spinner global molesto
    // Solo cambiamos el cursor si es necesario
    if (show) {
      document.body.style.cursor = 'wait';
    } else {
      document.body.style.cursor = '';
    }
  }
};

// =============================================================================
// PRODUCT MODAL CON CARRUSEL
// =============================================================================

const productModal = {
  currentImageIndex: 0,
  currentProduct: null,
  
  show(productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;
    
    this.currentProduct = product;
    this.currentImageIndex = 0;
    
    // Obtener las 3 imágenes (o repetir la principal si solo hay una)
    const images = product.images && Array.isArray(product.images) && product.images.length > 0
      ? product.images.slice(0, 3)
      : [product.image, product.image, product.image];
    
    // Crear modal
    const modal = document.createElement('div');
    modal.className = 'product-modal-overlay';
    modal.id = 'product-detail-modal';
    modal.innerHTML = `
      <div class="product-modal">
        <button class="modal-close" onclick="productModal.close()">&times;</button>
        
        <div class="modal-content">
          <!-- Sección de imágenes con carrusel -->
          <div class="modal-image-section">
            <div class="modal-main-image">
              <img id="modal-main-img" src="${images[0]}" alt="${product.name}">
              
              <!-- Botones de navegación del carrusel -->
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
            
            <!-- Miniaturas -->
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
          
          <!-- Información del producto -->
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
    
    // Cerrar al hacer clic fuera
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
    
    // Actualizar miniaturas activas
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
    
    grid.innerHTML = products.map(product => `
      <article class="product-card" data-product-id="${product.id}">
        <div class="product-image-container" onclick="productModal.show(${product.id})" style="cursor: pointer;">
          <div class="product-carousel">
            <img src="${product.image}" alt="${product.name}" class="product-image" loading="lazy">
          </div>
        </div>
        
        <div class="product-content">
          <div class="product-category">${product.category}</div>
          <h3 class="product-title">${product.name}</h3>
          <p class="product-description">${product.description.substring(0, 80)}...</p>
          
          <div class="product-footer">
            <span class="product-price">$${Number(product.price).toFixed(2)}</span>
            <button 
              class="btn-add-to-cart" 
              onclick="cart.addItem(${product.id})"
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
          
          <button class="btn-details" onclick="productModal.show(${product.id})">
            Ver detalles
          </button>
        </div>
      </article>
    `).join('');
    
    console.log(`✅ ${products.length} productos renderizados`);
  },
  
  categories(categories) {
    const container = document.getElementById('category-filters');
    
    if (!container || !categories) return;
    
    // ✅ ORDEN CORRECTO DE CATEGORÍAS
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
    
    // Crear array ordenado
    const orderedCategories = [];
    
    // Primero "Todos"
    orderedCategories.push({ id: 'all', name: 'Todos' });
    
    // Luego el resto en el orden especificado
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
        console.warn('⚠️ Item inválido en carrito:', item);
        return '';
      }
      
      return `
        <div class="cart-item">
          <img src="${item.image || ''}" alt="${item.name}" class="cart-item-image">
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
    // ✅ NO MOSTRAR SPINNER MOLESTO
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
    // ✅ NO MOSTRAR SPINNER MOLESTO
    ui.showLoading(true);
    
    const data = await api.fetchProducts();
    
    if (data.success) {
      state.products = data.products;
      state.categories = data.categories;
      
      render.products(data.products);
      render.categories(data.categories);
      
      console.log(`✅ ${data.products.length} productos cargados`);
      
      cart.load();
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
  
  // Cerrar modal con ESC
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

console.log('✅ Mawewe script loaded');