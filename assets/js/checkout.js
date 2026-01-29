/**
 * MAWEWE E-COMMERCE - CHECKOUT CORREGIDO
 * ✅ FIX: Envío SIEMPRE GRATIS (sin opciones)
 * ✅ SIN PDF - Solo WhatsApp
 * ✅ Sin paypal_order_id
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
    orderNumber: null,
    orderId: null,
  },

  // ========================================
  // HELPER: Obtener referencia al carrito
  // ========================================
  getCart() {
    if (window.mawewe && window.mawewe.cart) {
      return window.mawewe.cart;
    }
    if (window.cart) {
      return window.cart;
    }
    console.error("❌ Cart no encontrado");
    return null;
  },

  // ========================================
  // HELPER: Obtener referencia al state
  // ========================================
  getState() {
    if (window.mawewe && window.mawewe.state) {
      return window.mawewe.state;
    }
    if (window.state) {
      return window.state;
    }
    console.error("❌ State no encontrado");
    return null;
  },

  // ========================================
  // HELPER: Obtener items del carrito
  // ========================================
  getCartItems() {
    const state = this.getState();
    if (state && state.cart && Array.isArray(state.cart)) {
      return state.cart;
    }
    return [];
  },

  // ========================================
  // STEP 1: Abrir formulario de checkout
  // ========================================
  openCheckout() {
    console.log("🔍 DEBUG Checkout - Verificando referencias...");

    const cart = this.getCart();
    const cartItems = this.getCartItems();

    console.log("- Cart encontrado:", !!cart);
    console.log("- Items en carrito:", cartItems.length);

    if (!cart) {
      alert(
        "Error: Sistema de carrito no disponible. Por favor recarga la página.",
      );
      return;
    }

    if (cartItems.length === 0) {
      console.log("❌ Carrito vacío");
      if (window.mawewe && window.mawewe.ui) {
        window.mawewe.ui.showNotification("El carrito está vacío", "error");
      } else {
        alert("El carrito está vacío");
      }
      return;
    }

    console.log("✅ Carrito válido, abriendo checkout...");

    // Ocultar items del carrito y footer
    const cartItemsContainer = document.getElementById("cart-items");
    const cartFooter = document.getElementById("cart-footer");
    const container = document.getElementById("checkout-form-container");

    if (cartItemsContainer) cartItemsContainer.style.display = "none";
    if (cartFooter) cartFooter.style.display = "none";

    // Mostrar formulario de checkout
    if (container) {
      container.style.display = "block";
      container.innerHTML = this.renderCheckoutForm();
    }

    console.log("✅ Checkout abierto - Step 1: Datos del cliente");
  },

  // ========================================
  // Renderizar formulario principal
  // ========================================
  renderCheckoutForm() {
    const cart = this.getCart();

    if (!cart || typeof cart.calculateTotals !== "function") {
      console.error("❌ Error: cart.calculateTotals no disponible");
      return '<p style="color: red; padding: 2rem;">Error: Sistema de carrito no disponible. Por favor recarga la página.</p>';
    }

    const { subtotal, shipping, total } = cart.calculateTotals();
    const cartItems = this.getCartItems();

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
        
        <!-- ✅ MÉTODO DE ENVÍO - SOLO GRATIS -->
        <div class="form-section">
          <h3>🚚 Método de Envío</h3>
          
          <div style="background: #d4edda; padding: 1.5rem; border-radius: 12px; border: 2px solid #c3e6cb; text-align: center;">
            <div style="font-size: 3rem; margin-bottom: 0.5rem;">✓</div>
            <h4 style="color: #155724; font-size: 1.25rem; margin-bottom: 0.5rem;">Envío Gratis</h4>
            <p style="color: #155724; margin: 0;">Entrega en 3-5 días hábiles sin costo adicional</p>
          </div>
        </div>
        
        <!-- Resumen del Pedido -->
        <div class="checkout-summary">
          <h3>📋 Resumen del Pedido</h3>
          
          <div class="summary-items">
            ${cartItems
              .map(
                (item) => `
              <div class="summary-item">
                <img src="${item.image}" alt="${item.name}" />
                <div class="summary-item-info">
                  <div style="font-weight: 600;">${item.name}</div>
                  <div class="quantity">Cantidad: ${item.quantity}</div>
                </div>
                <div class="summary-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
              </div>
            `,
              )
              .join("")}
          </div>
          
          <div class="summary-totals">
            <div class="summary-row">
              <span>Subtotal:</span>
              <span class="amount">$${subtotal.toFixed(2)}</span>
            </div>
            <div class="summary-row">
              <span>Envío:</span>
              <span class="amount free-shipping">GRATIS ✓</span>
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
  // STEP 2: Procesar datos del cliente
  // ========================================
  submitCustomerData(event) {
    event.preventDefault();

    console.log("📝 Procesando datos del cliente...");

    const formData = new FormData(event.target);

    this.state.customerData = {
      email: formData.get("email"),
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      address: formData.get("address"),
      apartment: formData.get("apartment"),
      city: formData.get("city"),
      postalCode: formData.get("postalCode"),
      phone: formData.get("phone"),
      newsletter: formData.get("newsletter") === "on",
      saveInfo: formData.get("saveInfo") === "on",
    };

    if (this.state.customerData.saveInfo) {
      localStorage.setItem(
        "mawewe_customer_data",
        JSON.stringify(this.state.customerData),
      );
    }

    console.log("✅ Datos del cliente guardados:", this.state.customerData);

    this.showPaymentMethods();
  },

  // ========================================
  // STEP 2: Mostrar métodos de pago
  // ========================================
  showPaymentMethods() {
    const container = document.getElementById("checkout-form-container");
    const cart = this.getCart();

    if (!cart) {
      container.innerHTML =
        '<p style="color: red; padding: 2rem;">Error: Sistema de carrito no disponible</p>';
      return;
    }

    const { subtotal, shipping, total } = cart.calculateTotals();
    const cartItems = this.getCartItems();

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
            <p style="margin-bottom: 0.5rem; color: var(--gray-700);">${this.state.customerData.address}${this.state.customerData.apartment ? ", " + this.state.customerData.apartment : ""}</p>
            <p style="margin-bottom: 0.5rem; color: var(--gray-700);">${this.state.customerData.city}${this.state.customerData.postalCode ? ", " + this.state.customerData.postalCode : ""}</p>
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
              <span>Envío Estándar:</span>
              <span class="amount free-shipping">GRATIS ✓</span>
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
    console.log("💳 Mostrando métodos de pago");
  },

  // ========================================
  // Seleccionar método de pago
  // ========================================
  selectPaymentMethod(method) {
    this.state.paymentMethod = method;

    document.querySelectorAll(".payment-option").forEach((option) => {
      option.classList.remove("selected");
    });
    event.currentTarget.classList.add("selected");

    const btn = document.getElementById("btn-confirm-payment");
    btn.disabled = false;
    btn.style.opacity = "1";
    btn.style.cursor = "pointer";

    const paymentNames = {
      transfer: "Transferencia Bancaria",
      card: "Tarjeta de Crédito/Débito",
      cash: "Pago en Efectivo",
      paypal: "PayPal",
    };

    btn.textContent = `Confirmar Pago con ${paymentNames[method]}`;
    btn.onclick = () => this.processPayment();

    console.log("💳 Método de pago seleccionado:", method);
  },

  // ========================================
  // STEP 3: Procesar pago simulado
  // ========================================
  async processPayment() {
    const btn = document.getElementById("btn-confirm-payment");
    btn.disabled = true;
    btn.textContent = "Procesando pago...";

    const mawewe = window.mawewe;
    if (mawewe && mawewe.ui) {
      mawewe.ui.showLoading(true);
    }

    try {
      const cart = this.getCart();
      const cartItems = this.getCartItems();

      if (!cart) {
        throw new Error("Sistema de carrito no disponible");
      }

      const totals = cart.calculateTotals();

      // Preparar datos de la orden
      const orderData = {
        email: this.state.customerData.email,
        firstName: this.state.customerData.firstName,
        lastName: this.state.customerData.lastName,
        address: this.state.customerData.address || "",
        apartment: this.state.customerData.apartment || "",
        city: this.state.customerData.city || "",
        postalCode: this.state.customerData.postalCode || "",
        phone: this.state.customerData.phone || "",
        shippingMethod: "standard",
        paymentMethod: this.state.paymentMethod,
        items: cartItems.map((item) => ({
          productId: item.productId,
          name: item.name,
          sku: item.sku,
          price: item.price,
          quantity: item.quantity,
        })),
        totals: totals,
      };

      console.log("📤 Enviando orden al servidor:", orderData);

      // Simular delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Guardar orden
      const result = await this.saveOrder(orderData);

      if (mawewe && mawewe.ui) {
        mawewe.ui.showLoading(false);
      }

      if (result.success) {
        console.log("✅ Orden guardada exitosamente:", result);

        this.state.orderId = result.orderId;
        this.state.orderNumber = result.orderNumber;

        // Mostrar confirmación
        this.showConfirmation(orderData, result);

        // Limpiar carrito
        if (cart && typeof cart.clear === "function") {
          cart.clear();
        }

        // Marcar que compró
        localStorage.setItem("has_purchased", "true");

        // Google Analytics
        if (typeof gtag !== "undefined") {
          gtag("event", "purchase", {
            transaction_id: result.orderNumber,
            value: totals.total,
            currency: "USD",
            items: orderData.items.map((item) => ({
              item_id: item.sku,
              item_name: item.name,
              price: item.price,
              quantity: item.quantity,
            })),
          });
        }
      } else {
        throw new Error(result.message || "Error al guardar la orden");
      }
    } catch (error) {
      const mawewe = window.mawewe;
      if (mawewe && mawewe.ui) {
        mawewe.ui.showLoading(false);
        mawewe.ui.showNotification(
          "Error al procesar el pago: " + error.message,
          "error",
        );
      }

      console.error("❌ Error procesando pago:", error);

      btn.disabled = false;
      btn.textContent = "Reintentar Pago";

      alert(
        "❌ Error al procesar el pago\n\n" +
          "Detalles: " +
          error.message +
          "\n\n" +
          "Por favor intenta nuevamente.\n\n" +
          "Si el problema persiste:\n" +
          "WhatsApp: +593 98 183 2313",
      );
    }
  },

  // ========================================
  // Guardar orden en el backend
  // ========================================
  async saveOrder(orderData) {
    try {
      console.log("💾 Guardando orden en servidor...");

      const apiBase =
        window.CONFIG && window.CONFIG.api && window.CONFIG.api.baseUrl
          ? window.CONFIG.api.baseUrl
          : "https://mawewe.com.ec/api";

      const saveOrderUrl =
        window.CONFIG &&
        window.CONFIG.api &&
        window.CONFIG.api.endpoints &&
        window.CONFIG.api.endpoints.saveOrder
          ? window.CONFIG.api.endpoints.saveOrder
          : "/save-order.php";

      const url = apiBase + saveOrderUrl;

      console.log("📡 URL:", url);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("❌ Respuesta no es JSON:", text);
        throw new Error("El servidor no respondió correctamente");
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `Error HTTP ${response.status}`);
      }

      console.log("✅ Respuesta del servidor:", result);

      return result;
    } catch (error) {
      console.error("❌ Error en saveOrder:", error);

      return {
        success: false,
        message: error.message || "Error de conexión",
        error: error.toString(),
      };
    }
  },

  // ========================================
  // STEP 4: Mostrar confirmación - SIN PDF
  // ========================================
  showConfirmation(orderData, serverResponse = {}) {
    const container = document.getElementById("checkout-form-container");

    const orderId = serverResponse.orderId || this.state.orderId || "N/A";
    const orderNumber =
      serverResponse.orderNumber || this.state.orderNumber || "N/A";

    const paymentMethodsInfo = {
      transfer: {
        icon: "🏦",
        title: "Transferencia Bancaria",
        instructions: `
          <h4>Datos para Transferencia:</h4>
          <div class="bank-details">
            <p><strong>Banco:</strong> Banco Pichincha</p>
            <p><strong>Tipo:</strong> Cuenta Corriente</p>
            <p><strong>Número de Cuenta:</strong> 2100123456</p>
            <p><strong>Beneficiario:</strong> Mawewe E-commerce</p>
            <p><strong>RUC:</strong> 1234567890001</p>
            <p><strong>Monto:</strong> <span style="color: var(--primary-800); font-size: 1.2rem;">$${orderData.totals.total.toFixed(2)}</span></p>
            <p><strong>Referencia:</strong> <span style="color: var(--primary-800); font-weight: 700;">${orderNumber}</span></p>
          </div>
          <div style="background: #f39c12; padding: 1rem; border-radius: 8px; margin-top: 1rem; color: white;">
            <p style="margin: 0; font-weight: 600;">
              ⚠️ Envía el comprobante a: <strong>pagos@mawewe.com.ec</strong>
            </p>
          </div>
        `,
      },
      card: {
        icon: "💳",
        title: "Tarjeta de Crédito/Débito",
        instructions: `
          <div style="text-align: center; padding: 2rem;">
            <div style="font-size: 4rem; margin-bottom: 1rem;">✅</div>
            <p style="color: var(--success); font-size: 1.2rem; font-weight: 600; margin-bottom: 1rem;">
              ¡Pago Procesado Exitosamente!
            </p>
            <p>Tu tarjeta ha sido cargada por <strong>$${orderData.totals.total.toFixed(2)}</strong></p>
          </div>
        `,
      },
      cash: {
        icon: "💵",
        title: "Pago en Efectivo",
        instructions: `
          <div style="padding: 1.5rem; text-align: center;">
            <div style="font-size: 4rem; margin-bottom: 1rem;">💵</div>
            <p style="font-size: 1.2rem; font-weight: 600; margin-bottom: 1rem;">
              Pagarás en Efectivo al Recibir
            </p>
            <div style="background: var(--primary-50); padding: 1.5rem; border-radius: 12px;">
              <p style="font-size: 2rem; font-weight: 700; color: var(--primary-800);">
                $${orderData.totals.total.toFixed(2)}
              </p>
            </div>
          </div>
        `,
      },
      paypal: {
        icon: "💙",
        title: "PayPal",
        instructions: `
          <div style="text-align: center; padding: 2rem;">
            <div style="font-size: 4rem; margin-bottom: 1rem;">✅</div>
            <p style="color: var(--success); font-size: 1.2rem; font-weight: 600;">
              ¡Pago Procesado vía PayPal!
            </p>
            <p>Debitado: <strong>$${orderData.totals.total.toFixed(2)}</strong></p>
          </div>
        `,
      },
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
          <p style="font-size: 1.5rem; font-weight: 700; color: var(--primary-800);">${orderNumber}</p>
          ${orderId !== "N/A" ? `<p style="font-size: 0.8rem; color: var(--gray-500); margin-top: 0.25rem;">ID: #${orderId}</p>` : ""}
        </div>
        
        <div class="form-section" style="margin-top: 2rem;">
          <h3>${paymentInfo.icon} ${paymentInfo.title}</h3>
          <div style="background: var(--gray-50); padding: 1.5rem; border-radius: 12px;">
            ${paymentInfo.instructions}
          </div>
        </div>
        
        <div style="background: #d4edda; padding: 1rem; border-radius: 12px; margin-top: 1rem; border: 2px solid #c3e6cb;">
          <p style="margin: 0; color: #155724; font-weight: 600; text-align: center;">
            ✓ Envío Gratis - Recibirás tu pedido en 3-5 días hábiles
          </p>
        </div>
        
        <div style="display: flex; gap: 1rem; margin-top: 2rem; flex-wrap: wrap;">
          <button 
            onclick="checkout.closeCheckout(); if(window.mawewe && window.mawewe.ui) window.mawewe.ui.toggleCart();" 
            class="btn-continue-payment" 
            style="flex: 1; min-width: 200px;"
          >
            ✓ Cerrar
          </button>
          <a 
            href="https://wa.me/593981832313?text=Hola,%20mi%20orden%20es%20${orderNumber}%20por%20$${orderData.totals.total.toFixed(2)}" 
            target="_blank"
            class="btn-continue-payment" 
            style="flex: 1; min-width: 200px; background: linear-gradient(135deg, #25D366 0%, #128C7E 100%); text-decoration: none; display: flex; align-items: center; justify-content: center;"
          >
            📱 WhatsApp
          </a>
        </div>
      </div>
    `;

    this.state.step = 3;

    const mawewe = window.mawewe;
    if (mawewe && mawewe.ui) {
      mawewe.ui.showNotification(`¡Orden ${orderNumber} confirmada! 🎉`);
    }

    console.log("✅ Orden completada:", orderNumber);
  },

  // ========================================
  // Cerrar checkout
  // ========================================
  closeCheckout() {
    const cartItems = document.getElementById("cart-items");
    const cartFooter = document.getElementById("cart-footer");
    const container = document.getElementById("checkout-form-container");

    if (cartItems) cartItems.style.display = "block";
    if (cartFooter) cartFooter.style.display = "block";
    if (container) container.style.display = "none";

    this.state = {
      step: 1,
      customerData: {},
      paymentMethod: null,
      orderNumber: null,
      orderId: null,
    };

    console.log("🔙 Checkout cerrado");
  },
};

// Exportar
window.checkout = checkout;

if (window.mawewe) {
  window.mawewe.checkout = checkout;
}

console.log("✅ Checkout cargado (sin PDF, sin paypal_order_id)")