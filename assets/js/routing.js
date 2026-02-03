/**
 * MAWEWE E-COMMERCE - URL ROUTING SYSTEM (VERSIÓN LOCALHOST)
 * Sistema de URLs compartibles para categorías y productos
 * 
 * 🔧 CONFIGURADO PARA: http://localhost:3000/
 * 
 * URLs soportadas:
 * - http://localhost:3000/ (todas las categorías)
 * - http://localhost:3000/?category=san-valentin
 * - http://localhost:3000/?category=perfumes&subcategory=dior
 * - http://localhost:3000/?product=123
 * - http://localhost:3000/?search=regalo
 */

// =============================================================================
// URL ROUTING SYSTEM
// =============================================================================

const routing = {
  
  // ========================================
  // 🔍 MODO DEBUG ACTIVADO
  // ========================================
  debug: true, // ✅ Activar logs en consola
  
  log(...args) {
    if (this.debug) {
      console.log('🔗 [ROUTING]', ...args);
    }
  },
  
  // ========================================
  // Obtener parámetros de la URL
  // ========================================
  getURLParams() {
    const params = new URLSearchParams(window.location.search);
    const result = {
      category: params.get('category'),
      subcategory: params.get('subcategory'),
      product: params.get('product'),
      search: params.get('search')
    };
    this.log('Parámetros URL:', result);
    return result;
  },
  
  // ========================================
  // Actualizar URL sin recargar la página
  // ========================================
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
    
    this.log('✅ URL actualizada:', url.toString());
    
    // Actualizar meta tags
    this.updateMetaTags(params);
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
    if (params.product && window.state && window.state.products) {
      const product = window.state.products.find(p => p.id === parseInt(params.product));
      if (product) {
        title = `${product.name} - ${baseTitle}`;
        description = product.description || baseDescription;
        image = product.image || baseImage;
        this.log('Meta tags de producto:', title);
      }
    }
    
    // Si es una categoría
    else if (params.category && window.state && window.state.categories) {
      const category = window.state.categories.find(c => c.id === params.category);
      if (category) {
        title = `${category.name} - ${baseTitle}`;
        description = `Descubre nuestra colección de ${category.name.toLowerCase()}`;
        this.log('Meta tags de categoría:', title);
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
    const url = new URL(window.location.origin + window.location.pathname);
    
    if (categoryId !== 'all') {
      url.searchParams.set('category', categoryId);
    }
    
    if (subcategoryId) {
      url.searchParams.set('subcategory', subcategoryId);
    }
    
    this.log('URL de categoría generada:', url.toString());
    return url.toString();
  },
  
  // ========================================
  // Obtener URL compartible de producto
  // ========================================
  getProductURL(productId) {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('product', productId);
    
    this.log('URL de producto generada:', url.toString());
    return url.toString();
  },
  
  // ========================================
  // Copiar URL al portapapeles
  // ========================================
  async copyToClipboard(url) {
    this.log('📋 Intentando copiar:', url);
    
    try {
      await navigator.clipboard.writeText(url);
      
      if (window.mawewe && window.mawewe.ui) {
        window.mawewe.ui.showNotification('✓ Enlace copiado al portapapeles');
      } else {
        alert('✓ Enlace copiado: ' + url);
      }
      
      this.log('✅ Copiado exitosamente');
      
      // Mostrar en consola para pruebas
      console.log('═══════════════════════════════════════');
      console.log('📋 ENLACE COPIADO:');
      console.log(url);
      console.log('═══════════════════════════════════════');
      
      return true;
    } catch (err) {
      this.log('⚠️ Error al copiar:', err);
      
      // Fallback para navegadores antiguos
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      
      if (window.mawewe && window.mawewe.ui) {
        window.mawewe.ui.showNotification('✓ Enlace copiado');
      } else {
        alert('✓ Enlace copiado: ' + url);
      }
      
      console.log('═══════════════════════════════════════');
      console.log('📋 ENLACE COPIADO (fallback):');
      console.log(url);
      console.log('═══════════════════════════════════════');
      
      return true;
    }
  },
  
  // ========================================
  // Compartir en redes sociales
  // ========================================
  shareOn(platform, url, title = '', description = '') {
    this.log(`📤 Compartiendo en ${platform}:`, url);
    
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
      console.log('═══════════════════════════════════════');
      console.log(`📤 COMPARTIENDO EN ${platform.toUpperCase()}:`);
      console.log('URL:', url);
      console.log('Título:', title);
      console.log('═══════════════════════════════════════');
      
      window.open(shareURLs[platform], '_blank', 'width=600,height=400');
    }
  },
  
  // ========================================
  // Compartir nativamente (móvil)
  // ========================================
  async shareNative(url, title, text) {
    this.log('📱 Compartir nativo:', { url, title, text });
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: text,
          url: url
        });
        this.log('✅ Compartido exitosamente');
      } catch (err) {
        this.log('⚠️ Error o cancelado:', err);
      }
    } else {
      this.log('ℹ️ Share API no disponible, usando clipboard');
      // Fallback: copiar al portapapeles
      this.copyToClipboard(url);
    }
  },
  
  // ========================================
  // 🧪 MODO TEST: Mostrar todas las URLs posibles
  // ========================================
  showAllURLs() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🔗 URLS DISPONIBLES EN TU TIENDA');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const baseURL = window.location.origin + window.location.pathname;
    
    console.log('📍 PÁGINA PRINCIPAL:');
    console.log('   ', baseURL);
    console.log('');
    
    if (window.state && window.state.categories) {
      console.log('📂 CATEGORÍAS:');
      window.state.categories.forEach(cat => {
        if (cat.id !== 'all') {
          console.log(`   ${cat.name}:`, this.getCategoryURL(cat.id));
        }
      });
      console.log('');
    }
    
    if (window.state && window.state.products && window.state.products.length > 0) {
      console.log('🛍️ PRODUCTOS (primeros 5):');
      window.state.products.slice(0, 5).forEach(product => {
        console.log(`   ${product.name}:`, this.getProductURL(product.id));
      });
      console.log('');
    }
    
    console.log('🔍 BÚSQUEDA (ejemplo):');
    console.log('   ', baseURL + '?search=regalo');
    console.log('');
    
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('💡 TIP: Copia cualquier URL y ábrela en una nueva pestaña para probar\n');
  },
  
  // ========================================
  // Procesar URL inicial al cargar la página
  // ========================================
  handleInitialURL() {
    const params = this.getURLParams();
    
    this.log('═══════════════════════════════════════');
    this.log('🚀 Procesando URL inicial');
    this.log('Parámetros encontrados:', params);
    this.log('═══════════════════════════════════════');
    
    // Si hay un producto específico
    if (params.product) {
      const productId = parseInt(params.product);
      this.log('🔍 Abriendo producto desde URL:', productId);
      
      // Esperar a que los productos se carguen
      const checkProducts = setInterval(() => {
        if (window.state && window.state.products && window.state.products.length > 0) {
          clearInterval(checkProducts);
          
          const product = window.state.products.find(p => p.id === productId);
          if (product) {
            this.log('✅ Producto encontrado:', product.name);
            
            // Abrir modal del producto
            setTimeout(() => {
              if (window.productModal) {
                window.productModal.show(productId);
                this.log('✅ Modal de producto abierto');
              } else {
                this.log('⚠️ productModal no disponible');
              }
            }, 500);
          } else {
            this.log('❌ Producto no encontrado:', productId);
            if (window.mawewe && window.mawewe.ui) {
              window.mawewe.ui.showNotification('Producto no encontrado', 'error');
            }
          }
        }
      }, 100);
      
      // Timeout de seguridad
      setTimeout(() => {
        clearInterval(checkProducts);
        this.log('⏱️ Timeout alcanzado esperando productos');
      }, 5000);
    }
    
    // Si hay una categoría específica
    else if (params.category) {
      this.log('📂 Filtrando por categoría:', params.category);
      
      // Esperar a que se carguen las categorías
      const checkCategories = setInterval(() => {
        if (window.state && window.state.categories && window.state.categories.length > 0) {
          clearInterval(checkCategories);
          
          window.state.currentFilter = params.category;
          
          if (params.subcategory) {
            window.state.currentSubcategory = params.subcategory;
            this.log('📑 Subcategoría:', params.subcategory);
          }
          
          // Aplicar filtros
          if (window.mawewe && window.mawewe.filters) {
            window.mawewe.filters.apply();
            this.log('✅ Filtros aplicados');
          } else if (window.filters) {
            window.filters.apply();
            this.log('✅ Filtros aplicados');
          }
          
          // Actualizar UI de filtros
          setTimeout(() => {
            document.querySelectorAll('.filter-button').forEach(btn => {
              btn.classList.remove('active');
              const btnText = btn.textContent.toLowerCase().trim();
              if (btnText.includes(params.category.replace('-', ' '))) {
                btn.classList.add('active');
                this.log('✅ Botón de filtro activado:', btnText);
              }
            });
            
            if (window.render) {
              window.render.subcategories();
            }
          }, 500);
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkCategories);
        this.log('⏱️ Timeout alcanzado esperando categorías');
      }, 5000);
    }
    
    // Si hay una búsqueda
    else if (params.search) {
      this.log('🔍 Búsqueda desde URL:', params.search);
      
      const searchInput = document.getElementById('search-input');
      if (searchInput) {
        searchInput.value = params.search;
        window.state.searchQuery = params.search;
        
        if (window.mawewe && window.mawewe.filters) {
          window.mawewe.filters.setSearch(params.search);
        } else if (window.filters) {
          window.filters.setSearch(params.search);
        }
        
        this.log('✅ Búsqueda aplicada');
      }
    }
    
    // Si no hay parámetros
    else {
      this.log('ℹ️ No hay parámetros en la URL - mostrando todos los productos');
    }
  }
};

