/* =========================================
   MAWEWE SHOP - MAIN JAVASCRIPT
   ========================================= */

// Configuration
const CONFIG = {
  API_URL: './api/products.json',
  PAYPAL_CLIENT_ID: 'AeKUZVm_-yxZRjygolPx21RgDuy3_K24uOrKWf3MpLAG8xErNCyu4S2GcIu27tJclkpabpv0HXAeBgrg', // Reemplazar con tu Client ID
  CURRENCY: 'USD',
  SHIPPING_COST: 5.00
};

// State Management
const state = {
  products: [],
  cart: [],
  currentFilter: 'all',
  searchQuery: ''
};

// =========================================
// INITIALIZATION
// =========================================
document.addEventListener('DOMContentLoaded', async () => {
  await loadProducts();
  loadCartFromStorage();
  renderProducts();
  setupEventListeners();
  updateCartUI();
  initPayPal();
});

// =========================================
// LOAD PRODUCTS FROM API
// =========================================
async function loadProducts() {
  try {
    showLoading(true);
    const response = await fetch(CONFIG.API_URL);
    const data = await response.json();
    state.products = data.products;
    renderCategories(data.categories);
    showLoading(false);
  } catch (error) {
    console.error('Error loading products:', error);
    showNotification('Error al cargar productos', 'error');
    showLoading(false);
  }
}

