const routing = {
  
  // ========================================
  // Obtener parámetros de la URL
  // ========================================
  getURLParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      category: params.get('category'),
      subcategory: params.get('subcategory'),
      product: params.get('product'),
      search: params.get('search')
    };
  },
  
  updateURL(params = {}) {
    const url = new URL(window.location.href);
    
    // Limpiar parámetros previos
    url.searchParams.delete('category');
    url.searchParams.delete('subcategory');
    url.searchParams.delete('product');
    url.searchParams.delete('search');
    
    // Agregar nuevos parámetros
    if (params.category && params.category !== 'all') {
      url.searchParams.set('category', params.category);
    }
    
    if (params.subcategory) {
      url.searchParams.set('subcategory', params.subcategory);
    }
    
    if (params.product) {
      url.searchParams.set('product', params.product);
    }
    
    if (params.search) {
      url.searchParams.set('search', params.search);
    }
    
    // Actualizar URL sin recargar
    window.history.pushState({}, '', url.toString());
    
    // Actualizar meta tags para compartir
    this.updateMetaTags(params);
    
    console.log('🔗 URL actualizada:', url.toString());
  },
  
  // ========================================
  // Actualizar meta tags para redes sociales
  // ========================================
  updateMetaTags(params) {
    const baseTitle = 'Mawewe | Tienda Online Premium';
    const baseDescription = 'Descubre productos premium en Ecuador';
    const baseImage = 'https://mawewe.com.ec/assets/images/og-image.jpg';
    
    let title = baseTitle;
    let description = baseDescription;
    let image = baseImage;
    
    // Si es un producto específico
    if (params.product && state.products) {
      const product = state.products.find(p => p.id === parseInt(params.product));
      if (product) {
        title = `${product.name} - ${baseTitle}`;
        description = product.description || baseDescription;
        image = product.image || baseImage;
      }
    }
    
    // Si es una categoría
    else if (params.category && state.categories) {
      const category = state.categories.find(c => c.id === params.category);
      if (category) {
        title = `${category.name} - ${baseTitle}`;
        description = `Descubre nuestra colección de ${category.name.toLowerCase()}`;
      }
    }
    
    // Actualizar título
    document.title = title;
    
    // Actualizar meta tags
    this.setMetaTag('og:title', title);
    this.setMetaTag('og:description', description);
    this.setMetaTag('og:image', image);
    this.setMetaTag('twitter:title', title);
    this.setMetaTag('twitter:description', description);
    this.setMetaTag('twitter:image', image);
  },
  
  // ========================================
  // Helper para actualizar meta tags
  // ========================================
  setMetaTag(property, content) {
    let tag = document.querySelector(`meta[property="${property}"]`);
    if (!tag) {
      tag = document.querySelector(`meta[name="${property}"]`);
    }
    
    if (tag) {
      tag.setAttribute('content', content);
    } else {
      // Crear si no existe
      tag = document.createElement('meta');
      tag.setAttribute('property', property);
      tag.setAttribute('content', content);
      document.head.appendChild(tag);
    }
  },
  
  // ========================================
  // Obtener URL compartible de categoría
  // ========================================
  getCategoryURL(categoryId, subcategoryId = null) {
    const url = new URL(window.location.origin);
    
    if (categoryId !== 'all') {
      url.searchParams.set('category', categoryId);
    }
    
    if (subcategoryId) {
      url.searchParams.set('subcategory', subcategoryId);
    }
    
    return url.toString();
  },
  
  // ========================================
  // Obtener URL compartible de producto
  // ========================================
  getProductURL(productId) {
    const url = new URL(window.location.origin);
    url.searchParams.set('product', productId);
    return url.toString();
  },
  
  // ========================================
  // Copiar URL al portapapeles
  // ========================================
  async copyToClipboard(url) {
    try {
      await navigator.clipboard.writeText(url);
      if (window.mawewe && window.mawewe.ui) {
        window.mawewe.ui.showNotification('✓ Enlace copiado al portapapeles');
      }
      return true;
    } catch (err) {
      console.error('Error al copiar:', err);
      // Fallback para navegadores antiguos
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      
      if (window.mawewe && window.mawewe.ui) {
        window.mawewe.ui.showNotification('✓ Enlace copiado');
      }
      return true;
    }
  },
  
  // ========================================
  // Compartir en redes sociales
  // ========================================
  shareOn(platform, url, title = '', description = '') {
    const encodedURL = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    const encodedDescription = encodeURIComponent(description);
    
    const shareURLs = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedURL}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodedURL}&text=${encodedTitle}`,
      whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedURL}`,
      telegram: `https://t.me/share/url?url=${encodedURL}&text=${encodedTitle}`,
      pinterest: `https://pinterest.com/pin/create/button/?url=${encodedURL}&description=${encodedTitle}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedURL}`
    };
    
    if (shareURLs[platform]) {
      window.open(shareURLs[platform], '_blank', 'width=600,height=400');
    }
  },
  
  // ========================================
  // Compartir nativamente (móvil)
  // ========================================
  async shareNative(url, title, text) {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: text,
          url: url
        });
        console.log('✓ Compartido exitosamente');
      } catch (err) {
        console.log('Error o cancelado:', err);
      }
    } else {
      // Fallback: copiar al portapapeles
      this.copyToClipboard(url);
    }
  },
  
  // ========================================
  // Procesar URL inicial al cargar la página
  // ========================================
  handleInitialURL() {
    const params = this.getURLParams();
    
    console.log('📍 Parámetros URL iniciales:', params);
    
    // Si hay un producto específico
    if (params.product) {
      const productId = parseInt(params.product);
      console.log('🔍 Abriendo producto desde URL:', productId);
      
      // Esperar a que los productos se carguen
      const checkProducts = setInterval(() => {
        if (state.products && state.products.length > 0) {
          clearInterval(checkProducts);
          
          const product = state.products.find(p => p.id === productId);
          if (product) {
            // Abrir modal del producto
            setTimeout(() => {
              if (window.productModal) {
                window.productModal.show(productId);
              }
            }, 500);
          } else {
            console.log('⚠️ Producto no encontrado:', productId);
            if (window.mawewe && window.mawewe.ui) {
              window.mawewe.ui.showNotification('Producto no encontrado', 'error');
            }
          }
        }
      }, 100);
      
      // Timeout de seguridad
      setTimeout(() => clearInterval(checkProducts), 5000);
    }
    
    // Si hay una categoría específica
    else if (params.category) {
      console.log('📂 Filtrando por categoría:', params.category);
      
      // Esperar a que se carguen las categorías
      const checkCategories = setInterval(() => {
        if (state.categories && state.categories.length > 0) {
          clearInterval(checkCategories);
          
          state.currentFilter = params.category;
          
          if (params.subcategory) {
            state.currentSubcategory = params.subcategory;
          }
          
          // Aplicar filtros
          if (window.mawewe && window.mawewe.filters) {
            window.mawewe.filters.apply();
          }
          
          // Actualizar UI de filtros
          setTimeout(() => {
            document.querySelectorAll('.filter-button').forEach(btn => {
              btn.classList.remove('active');
              if (btn.textContent.toLowerCase().includes(params.category)) {
                btn.classList.add('active');
              }
            });
            
            if (window.render) {
              window.render.subcategories();
            }
          }, 500);
        }
      }, 100);
      
      setTimeout(() => clearInterval(checkCategories), 5000);
    }
    
    // Si hay una búsqueda
    else if (params.search) {
      console.log('🔍 Búsqueda desde URL:', params.search);
      
      const searchInput = document.getElementById('search-input');
      if (searchInput) {
        searchInput.value = params.search;
        state.searchQuery = params.search;
        
        if (window.mawewe && window.mawewe.filters) {
          window.mawewe.filters.setSearch(params.search);
        }
      }
    }
  }
};

