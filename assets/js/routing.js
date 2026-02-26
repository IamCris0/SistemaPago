/**
 * MAWEWE - URL Routing System
 * ✅ FIX: URLs para compartir apuntan a share.php (meta tags OG dinámicos)
 * ✅ FIX: La tienda sigue usando ?product=ID para abrir el modal
 */

const routing = {

  // ─── URL base de la tienda ───────────────────────────────────────────────
  SITE_URL: 'https://tienda.mawewe.com.ec',

  // ─── Obtener parámetros de la URL actual ─────────────────────────────────
  getURLParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      category:    params.get('category'),
      subcategory: params.get('subcategory'),
      product:     params.get('product'),
      search:      params.get('search'),
    };
  },

  // ─── Actualizar URL sin recargar (para navegación interna) ───────────────
  updateURL(params = {}) {
    const url = new URL(window.location.href);
    url.searchParams.delete('category');
    url.searchParams.delete('subcategory');
    url.searchParams.delete('product');
    url.searchParams.delete('search');

    if (params.category   && params.category !== 'all') url.searchParams.set('category',    params.category);
    if (params.subcategory)                              url.searchParams.set('subcategory', params.subcategory);
    if (params.product)                                  url.searchParams.set('product',     params.product);
    if (params.search)                                   url.searchParams.set('search',      params.search);

    window.history.pushState({}, '', url.toString());
    this.updateMetaTags(params);
    console.log('🔗 URL actualizada:', url.toString());
  },

  // ─── URL para COMPARTIR en redes (pasa por share.php para OG tags) ───────
  getShareURL(type, id) {
    if (type === 'product') {
      return `${this.SITE_URL}/share.php?product=${id}`;
    }
    if (type === 'category') {
      return `${this.SITE_URL}/share.php?category=${encodeURIComponent(id)}`;
    }
    return this.SITE_URL;
  },

  // ─── URL de la tienda (para navegación normal, no para redes) ────────────
  getProductURL(productId) {
    return `${this.SITE_URL}/?product=${productId}`;
  },

  getCategoryURL(categoryId, subcategoryId = null) {
    const url = new URL(this.SITE_URL);
    if (categoryId !== 'all') url.searchParams.set('category', categoryId);
    if (subcategoryId)        url.searchParams.set('subcategory', subcategoryId);
    return url.toString();
  },

  // ─── Actualizar meta tags en el <head> ───────────────────────────────────
  updateMetaTags(params) {
    const baseTitle       = 'Mawewe | Tienda Online Premium';
    const baseDescription = 'Descubre productos premium en Ecuador';
    const baseImage       = `${this.SITE_URL}/assets/img/logo.jpg`;

    let title       = baseTitle;
    let description = baseDescription;
    let image       = baseImage;
    let shareURL    = this.SITE_URL;

    if (params.product && state.products) {
      const product = state.products.find(p => p.id === parseInt(params.product));
      if (product) {
        // Obtener primera imagen del array si existe
        let firstImage = product.image;
        if (product.images && Array.isArray(product.images) && product.images.length > 0) {
          firstImage = product.images[0];
        }
        if (!firstImage.startsWith('http')) {
          firstImage = `${this.SITE_URL}/${firstImage.replace(/^\//, '')}`;
        }

        title       = `${product.name} - $${Number(product.price).toFixed(2)} | Mawewe`;
        description = product.description
          ? product.description.substring(0, 160) + '...'
          : `Compra ${product.name} en Mawewe Ecuador`;
        image       = firstImage;
        shareURL    = this.getShareURL('product', product.id);
      }
    } else if (params.category && state.categories) {
      const category = state.categories.find(c => c.id === params.category);
      if (category) {
        title       = `${category.name} - ${baseTitle}`;
        description = `Descubre nuestra colección de ${category.name.toLowerCase()}`;
        shareURL    = this.getShareURL('category', params.category);
      }
    }

    document.title = title;
    this.setMetaTag('og:title',       title);
    this.setMetaTag('og:description', description);
    this.setMetaTag('og:image',       image);
    this.setMetaTag('og:url',         shareURL);
    this.setMetaTag('twitter:title',       title);
    this.setMetaTag('twitter:description', description);
    this.setMetaTag('twitter:image',       image);
  },

  setMetaTag(property, content) {
    let tag = document.querySelector(`meta[property="${property}"]`)
           || document.querySelector(`meta[name="${property}"]`);
    if (tag) {
      tag.setAttribute('content', content);
    } else {
      tag = document.createElement('meta');
      tag.setAttribute('property', property);
      tag.setAttribute('content', content);
      document.head.appendChild(tag);
    }
  },

  // ─── Copiar enlace de SHARE al portapapeles ───────────────────────────────
  async copyToClipboard(url) {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    if (window.mawewe && window.mawewe.ui)
      window.mawewe.ui.showNotification('✓ Enlace copiado al portapapeles');
  },

  // ─── Compartir en redes (usa share.php) ──────────────────────────────────
  shareOn(platform, shareUrl, title = '', description = '') {
    // shareUrl ya debe ser la URL de share.php
    const encodedURL   = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(title);
    const encodedDesc  = encodeURIComponent(description);

    const shareURLs = {
      facebook:  `https://www.facebook.com/sharer/sharer.php?u=${encodedURL}`,
      twitter:   `https://twitter.com/intent/tweet?url=${encodedURL}&text=${encodedTitle}`,
      whatsapp:  `https://wa.me/?text=${encodedTitle}%20${encodedURL}`,
      telegram:  `https://t.me/share/url?url=${encodedURL}&text=${encodedTitle}`,
      pinterest: `https://pinterest.com/pin/create/button/?url=${encodedURL}&description=${encodedTitle}`,
      linkedin:  `https://www.linkedin.com/sharing/share-offsite/?url=${encodedURL}`,
    };

    if (shareURLs[platform]) {
      window.open(shareURLs[platform], '_blank', 'width=600,height=400');
    }
  },

  async shareNative(shareUrl, title, text) {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
      } catch (err) {
        this.copyToClipboard(shareUrl);
      }
    } else {
      this.copyToClipboard(shareUrl);
    }
  },

  // ─── Procesar URL inicial al cargar la página ─────────────────────────────
  handleInitialURL() {
    const params = this.getURLParams();
    console.log('📍 Parámetros URL iniciales:', params);

    // PRIORIDAD 1: Producto específico
    if (params.product) {
      const productId = parseInt(params.product);
      const checkProducts = setInterval(() => {
        if (state.products && state.products.length > 0) {
          clearInterval(checkProducts);
          const product = state.products.find(p => p.id === productId);
          if (product) {
            setTimeout(() => { if (window.productModal) window.productModal.show(productId); }, 400);
          } else {
            if (window.mawewe && window.mawewe.ui)
              window.mawewe.ui.showNotification('Producto no encontrado', 'error');
          }
        }
      }, 100);
      setTimeout(() => clearInterval(checkProducts), 5000);
      return;
    }

    // PRIORIDAD 2: Búsqueda
    if (params.search) {
      const searchInput = document.getElementById('search-input');
      if (searchInput) {
        searchInput.value = params.search;
        state.searchQuery = params.search;
        state.currentFilter = 'all';
        state.currentSubcategory = null;
        if (window.mawewe && window.mawewe.filters)
          window.mawewe.filters.setSearch(params.search);
      }
      return;
    }

    // PRIORIDAD 3: Categoría
    if (params.category) {
      const checkCategories = setInterval(() => {
        if (state.categories && state.categories.length > 0) {
          clearInterval(checkCategories);
          state.currentFilter = params.category;
          if (params.subcategory) state.currentSubcategory = params.subcategory;
          if (window.mawewe && window.mawewe.filters) window.mawewe.filters.apply();
          setTimeout(() => {
            document.querySelectorAll('.filter-button').forEach(btn => {
              btn.classList.remove('active');
              if (btn.textContent.toLowerCase().includes(params.category.toLowerCase()) ||
                  (btn.textContent.toLowerCase().includes('todos') && params.category === 'all'))
                btn.classList.add('active');
            });
            if (window.render) window.render.subcategories();
          }, 500);
        }
      }, 100);
      setTimeout(() => clearInterval(checkCategories), 5000);
    }
  },
};

