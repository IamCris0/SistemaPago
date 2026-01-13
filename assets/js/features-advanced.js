/**
 * MAWEWE E-COMMERCE V4.0 - ADVANCED FEATURES
 * Sistema de Cupones, Wishlist, Reviews, Recomendaciones y WhatsApp
 */

// ==============================================
// 1. SISTEMA DE CUPONES Y DESCUENTOS
// ==============================================
const coupons = {
  codes: {
    'BIENVENIDO10': { 
      type: 'percent', 
      value: 10, 
      minPurchase: 0,
      description: '10% de descuento en tu primera compra'
    },
    'PRIMERA50': { 
      type: 'percent', 
      value: 15, 
      minPurchase: 50, 
      firstTimeOnly: true,
      description: '15% OFF en compras sobre $50'
    },
    'ENVIOGRATIS': { 
      type: 'shipping', 
      value: 0,
      description: 'Envío gratis sin mínimo'
    },
    'VERANO20': { 
      type: 'percent', 
      value: 20, 
      minPurchase: 100,
      expiresAt: '2025-03-31',
      description: '20% OFF en compras sobre $100'
    },
    'VIP15': {
      type: 'percent',
      value: 15,
      minPurchase: 200,
      description: 'Descuento VIP del 15%'
    }
  },
  
  applied: null,
  
  validate(code) {
    const coupon = this.codes[code.toUpperCase()];
    
    if (!coupon) {
      return { valid: false, error: 'Cupón no válido' };
    }
    
    const totals = cart.calculateTotals();
    
    // Verificar compra mínima
    if (coupon.minPurchase && totals.subtotal < coupon.minPurchase) {
      return { 
        valid: false, 
        error: `Compra mínima: ${utils.formatPrice(coupon.minPurchase)}` 
      };
    }
    
    // Verificar expiración
    if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) {
      return { valid: false, error: 'Cupón expirado' };
    }
    
    // Verificar primera compra
    if (coupon.firstTimeOnly && localStorage.getItem('has_purchased')) {
      return { valid: false, error: 'Solo para primera compra' };
    }
    
    return { valid: true, coupon };
  },
  
  apply(code) {
    const result = this.validate(code);
    
    if (result.valid) {
      this.applied = { code: code.toUpperCase(), ...result.coupon };
      ui.showNotification(`¡Cupón ${code.toUpperCase()} aplicado! 🎉`);
      render.cartSummary();
      return true;
    } else {
      ui.showNotification(result.error, 'error');
      return false;
    }
  },
  
  remove() {
    this.applied = null;
    ui.showNotification('Cupón removido');
    render.cartSummary();
  },
  
  calculateDiscount(subtotal, shipping) {
    if (!this.applied) return { amount: 0, shipping: 0 };
    
    if (this.applied.type === 'percent') {
      return { 
        amount: subtotal * (this.applied.value / 100),
        shipping: 0
      };
    } else if (this.applied.type === 'shipping') {
      return {
        amount: 0,
        shipping: shipping
      };
    }
    
    return { amount: 0, shipping: 0 };
  },
  
  renderInput() {
    return `
      <div class="coupon-section">
        <h4>¿Tienes un cupón?</h4>
        <div class="coupon-input-group">
          <input 
            type="text" 
            id="coupon-code" 
            placeholder="Ej: BIENVENIDO10"
            class="coupon-input"
          />
          <button onclick="coupons.applyFromInput()" class="btn-apply-coupon">
            Aplicar
          </button>
        </div>
        ${this.applied ? `
          <div class="coupon-applied">
            <span>✓ Cupón: ${this.applied.code}</span>
            <button onclick="coupons.remove()">×</button>
          </div>
        ` : ''}
      </div>
    `;
  },
  
  applyFromInput() {
    const input = document.getElementById('coupon-code');
    if (input && input.value.trim()) {
      this.apply(input.value.trim());
      input.value = '';
    }
  }
};