// =============================================================================
// INTEGRACIÓN CON EL SISTEMA EXISTENTE
// =============================================================================

// Esperar a que el sistema principal esté listo
function integrateRouting() {
  routing.log('🔧 Integrando routing con sistema existente...');
  
  // Modificar filters.setCategory
  const filters = window.mawewe?.filters || window.filters;
  
  if (filters && typeof filters.setCategory === 'function') {
    const originalSetCategory = filters.setCategory.bind(filters);
    filters.setCategory = function(category) {
      originalSetCategory(category);
      routing.updateURL({
        category: category,
        subcategory: window.state?.currentSubcategory
      });
    };
    routing.log('✅ filters.setCategory integrado');
  }
  
  if (filters && typeof filters.setSubcategory === 'function') {
    const originalSetSubcategory = filters.setSubcategory.bind(filters);
    filters.setSubcategory = function(subcategory) {
      originalSetSubcategory(subcategory);
      routing.updateURL({
        category: window.state?.currentFilter,
        subcategory: window.state?.currentSubcategory
      });
    };
    routing.log('✅ filters.setSubcategory integrado');
  }
  
  if (filters && typeof filters.setSearch === 'function') {
    const originalSetSearch = filters.setSearch.bind(filters);
    filters.setSearch = function(query) {
      originalSetSearch(query);
      if (query && query.trim()) {
        routing.updateURL({ search: query });
      } else {
        routing.updateURL({});
      }
    };
    routing.log('✅ filters.setSearch integrado');
  }
  
  // Modificar productModal
  if (window.productModal && typeof window.productModal.show === 'function') {
    const originalShow = window.productModal.show.bind(window.productModal);
    window.productModal.show = function(productId) {
      originalShow(productId);
      routing.updateURL({ product: productId });
    };
    routing.log('✅ productModal.show integrado');
    
    const originalClose = window.productModal.close.bind(window.productModal);
    window.productModal.close = function() {
      originalClose();
      const currentFilter = window.state?.currentFilter;
      const currentSubcategory = window.state?.currentSubcategory;
      routing.updateURL({
        category: currentFilter !== 'all' ? currentFilter : null,
        subcategory: currentSubcategory
      });
    };
    routing.log('✅ productModal.close integrado');
  }
  
  routing.log('✅ Integración completada');
}