// =============================================================================
// INTEGRACIÓN CON EL SISTEMA EXISTENTE
// =============================================================================

// Modificar filters.setCategory para actualizar URL
if (window.filters) {
  const originalSetCategory = window.filters.setCategory;
  window.filters.setCategory = function(category) {
    originalSetCategory.call(this, category);
    routing.updateURL({
      category: category,
      subcategory: state.currentSubcategory
    });
  };
  
  const originalSetSubcategory = window.filters.setSubcategory;
  window.filters.setSubcategory = function(subcategory) {
    originalSetSubcategory.call(this, subcategory);
    routing.updateURL({
      category: state.currentFilter,
      subcategory: state.currentSubcategory
    });
  };
  
  const originalSetSearch = window.filters.setSearch;
  window.filters.setSearch = function(query) {
    originalSetSearch.call(this, query);
    if (query.trim()) {
      routing.updateURL({ search: query });
    } else {
      routing.updateURL({});
    }
  };
}

// Modificar productModal.show para actualizar URL
if (window.productModal) {
  const originalShow = window.productModal.show;
  window.productModal.show = function(productId) {
    originalShow.call(this, productId);
    routing.updateURL({ product: productId });
  };
  
  const originalClose = window.productModal.close;
  window.productModal.close = function() {
    originalClose.call(this);
    // Limpiar parámetro de producto
    routing.updateURL({
      category: state.currentFilter !== 'all' ? state.currentFilter : null,
      subcategory: state.currentSubcategory
    });
  };
}

