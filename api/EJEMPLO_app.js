/**
 * Mawewe E-commerce - Main Application
 * Version: 3.1 - Con Dominio
 * ✅ Detección automática de entorno
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  // API Configuration - detecta automáticamente el entorno
  api: {
    // ✅ Detección automática:
    // - Local: http://localhost:8000/api
    // - Producción: https://mawewe.com.ec/api
    baseUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:8000/api'      // Desarrollo local
      : 'https://mawewe.com.ec/api',     // Producción con dominio ✅
    
    endpoints: {
      products: '/products.php',
      saveOrder: '/save-order.php'
    }
  },
  
  // PayPal Configuration
  paypal: {
    clientId: 'AeKUZVm_-yxZRjygolPx21RgDuy3_K24uOrKWf3MpLAG8xErNCyu4S2GcIu27tJclkpabpv0HXAeBgrg',
    currency: 'USD',
    intent: 'capture',
    locale: 'es_ES'
  },
  
  // Shipping Configuration
  shipping: {
    cost: 5.00,
    freeThreshold: 50.00,
    expressCost: 10.00
  }
};

// Log de configuración (solo en desarrollo)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  console.log('🔧 Modo: DESARROLLO');
  console.log('🌐 API URL:', CONFIG.api.baseUrl);
} else {
  console.log('🚀 Modo: PRODUCCIÓN');
  console.log('🌐 API URL:', CONFIG.api.baseUrl);
}

// El resto del archivo app.js permanece igual...
// (Aquí iría todo el código que ya tienes en tu app.js actual)