// =============================================================================
// MANEJO DEL BOTÓN ATRÁS/ADELANTE DEL NAVEGADOR
// =============================================================================

window.addEventListener('popstate', () => {
  routing.log('⬅️ Navegación con botón atrás/adelante');
  routing.handleInitialURL();
});

// =============================================================================
// INICIALIZACIÓN
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  routing.log('═══════════════════════════════════════');
  routing.log('🚀 Sistema de routing inicializado (LOCALHOST)');
  routing.log('═══════════════════════════════════════');
  
  // Intentar integrar inmediatamente
  setTimeout(() => {
    integrateRouting();
    routing.handleInitialURL();
  }, 100);
  
  // Re-intentar después de 1 segundo (por si app.js tarda en cargar)
  setTimeout(() => {
    integrateRouting();
  }, 1000);
  
  // Mostrar todas las URLs disponibles después de 2 segundos
  setTimeout(() => {
    routing.showAllURLs();
  }, 2000);
});

// =============================================================================
// COMANDOS DE CONSOLA PARA PRUEBAS
// =============================================================================

console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║  🔗 SISTEMA DE ROUTING CARGADO (MODO DESARROLLO)         ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');
console.log('📝 COMANDOS DISPONIBLES EN CONSOLA:\n');
console.log('  routing.showAllURLs()              - Ver todas las URLs');
console.log('  routing.getCategoryURL("joyas")    - URL de categoría');
console.log('  routing.getProductURL(123)         - URL de producto');
console.log('  routing.copyToClipboard(url)       - Copiar URL');
console.log('  routing.debug = false              - Desactivar logs\n');

// Exportar para uso global
window.routing = routing;

if (window.mawewe) {
  window.mawewe.routing = routing;
}

console.log('✅ Sistema listo. Escribe routing.showAllURLs() para ver enlaces\n');