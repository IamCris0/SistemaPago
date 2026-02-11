/**
 * MAWEWE E-COMMERCE - CHECKOUT CORREGIDO
 * ✅ Datos bancarios actualizados
 * ✅ Fix del monto $0.00
 * ✅ Descarga de comprobante PDF
 * ✅ Envío directo a WhatsApp
 */

// =============================================================================
// CHECKOUT NAMESPACE
// =============================================================================

const checkout = {
  state: {
    step: 1,
    customerData: {},
    paymentMethod: null,
    orderNumber: null,
    orderId: null,
    paypalOrderId: null,
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

    const cartItemsContainer = document.getElementById("cart-items");
    const cartFooter = document.getElementById("cart-footer");
    const container = document.getElementById("checkout-form-container");

    if (cartItemsContainer) cartItemsContainer.style.display = "none";
    if (cartFooter) cartFooter.style.display = "none";

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
        
        <!-- Método de Envío -->
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
            
            <!-- PayPal LIVE -->
            <label class="payment-option" onclick="checkout.selectPaymentMethod('paypal')">
              <input type="radio" name="payment" value="paypal" />
              <div class="payment-method-content">
                <div class="payment-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="#003087">
                    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.77.77 0 0 1 .76-.653h8.023c2.83 0 4.8.584 5.856 1.735 1.087 1.185 1.423 2.923 1.023 5.318-.016.094-.033.187-.052.281-.73 3.474-2.935 5.237-6.557 5.237h-1.672a.77.77 0 0 0-.76.652l-.055.283-.867 5.5a.641.641 0 0 1-.633.55z"/>
                  </svg>
                </div>
                <div class="payment-details">
                  <div class="payment-name">PayPal</div>
                  <div class="payment-description">Pago rápido y seguro (LIVE)</div>
                </div>
              </div>
            </label>
            
            <!-- Transferencia Bancaria -->
            <label class="payment-option" onclick="checkout.selectPaymentMethod('transfer')">
              <input type="radio" name="payment" value="transfer" />
              <div class="payment-method-content">
                <div class="payment-icon">🏦</div>
                <div class="payment-details">
                  <div class="payment-name">Transferencia Bancaria</div>
                  <div class="payment-description">Banco Pichincha - Datos en confirmación</div>
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
        
        <!-- Botón de pago / PayPal Container -->
        <div id="payment-button-container"></div>
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

    const buttonContainer = document.getElementById("payment-button-container");

    if (method === 'paypal') {
      this.renderPayPalButtons();
    } else if (method === 'transfer' || method === 'cash') {
      const paymentNames = {
        transfer: "Transferencia Bancaria",
        cash: "Pago en Efectivo",
      };

      buttonContainer.innerHTML = `
        <button 
          id="btn-confirm-payment" 
          class="btn-continue-payment"
          onclick="checkout.processPayment()"
        >
          Confirmar Pago con ${paymentNames[method]}
        </button>
      `;
    }

    console.log("💳 Método de pago seleccionado:", method);
  },

  // ========================================
  // PAYPAL: Renderizar botones LIVE
  // ========================================
  renderPayPalButtons() {
    const buttonContainer = document.getElementById("payment-button-container");

    if (!buttonContainer) {
      console.error("❌ payment-button-container no encontrado");
      return;
    }

    buttonContainer.innerHTML = '<div id="paypal-button-container"></div>';

    const clientId = window.CONFIG?.paypal?.clientId || window.mawewe?.CONFIG?.paypal?.clientId;

    if (!clientId) {
      console.error("❌ PayPal Client ID no configurado");
      buttonContainer.innerHTML = `
        <div style="padding: 2rem; background: #fee; border: 1px solid #fcc; border-radius: 8px; text-align: center;">
          <p style="color: #c00; font-weight: 600;">Error de configuración PayPal</p>
          <p style="color: #666;">Por favor contacta al administrador</p>
        </div>
      `;
      return;
    }

    console.log("💳 Cargando PayPal SDK con Client ID:", clientId.substring(0, 20) + "...");

    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
    script.addEventListener('load', () => {
      this.initPayPalButtons();
    });
    script.addEventListener('error', () => {
      console.error("❌ Error cargando PayPal SDK");
      buttonContainer.innerHTML = `
        <div style="padding: 2rem; background: #fee; border: 1px solid #fcc; border-radius: 8px; text-align: center;">
          <p style="color: #c00; font-weight: 600;">Error al cargar PayPal</p>
          <p style="color: #666;">Por favor intenta más tarde</p>
        </div>
      `;
    });

    document.body.appendChild(script);
  },

  // ========================================
  // PAYPAL: Inicializar botones
  // ========================================
  initPayPalButtons() {
    const cart = this.getCart();
    const { total } = cart.calculateTotals();

    console.log("💳 Inicializando botones PayPal (LIVE)...");

    paypal.Buttons({
      style: {
        layout: 'vertical',
        color: 'gold',
        shape: 'rect',
        label: 'paypal'
      },

      createOrder: (data, actions) => {
        console.log("💳 Creando orden PayPal...");
        
        return actions.order.create({
          purchase_units: [{
            amount: {
              value: total.toFixed(2),
              currency_code: 'USD'
            },
            description: `Pedido Mawewe - ${this.getCartItems().length} items`
          }]
        });
      },

      onApprove: async (data, actions) => {
        console.log("✅ Pago aprobado por PayPal:", data);

        const mawewe = window.mawewe;
        if (mawewe && mawewe.ui) {
          mawewe.ui.showLoading(true);
        }

        try {
          const details = await actions.order.capture();
          console.log("✅ Pago capturado:", details);

          this.state.paypalOrderId = data.orderID;

          await this.saveOrderToDatabase();

          if (mawewe && mawewe.ui) {
            mawewe.ui.showLoading(false);
          }

          this.showConfirmation({
            paypal_details: details
          });

        } catch (error) {
          console.error("❌ Error procesando pago PayPal:", error);

          if (mawewe && mawewe.ui) {
            mawewe.ui.showLoading(false);
            mawewe.ui.showNotification("Error al procesar el pago", "error");
          }

          alert("Error al procesar el pago. Por favor contacta al soporte.");
        }
      },

      onCancel: (data) => {
        console.log("⚠️ Pago cancelado por el usuario");
        const mawewe = window.mawewe;
        if (mawewe && mawewe.ui) {
          mawewe.ui.showNotification("Pago cancelado", "error");
        }
      },

      onError: (err) => {
        console.error("❌ Error PayPal:", err);
        const mawewe = window.mawewe;
        if (mawewe && mawewe.ui) {
          mawewe.ui.showNotification("Error en PayPal", "error");
        }
        alert("Error al procesar con PayPal. Por favor intenta otro método de pago.");
      }

    }).render('#paypal-button-container');

    console.log("✅ Botones PayPal renderizados");
  },

  // ========================================
  // STEP 3: Procesar pago manual
  // ========================================
  async processPayment() {
    const btn = document.getElementById("btn-confirm-payment");
    btn.disabled = true;
    btn.textContent = "Procesando...";

    const mawewe = window.mawewe;
    if (mawewe && mawewe.ui) {
      mawewe.ui.showLoading(true);
    }

    try {
      await this.saveOrderToDatabase();

      if (mawewe && mawewe.ui) {
        mawewe.ui.showLoading(false);
      }

      this.showConfirmation();

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
  async saveOrderToDatabase() {
    const cart = this.getCart();
    const cartItems = this.getCartItems();

    if (!cart) {
      throw new Error("Sistema de carrito no disponible");
    }

    const totals = cart.calculateTotals();

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

    try {
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

      console.log("✅ Orden guardada:", result);

      this.state.orderId = result.orderId;
      this.state.orderNumber = result.orderNumber;

      if (cart && typeof cart.clear === "function") {
        cart.clear();
      }

      localStorage.setItem("has_purchased", "true");

      return result;

    } catch (error) {
      console.error("❌ Error guardando orden:", error);
      throw error;
    }
  },

  // ========================================
  // STEP 4: Mostrar confirmación
  // ========================================
  showConfirmation(serverResponse = {}) {
    const container = document.getElementById("checkout-form-container");

    const orderId = serverResponse.orderId || this.state.orderId || "N/A";
    const orderNumber =
      serverResponse.orderNumber || this.state.orderNumber || "N/A";

    const cart = this.getCart();
    const { total } = cart.calculateTotals();
    const cartItems = this.getCartItems();

    // ✅ FIX: Guardar total en el state para uso posterior
    this.state.orderTotal = total;

    const paymentMethodsInfo = {
      transfer: {
        icon: "🏦",
        title: "Transferencia Bancaria",
        instructions: `
          <h4>✅ Datos para Transferencia:</h4>
          <div class="bank-details">
            <p><strong>Banco:</strong> Banco Pichincha</p>
            <p><strong>Tipo:</strong> Cuenta Corriente</p>
            <p><strong>Número de Cuenta:</strong> 2100291784</p>
            <p><strong>Beneficiario:</strong> Víctor Manuel Vargas Motoche</p>
            <p><strong>Monto:</strong> <span style="color: var(--primary-800); font-size: 1.2rem;">$${total.toFixed(2)}</span></p>
            <p><strong>Referencia:</strong> <span style="color: var(--primary-800); font-weight: 700;">${orderNumber}</span></p>
          </div>
          <div style="background: #f39c12; padding: 1rem; border-radius: 8px; margin-top: 1rem; color: white;">
            <p style="margin: 0; font-weight: 600;">
              ⚠️ Envía el comprobante a: <strong>+593 98 183 2313</strong>
            </p>
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
                $${total.toFixed(2)}
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
            <p>Debitado: <strong>$${total.toFixed(2)}</strong></p>
            ${this.state.paypalOrderId ? `<p style="font-size: 0.8rem; color: var(--gray-600); margin-top: 0.5rem;">ID PayPal: ${this.state.paypalOrderId}</p>` : ''}
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

        <!-- BOTONES DE DESCARGA Y WHATSAPP -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 2rem;">
          <button 
            onclick="checkout.downloadReceipt()" 
            class="btn-continue-payment" 
            style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"
          >
            📄 Descargar Comprobante
          </button>
          <button 
            onclick="checkout.sendToWhatsApp()" 
            class="btn-continue-payment" 
            style="background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);"
          >
            📱 Enviar a WhatsApp
          </button>
        </div>
        
        <button 
          onclick="checkout.closeCheckout(); if(window.mawewe && window.mawewe.ui) window.mawewe.ui.toggleCart();" 
          class="btn-continue-payment" 
          style="margin-top: 1rem; background: var(--gray-600);"
        >
          ✓ Cerrar
        </button>
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
  // NUEVA FUNCIÓN: Descargar comprobante PDF
  // ========================================
  downloadReceipt() {
    const cart = this.getCart();
    const cartItems = this.getCartItems();
    const { subtotal, shipping, total } = this.state.orderTotal 
      ? { subtotal: this.state.orderTotal - 0, shipping: 0, total: this.state.orderTotal }
      : cart.calculateTotals();

    const orderNumber = this.state.orderNumber || "N/A";
    const customerData = this.state.customerData;

    // Generar contenido del comprobante
    let receiptHTML = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Comprobante de Compra - ${orderNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
    h1 { color: #8C004B; text-align: center; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #8C004B; padding-bottom: 10px; }
    .section { margin: 20px 0; }
    .section h2 { color: #8C004B; border-bottom: 2px solid #8C004B; padding-bottom: 5px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #8C004B; color: white; }
    .total-row { font-weight: bold; font-size: 1.2em; background-color: #f0f0f0; }
    .bank-info { background-color: #fffacd; padding: 15px; border-radius: 8px; border: 2px solid #f39c12; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🛒 MAWEWE</h1>
    <p>Comprobante de Compra</p>
    <p><strong>Orden: ${orderNumber}</strong></p>
    <p>Fecha: ${new Date().toLocaleString('es-EC')}</p>
  </div>

  <div class="section">
    <h2>📋 Datos del Cliente</h2>
    <p><strong>Nombre:</strong> ${customerData.firstName} ${customerData.lastName}</p>
    <p><strong>Email:</strong> ${customerData.email}</p>
    <p><strong>Teléfono:</strong> ${customerData.phone}</p>
    <p><strong>Dirección:</strong> ${customerData.address}${customerData.apartment ? ', ' + customerData.apartment : ''}</p>
    <p><strong>Ciudad:</strong> ${customerData.city}${customerData.postalCode ? ', CP: ' + customerData.postalCode : ''}</p>
  </div>

  <div class="section">
    <h2>🛍️ Productos Comprados</h2>
    <table>
      <thead>
        <tr>
          <th>Producto</th>
          <th>SKU</th>
          <th>Cantidad</th>
          <th>Precio Unit.</th>
          <th>Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${cartItems.map(item => `
          <tr>
            <td>${item.name}</td>
            <td>${item.sku}</td>
            <td>${item.quantity}</td>
            <td>$${item.price.toFixed(2)}</td>
            <td>$${(item.price * item.quantity).toFixed(2)}</td>
          </tr>
        `).join('')}
        <tr>
          <td colspan="4" style="text-align: right;"><strong>Subtotal:</strong></td>
          <td><strong>$${subtotal.toFixed(2)}</strong></td>
        </tr>
        <tr>
          <td colspan="4" style="text-align: right;"><strong>Envío:</strong></td>
          <td><strong style="color: green;">GRATIS ✓</strong></td>
        </tr>
        <tr class="total-row">
          <td colspan="4" style="text-align: right;">TOTAL A PAGAR:</td>
          <td>$${total.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  ${this.state.paymentMethod === 'transfer' ? `
  <div class="section">
    <h2>🏦 Datos Bancarios para Transferencia</h2>
    <div class="bank-info">
      <p><strong>Banco:</strong> Banco Pichincha</p>
      <p><strong>Tipo de Cuenta:</strong> Cuenta Corriente</p>
      <p><strong>Número de Cuenta:</strong> 2100291784</p>
      <p><strong>Beneficiario:</strong> Víctor Manuel Vargas Motoche</p>
      <p><strong>Monto a Transferir:</strong> $${total.toFixed(2)}</p>
      <p><strong>Referencia:</strong> ${orderNumber}</p>
      <p style="color: #f39c12; font-weight: bold; margin-top: 15px;">
        ⚠️ IMPORTANTE: Enviar comprobante de pago a WhatsApp +593 98 183 2313
      </p>
    </div>
  </div>
  ` : ''}

  <div class="section">
    <h2>📦 Información de Envío</h2>
    <p><strong>Método:</strong> Envío Estándar (GRATIS)</p>
    <p><strong>Tiempo estimado:</strong> 3-5 días hábiles</p>
  </div>

  <div class="section" style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #8C004B;">
    <p><strong>¿Preguntas?</strong> Contáctanos:</p>
    <p>📱 WhatsApp: +593 98 183 2313</p>
    <p>📧 Email: info@mawewe.com.ec</p>
    <p>🌐 Web: https://mawewe.com.ec</p>
    <p style="margin-top: 20px; color: #666; font-size: 0.9em;">
      Gracias por tu compra 💖
    </p>
  </div>
</body>
</html>
    `;

    // Crear blob y descargar
    const blob = new Blob([receiptHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Comprobante-Mawewe-${orderNumber}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (window.mawewe && window.mawewe.ui) {
      window.mawewe.ui.showNotification('📄 Comprobante descargado correctamente');
    }

    console.log('✅ Comprobante descargado');
  },

  // ========================================
  // NUEVA FUNCIÓN: Enviar a WhatsApp
  // ========================================
  sendToWhatsApp() {
    const orderNumber = this.state.orderNumber || "N/A";
    const customerData = this.state.customerData;
    const cartItems = this.getCartItems();
    const total = this.state.orderTotal || 0;

    // Construir mensaje
    let message = `🛒 *PEDIDO MAWEWE*\n\n`;
    message += `📋 *Orden:* ${orderNumber}\n`;
    message += `👤 *Cliente:* ${customerData.firstName} ${customerData.lastName}\n`;
    message += `📧 *Email:* ${customerData.email}\n`;
    message += `📱 *Teléfono:* ${customerData.phone}\n`;
    message += `📍 *Dirección:* ${customerData.address}, ${customerData.city}\n\n`;
    
    message += `🛍️ *PRODUCTOS:*\n`;
    cartItems.forEach((item, index) => {
      message += `${index + 1}. ${item.name}\n`;
      message += `   SKU: ${item.sku}\n`;
      message += `   Cant: ${item.quantity} x $${item.price.toFixed(2)} = $${(item.price * item.quantity).toFixed(2)}\n\n`;
    });
    
    message += `💰 *TOTAL: $${total.toFixed(2)}*\n\n`;

    if (this.state.paymentMethod === 'transfer') {
      message += `🏦 *DATOS BANCARIOS:*\n`;
      message += `Banco: Pichincha\n`;
      message += `Cuenta Corriente: 2100291784\n`;
      message += `Beneficiario: Víctor Manuel Vargas Motoche\n`;
      message += `Referencia: ${orderNumber}\n\n`;
      message += `⚠️ *Enviaré el comprobante de pago*`;
    } else if (this.state.paymentMethod === 'cash') {
      message += `💵 Pagaré en efectivo al recibir`;
    } else if (this.state.paymentMethod === 'paypal') {
      message += `✅ Pago realizado vía PayPal`;
    }

    const whatsappURL = `https://wa.me/593981832313?text=${encodeURIComponent(message)}`;
    window.open(whatsappURL, '_blank');

    if (window.mawewe && window.mawewe.ui) {
      window.mawewe.ui.showNotification('📱 Abriendo WhatsApp...');
    }

    console.log('✅ Enviando a WhatsApp');
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
      paypalOrderId: null,
      orderTotal: null,
    };

    console.log("🔙 Checkout cerrado");
  },
};

// Exportar
window.checkout = checkout;

if (window.mawewe) {
  window.mawewe.checkout = checkout;
}

console.log("✅ Checkout cargado (CORREGIDO: Datos bancarios + Fix monto + Descarga PDF + WhatsApp)");