// ==============================================
// 2. SISTEMA DE WISHLIST / FAVORITOS
// ==============================================
const wishlist = {
  items: [],
  
  init() {
    this.load();
  },
  
  toggle(productId) {
    const index = this.items.indexOf(productId);
    
    if (index === -1) {
      this.items.push(productId);
      ui.showNotification('Agregado a favoritos ❤️');
    } else {
      this.items.splice(index, 1);
      ui.showNotification('Eliminado de favoritos');
    }
    
    this.save();
    this.updateUI();
  },
  
  has(productId) {
    return this.items.includes(productId);
  },
  
  save() {
    localStorage.setItem('mawewe_wishlist_v3', JSON.stringify(this.items));
  },
  
  load() {
    const saved = localStorage.getItem('mawewe_wishlist_v3');
    this.items = saved ? JSON.parse(saved) : [];
  },
  
  updateUI() {
    // Actualizar badges de corazones
    this.items.forEach(id => {
      const btn = document.querySelector(`[data-wishlist-id="${id}"]`);
      if (btn) btn.classList.add('active');
    });
    
    // Actualizar contador
    const badge = document.getElementById('wishlist-count');
    if (badge) {
      badge.textContent = this.items.length;
      badge.style.display = this.items.length > 0 ? 'flex' : 'none';
    }
  },
  
  getProducts() {
    return this.items.map(id => state.products.find(p => p.id === id)).filter(Boolean);
  },
  
  showModal() {
    const products = this.getProducts();
    
    const modal = document.createElement('div');
    modal.className = 'wishlist-modal-overlay';
    modal.innerHTML = `
      <div class="wishlist-modal">
        <div class="wishlist-header">
          <h2>Mis Favoritos ❤️</h2>
          <button onclick="this.closest('.wishlist-modal-overlay').remove()">&times;</button>
        </div>
        <div class="wishlist-content">
          ${products.length === 0 ? `
            <div class="empty-wishlist">
              <p>No tienes productos favoritos aún</p>
            </div>
          ` : products.map(product => `
            <div class="wishlist-item">
              <img src="${product.image}" alt="${product.name}" />
              <div class="wishlist-item-info">
                <h4>${product.name}</h4>
                <p class="price">${utils.formatPrice(product.price)}</p>
                <div class="wishlist-actions">
                  <button 
                    onclick="cart.addItem(${product.id}); ui.showNotification('Agregado al carrito')"
                    class="btn-add-cart-small"
                  >
                    Agregar al carrito
                  </button>
                  <button 
                    onclick="wishlist.toggle(${product.id}); this.closest('.wishlist-modal-overlay').remove()"
                    class="btn-remove-small"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }
};

// ==============================================
// 3. SISTEMA DE REVIEWS Y RATINGS
// ==============================================
const reviews = {
  items: {},
  
  init() {
    this.load();
  },
  
  add(productId, review) {
    if (!this.items[productId]) {
      this.items[productId] = [];
    }
    
    this.items[productId].push({
      id: Date.now(),
      name: review.name,
      rating: review.rating,
      comment: review.comment,
      date: new Date().toISOString(),
      verified: false // Cambiar a true si compró el producto
    });
    
    this.save();
    this.updateProductRating(productId);
    
    ui.showNotification('¡Gracias por tu reseña! ⭐');
  },
  
  getForProduct(productId) {
    return this.items[productId] || [];
  },
  
  getAverageRating(productId) {
    const productReviews = this.getForProduct(productId);
    if (productReviews.length === 0) return 0;
    
    const sum = productReviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / productReviews.length).toFixed(1);
  },
  
  updateProductRating(productId) {
    const product = state.products.find(p => p.id === productId);
    if (product) {
      const productReviews = this.getForProduct(productId);
      product.rating = parseFloat(this.getAverageRating(productId));
      product.reviewCount = productReviews.length;
    }
  },
  
  save() {
    localStorage.setItem('mawewe_reviews_v3', JSON.stringify(this.items));
  },
  
  load() {
    const saved = localStorage.getItem('mawewe_reviews_v3');
    this.items = saved ? JSON.parse(saved) : {};
  },
  
  renderForm(productId) {
    return `
      <div class="review-form">
        <h4>Escribe una reseña</h4>
        <form onsubmit="reviews.submitReview(event, ${productId})">
          <div class="form-group">
            <label>Tu nombre:</label>
            <input type="text" name="name" required maxlength="50" />
          </div>
          
          <div class="form-group">
            <label>Calificación:</label>
            <div class="star-rating">
              ${[5,4,3,2,1].map(n => `
                <input type="radio" name="rating" value="${n}" id="star-${n}-${productId}" required />
                <label for="star-${n}-${productId}">★</label>
              `).join('')}
            </div>
          </div>
          
          <div class="form-group">
            <label>Tu comentario:</label>
            <textarea name="comment" required maxlength="500" rows="4"></textarea>
          </div>
          
          <button type="submit" class="btn-submit-review">Publicar Reseña</button>
        </form>
      </div>
    `;
  },
  
  submitReview(e, productId) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    this.add(productId, {
      name: formData.get('name'),
      rating: parseInt(formData.get('rating')),
      comment: formData.get('comment')
    });
    
    e.target.reset();
    
    // Re-renderizar lista de reviews
    const reviewsList = document.getElementById(`reviews-list-${productId}`);
    if (reviewsList) {
      reviewsList.innerHTML = this.renderList(productId);
    }
  },
  
  renderList(productId) {
    const productReviews = this.getForProduct(productId);
    
    if (productReviews.length === 0) {
      return '<p class="no-reviews">Aún no hay reseñas. ¡Sé el primero!</p>';
    }
    
    return productReviews.map(review => `
      <div class="review-item">
        <div class="review-header">
          <div class="review-author">
            <strong>${review.name}</strong>
            ${review.verified ? '<span class="badge-verified">✓ Compra verificada</span>' : ''}
          </div>
          <div class="review-rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
        </div>
        <p class="review-comment">${review.comment}</p>
        <span class="review-date">${new Date(review.date).toLocaleDateString('es-EC')}</span>
      </div>
    `).join('');
  }
};