// =============================================================================
// ACTUALIZAR productModal.show PARA USAR share.php EN LOS BOTONES DE COMPARTIR
// =============================================================================

// Sobreescribir el método show del productModal para inyectar la URL de share.php
const _originalProductModalShow = window.productModal
  ? window.productModal.show.bind(window.productModal)
  : null;

// Reemplazar productModal.show con versión que usa share.php
if (window.productModal) {
  window.productModal.show = function(productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;

    this.currentProduct = product;
    this.currentImageIndex = 0;

    const images = (product.images && Array.isArray(product.images) && product.images.length > 0)
      ? product.images.slice(0, 3)
      : [product.image, product.image, product.image];

    // ✅ URL de share.php para redes sociales (con OG tags dinámicos)
    const shareURL  = routing.getShareURL('product', productId);
    const storeURL  = routing.getProductURL(productId);  // URL directa a la tienda
    const shareTitle = product.name + ' - Mawewe';
    const shareText  = `${product.name} - $${Number(product.price).toFixed(2)} | Mawewe Ecuador`;

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
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              <button class="modal-carousel-btn next" onclick="productModal.nextImage()">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </div>
            <div class="modal-thumbnails">
              ${images.map((img, index) => `
                <img src="${img}" alt="${product.name} - imagen ${index + 1}"
                  class="thumbnail ${index === 0 ? 'active' : ''}"
                  onclick="productModal.selectImage(${index})">`
              ).join('')}
            </div>
          </div>

          <div class="modal-info">
            <div class="product-category">${product.category ? product.category.toUpperCase() : ''}</div>
            ${product.subcategory ? `<div class="product-subcategory">${product.subcategory.toUpperCase()}</div>` : ''}
            <h2 class="modal-title">${product.name}</h2>
            <div class="modal-price">$${Number(product.price).toFixed(2)}</div>
            <p class="modal-description">${product.description}</p>

            <!-- COMPARTIR: usa share.php para que redes sociales vean imagen y título -->
            <div class="share-section" style="margin: var(--spacing-lg) 0; padding: var(--spacing-md); background: var(--gray-50); border-radius: var(--radius-lg); border: 1px solid var(--gray-200);">
              <p style="font-size: var(--font-size-sm); font-weight: 600; margin-bottom: var(--spacing-sm); color: var(--gray-700);">
                📤 Compartir este producto:
              </p>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--spacing-sm);">

                <button
                  onclick="routing.copyToClipboard('${shareURL}')"
                  style="padding: var(--spacing-sm); background: var(--gray-200); border: none; border-radius: var(--radius-md); cursor: pointer; font-size: var(--font-size-xs); font-weight: 600; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 4px;"
                >
                  🔗 Copiar
                </button>

                <button
                  onclick="routing.shareOn('whatsapp', '${shareURL}', '${encodeURIComponent(shareTitle)}', '${encodeURIComponent(shareText)}')"
                  style="padding: var(--spacing-sm); background: #25D366; color: white; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: var(--font-size-xs); font-weight: 600;"
                >
                  📱 WhatsApp
                </button>

                <button
                  onclick="routing.shareOn('facebook', '${shareURL}', '${encodeURIComponent(shareTitle)}')"
                  style="padding: var(--spacing-sm); background: #1877F2; color: white; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: var(--font-size-xs); font-weight: 600;"
                >
                  📘 Facebook
                </button>

                <button
                  onclick="routing.shareOn('twitter', '${shareURL}', '${encodeURIComponent(shareTitle)}')"
                  style="padding: var(--spacing-sm); background: #1DA1F2; color: white; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: var(--font-size-xs); font-weight: 600;"
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
                <li><strong>Enlace directo:</strong>
                  <a href="${storeURL}" style="color: var(--primary-800); text-decoration: none; word-break: break-all; font-size: 0.8rem;">${storeURL}</a>
                </li>
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
      if (e.target === modal) this.close();
    });

    // Actualizar URL de la tienda (no share.php) para que el botón atrás funcione
    routing.updateURL({ product: productId });
    // Actualizar meta tags con imagen del producto
    routing.updateMetaTags({ product: productId });
  };

  // Sobreescribir close
  window.productModal.close = function() {
    const modal = document.getElementById('product-detail-modal');
    if (modal) { modal.remove(); document.body.style.overflow = ''; }
    this.currentProduct = null;
    this.currentImageIndex = 0;
    routing.updateURL({
      category: state.currentFilter !== 'all' ? state.currentFilter : null,
      subcategory: state.currentSubcategory,
    });
  };
}

// =============================================================================
// INTEGRACIÓN CON FILTROS
// =============================================================================

if (window.filters) {
  const _origSetCategory = window.filters.setCategory;
  window.filters.setCategory = function(category) {
    _origSetCategory.call(this, category);
    routing.updateURL({ category, subcategory: state.currentSubcategory });
  };

  const _origSetSubcategory = window.filters.setSubcategory;
  window.filters.setSubcategory = function(subcategory) {
    _origSetSubcategory.call(this, subcategory);
    routing.updateURL({ category: state.currentFilter, subcategory: state.currentSubcategory });
  };

  const _origSetSearch = window.filters.setSearch;
  window.filters.setSearch = function(query) {
    _origSetSearch.call(this, query);
    routing.updateURL(query.trim() ? { search: query } : {});
  };
}

// =============================================================================
// BOTÓN ATRÁS / ADELANTE
// =============================================================================
window.addEventListener('popstate', () => {
  routing.handleInitialURL();
});

// =============================================================================
// INICIALIZACIÓN
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => routing.handleInitialURL(), 100);
  console.log('✅ URL Routing con share.php cargado');
});

window.routing      = routing;
window.shareButtons = {}; // compatibilidad

if (window.mawewe) window.mawewe.routing = routing;