// =============================================================================
// BOTONES DE COMPARTIR
// =============================================================================

const shareButtons = {
  
  // ========================================
  // Renderizar botones de compartir para producto
  // ========================================
  renderProductShare(productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return '';
    
    const url = routing.getProductURL(productId);
    const title = `${product.name} - Mawewe`;
    const text = `Mira este producto: ${product.name} - $${product.price.toFixed(2)}`;
    
    return `
      <div class="share-buttons" style="margin-top: var(--spacing-lg); padding: var(--spacing-md); background: var(--gray-50); border-radius: var(--radius-lg);">
        <p style="font-size: var(--font-size-sm); font-weight: 600; margin-bottom: var(--spacing-sm); color: var(--gray-700);">
          Compartir este producto:
        </p>
        <div style="display: flex; gap: var(--spacing-sm); flex-wrap: wrap;">
          <button 
            onclick="routing.copyToClipboard('${url}')"
            class="btn-share"
            style="flex: 1; min-width: 100px; padding: var(--spacing-sm); background: var(--gray-200); border: none; border-radius: var(--radius-md); cursor: pointer; font-size: var(--font-size-sm); font-weight: 600; transition: all 0.2s;"
          >
            🔗 Copiar Enlace
          </button>
          <button 
            onclick="routing.shareOn('whatsapp', '${url}', '${encodeURIComponent(title)}', '${encodeURIComponent(text)}')"
            class="btn-share"
            style="flex: 1; min-width: 100px; padding: var(--spacing-sm); background: #25D366; color: white; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: var(--font-size-sm); font-weight: 600; transition: all 0.2s;"
          >
            📱 WhatsApp
          </button>
          <button 
            onclick="routing.shareOn('facebook', '${url}', '${encodeURIComponent(title)}')"
            class="btn-share"
            style="flex: 1; min-width: 100px; padding: var(--spacing-sm); background: #1877F2; color: white; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: var(--font-size-sm); font-weight: 600; transition: all 0.2s;"
          >
            📘 Facebook
          </button>
        </div>
      </div>
    `;
  },
  
  // ========================================
  // Renderizar botones de compartir para categoría
  // ========================================
  renderCategoryShare(categoryId) {
    const category = state.categories.find(c => c.id === categoryId);
    if (!category) return '';
    
    const url = routing.getCategoryURL(categoryId);
    const title = `${category.name} - Mawewe`;
    const text = `Mira nuestra colección de ${category.name.toLowerCase()}`;
    
    return `
      <div class="share-category" style="margin-bottom: var(--spacing-lg);">
        <button 
          onclick="routing.copyToClipboard('${url}')"
          style="padding: var(--spacing-sm) var(--spacing-lg); background: var(--gray-100); border: 1px solid var(--gray-300); border-radius: var(--radius-full); cursor: pointer; font-size: var(--font-size-sm); font-weight: 600; transition: all 0.2s;"
        >
          🔗 Compartir ${category.name}
        </button>
      </div>
    `;
  }
};

// =============================================================================
// MANEJO DEL BOTÓN ATRÁS/ADELANTE DEL NAVEGADOR
// =============================================================================

window.addEventListener('popstate', () => {
  console.log('⬅️ Navegación con botón atrás/adelante');
  routing.handleInitialURL();
});

// =============================================================================
// INICIALIZACIÓN
// =============================================================================

// Procesar URL al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Sistema de routing inicializado');
  
  // Pequeño delay para asegurar que todo esté cargado
  setTimeout(() => {
    routing.handleInitialURL();
  }, 100);
});

// Exportar para uso global
window.routing = routing;
window.shareButtons = shareButtons;

if (window.mawewe) {
  window.mawewe.routing = routing;
  window.mawewe.shareButtons = shareButtons;
}

console.log('✅ URL Routing System cargado');