// ==============================================
// 4. SISTEMA DE RECOMENDACIONES
// ==============================================
const recommendations = {
  // Productos que se compran juntos frecuentemente
  frequentlyBought: {
    1: [2, 5],     // Peluche Barcelona → Madrid, Panda
    2: [1, 3],     // Peluche Madrid → Barcelona, Unicornio
    6: [7, 10],    // Perfume Mujer → otros perfumes
    7: [6, 9],     // Perfume Hombre → otros perfumes
    11: [12, 13],  // LEGO → otros juguetes
    20: [21, 23]   // Reloj Rolex → otros relojes
  },
  
  getSimilarProducts(productId, limit = 4) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return [];
    
    return state.products
      .filter(p => 
        p.category === product.category && 
        p.id !== productId &&
        p.stock > 0
      )
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);
  },
  
  getFrequentlyBought(productId, limit = 3) {
    const ids = this.frequentlyBought[productId] || [];
    return ids
      .map(id => state.products.find(p => p.id === id))
      .filter(p => p && p.stock > 0)
      .slice(0, limit);
  },
  
  getTrending(limit = 6) {
    return state.products
      .filter(p => p.stock > 0)
      .sort((a, b) => {
        // Priorizar: featured, rating alto, stock alto
        if (a.featured !== b.featured) return b.featured - a.featured;
        if (a.rating !== b.rating) return b.rating - a.rating;
        return b.stock - a.stock;
      })
      .slice(0, limit);
  },
  
  renderSection(productId, type = 'similar') {
    let products = [];
    let title = '';
    
    switch(type) {
      case 'similar':
        products = this.getSimilarProducts(productId);
        title = 'Productos Similares';
        break;
      case 'frequently':
        products = this.getFrequentlyBought(productId);
        title = 'Comprados Juntos Frecuentemente';
        break;
      case 'trending':
        products = this.getTrending();
        title = 'Tendencias Actuales';
        break;
    }
    
    if (products.length === 0) return '';
    
    return `
      <div class="recommendations-section">
        <h3>${title}</h3>
        <div class="recommendations-grid">
          ${products.map(p => `
            <div class="recommendation-card">
              <img src="${p.image}" alt="${p.name}" onclick="productDetails.show(${p.id})" />
              <h4>${p.name}</h4>
              <div class="rec-price">${utils.formatPrice(p.price)}</div>
              <button onclick="cart.addItem(${p.id})" class="btn-add-small">
                Agregar
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
};

// ==============================================
// 5. WHATSAPP FLOATING BUTTON
// ==============================================
const whatsapp = {
  phone: '593981832313',
  
  init() {
    this.render();
  },
  
  getDefaultMessage() {
    const cartItems = cart.getItemCount();
    if (cartItems > 0) {
      return `Hola! Tengo ${cartItems} producto(s) en mi carrito y necesito ayuda.`;
    }
    return 'Hola! Tengo una consulta sobre los productos.';
  },
  
  open(customMessage) {
    const message = customMessage || this.getDefaultMessage();
    const url = `https://wa.me/${this.phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  },
  
  render() {
    const button = document.createElement('div');
    button.className = 'whatsapp-float';
    button.innerHTML = `
      <button onclick="whatsapp.open()" aria-label="Chatear por WhatsApp">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
        <span>¿Necesitas ayuda?</span>
      </button>
    `;
    
    document.body.appendChild(button);
  }
};

// ==============================================
// INITIALIZATION
// ==============================================
document.addEventListener('DOMContentLoaded', () => {
  wishlist.init();
  reviews.init();
  whatsapp.init();
  
  console.log('✅ Advanced features loaded');
});

// Exportar para uso global
window.advancedFeatures = {
  coupons,
  wishlist,
  reviews,
  recommendations,
  whatsapp
};