// =========================================
// RENDER FUNCTIONS
// =========================================
function renderProducts() {
  const container = document.getElementById('products-grid');
  const filteredProducts = getFilteredProducts();
  
  if (filteredProducts.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
        <div style="font-size: 4rem; opacity: 0.3;">🔍</div>
        <h3>No se encontraron productos</h3>
        <p style="color: var(--text-secondary);">Intenta con otra búsqueda o categoría</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = filteredProducts.map(product => `
    <div class="product-card" data-product-id="${product.id}">
      ${product.featured ? '<div class="product-badge">⭐ Destacado</div>' : ''}
      <img 
        src="${product.image}" 
        alt="${product.name}" 
        class="product-image"
        loading="lazy"
      />
      <div class="product-info">
        <div class="product-category">${getCategoryName(product.category)}</div>
        <h3 class="product-name">${product.name}</h3>
        <p class="product-description">${product.description}</p>
        <div class="product-footer">
          <div>
            <div class="product-price">$${product.price.toFixed(2)}</div>
            <div class="stock-info ${product.stock < 5 ? 'low-stock' : ''}">
              📦 ${product.stock} disponibles
            </div>
          </div>
          <button 
            class="add-to-cart-btn" 
            onclick="addToCart(${product.id})"
            ${product.stock === 0 ? 'disabled' : ''}
          >
            🛒 Agregar
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderCategories(categories) {
  const container = document.getElementById('category-filters');
  const allBtn = `
    <button class="filter-btn active" onclick="filterByCategory('all')">
      🏪 Todos los Productos
    </button>
  `;
  
  const categoryBtns = categories.map(cat => `
    <button class="filter-btn" onclick="filterByCategory('${cat.id}')">
      ${cat.icon} ${cat.name}
    </button>
  `).join('');
  
  container.innerHTML = allBtn + categoryBtns;
}

function renderCart() {
  const container = document.getElementById('cart-items');
  
  if (state.cart.length === 0) {
    container.innerHTML = `
      <div class="empty-cart">
        <div class="empty-cart-icon">🛒</div>
        <h3>Tu carrito está vacío</h3>
        <p>¡Agrega productos para comenzar a comprar!</p>
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
          <div class="cart-item-name">${product.name}</div>
          <div class="cart-item-price">$${product.price.toFixed(2)}</div>
          <div class="cart-item-controls">
            <button class="qty-btn" onclick="updateQuantity(${item.productId}, -1)">−</button>
            <span class="qty-display">${item.quantity}</span>
            <button class="qty-btn" onclick="updateQuantity(${item.productId}, 1)">+</button>
            <button class="remove-btn" onclick="removeFromCart(${item.productId})">🗑️ Eliminar</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// =========================================
// FILTER & SEARCH
// =========================================
function getFilteredProducts() {
  return state.products.filter(product => {
    const matchesCategory = state.currentFilter === 'all' || product.category === state.currentFilter;
    const matchesSearch = product.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
                         product.description.toLowerCase().includes(state.searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });
}

function filterByCategory(category) {
  state.currentFilter = category;
  
  // Update active button
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  
  renderProducts();
}

function searchProducts(query) {
  state.searchQuery = query;
  renderProducts();
}

// =========================================
// CART MANAGEMENT
// =========================================
function addToCart(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product || product.stock === 0) return;
  
  const existingItem = state.cart.find(item => item.productId === productId);
  
  if (existingItem) {
    if (existingItem.quantity < product.stock) {
      existingItem.quantity++;
    } else {
      showNotification('No hay más stock disponible', 'error');
      return;
    }
  } else {
    state.cart.push({
      productId: productId,
      quantity: 1
    });
  }
  
  saveCartToStorage();
  updateCartUI();
  renderCart();
  showNotification(`✅ ${product.name} agregado al carrito`);
}

function updateQuantity(productId, change) {
  const item = state.cart.find(i => i.productId === productId);
  const product = state.products.find(p => p.id === productId);
  
  if (!item || !product) return;
  
  const newQuantity = item.quantity + change;
  
  if (newQuantity <= 0) {
    removeFromCart(productId);
    return;
  }
  
  if (newQuantity > product.stock) {
    showNotification('No hay más stock disponible', 'error');
    return;
  }
  
  item.quantity = newQuantity;
  saveCartToStorage();
  updateCartUI();
  renderCart();
}

function removeFromCart(productId) {
  state.cart = state.cart.filter(item => item.productId !== productId);
  saveCartToStorage();
  updateCartUI();
  renderCart();
  showNotification('Producto eliminado del carrito');
}

function clearCart() {
  state.cart = [];
  saveCartToStorage();
  updateCartUI();
  renderCart();
}

// =========================================
// CART UI
// =========================================
function updateCartUI() {
  const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const badge = document.getElementById('cart-count');
  badge.textContent = totalItems;
  
  const total = calculateTotal();
  const totalElement = document.getElementById('cart-total');
  if (totalElement) {
    totalElement.textContent = `$${total.toFixed(2)}`;
  }
}

function toggleCart() {
  const modal = document.getElementById('cart-modal');
  const overlay = document.getElementById('cart-overlay');
  
  modal.classList.toggle('open');
  overlay.classList.toggle('active');
  
  if (modal.classList.contains('open')) {
    renderCart();
    updateCartUI();
  }
}

function calculateTotal() {
  return state.cart.reduce((total, item) => {
    const product = state.products.find(p => p.id === item.productId);
    return total + (product ? product.price * item.quantity : 0);
  }, 0);
}

// =========================================
// STORAGE
// =========================================
function saveCartToStorage() {
  localStorage.setItem('mawewe_cart', JSON.stringify(state.cart));
}

function loadCartFromStorage() {
  const saved = localStorage.getItem('mawewe_cart');
  if (saved) {
    try {
      state.cart = JSON.parse(saved);
    } catch (e) {
      state.cart = [];
    }
  }
}

// =========================================
// PAYPAL INTEGRATION
// =========================================
function initPayPal() {
  // Cargar el SDK de PayPal
  if (!document.getElementById('paypal-sdk')) {
    const script = document.createElement('script');
    script.id = 'paypal-sdk';
    script.src = `https://www.paypal.com/sdk/js?client-id=${CONFIG.PAYPAL_CLIENT_ID}&currency=${CONFIG.CURRENCY}&locale=es_ES`;
    script.onload = renderPayPalButton;
    document.head.appendChild(script);
  }
}

function renderPayPalButton() {
  if (typeof paypal === 'undefined') {
    console.error('PayPal SDK not loaded');
    return;
  }
  
  const container = document.getElementById('paypal-button-container');
  if (!container) return;
  
  // Limpiar contenedor
  container.innerHTML = '';
  
  paypal.Buttons({
    style: {
      layout: 'vertical',
      color: 'gold',
      shape: 'pill',
      label: 'checkout'
    },
    
    createOrder: function(data, actions) {
      const items = state.cart.map(item => {
        const product = state.products.find(p => p.id === item.productId);
        return {
          name: product.name,
          description: product.description,
          unit_amount: {
            currency_code: CONFIG.CURRENCY,
            value: product.price.toFixed(2)
          },
          quantity: item.quantity
        };
      });
      
      const subtotal = calculateTotal();
      const total = subtotal + CONFIG.SHIPPING_COST;
      
      return actions.order.create({
        purchase_units: [{
          description: 'Compra en Mawewe - Despierta tu Imaginación',
          amount: {
            currency_code: CONFIG.CURRENCY,
            value: total.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: CONFIG.CURRENCY,
                value: subtotal.toFixed(2)
              },
              shipping: {
                currency_code: CONFIG.CURRENCY,
                value: CONFIG.SHIPPING_COST.toFixed(2)
              }
            }
          },
          items: items
        }],
        application_context: {
          shipping_preference: 'GET_FROM_FILE',
          brand_name: 'Mawewe',
          locale: 'es-EC'
        }
      });
    },
    
    onApprove: async function(data, actions) {
      try {
        const order = await actions.order.capture();
        console.log('Order completed:', order);
        
        // Aquí puedes enviar la orden a tu backend
        await processOrder(order);
        
        showNotification('¡Pago completado exitosamente! 🎉');
        clearCart();
        toggleCart();
        
        // Redirigir a página de confirmación (opcional)
        // window.location.href = '/confirmacion.html?order=' + order.id;
        
      } catch (error) {
        console.error('Error processing payment:', error);
        showNotification('Error al procesar el pago', 'error');
      }
    },
    
    onError: function(err) {
      console.error('PayPal error:', err);
      showNotification('Error al procesar el pago con PayPal', 'error');
    },
    
    onCancel: function(data) {
      showNotification('Pago cancelado', 'error');
    }
    
  }).render('#paypal-button-container');
}

async function processOrder(orderData) {
  // Aquí puedes enviar la orden a tu backend
  const orderDetails = {
    orderId: orderData.id,
    status: orderData.status,
    items: state.cart.map(item => {
      const product = state.products.find(p => p.id === item.productId);
      return {
        productId: item.productId,
        name: product.name,
        price: product.price,
        quantity: item.quantity
      };
    }),
    total: calculateTotal() + CONFIG.SHIPPING_COST,
    customer: orderData.payer,
    timestamp: new Date().toISOString()
  };
  
  console.log('Order to process:', orderDetails);
  
  // Ejemplo de envío a backend:
  /*
  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderDetails)
    });
    
    if (!response.ok) {
      throw new Error('Error saving order');
    }
    
    const result = await response.json();
    console.log('Order saved:', result);
  } catch (error) {
    console.error('Error saving order:', error);
  }
  */
}

// =========================================
// UTILITIES
// =========================================
function getCategoryName(categoryId) {
  const categories = {
    'peluches': 'Peluches',
    'perfumes': 'Perfumes',
    'juguetes': 'Juguetes',
    'legos': 'LEGOs',
    'joyas': 'Joyas',
    'relojes': 'Relojes',
    'accesorios': 'Accesorios'
  };
  return categories[categoryId] || categoryId;
}

function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <span>${type === 'success' ? '✅' : '⚠️'}</span>
    <span>${message}</span>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideInRight 0.4s ease-out reverse';
    setTimeout(() => notification.remove(), 400);
  }, 3000);
}

function showLoading(show) {
  const container = document.getElementById('products-grid');
  if (show) {
    container.innerHTML = `
      <div class="loading" style="grid-column: 1/-1;">
        <div class="spinner"></div>
        <p>Cargando productos...</p>
      </div>
    `;
  }
}

// =========================================
// EVENT LISTENERS
// =========================================
function setupEventListeners() {
  // Search
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => searchProducts(e.target.value));
  }
  
  // Cart overlay
  const overlay = document.getElementById('cart-overlay');
  if (overlay) {
    overlay.addEventListener('click', toggleCart);
  }
  
  // Close cart on ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('cart-modal');
      if (modal.classList.contains('open')) {
        toggleCart();
      }
    }
  });
}

// =========================================
// EXPORT FUNCTIONS TO GLOBAL SCOPE
// =========================================
window.addToCart = addToCart;
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
window.toggleCart = toggleCart;
window.filterByCategory = filterByCategory;
window.searchProducts = searchProducts;