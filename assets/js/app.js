/**
 * CÓDIGO MÍNIMO FUNCIONAL - Mawewe
 * ✅ Carga productos desde API y los renderiza
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  api: {
    // ✅ SIEMPRE USA PRODUCCIÓN
    baseUrl: 'https://mawewe.com.ec/api',
    endpoints: {
      products: '/products.php',
      saveOrder: '/save-order.php'
    }
  }
};

console.log('🚀 Mawewe iniciando...');
console.log('🌐 API URL:', CONFIG.api.baseUrl);

// =============================================================================
// FUNCIÓN PARA CARGAR PRODUCTOS
// =============================================================================

async function loadProducts() {
  try {
    console.log('📡 Cargando productos desde:', CONFIG.api.baseUrl + CONFIG.api.endpoints.products);
    
    const response = await fetch(CONFIG.api.baseUrl + CONFIG.api.endpoints.products);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ Datos recibidos:', data);
    
    if (data.success && data.products) {
      console.log(`✅ ${data.products.length} productos cargados`);
      renderProducts(data.products);
      renderCategories(data.categories);
    } else {
      console.error('❌ Error: respuesta no válida', data);
    }
    
  } catch (error) {
    console.error('❌ Error al cargar productos:', error);
    showError('No se pudieron cargar los productos. Por favor, intenta de nuevo.');
  }
}

// =============================================================================
// FUNCIÓN PARA RENDERIZAR PRODUCTOS
// =============================================================================

function renderProducts(products) {
  const grid = document.getElementById('products-grid');
  
  if (!grid) {
    console.error('❌ No se encontró el elemento products-grid');
    return;
  }
  
  // Limpiar el grid
  grid.innerHTML = '';
  
  if (!products || products.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem;">
        <p style="font-size: 1.25rem; color: #666;">No se encontraron productos</p>
      </div>
    `;
    return;
  }
  
  // Crear card por cada producto
  products.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <div class="product-image">
        <img src="${product.image}" alt="${product.name}" loading="lazy">
        ${product.featured ? '<span class="product-badge">Destacado</span>' : ''}
      </div>
      <div class="product-info">
        <h3 class="product-name">${product.name}</h3>
        <p class="product-description">${product.description.substring(0, 80)}...</p>
        <div class="product-footer">
          <span class="product-price">$${product.price.toFixed(2)}</span>
          <button class="btn-add-cart" onclick="addToCart(${product.id})">
            Añadir al Carrito
          </button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
  
  console.log(`✅ ${products.length} productos renderizados en el DOM`);
}

// =============================================================================
// FUNCIÓN PARA RENDERIZAR CATEGORÍAS
// =============================================================================

function renderCategories(categories) {
  const container = document.getElementById('category-filters');
  
  if (!container || !categories) return;
  
  container.innerHTML = `
    <button class="category-btn active" onclick="filterByCategory('all')">
      Todos
    </button>
  `;
  
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'category-btn';
    btn.textContent = cat.name;
    btn.onclick = () => filterByCategory(cat.id);
    container.appendChild(btn);
  });
}

// =============================================================================
// FUNCIÓN DE ERROR
// =============================================================================

function showError(message) {
  const grid = document.getElementById('products-grid');
  if (grid) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem;">
        <p style="font-size: 1.25rem; color: #e53e3e;">${message}</p>
      </div>
    `;
  }
}

// =============================================================================
// FUNCIÓN DUMMY PARA AÑADIR AL CARRITO (temporal)
// =============================================================================

function addToCart(productId) {
  console.log('➕ Añadir producto al carrito:', productId);
  alert(`Producto ${productId} añadido al carrito (funcionalidad en desarrollo)`);
}

// =============================================================================
// INICIALIZAR AL CARGAR LA PÁGINA
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM cargado, iniciando app...');
  loadProducts();
});

console.log('✅ Script cargado correctamente');
