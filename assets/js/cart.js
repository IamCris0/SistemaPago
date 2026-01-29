/**
 * SISTEMA DE CARRITO UNIFICADO Y CORREGIDO
 * Soluciona: "carrito vacío" y "carrito no disponible"
 * 
 * INSTRUCCIONES DE INSTALACIÓN:
 * 1. Reemplaza el contenido de assets/js/cart.js con este archivo
 * 2. Asegúrate de que index.html cargue SOLO cart.js (no app.js para el carrito)
 * 3. Limpia localStorage del navegador antes de probar
 */

// =============================================================================
// CONFIGURACIÓN GLOBAL
// =============================================================================

const CART_CONFIG = {
  storageKey: 'mawewe_cart_v4',
  shippingCost: 5.00,
  freeShippingThreshold: 50.00,
  expressCost: 10.00
};

// =============================================================================
// INICIALIZAR ESTADO GLOBAL
// =============================================================================

if (!window.state) {
  window.state = {
    cart: [],
    shippingMethod: 'standard'
  };
}

// =============================================================================
// SISTEMA DE CARRITO
// =============================================================================

const cart = {
  
  // ========================================
  // INICIALIZAR CARRITO
  // ========================================
  init() {
    console.log('🛒 Inicializando carrito...');
    
    try {
      // Cargar desde localStorage
      const savedCart = localStorage.getItem(CART_CONFIG.storageKey);
      
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        
        if (Array.isArray(parsed) && parsed.length > 0) {
          window.state.cart = parsed;
          console.log('✅ Carrito cargado:', window.state.cart.length, 'items');
        } else {
          window.state.cart = [];
          console.log('📦 Carrito vacío inicializado');
        }
      } else {
        window.state.cart = [];
        this.save();
        console.log('📦 Nuevo carrito creado');
      }
      
    } catch (error) {
      console.error('❌ Error al cargar carrito:', error);
      window.state.cart = [];
      this.save();
    }
    
    // Actualizar UI
    this.updateCartCount();
    this.render();
  },
  
  // ========================================
  // GUARDAR EN LOCALSTORAGE
  // ========================================
  save() {
    try {
      localStorage.setItem(CART_CONFIG.storageKey, JSON.stringify(window.state.cart));
      console.log('💾 Carrito guardado:', window.state.cart.length, 'items');
    } catch (error) {
      console.error('❌ Error al guardar carrito:', error);
    }
  },
  
  // ========================================
  // AGREGAR PRODUCTO
  // ========================================
  addItem(productId) {
    console.log('➕ Agregando producto ID:', productId);
    
    // Buscar producto en los datos disponibles
    let product = null;
    
    // Intentar obtener del estado global si existe
    if (window.state && window.state.products) {
      product = window.state.products.find(p => p.id === productId);
    }
    
    // Si no está en state, crear objeto básico (para compatibilidad)
    if (!product) {
      // Intentar obtener datos del DOM
      const productCard = document.querySelector(`[data-product-id="${productId}"]`);
      if (productCard) {
        const name = productCard.querySelector('.product-title')?.textContent || 'Producto';
        const priceText = productCard.querySelector('.product-price')?.textContent || '$0';
        const price = parseFloat(priceText.replace('$', '').replace(',', ''));
        const image = productCard.querySelector('.product-image')?.src || '';
        
        product = {
          id: productId,
          name: name,
          price: price,
          image: image,
          sku: `PRD-${productId}`,
          stock: 99
        };
      } else {
        console.error('❌ Producto no encontrado:', productId);
        this.showNotification('Error: Producto no encontrado', 'error');
        return false;
      }
    }
    
    // Validar stock
    if (product.stock < 1) {
      this.showNotification('Producto sin stock disponible', 'error');
      return false;
    }
    
    // Buscar si ya existe en el carrito
    const existingItem = window.state.cart.find(item => item.productId === productId);
    
    if (existingItem) {
      // Verificar stock antes de incrementar
      if (existingItem.quantity >= product.stock) {
        this.showNotification('Stock máximo alcanzado', 'error');
        return false;
      }
      
      // Incrementar cantidad
      existingItem.quantity++;
      console.log('✅ Cantidad incrementada a:', existingItem.quantity);
    } else {
      // Agregar nuevo item
      window.state.cart.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        sku: product.sku,
        quantity: 1,
        stock: product.stock
      });
      console.log('✅ Nuevo producto agregado al carrito');
    }
    
    // Guardar y actualizar UI
    this.save();
    this.updateCartCount();
    this.render();
    this.showNotification(`${product.name} agregado al carrito ✓`);
    
    return true;
  },
  
  // ========================================
  // ACTUALIZAR CANTIDAD
  // ========================================
  updateQuantity(productId, change) {
    console.log('🔄 Actualizando cantidad - Producto:', productId, 'Cambio:', change);
    
    const item = window.state.cart.find(i => i.productId === productId);
    
    if (!item) {
      console.error('❌ Item no encontrado en carrito');
      return;
    }
    
    const newQuantity = item.quantity + change;
    
    // Si la cantidad es menor a 1, eliminar
    if (newQuantity < 1) {
      this.removeItem(productId);
      return;
    }
    
    // Verificar stock
    if (newQuantity > item.stock) {
      this.showNotification('Stock máximo alcanzado', 'error');
      return;
    }
    
    // Actualizar cantidad
    item.quantity = newQuantity;
    console.log('✅ Nueva cantidad:', newQuantity);
    
    // Guardar y actualizar
    this.save();
    this.render();
    this.updateCartCount();
  },
  
  // ========================================
  // ELIMINAR PRODUCTO
  // ========================================
  removeItem(productId) {
    console.log('➖ Eliminando producto:', productId);
    
    const index = window.state.cart.findIndex(item => item.productId === productId);
    
    if (index === -1) {
      console.error('❌ Producto no encontrado para eliminar');
      return;
    }
    
    const removedItem = window.state.cart.splice(index, 1)[0];
    console.log('✅ Producto eliminado:', removedItem.name);
    
    // Guardar y actualizar
    this.save();
    this.render();
    this.updateCartCount();
    this.showNotification('Producto eliminado del carrito');
  },
  
  // ========================================
  // VACIAR CARRITO
  // ========================================
  clear() {
    console.log('🗑️ Vaciando carrito...');
    window.state.cart = [];
    this.save();
    this.render();
    this.updateCartCount();
    this.showNotification('Carrito vaciado');
  },
  
  // ========================================
  // CALCULAR TOTALES
  // ========================================
  calculateTotals() {
    const subtotal = window.state.cart.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);
    
    let shipping = 0;
    if (subtotal > 0) {
      if (window.state.shippingMethod === 'express') {
        shipping = CART_CONFIG.expressCost;
      } else if (subtotal < CART_CONFIG.freeShippingThreshold) {
        shipping = CART_CONFIG.shippingCost;
      }
    }
    
    const total = subtotal + shipping;
    const itemCount = window.state.cart.reduce((sum, item) => sum + item.quantity, 0);
    
    return {
      subtotal: subtotal.toFixed(2),
      shipping: shipping.toFixed(2),
      total: total.toFixed(2),
      itemCount: itemCount
    };
  },
  
  // ========================================
  // RENDERIZAR CARRITO
  // ========================================
  render() {
    console.log('🎨 Renderizando carrito...');
    
    const cartItemsContainer = document.getElementById('cart-items');
    
    if (!cartItemsContainer) {
      console.warn('⚠️ Contenedor cart-items no encontrado');
      return;
    }
    
    // Verificar si está vacío
    if (!window.state.cart || window.state.cart.length === 0) {
      cartItemsContainer.innerHTML = `
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
      
      // Ocultar resumen y botón de checkout
      const cartSummary = document.getElementById('cart-summary');
      const checkoutBtn = document.querySelector('.checkout-btn');
      
      if (cartSummary) cartSummary.style.display = 'none';
      if (checkoutBtn) checkoutBtn.style.display = 'none';
      
      console.log('📦 Carrito vacío renderizado');
      return;
    }
    
    // Renderizar items
    cartItemsContainer.innerHTML = window.state.cart.map(item => `
      <div class="cart-item">
        <img 
          src="${item.image || 'https://via.placeholder.com/90x90?text=Sin+Imagen'}" 
          alt="${item.name}" 
          class="cart-item-image"
          onerror="this.src='https://via.placeholder.com/90x90?text=Sin+Imagen'"
        >
        <div class="cart-item-info">
          <h4 class="cart-item-title">${item.name}</h4>
          <div class="cart-item-price">$${parseFloat(item.price).toFixed(2)}</div>
          <div class="cart-item-controls">
            <button class="btn-quantity" onclick="cart.updateQuantity(${item.productId}, -1)" aria-label="Disminuir cantidad">
              -
            </button>
            <span class="quantity-display">${item.quantity}</span>
            <button class="btn-quantity" onclick="cart.updateQuantity(${item.productId}, 1)" aria-label="Aumentar cantidad">
              +
            </button>
            <button class="btn-remove" onclick="cart.removeItem(${item.productId})" aria-label="Eliminar producto">
              Eliminar
            </button>
          </div>
        </div>
      </div>
    `).join('');
    
    // Renderizar resumen
    this.renderSummary();
    
    console.log('✅ Carrito renderizado:', window.state.cart.length, 'items');
  },
  
  // ========================================
  // RENDERIZAR RESUMEN
  // ========================================
  renderSummary() {
    const cartSummary = document.getElementById('cart-summary');
    const checkoutBtn = document.querySelector('.checkout-btn');
    
    if (!cartSummary) {
      console.warn('⚠️ Contenedor cart-summary no encontrado');
      return;
    }
    
    const { subtotal, shipping, total } = this.calculateTotals();
    
    // Mostrar resumen y botón
    cartSummary.style.display = 'block';
    if (checkoutBtn) checkoutBtn.style.display = 'block';
    
    cartSummary.innerHTML = `
      <div class="summary-row">
        <span>Subtotal:</span>
        <span class="amount">$${subtotal}</span>
      </div>
      <div class="summary-row">
        <span>Envío:</span>
        <span class="amount ${parseFloat(shipping) === 0 ? 'free-shipping' : ''}">
          ${parseFloat(shipping) === 0 ? 'GRATIS' : '$' + shipping}
        </span>
      </div>
      <div class="summary-row total">
        <span>Total:</span>
        <span class="amount">$${total}</span>
      </div>
      ${parseFloat(subtotal) > 0 && parseFloat(subtotal) < CART_CONFIG.freeShippingThreshold ? `
        <p class="summary-note">
          Compra $${(CART_CONFIG.freeShippingThreshold - parseFloat(subtotal)).toFixed(2)} más para envío gratis
        </p>
      ` : ''}
    `;
  },
  
  // ========================================
  // ACTUALIZAR CONTADOR
  // ========================================
  updateCartCount() {
    const { itemCount } = this.calculateTotals();
    const badges = document.querySelectorAll('.cart-badge, #cart-count, .cart-count');
    
    badges.forEach(badge => {
      badge.textContent = itemCount;
      badge.style.display = itemCount > 0 ? 'flex' : 'none';
    });
    
    console.log('🔢 Contador actualizado:', itemCount);
  },
  
  // ========================================
  // MOSTRAR NOTIFICACIÓN
  // ========================================
  showNotification(message, type = 'success') {
    // Eliminar notificación existente
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    // Crear notificación
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 6L9 17l-5-5"/>
      </svg>
      <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Mostrar
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Ocultar y eliminar
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
};

// =============================================================================
// EXPORTAR AL OBJETO WINDOW
// =============================================================================

window.cart = cart;

// =============================================================================
// AUTO-INICIALIZACIÓN
// =============================================================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    cart.init();
    console.log('✅ Sistema de carrito inicializado');
  });
} else {
  cart.init();
  console.log('✅ Sistema de carrito inicializado');
}

// =============================================================================
// ESTILOS DE NOTIFICACIÓN
// =============================================================================

if (!document.getElementById('cart-notification-styles')) {
  const style = document.createElement('style');
  style.id = 'cart-notification-styles';
  style.textContent = `
    .notification {
      position: fixed;
      top: -100px;
      left: 50%;
      transform: translateX(-50%);
      background: #4CAF50;
      color: white;
      padding: 15px 30px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      gap: 10px;
      z-index: 10000;
      transition: top 0.3s ease;
      font-size: 16px;
      font-weight: 500;
    }
    
    .notification.show {
      top: 20px;
    }
    
    .notification.error {
      background: #f44336;
    }
    
    .notification svg {
      flex-shrink: 0;
    }
  `;
  document.head.appendChild(style);
}

console.log('✅ cart-fixed.js cargado correctamente');