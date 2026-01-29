/**
 * EXTENSIÓN DEL SISTEMA DE CARRITO
 * Este archivo EXTIENDE el carrito de app.js, no lo reemplaza
 * 
 * INSTALACIÓN:
 * 1. Reemplaza assets/js/cart.js con este archivo
 * 2. NO modifiques app.js
 * 3. Limpia localStorage antes de probar
 */

// =============================================================================
// ESPERAR A QUE APP.JS CARGUE
// =============================================================================

function initCartExtensions() {
  console.log('🔧 Inicializando extensiones del carrito...');
  
  // Verificar que window.cart existe (creado por app.js)
  if (!window.cart || !window.state) {
    console.error('❌ ERROR: app.js no ha cargado correctamente');
    setTimeout(initCartExtensions, 100); // Reintentar
    return;
  }
  
  // Verificar que cart tenga los métodos necesarios
  if (typeof window.cart.load !== 'function') {
    console.error('❌ ERROR: window.cart no tiene los métodos necesarios');
    return;
  }
  
  console.log('✅ app.js detectado, aplicando extensiones...');
  
  // =============================================================================
  // SOBRESCRIBIR MÉTODO openCheckout EN CHECKOUT
  // =============================================================================
  
  // Esperar a que checkout.js también cargue
  const waitForCheckout = setInterval(() => {
    if (window.checkout && typeof window.checkout.openCheckout === 'function') {
      clearInterval(waitForCheckout);
      
      // Guardar referencia al método original
      const originalOpenCheckout = window.checkout.openCheckout;
      
      // Sobrescribir con validación mejorada
      window.checkout.openCheckout = function() {
        console.log('🔍 Validando carrito antes de checkout...');
        console.log('📊 Estado actual:', {
          cart: window.state.cart,
          length: window.state.cart ? window.state.cart.length : 0,
          items: window.state.cart
        });
        
        // Validación robusta
        if (!window.state) {
          console.error('❌ window.state no existe');
          alert('Error: Estado de la aplicación no disponible');
          return;
        }
        
        if (!window.state.cart) {
          console.error('❌ window.state.cart no existe');
          alert('Error: Carrito no inicializado');
          return;
        }
        
        if (!Array.isArray(window.state.cart)) {
          console.error('❌ window.state.cart no es un array');
          alert('Error: Formato de carrito inválido');
          return;
        }
        
        if (window.state.cart.length === 0) {
          console.warn('⚠️ Carrito vacío');
          if (window.ui && window.ui.showNotification) {
            window.ui.showNotification('El carrito está vacío', 'error');
          } else {
            alert('El carrito está vacío');
          }
          return;
        }
        
        console.log('✅ Validación exitosa, procediendo con checkout...');
        
        // Llamar al método original
        originalOpenCheckout.call(this);
      };
      
      console.log('✅ checkout.openCheckout sobrescrito con validaciones');
    }
  }, 100);
  
  // Timeout de seguridad
  setTimeout(() => {
    clearInterval(waitForCheckout);
  }, 5000);
  
  // =============================================================================
  // VERIFICAR Y CORREGIR ESTADO AL CARGAR
  // =============================================================================
  
  // Asegurar que el carrito esté inicializado correctamente
  if (!window.state.cart || !Array.isArray(window.state.cart)) {
    console.warn('⚠️ Corrigiendo estado del carrito...');
    window.state.cart = [];
    
    // Intentar cargar desde localStorage
    try {
      const saved = localStorage.getItem('mawewe_cart_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          window.state.cart = parsed.filter(item => 
            item && 
            item.productId && 
            item.name && 
            item.price
          );
          console.log('✅ Carrito restaurado desde localStorage:', window.state.cart.length, 'items');
        }
      }
    } catch (error) {
      console.error('❌ Error restaurando carrito:', error);
    }
  }
  
  // =============================================================================
  // AGREGAR MÉTODO DE DIAGNÓSTICO
  // =============================================================================
  
  window.diagnosticarCarrito = function() {
    console.log('=================================================');
    console.log('🔍 DIAGNÓSTICO DEL CARRITO');
    console.log('=================================================');
    console.log('window.state existe?', !!window.state);
    console.log('window.state.cart existe?', !!window.state?.cart);
    console.log('window.state.cart es array?', Array.isArray(window.state?.cart));
    console.log('window.state.cart.length:', window.state?.cart?.length);
    console.log('Contenido del carrito:', window.state?.cart);
    console.log('localStorage cart:', localStorage.getItem('mawewe_cart_v3'));
    console.log('window.cart existe?', !!window.cart);
    console.log('window.cart.addItem existe?', typeof window.cart?.addItem);
    console.log('window.checkout existe?', !!window.checkout);
    console.log('window.checkout.openCheckout existe?', typeof window.checkout?.openCheckout);
    console.log('=================================================');
    
    return {
      state: !!window.state,
      cart: window.state?.cart,
      isArray: Array.isArray(window.state?.cart),
      length: window.state?.cart?.length,
      localStorage: localStorage.getItem('mawewe_cart_v3')
    };
  };
  
  console.log('✅ Comando de diagnóstico disponible: diagnosticarCarrito()');
  
  // =============================================================================
  // FORZAR ACTUALIZACIÓN DE UI
  // =============================================================================
  
  if (window.cart && typeof window.cart.updateUI === 'function') {
    window.cart.updateUI();
    console.log('✅ UI del carrito actualizada');
  }
  
  // =============================================================================
  // LISTENER PARA CAMBIOS EN LOCALSTORAGE
  // =============================================================================
  
  window.addEventListener('storage', (e) => {
    if (e.key === 'mawewe_cart_v3') {
      console.log('📡 Cambio detectado en localStorage del carrito');
      if (window.cart && typeof window.cart.load === 'function') {
        window.cart.load();
        console.log('✅ Carrito recargado desde localStorage');
      }
    }
  });
  
  console.log('✅ Extensiones del carrito inicializadas correctamente');
}

// =============================================================================
// AUTO-INICIALIZACIÓN
// =============================================================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCartExtensions);
} else {
  // DOM ya está listo
  initCartExtensions();
}

// También intentar después de 1 segundo por seguridad
setTimeout(initCartExtensions, 1000);

console.log('✅ cart.js (extensiones) cargado');