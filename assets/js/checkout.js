/**
 * MAWEWE E-COMMERCE - CHECKOUT SIMULADO CORREGIDO
 * Sistema de pago simulado sin PayPal
 * ✅ FIX: Referencias a cart y state corregidas
 */

// =============================================================================
// CHECKOUT NAMESPACE
// =============================================================================

const checkout = {
  
  // Estado del checkout
  state: {
    step: 1,
    customerData: {},
    paymentMethod: null,
    orderNumber: null
  },
  
  // ========================================
  // STEP 1: Abrir formulario de checkout
  // ========================================
  openCheckout() {
    // ✅ FIX: Verificar que el carrito no esté vacío usando window.state
    if (!window.state || !window.state.cart || window.state.cart.length === 0) {
      if (window.ui) {
        window.ui.showNotification('El carrito está vacío', 'error');
      } else {
        alert('El carrito está vacío');
      }
      return;
    }
    
    console.log('📝 Abriendo checkout...');
    
    // Ocultar items del carrito y footer
    const cartItems = document.getElementById('cart-items');
    const cartFooter = document.getElementById('cart-footer');
    const container = document.getElementById('checkout-form-container');
    
    if (cartItems) cartItems.style.display = 'none';
    if (cartFooter) cartFooter.style.display = 'none';
    
    // Mostrar formulario de checkout
    if (container) {
      container.style.display = 'block';
      container.innerHTML = this.renderCheckoutForm();
    }
    
    console.log('✅ Checkout abierto - Step 1: Datos del cliente');
  },
  
  // ========================================
  // Renderizar formulario principal
  // ========================================
  renderCheckoutForm() {
    // ✅ FIX: Verificar que cart esté disponible en window
    if (!window.cart || typeof window.cart.calculateTotals !== 'function') {
      console.error('❌ Error: cart no está disponible');
      return '<p style="color: red; padding: 2rem;">Error: Sistema de carrito no disponible</p>';
    }
    
    const { subtotal, shipping, total } = window.cart.calculateTotals();
    
    // ✅ FIX: Acceder a state desde window
    const cartItems = window.state.cart || [];
    const shippingMethod = window.state.shippingMethod || 'standard';
    
    return `
      <div class="checkout-header">
        <button class="btn-back" onclick="checkout.closeCheckout()">
          ← Volver al carrito
        </button>
        <h2>Finalizar Compra</h2>
      </div>
      
      <form id="checkout-form" class="checkout-form" onsubmit="checkout.submitCustomerData(event)">
        
        <!-- Información de Contacto -->
        <div class="form-section">
          <h3>📧 Información de Contacto</h3>
          
          <div class="form-group">
            <label for="email">Email *</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              required 
              placeholder="tu@email.com"
            />
          </div>
          
          <div class="form-checkbox">
            <input type="checkbox" id="newsletter" name="newsletter" />
            <label for="newsletter">Recibir ofertas y promociones por email</label>
          </div>
        </div>
        
        <!-- Información de Entrega -->
        <div class="form-section">
          <h3>📦 Información de Entrega</h3>
          
          <div class="form-row">
            <div class="form-group">
              <label for="firstName">Nombre *</label>
              <input 
                type="text" 
                id="firstName" 
                name="firstName" 
                required 
                placeholder="Juan"
              />
            </div>
            
            <div class="form-group">
              <label for="lastName">Apellido *</label>
              <input 
                type="text" 
                id="lastName" 
                name="lastName" 
                required 
                placeholder="Pérez"
              />
            </div>
          </div>
          
          <div class="form-group">
            <label for="address">Dirección *</label>
            <input 
              type="text" 
              id="address" 
              name="address" 
              required 
              placeholder="Calle Principal 123"
            />
          </div>
          
          <div class="form-group">
            <label for="apartment">Apartamento, suite, etc. (opcional)</label>
            <input 
              type="text" 
              id="apartment" 
              name="apartment" 
              placeholder="Apto 4B"
            />
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="city">Ciudad *</label>
              <input 
                type="text" 
                id="city" 
                name="city" 
                required 
                placeholder="Quito"
              />
            </div>
            
            <div class="form-group">
              <label for="postalCode">Código Postal</label>
              <input 
                type="text" 
                id="postalCode" 
                name="postalCode" 
                placeholder="170150"
              />
            </div>
          </div>
          
          <div class="form-group">
            <label for="phone">Teléfono *</label>
            <input 
              type="tel" 
              id="phone" 
              name="phone" 
              required 
              placeholder="0991234567"
            />
          </div>
          
          <div class="form-checkbox">
            <input type="checkbox" id="saveInfo" name="saveInfo" checked />
            <label for="saveInfo">Guardar información para futuras compras</label>
          </div>
        </div>
        
        <!-- Método de Envío -->
        <div class="form-section">
          <h3>🚚 Método de Envío</h3>
          
          <div class="shipping-options">
            <label class="shipping-option ${shippingMethod === 'standard' ? 'selected' : ''}" onclick="checkout.selectShipping('standard')">
              <input 
                type="radio" 
                name="shipping" 
                value="standard" 
                ${shippingMethod === 'standard' ? 'checked' : ''}
              />
              <div class="shipping-info">
                <div>
                  <div class="shipping-name">Envío Estándar</div>
                  <div style="font-size: 0.875rem; color: var(--gray-600);">3-5 días hábiles</div>
                </div>
                <div class="shipping-cost">
                  ${shipping === 0 ? 'GRATIS' : '$' + shipping.toFixed(2)}
                </div>
              </div>
            </label>
            
            <label class="shipping-option ${shippingMethod === 'express' ? 'selected' : ''}" onclick="checkout.selectShipping('express')">
              <input 
                type="radio" 
                name="shipping" 
                value="express" 
                ${shippingMethod === 'express' ? 'checked' : ''}
              />
              <div class="shipping-info">
                <div>
                  <div class="shipping-name">Envío Express</div>
                  <div style="font-size: 0.875rem; color: var(--gray-600);">1-2 días hábiles</div>
                </div>
                <div class="shipping-cost">$${window.CONFIG.shipping.expressCost.toFixed(2)}</div>
              </div>
            </label>
          </div>
        </div>
        
        <!-- Resumen del Pedido -->
        <div class="checkout-summary">
          <h3>📋 Resumen del Pedido</h3>
          
          <div class="summary-items">
            ${cartItems.map(item => `
              <div class="summary-item">
                <img src="${item.image}" alt="${item.name}" />
                <div class="summary-item-info">
                  <div style="font-weight: 600;">${item.name}</div>
                  <div class="quantity">Cantidad: ${item.quantity}</div>
                </div>
                <div class="summary-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
              </div>
            `).join('')}
          </div>
          
          <div class="summary-totals">
            <div class="summary-row">
              <span>Subtotal:</span>
              <span class="amount">$${subtotal.toFixed(2)}</span>
            </div>
            <div class="summary-row">
              <span>Envío:</span>
              <span class="amount ${shipping === 0 ? 'free-shipping' : ''}">
                ${shipping === 0 ? 'GRATIS' : '$' + shipping.toFixed(2)}
              </span>
            </div>
            <div class="summary-row total">
              <span>Total:</span>
              <span class="amount">$${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <button type="submit" class="btn-continue-payment">
          Continuar al Pago
        </button>
      </form>
    `;
  },
  
  // ========================================
  // Seleccionar método de envío
  // ========================================
  selectShipping(method) {
    window.state.shippingMethod = method;
    
    // Actualizar UI
    document.querySelectorAll('.shipping-option').forEach(option => {
      option.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
    
    // Recalcular y actualizar resumen
    this.openCheckout();
    
    console.log('🚚 Método de envío seleccionado:', method);
  },
  
  // ========================================
  // STEP 2: Procesar datos del cliente
  // ========================================
  submitCustomerData(event) {
    event.preventDefault();
    
    console.log('📝 Procesando datos del cliente...');
    
    const formData = new FormData(event.target);
    
    // Guardar datos del cliente
    this.state.customerData = {
      email: formData.get('email'),
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      address: formData.get('address'),
      apartment: formData.get('apartment'),
      city: formData.get('city'),
      postalCode: formData.get('postalCode'),
      phone: formData.get('phone'),
      newsletter: formData.get('newsletter') === 'on',
      saveInfo: formData.get('saveInfo') === 'on'
    };
    
    // Guardar en localStorage si lo solicitó
    if (this.state.customerData.saveInfo) {
      localStorage.setItem('mawewe_customer_data', JSON.stringify(this.state.customerData));
    }
    
    console.log('✅ Datos del cliente guardados:', this.state.customerData);
    
    // Ir a selección de método de pago
    this.showPaymentMethods();
  },
  
  // ========================================
  // STEP 2: Mostrar métodos de pago
  // ========================================
  showPaymentMethods() {
    const container = document.getElementById('checkout-form-container');
    const { subtotal, shipping, total } = window.cart.calculateTotals();
    const cartItems = window.state.cart || [];
    
    container.innerHTML = `
      <div class="checkout-header">
        <button class="btn-back" onclick="checkout.openCheckout()">
          ← Volver a datos de entrega
        </button>
        <h2>Método de Pago</h2>
      </div>
      
      <div class="payment-methods-container">
        
        <!-- Información del Cliente -->
        <div class="form-section" style="margin-bottom: 2rem;">
          <h3>📋 Información de Entrega</h3>
          <div style="background: var(--gray-50); padding: 1rem; border-radius: 12px; font-size: 0.9rem;">
            <p style="margin-bottom: 0.5rem;"><strong>${this.state.customerData.firstName} ${this.state.customerData.lastName}</strong></p>
            <p style="margin-bottom: 0.5rem; color: var(--gray-700);">${this.state.customerData.address}${this.state.customerData.apartment ? ', ' + this.state.customerData.apartment : ''}</p>
            <p style="margin-bottom: 0.5rem; color: var(--gray-700);">${this.state.customerData.city}${this.state.customerData.postalCode ? ', ' + this.state.customerData.postalCode : ''}</p>
            <p style="margin-bottom: 0.5rem; color: var(--gray-700);">📧 ${this.state.customerData.email}</p>
            <p style="color: var(--gray-700);">📱 ${this.state.customerData.phone}</p>
          </div>
        </div>
        
        <!-- Métodos de Pago -->
        <div class="form-section">
          <h3>💳 Selecciona tu Método de Pago</h3>
          
          <div class="payment-options">
            
            <!-- Transferencia Bancaria -->
            <label class="payment-option" onclick="checkout.selectPaymentMethod('transfer')">
              <input type="radio" name="payment" value="transfer" />
              <div class="payment-method-content">
                <div class="payment-icon">🏦</div>
                <div class="payment-details">
                  <div class="payment-name">Transferencia Bancaria</div>
                  <div class="payment-description">Recibirás los datos bancarios después de confirmar</div>
                </div>
              </div>
            </label>
            
            <!-- Tarjeta de Crédito/Débito (Simulado) -->
            <label class="payment-option" onclick="checkout.selectPaymentMethod('card')">
              <input type="radio" name="payment" value="card" />
              <div class="payment-method-content">
                <div class="payment-icon">💳</div>
                <div class="payment-details">
                  <div class="payment-name">Tarjeta de Crédito/Débito</div>
                  <div class="payment-description">Pago seguro con tarjeta (Simulado)</div>
                </div>
              </div>
            </label>
            
            <!-- Pago en Efectivo -->
            <label class="payment-option" onclick="checkout.selectPaymentMethod('cash')">
              <input type="radio" name="payment" value="cash" />
              <div class="payment-method-content">
                <div class="payment-icon">💵</div>
                <div class="payment-details">
                  <div class="payment-name">Pago en Efectivo</div>
                  <div class="payment-description">Paga al recibir tu pedido</div>
                </div>
              </div>
            </label>
            
            <!-- PayPal (Simulado) -->
            <label class="payment-option" onclick="checkout.selectPaymentMethod('paypal')">
              <input type="radio" name="payment" value="paypal" />
              <div class="payment-method-content">
                <div class="payment-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="#003087">
                    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.77.77 0 0 1 .76-.653h8.023c2.83 0 4.8.584 5.856 1.735 1.087 1.185 1.423 2.923 1.023 5.318-.016.094-.033.187-.052.281-.73 3.474-2.935 5.237-6.557 5.237h-1.672a.77.77 0 0 0-.76.652l-.055.283-.867 5.5a.641.641 0 0 1-.633.55z"/>
                  </svg>
                </div>
                <div class="payment-details">
                  <div class="payment-name">PayPal</div>
                  <div class="payment-description">Pago rápido y seguro (Simulado)</div>
                </div>
              </div>
            </label>
          </div>
        </div>
        
        <!-- Resumen del Pedido -->
        <div class="checkout-summary">
          <h3>📋 Resumen Final</h3>
          
          <div class="summary-totals">
            <div class="summary-row">
              <span>Subtotal (${cartItems.length} items):</span>
              <span class="amount">$${subtotal.toFixed(2)}</span>
            </div>
            <div class="summary-row">
              <span>Envío ${window.state.shippingMethod === 'express' ? 'Express' : 'Estándar'}:</span>
              <span class="amount ${shipping === 0 ? 'free-shipping' : ''}">
                ${shipping === 0 ? 'GRATIS' : '$' + shipping.toFixed(2)}
              </span>
            </div>
            <div class="summary-row total">
              <span>Total a Pagar:</span>
              <span class="amount">$${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <button 
          id="btn-confirm-payment" 
          class="btn-continue-payment" 
          style="opacity: 0.5; cursor: not-allowed;" 
          disabled
        >
          Selecciona un método de pago
        </button>
      </div>
    `;
    
    this.state.step = 2;
    console.log('💳 Mostrando métodos de pago');
  },
  
  // ========================================
  // Seleccionar método de pago
  // ========================================
  selectPaymentMethod(method) {
    this.state.paymentMethod = method;
    
    // Actualizar UI de selección
    document.querySelectorAll('.payment-option').forEach(option => {
      option.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
    
    // Habilitar botón de confirmar
    const btn = document.getElementById('btn-confirm-payment');
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
    
    const paymentNames = {
      'transfer': 'Transferencia Bancaria',
      'card': 'Tarjeta de Crédito/Débito',
      'cash': 'Pago en Efectivo',
      'paypal': 'PayPal'
    };
    
    btn.textContent = `Confirmar Pago con ${paymentNames[method]}`;
    btn.onclick = () => this.processPayment();
    
    console.log('💳 Método de pago seleccionado:', method);
  },
  
  // ========================================
  // STEP 3: Procesar pago simulado
  // ========================================
  async processPayment() {
    const btn = document.getElementById('btn-confirm-payment');
    btn.disabled = true;
    btn.textContent = 'Procesando pago...';
    
    if (window.ui) {
      window.ui.showLoading(true);
    }
    
    // Simular procesamiento (2 segundos)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generar número de orden
    this.state.orderNumber = 'MW-' + Date.now().toString().slice(-8);
    
    // Preparar datos de la orden
    const orderData = {
      orderNumber: this.state.orderNumber,
      email: this.state.customerData.email,
      firstName: this.state.customerData.firstName,
      lastName: this.state.customerData.lastName,
      address: this.state.customerData.address,
      apartment: this.state.customerData.apartment,
      city: this.state.customerData.city,
      postalCode: this.state.customerData.postalCode,
      phone: this.state.customerData.phone,
      shippingMethod: window.state.shippingMethod,
      paymentMethod: this.state.paymentMethod,
      items: window.state.cart.map(item => ({
        productId: item.productId,
        name: item.name,
        sku: item.sku,
        price: item.price,
        quantity: item.quantity
      })),
      totals: window.cart.calculateTotals()
    };
    
    try {
      // Guardar orden en API
      const result = await this.saveOrder(orderData);
      
      if (window.ui) {
        window.ui.showLoading(false);
      }
      
      if (result.success) {
        console.log('✅ Orden guardada exitosamente:', result);
        
        // Mostrar confirmación
        this.showConfirmation(orderData);
        
        // Limpiar carrito
        if (window.cart) {
          window.cart.clear();
        }
      } else {
        throw new Error(result.message || 'Error al guardar la orden');
      }
      
    } catch (error) {
      if (window.ui) {
        window.ui.showLoading(false);
      }
      console.error('❌ Error procesando pago:', error);
      
      // Mostrar confirmación de todos modos (modo simulado)
      this.showConfirmation(orderData);
      if (window.cart) {
        window.cart.clear();
      }
    }
  },
  
  // ========================================
  // Guardar orden en el backend
  // ========================================
  async saveOrder(orderData) {
    try {
      const response = await fetch(
        window.CONFIG.api.baseUrl + window.CONFIG.api.endpoints.saveOrder,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(orderData),
        }
      );

      const result = await response.json();
      return result;
      
    } catch (error) {
      console.error('Error saving order:', error);
      // En modo simulado, retornar éxito de todos modos
      return { success: true, orderNumber: orderData.orderNumber };
    }
  },
  
  // ========================================
  // STEP 4: Mostrar confirmación
  // ========================================
  showConfirmation(orderData) {
    const container = document.getElementById('checkout-form-container');
    
    const paymentMethodsInfo = {
      'transfer': {
        icon: '🏦',
        title: 'Transferencia Bancaria',
        instructions: `
          <h4>Datos para Transferencia:</h4>
          <div class="bank-details">
            <p><strong>Banco:</strong> Banco Pichincha</p>
            <p><strong>Cuenta Corriente:</strong> 1234567890</p>
            <p><strong>Beneficiario:</strong> Mawewe Store</p>
            <p><strong>RUC:</strong> 1234567890001</p>
            <p><strong>Monto:</strong> $${orderData.totals.total.toFixed(2)}</p>
            <p><strong>Referencia:</strong> ${this.state.orderNumber}</p>
          </div>
          <p style="color: var(--warning); margin-top: 1rem;">
            ⚠️ Importante: Envía el comprobante de pago a <strong>pagos@mawewe.com.ec</strong> con el número de orden.
          </p>
        `
      },
      'card': {
        icon: '💳',
        title: 'Tarjeta de Crédito/Débito',
        instructions: `
          <p style="color: var(--success); font-size: 1.1rem; margin-bottom: 1rem;">
            ✅ Pago procesado exitosamente
          </p>
          <p>Tu tarjeta ha sido cargada por <strong>$${orderData.totals.total.toFixed(2)}</strong></p>
          <p>Recibirás un email de confirmación en breve.</p>
        `
      },
      'cash': {
        icon: '💵',
        title: 'Pago en Efectivo',
        instructions: `
          <p style="font-size: 1.1rem; margin-bottom: 1rem;">
            💵 Pagarás en efectivo al recibir tu pedido
          </p>
          <p><strong>Monto a pagar:</strong> $${orderData.totals.total.toFixed(2)}</p>
          <p style="color: var(--gray-700); margin-top: 1rem;">
            Por favor, ten el monto exacto listo para agilizar la entrega.
          </p>
        `
      },
      'paypal': {
        icon: '💙',
        title: 'PayPal',
        instructions: `
          <p style="color: var(--success); font-size: 1.1rem; margin-bottom: 1rem;">
            ✅ Pago procesado exitosamente vía PayPal
          </p>
          <p>Se ha debitado <strong>$${orderData.totals.total.toFixed(2)}</strong> de tu cuenta PayPal</p>
          <p>Recibirás un email de confirmación de PayPal en breve.</p>
        `
      }
    };
    
    const paymentInfo = paymentMethodsInfo[this.state.paymentMethod];
    
    container.innerHTML = `
      <div class="order-confirmation">
        <div class="confirmation-icon">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M8 12l3 3 5-5"/>
          </svg>
        </div>
        
        <h2 style="color: var(--success); font-size: 2rem; margin: 1rem 0;">¡Pedido Confirmado!</h2>
        
        <div class="order-number">
          <p style="font-size: 0.9rem; color: var(--gray-600); margin-bottom: 0.5rem;">Número de Orden</p>
          <p style="font-size: 1.5rem; font-weight: 700; color: var(--primary-800);">${this.state.orderNumber}</p>
        </div>
        
        <div class="form-section" style="margin-top: 2rem;">
          <h3>${paymentInfo.icon} ${paymentInfo.title}</h3>
          <div style="background: var(--gray-50); padding: 1.5rem; border-radius: 12px;">
            ${paymentInfo.instructions}
          </div>
        </div>
        
        <div class="form-section">
          <h3>📦 Detalles del Pedido</h3>
          
          <div style="background: white; padding: 1rem; border-radius: 12px; border: 1px solid var(--gray-200);">
            ${orderData.items.map(item => `
              <div style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem 0; border-bottom: 1px solid var(--gray-100);">
                <div style="flex: 1;">
                  <div style="font-weight: 600; font-size: 0.9rem;">${item.name}</div>
                  <div style="font-size: 0.8rem; color: var(--gray-600);">Cantidad: ${item.quantity}</div>
                </div>
                <div style="font-weight: 700; color: var(--primary-800);">
                  $${(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            `).join('')}
            
            <div style="margin-top: 1rem; padding-top: 1rem; border-top: 2px solid var(--gray-200);">
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <span>Subtotal:</span>
                <span>$${orderData.totals.subtotal.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <span>Envío ${orderData.shippingMethod === 'express' ? 'Express' : 'Estándar'}:</span>
                <span style="color: ${orderData.totals.shipping === 0 ? 'var(--success)' : 'inherit'}">
                  ${orderData.totals.shipping === 0 ? 'GRATIS' : '$' + orderData.totals.shipping.toFixed(2)}
                </span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 1.2rem; font-weight: 700; margin-top: 1rem;">
                <span>Total:</span>
                <span style="color: var(--primary-800);">$${orderData.totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="form-section">
          <h3>🚚 Información de Envío</h3>
          <div style="background: var(--gray-50); padding: 1rem; border-radius: 12px;">
            <p style="margin-bottom: 0.5rem;"><strong>${orderData.firstName} ${orderData.lastName}</strong></p>
            <p style="margin-bottom: 0.5rem; color: var(--gray-700);">${orderData.address}${orderData.apartment ? ', ' + orderData.apartment : ''}</p>
            <p style="margin-bottom: 0.5rem; color: var(--gray-700);">${orderData.city}${orderData.postalCode ? ', ' + orderData.postalCode : ''}</p>
            <p style="margin-bottom: 0.5rem; color: var(--gray-700);">📧 ${orderData.email}</p>
            <p style="color: var(--gray-700);">📱 ${orderData.phone}</p>
          </div>
        </div>
        
        <div class="form-section" style="background: var(--primary-50); border: 2px solid var(--primary-200);">
          <p style="text-align: center; color: var(--gray-700); line-height: 1.6;">
            📧 Hemos enviado un email de confirmación a <strong>${orderData.email}</strong>
            <br/>
            ${orderData.shippingMethod === 'express' ? '🚀 Tu pedido llegará en 1-2 días hábiles' : '📦 Tu pedido llegará en 3-5 días hábiles'}
          </p>
        </div>
        
        <div style="display: flex; gap: 1rem; margin-top: 2rem;">
          <button onclick="checkout.closeCheckout(); if(window.ui) window.ui.toggleCart();" class="btn-continue-payment" style="flex: 1;">
            Cerrar
          </button>
          <button onclick="window.print();" class="btn-continue-payment" style="flex: 1; background: var(--gray-700);">
            🖨️ Imprimir Orden
          </button>
        </div>
      </div>
    `;
    
    this.state.step = 3;
    
    // Mostrar notificación de éxito
    if (window.ui) {
      window.ui.showNotification(`¡Orden ${this.state.orderNumber} confirmada! 🎉`);
    }
    
    console.log('✅ Orden completada:', this.state.orderNumber);
  },
  
  // ========================================
  // Cerrar checkout
  // ========================================
  closeCheckout() {
    const cartItems = document.getElementById('cart-items');
    const cartFooter = document.getElementById('cart-footer');
    const container = document.getElementById('checkout-form-container');
    
    if (cartItems) cartItems.style.display = 'block';
    if (cartFooter) cartFooter.style.display = 'block';
    if (container) container.style.display = 'none';
    
    // Resetear estado
    this.state.step = 1;
    this.state.customerData = {};
    this.state.paymentMethod = null;
    this.state.orderNumber = null;
    
    console.log('🔙 Checkout cerrado');
  }
};

// ✅ FIX: Exportar para uso global
window.checkout = checkout;

// ✅ FIX: También crear alias en el namespace mawewe si existe
if (window.mawewe) {
  window.mawewe.checkout = checkout;
}

console.log('✅ Sistema de checkout simulado cargado y exportado correctamente');