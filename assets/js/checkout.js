/**
 * MAWEWE E-COMMERCE - CHECKOUT v3.0
 * ✅ Descuento automático -16% con PayPal
 * ✅ Descuento automático -20% con Transferencia / Efectivo
 * ✅ Envío GRATIS solo en compras superiores a $60 (precio final)
 * ✅ FIX DEFINITIVO: Productos y total correctos en PDF y WhatsApp
 */

const checkout = {
  state: {
    step: 1,
    customerData: {},
    paymentMethod: null,
    orderNumber: null,
    orderId: null,
    paypalOrderId: null,
    // ✅ FIX: Guardar snapshot del carrito ANTES de limpiarlo
    savedItems: [],
    savedTotals: null,
  },

  // ─────────────────────────────────────────
  // CONFIGURACIÓN DE DESCUENTOS Y ENVÍO
  // ─────────────────────────────────────────
  DISCOUNTS: {
    paypal:    0.16,  // 16% descuento con PayPal
    transfer:  0.20,  // 20% descuento con Transferencia
    cash:      0.20,  // 20% descuento con Efectivo
  },

  SHIPPING: {
    freeThreshold: 60.00,  // Envío gratis sobre $60 (precio final con descuento)
    cost:          5.00,   // Costo de envío si no aplica gratis
  },

  // ─────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────
  getCart() {
    return (window.mawewe && window.mawewe.cart) || window.cart || null;
  },

  getState() {
    return (window.mawewe && window.mawewe.state) || window.state || null;
  },

  getCartItems() {
    const s = this.getState();
    return (s && Array.isArray(s.cart)) ? s.cart : [];
  },

  /**
   * Calcula totales aplicando descuento según método de pago
   * @param {string} method - 'paypal' | 'transfer' | 'cash'
   */
  calculateDiscountedTotals(method) {
    const items    = this.getCartItems();
    const discount = this.DISCOUNTS[method] || 0;

    // Subtotal original (sin descuento)
    const originalSubtotal = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);

    // Subtotal con descuento aplicado
    const discountAmount   = originalSubtotal * discount;
    const subtotal         = originalSubtotal - discountAmount;

    // Envío: gratis si el total con descuento supera el umbral
    const shipping = subtotal >= this.SHIPPING.freeThreshold ? 0 : this.SHIPPING.cost;
    const total    = subtotal + shipping;

    return {
      originalSubtotal: parseFloat(originalSubtotal.toFixed(2)),
      discountPercent:  discount * 100,
      discountAmount:   parseFloat(discountAmount.toFixed(2)),
      subtotal:         parseFloat(subtotal.toFixed(2)),
      shipping:         parseFloat(shipping.toFixed(2)),
      total:            parseFloat(total.toFixed(2)),
    };
  },

  // ─────────────────────────────────────────
  // STEP 1: Abrir formulario
  // ─────────────────────────────────────────
  openCheckout() {
    const cart      = this.getCart();
    const cartItems = this.getCartItems();

    if (!cart) {
      alert("Error: Sistema de carrito no disponible. Por favor recarga la página.");
      return;
    }

    if (cartItems.length === 0) {
      if (window.mawewe && window.mawewe.ui) {
        window.mawewe.ui.showNotification("El carrito está vacío", "error");
      } else {
        alert("El carrito está vacío");
      }
      return;
    }

    const cartItemsContainer = document.getElementById("cart-items");
    const cartFooter         = document.getElementById("cart-footer");
    const container          = document.getElementById("checkout-form-container");

    if (cartItemsContainer) cartItemsContainer.style.display = "none";
    if (cartFooter)         cartFooter.style.display         = "none";

    if (container) {
      container.style.display = "block";
      container.innerHTML     = this.renderCheckoutForm();
    }
  },

  // ─────────────────────────────────────────
  // Renderizar formulario con banner de descuentos
  // ─────────────────────────────────────────
  renderCheckoutForm() {
    const cart      = this.getCart();
    if (!cart) return '<p style="color:red;padding:2rem">Error de carrito</p>';

    const baseTotal  = cart.calculateTotals().total;
    const cartItems  = this.getCartItems();
    const paypalTotal    = baseTotal * (1 - this.DISCOUNTS.paypal);
    const transferTotal  = baseTotal * (1 - this.DISCOUNTS.transfer);

    // Recuperar datos guardados si existen
    const saved = {};
    try {
      const s = localStorage.getItem("mawewe_customer_data");
      if (s) Object.assign(saved, JSON.parse(s));
    } catch(e) {}

    return `
      <div class="checkout-header">
        <button class="btn-back" onclick="checkout.closeCheckout()">← Volver al carrito</button>
        <h2>Finalizar Compra</h2>
      </div>

      <!-- BANNER DE DESCUENTOS -->
      <div style="
        background: linear-gradient(135deg, #8C004B 0%, #c0006a 100%);
        color: white; border-radius: 14px; padding: 1.25rem 1.5rem;
        margin-bottom: 1.5rem; box-shadow: 0 4px 20px rgba(140,0,75,0.3);
      ">
        <p style="font-size:0.85rem; opacity:0.85; margin-bottom:0.5rem; text-transform:uppercase; letter-spacing:0.05em;">
          💥 Precios especiales para ti
        </p>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-top:0.5rem;">
          <div style="background:rgba(255,255,255,0.15); border-radius:10px; padding:0.75rem; text-align:center;">
            <div style="font-size:0.75rem; opacity:0.85; margin-bottom:0.25rem;">💙 Con PayPal</div>
            <div style="font-size:1.4rem; font-weight:700;">$${paypalTotal.toFixed(2)}</div>
            <div style="font-size:0.75rem; background:rgba(255,255,255,0.2); border-radius:20px; padding:2px 8px; margin-top:4px; display:inline-block;">-16% OFF</div>
          </div>
          <div style="background:rgba(255,255,255,0.15); border-radius:10px; padding:0.75rem; text-align:center;">
            <div style="font-size:0.75rem; opacity:0.85; margin-bottom:0.25rem;">🏦 Transferencia/Efectivo</div>
            <div style="font-size:1.4rem; font-weight:700;">$${transferTotal.toFixed(2)}</div>
            <div style="font-size:0.75rem; background:rgba(255,255,255,0.2); border-radius:20px; padding:2px 8px; margin-top:4px; display:inline-block;">-20% OFF</div>
          </div>
        </div>
        <p style="font-size:0.78rem; opacity:0.8; margin-top:0.75rem; text-align:center;">
          📦 Envío GRATIS en compras superiores a $${this.SHIPPING.freeThreshold.toFixed(2)}
        </p>
      </div>

      <form id="checkout-form" class="checkout-form" onsubmit="checkout.submitCustomerData(event)">

        <div class="form-section">
          <h3>📧 Información de Contacto</h3>
          <div class="form-group">
            <label for="email">Email *</label>
            <input type="email" id="email" name="email" required placeholder="tu@email.com" value="${saved.email || ''}" />
          </div>
        </div>

        <div class="form-section">
          <h3>📦 Información de Entrega</h3>
          <div class="form-row">
            <div class="form-group">
              <label for="firstName">Nombre *</label>
              <input type="text" id="firstName" name="firstName" required placeholder="Juan" value="${saved.firstName || ''}" />
            </div>
            <div class="form-group">
              <label for="lastName">Apellido *</label>
              <input type="text" id="lastName" name="lastName" required placeholder="Pérez" value="${saved.lastName || ''}" />
            </div>
          </div>
          <div class="form-group">
            <label for="address">Dirección *</label>
            <input type="text" id="address" name="address" required placeholder="Calle Principal 123" value="${saved.address || ''}" />
          </div>
          <div class="form-group">
            <label for="apartment">Apartamento, suite, etc. (opcional)</label>
            <input type="text" id="apartment" name="apartment" placeholder="Apto 4B" value="${saved.apartment || ''}" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="city">Ciudad *</label>
              <input type="text" id="city" name="city" required placeholder="Quito" value="${saved.city || ''}" />
            </div>
            <div class="form-group">
              <label for="postalCode">Código Postal</label>
              <input type="text" id="postalCode" name="postalCode" placeholder="170150" value="${saved.postalCode || ''}" />
            </div>
          </div>
          <div class="form-group">
            <label for="phone">Teléfono *</label>
            <input type="tel" id="phone" name="phone" required placeholder="0991234567" value="${saved.phone || ''}" />
          </div>
          <div class="form-checkbox">
            <input type="checkbox" id="saveInfo" name="saveInfo" checked />
            <label for="saveInfo">Guardar información para futuras compras</label>
          </div>
        </div>

        <!-- Resumen del pedido -->
        <div class="checkout-summary">
          <h3>📋 Resumen del Pedido</h3>
          <div class="summary-items">
            ${cartItems.map(item => `
              <div class="summary-item">
                <img src="${item.image}" alt="${item.name}" />
                <div class="summary-item-info">
                  <div style="font-weight:600">${item.name}</div>
                  <div class="quantity">Cantidad: ${item.quantity}</div>
                </div>
                <div class="summary-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
              </div>
            `).join('')}
          </div>
          <div style="background:rgba(140,0,75,0.06); border-radius:10px; padding:1rem; margin-top:0.75rem; font-size:0.85rem; color:#666; text-align:center;">
            💡 El descuento se aplica según el método de pago que elijas en el siguiente paso
          </div>
        </div>

        <button type="submit" class="btn-continue-payment">Continuar al Pago →</button>
      </form>
    `;
  },

  // ─────────────────────────────────────────
  // STEP 2: Guardar datos del cliente
  // ─────────────────────────────────────────
  submitCustomerData(event) {
    event.preventDefault();
    const formData = new FormData(event.target);

    this.state.customerData = {
      email:      formData.get("email"),
      firstName:  formData.get("firstName"),
      lastName:   formData.get("lastName"),
      address:    formData.get("address"),
      apartment:  formData.get("apartment"),
      city:       formData.get("city"),
      postalCode: formData.get("postalCode"),
      phone:      formData.get("phone"),
    };

    if (formData.get("saveInfo") === "on") {
      localStorage.setItem("mawewe_customer_data", JSON.stringify(this.state.customerData));
    }

    this.showPaymentMethods();
  },

  // ─────────────────────────────────────────
  // STEP 2: Mostrar métodos de pago con precios ya calculados
  // ─────────────────────────────────────────
  showPaymentMethods() {
    const container = document.getElementById("checkout-form-container");
    const c         = this.state.customerData;

    const tPaypal    = this.calculateDiscountedTotals('paypal');
    const tTransfer  = this.calculateDiscountedTotals('transfer');
    const tCash      = this.calculateDiscountedTotals('cash');

    container.innerHTML = `
      <div class="checkout-header">
        <button class="btn-back" onclick="checkout.openCheckout()">← Volver a datos de entrega</button>
        <h2>Método de Pago</h2>
      </div>

      <div class="payment-methods-container">

        <!-- Datos del cliente -->
        <div class="form-section" style="margin-bottom:1.5rem;">
          <h3>📋 Datos de Entrega</h3>
          <div style="background:var(--gray-50); padding:1rem; border-radius:12px; font-size:0.9rem; line-height:1.7;">
            <strong>${c.firstName} ${c.lastName}</strong><br/>
            ${c.address}${c.apartment ? ', ' + c.apartment : ''}<br/>
            ${c.city}${c.postalCode ? ', ' + c.postalCode : ''}<br/>
            📧 ${c.email} &nbsp;|&nbsp; 📱 ${c.phone}
          </div>
        </div>

        <!-- Elige tu método -->
        <div class="form-section">
          <h3>💳 Elige cómo pagar</h3>
          <p style="color:#666; font-size:0.85rem; margin-bottom:1rem;">
            El descuento se aplica automáticamente según el método elegido
          </p>

          <div class="payment-options">

            <!-- PayPal -->
            <label class="payment-option" id="opt-paypal" onclick="checkout.selectPaymentMethod('paypal', event)">
              <input type="radio" name="payment" value="paypal" />
              <div class="payment-method-content" style="width:100%">
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                  <div style="display:flex; align-items:center; gap:0.75rem;">
                    <div class="payment-icon">💙</div>
                    <div>
                      <div class="payment-name">PayPal</div>
                      <div class="payment-description">Descuento del 16%</div>
                    </div>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-size:1.25rem; font-weight:700; color:var(--primary-800);">$${tPaypal.total.toFixed(2)}</div>
                    <div style="font-size:0.75rem; color:#999; text-decoration:line-through;">$${tPaypal.originalSubtotal.toFixed(2)}</div>
                    ${tPaypal.shipping === 0
                      ? '<div style="font-size:0.72rem; color:#16a34a; font-weight:600;">📦 Envío gratis</div>'
                      : `<div style="font-size:0.72rem; color:#666;">+ $${tPaypal.shipping.toFixed(2)} envío</div>`
                    }
                  </div>
                </div>
              </div>
            </label>

            <!-- Transferencia -->
            <label class="payment-option" id="opt-transfer" onclick="checkout.selectPaymentMethod('transfer', event)">
              <input type="radio" name="payment" value="transfer" />
              <div class="payment-method-content" style="width:100%">
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                  <div style="display:flex; align-items:center; gap:0.75rem;">
                    <div class="payment-icon">🏦</div>
                    <div>
                      <div class="payment-name">Transferencia Bancaria</div>
                      <div class="payment-description">Descuento del 20%</div>
                    </div>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-size:1.25rem; font-weight:700; color:var(--primary-800);">$${tTransfer.total.toFixed(2)}</div>
                    <div style="font-size:0.75rem; color:#999; text-decoration:line-through;">$${tTransfer.originalSubtotal.toFixed(2)}</div>
                    ${tTransfer.shipping === 0
                      ? '<div style="font-size:0.72rem; color:#16a34a; font-weight:600;">📦 Envío gratis</div>'
                      : `<div style="font-size:0.72rem; color:#666;">+ $${tTransfer.shipping.toFixed(2)} envío</div>`
                    }
                  </div>
                </div>
              </div>
            </label>

            <!-- Efectivo -->
            <label class="payment-option" id="opt-cash" onclick="checkout.selectPaymentMethod('cash', event)">
              <input type="radio" name="payment" value="cash" />
              <div class="payment-method-content" style="width:100%">
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                  <div style="display:flex; align-items:center; gap:0.75rem;">
                    <div class="payment-icon">💵</div>
                    <div>
                      <div class="payment-name">Pago en Efectivo</div>
                      <div class="payment-description">Descuento del 20%</div>
                    </div>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-size:1.25rem; font-weight:700; color:var(--primary-800);">$${tCash.total.toFixed(2)}</div>
                    <div style="font-size:0.75rem; color:#999; text-decoration:line-through;">$${tCash.originalSubtotal.toFixed(2)}</div>
                    ${tCash.shipping === 0
                      ? '<div style="font-size:0.72rem; color:#16a34a; font-weight:600;">📦 Envío gratis</div>'
                      : `<div style="font-size:0.72rem; color:#666;">+ $${tCash.shipping.toFixed(2)} envío</div>`
                    }
                  </div>
                </div>
              </div>
            </label>

          </div>
        </div>

        <!-- Contenedor del botón de pago -->
        <div id="payment-button-container" style="margin-top:1.5rem;"></div>

      </div>
    `;

    this.state.step = 2;
  },

  // ─────────────────────────────────────────
  // Seleccionar método de pago
  // ─────────────────────────────────────────
  selectPaymentMethod(method, event) {
    this.state.paymentMethod = method;

    document.querySelectorAll(".payment-option").forEach(o => o.classList.remove("selected"));
    const label = document.getElementById(`opt-${method}`);
    if (label) label.classList.add("selected");

    const t = this.calculateDiscountedTotals(method);
    const buttonContainer = document.getElementById("payment-button-container");

    if (method === 'paypal') {
      this.renderPayPalButtons(t.total);
    } else {
      const names = { transfer: "Transferencia Bancaria", cash: "Efectivo" };
      buttonContainer.innerHTML = `
        <div style="background:rgba(140,0,75,0.06); border-radius:12px; padding:1rem 1.25rem; margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:0.8rem; color:#666; margin-bottom:0.2rem;">Total a pagar con ${names[method]}</div>
            <div style="font-size:1.5rem; font-weight:700; color:var(--primary-800);">$${t.total.toFixed(2)}</div>
            <div style="font-size:0.75rem; color:#888;">Descuento: -$${t.discountAmount.toFixed(2)} (${t.discountPercent}% OFF) &nbsp;|&nbsp; Envío: ${t.shipping === 0 ? '<span style="color:#16a34a">Gratis</span>' : '$' + t.shipping.toFixed(2)}</div>
          </div>
          <div style="font-size:2rem;">${method === 'transfer' ? '🏦' : '💵'}</div>
        </div>
        <button
          id="btn-confirm-payment"
          class="btn-continue-payment"
          onclick="checkout.processPayment()"
        >
          ✓ Confirmar Pedido
        </button>
      `;
    }
  },

  // ─────────────────────────────────────────
  // PayPal
  // ─────────────────────────────────────────
  renderPayPalButtons(total) {
    const buttonContainer = document.getElementById("payment-button-container");
    if (!buttonContainer) return;

    const t = this.calculateDiscountedTotals('paypal');

    buttonContainer.innerHTML = `
      <div style="background:rgba(140,0,75,0.06); border-radius:12px; padding:1rem 1.25rem; margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="font-size:0.8rem; color:#666; margin-bottom:0.2rem;">Total a pagar con PayPal</div>
          <div style="font-size:1.5rem; font-weight:700; color:var(--primary-800);">$${t.total.toFixed(2)}</div>
          <div style="font-size:0.75rem; color:#888;">Descuento: -$${t.discountAmount.toFixed(2)} (16% OFF) &nbsp;|&nbsp; Envío: ${t.shipping === 0 ? '<span style="color:#16a34a">Gratis</span>' : '$' + t.shipping.toFixed(2)}</div>
        </div>
        <div style="font-size:2rem;">💙</div>
      </div>
      <div id="paypal-button-container"></div>
    `;

    const clientId = (window.CONFIG && window.CONFIG.paypal && window.CONFIG.paypal.clientId)
      || (window.mawewe && window.mawewe.CONFIG && window.mawewe.CONFIG.paypal && window.mawewe.CONFIG.paypal.clientId);

    if (!clientId) {
      buttonContainer.innerHTML += `<p style="color:red;text-align:center">Error de configuración PayPal</p>`;
      return;
    }

    const existing = document.querySelector('script[src*="paypal.com/sdk"]');
    if (existing) {
      this.initPayPalButtons(t.total);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
    script.onload  = () => this.initPayPalButtons(t.total);
    script.onerror = () => {
      document.getElementById('paypal-button-container').innerHTML =
        `<p style="color:red;text-align:center">Error al cargar PayPal. Intenta otro método.</p>`;
    };
    document.body.appendChild(script);
  },

  initPayPalButtons(total) {
    if (typeof paypal === 'undefined') return;

    paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' },

      createOrder: (data, actions) => {
        return actions.order.create({
          purchase_units: [{
            amount: { value: total.toFixed(2), currency_code: 'USD' },
            description: `Pedido Mawewe - ${this.getCartItems().length} items`,
          }],
        });
      },

      onApprove: async (data, actions) => {
        if (window.mawewe && window.mawewe.ui) window.mawewe.ui.showLoading(true);
        try {
          const details = await actions.order.capture();
          this.state.paypalOrderId = data.orderID;
          await this.saveOrderToDatabase();
          if (window.mawewe && window.mawewe.ui) window.mawewe.ui.showLoading(false);
          this.showConfirmation();
        } catch (err) {
          if (window.mawewe && window.mawewe.ui) window.mawewe.ui.showLoading(false);
          alert("Error al procesar el pago PayPal. Contacta: +593 98 183 2313");
        }
      },

      onCancel: () => {
        if (window.mawewe && window.mawewe.ui)
          window.mawewe.ui.showNotification("Pago cancelado", "error");
      },

      onError: (err) => {
        console.error("PayPal error:", err);
        if (window.mawewe && window.mawewe.ui)
          window.mawewe.ui.showNotification("Error en PayPal", "error");
      },
    }).render('#paypal-button-container');
  },

  // ─────────────────────────────────────────
  // STEP 3: Procesar pago manual
  // ─────────────────────────────────────────
  async processPayment() {
    const btn = document.getElementById("btn-confirm-payment");
    if (btn) { btn.disabled = true; btn.textContent = "Procesando..."; }
    if (window.mawewe && window.mawewe.ui) window.mawewe.ui.showLoading(true);

    try {
      await this.saveOrderToDatabase();
      if (window.mawewe && window.mawewe.ui) window.mawewe.ui.showLoading(false);
      this.showConfirmation();
    } catch (err) {
      if (window.mawewe && window.mawewe.ui) {
        window.mawewe.ui.showLoading(false);
        window.mawewe.ui.showNotification("Error al procesar: " + err.message, "error");
      }
      if (btn) { btn.disabled = false; btn.textContent = "Reintentar"; }
      alert("❌ Error: " + err.message + "\n\nWhatsApp: +593 98 183 2313");
    }
  },

  // ─────────────────────────────────────────
  // Guardar orden con precios CON descuento
  // ─────────────────────────────────────────
  async saveOrderToDatabase() {
    const cart      = this.getCart();
    const cartItems = this.getCartItems();
    const method    = this.state.paymentMethod;
    const totals    = this.calculateDiscountedTotals(method);
    const discount  = this.DISCOUNTS[method] || 0;

    if (!cart || cartItems.length === 0) throw new Error("Carrito vacío");

    // ✅ FIX DEFINITIVO: guardar snapshot ANTES de limpiar el carrito
    this.state.savedItems  = cartItems.map(item => ({ ...item }));
    this.state.savedTotals = { ...totals };

    const orderData = {
      email:          this.state.customerData.email,
      firstName:      this.state.customerData.firstName,
      lastName:       this.state.customerData.lastName,
      address:        this.state.customerData.address        || "",
      apartment:      this.state.customerData.apartment      || "",
      city:           this.state.customerData.city           || "",
      postalCode:     this.state.customerData.postalCode     || "",
      phone:          this.state.customerData.phone          || "",
      shippingMethod: "standard",
      paymentMethod:  method,
      // Enviar ítems con precio YA descontado
      items: cartItems.map(item => ({
        productId: item.productId,
        name:      item.name,
        sku:       item.sku,
        price:     parseFloat((item.price * (1 - discount)).toFixed(2)),
        quantity:  item.quantity,
      })),
      totals: {
        subtotal:         totals.subtotal,
        shipping:         totals.shipping,
        total:            totals.total,
        originalSubtotal: totals.originalSubtotal,
        discountPercent:  totals.discountPercent,
        discountAmount:   totals.discountAmount,
      },
    };

    const apiBase   = (window.CONFIG && window.CONFIG.api && window.CONFIG.api.baseUrl) || "https://mawewe.com.ec/api";
    const saveUrl   = (window.CONFIG && window.CONFIG.api && window.CONFIG.api.endpoints && window.CONFIG.api.endpoints.saveOrder) || "/save-order.php";
    const url       = apiBase + saveUrl;

    const response  = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || `HTTP ${response.status}`);

    this.state.orderId      = result.orderId;
    this.state.orderNumber  = result.orderNumber;

    // Limpiar carrito DESPUÉS de guardar el snapshot
    if (cart && typeof cart.clear === "function") cart.clear();
    localStorage.setItem("has_purchased", "true");

    return result;
  },

  // ─────────────────────────────────────────
  // STEP 4: Confirmación
  // ─────────────────────────────────────────
  showConfirmation() {
    const container    = document.getElementById("checkout-form-container");
    const orderNumber  = this.state.orderNumber || "N/A";
    const totals       = this.state.savedTotals || { total: 0, subtotal: 0, shipping: 0 };
    const method       = this.state.paymentMethod;

    const paymentDetails = {
      paypal: {
        icon: "💙", title: "PayPal",
        instructions: `
          <div style="text-align:center; padding:1.5rem;">
            <div style="font-size:3rem; margin-bottom:0.5rem;">✅</div>
            <p style="color:#16a34a; font-size:1.1rem; font-weight:600; margin-bottom:0.5rem;">¡Pago procesado vía PayPal!</p>
            <p style="font-size:1.5rem; font-weight:700; color:var(--primary-800);">$${totals.total.toFixed(2)}</p>
            ${this.state.paypalOrderId ? `<p style="font-size:0.78rem; color:#888; margin-top:0.5rem;">ID: ${this.state.paypalOrderId}</p>` : ''}
          </div>`
      },
      transfer: {
        icon: "🏦", title: "Transferencia Bancaria",
        instructions: `
          <div class="bank-details" style="line-height:1.9;">
            <p><strong>Banco:</strong> Banco Pichincha</p>
            <p><strong>Tipo:</strong> Cuenta Corriente</p>
            <p><strong>Número:</strong> 2100291784</p>
            <p><strong>Beneficiario:</strong> Víctor Manuel Vargas Motoche</p>
            <p><strong>Monto:</strong> <span style="color:var(--primary-800); font-size:1.2rem; font-weight:700;">$${totals.total.toFixed(2)}</span></p>
            <p><strong>Referencia:</strong> <span style="color:var(--primary-800); font-weight:700;">${orderNumber}</span></p>
          </div>
          <div style="background:#f59e0b; color:white; padding:0.85rem 1rem; border-radius:8px; margin-top:1rem;">
            <p style="margin:0; font-weight:600; font-size:0.9rem;">⚠️ Envía el comprobante a WhatsApp: <strong>+593 98 183 2313</strong></p>
          </div>`
      },
      cash: {
        icon: "💵", title: "Pago en Efectivo",
        instructions: `
          <div style="text-align:center; padding:1.5rem;">
            <div style="font-size:3rem; margin-bottom:0.75rem;">💵</div>
            <p style="font-size:1.1rem; font-weight:600; margin-bottom:0.5rem;">Pagas al recibir tu pedido</p>
            <div style="background:var(--primary-50); padding:1rem; border-radius:12px;">
              <p style="font-size:1.8rem; font-weight:700; color:var(--primary-800);">$${totals.total.toFixed(2)}</p>
            </div>
          </div>`
      },
    };

    const info = paymentDetails[method] || paymentDetails.cash;

    container.innerHTML = `
      <div class="order-confirmation">
        <div class="confirmation-icon">
          <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M8 12l3 3 5-5"/>
          </svg>
        </div>

        <h2 style="color:#16a34a; font-size:1.75rem; margin:1rem 0 0.25rem;">¡Pedido Confirmado!</h2>
        <p style="color:#666; margin-bottom:1.5rem;">Gracias por tu compra en Mawewe 💖</p>

        <div class="order-number" style="background:var(--primary-50); border:2px solid var(--primary-200); border-radius:14px; padding:1rem 1.5rem; margin-bottom:1.5rem;">
          <p style="font-size:0.8rem; color:#666; margin-bottom:0.25rem; text-transform:uppercase; letter-spacing:0.05em;">Número de Orden</p>
          <p style="font-size:1.4rem; font-weight:700; color:var(--primary-800); margin:0;">${orderNumber}</p>
        </div>

        <!-- Resumen de precios -->
        <div style="background:var(--gray-50); border-radius:12px; padding:1rem 1.25rem; margin-bottom:1.5rem; font-size:0.9rem;">
          <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;">
            <span style="color:#666;">Precio original:</span>
            <span style="text-decoration:line-through; color:#999;">$${totals.originalSubtotal.toFixed(2)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem; color:#16a34a;">
            <span>Descuento (${totals.discountPercent}% OFF):</span>
            <span>-$${totals.discountAmount.toFixed(2)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;">
            <span style="color:#666;">Envío:</span>
            <span style="color:${totals.shipping === 0 ? '#16a34a' : '#333'}; font-weight:600;">
              ${totals.shipping === 0 ? 'GRATIS ✓' : '$' + totals.shipping.toFixed(2)}
            </span>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:1.1rem; font-weight:700; color:var(--primary-800); border-top:2px solid var(--gray-200); padding-top:0.6rem; margin-top:0.4rem;">
            <span>TOTAL:</span>
            <span>$${totals.total.toFixed(2)}</span>
          </div>
        </div>

        <!-- Instrucciones de pago -->
        <div class="form-section" style="margin-bottom:1.5rem;">
          <h3>${info.icon} ${info.title}</h3>
          <div style="background:var(--gray-50); padding:1.25rem; border-radius:12px;">
            ${info.instructions}
          </div>
        </div>

        <!-- Botones PDF y WhatsApp -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-bottom:0.75rem;">
          <button onclick="checkout.downloadReceipt()" class="btn-continue-payment"
            style="background:linear-gradient(135deg,#667eea,#764ba2); font-size:0.9rem;">
            📄 Descargar Comprobante
          </button>
          <button onclick="checkout.sendToWhatsApp()" class="btn-continue-payment"
            style="background:linear-gradient(135deg,#25D366,#128C7E); font-size:0.9rem;">
            📱 Enviar a WhatsApp
          </button>
        </div>

        <button onclick="checkout.closeCheckout(); if(window.mawewe && window.mawewe.ui) window.mawewe.ui.toggleCart();"
          class="btn-continue-payment" style="background:var(--gray-600); font-size:0.9rem;">
          ✓ Cerrar
        </button>
      </div>
    `;

    this.state.step = 3;
    if (window.mawewe && window.mawewe.ui)
      window.mawewe.ui.showNotification(`¡Orden ${orderNumber} confirmada! 🎉`);
  },

  // ─────────────────────────────────────────
  // ✅ FIX: Descargar comprobante con datos reales del snapshot
  // ─────────────────────────────────────────
  downloadReceipt() {
    // Usar snapshot guardado - NO depende del carrito actual
    const items       = this.state.savedItems  || [];
    const totals      = this.state.savedTotals || { subtotal: 0, shipping: 0, total: 0, discountPercent: 0, discountAmount: 0, originalSubtotal: 0 };
    const orderNumber = this.state.orderNumber || "N/A";
    const c           = this.state.customerData;
    const method      = this.state.paymentMethod;

    const receiptHTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Comprobante - ${orderNumber}</title>
  <style>
    *{box-sizing:border-box; margin:0; padding:0;}
    body{font-family:'Segoe UI',Arial,sans-serif; color:#333; padding:30px; max-width:750px; margin:0 auto; background:#fff;}
    .header{text-align:center; padding-bottom:20px; border-bottom:3px solid #8C004B; margin-bottom:25px;}
    .logo{font-size:2rem; font-weight:800; color:#8C004B; letter-spacing:-0.03em;}
    .order-num{background:#f8e8f0; color:#8C004B; padding:8px 20px; border-radius:20px; font-size:0.9rem; font-weight:600; display:inline-block; margin-top:10px;}
    .section{margin:20px 0;}
    .section h2{color:#8C004B; font-size:1rem; text-transform:uppercase; letter-spacing:0.05em; border-bottom:2px solid #f0d0e0; padding-bottom:6px; margin-bottom:12px;}
    .info-grid{display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:0.9rem;}
    .info-grid p span{color:#666; font-size:0.85rem;}
    table{width:100%; border-collapse:collapse; font-size:0.88rem;}
    th{background:#8C004B; color:white; padding:10px; text-align:left;}
    td{padding:9px 10px; border-bottom:1px solid #f0d0e0;}
    tr:nth-child(even) td{background:#fdf5f9;}
    .totals-table td{border:none; padding:6px 10px;}
    .total-final td{font-size:1.1rem; font-weight:700; color:#8C004B; border-top:2px solid #8C004B; padding-top:10px;}
    .discount-row td{color:#16a34a; font-weight:600;}
    .bank-box{background:#fffbea; border:2px solid #f59e0b; border-radius:10px; padding:15px; margin-top:10px; font-size:0.9rem; line-height:1.8;}
    .footer{text-align:center; margin-top:30px; padding-top:20px; border-top:2px solid #f0d0e0; color:#888; font-size:0.85rem; line-height:1.8;}
    .free-ship{color:#16a34a; font-weight:600;}
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">🛒 MAWEWE</div>
    <p style="color:#666; margin-top:5px;">Comprobante de Compra</p>
    <span class="order-num">Orden: ${orderNumber}</span>
    <p style="color:#999; font-size:0.8rem; margin-top:8px;">Fecha: ${new Date().toLocaleString('es-EC')}</p>
  </div>

  <div class="section">
    <h2>📋 Datos del Cliente</h2>
    <div class="info-grid">
      <p><span>Nombre:</span><br/><strong>${c.firstName} ${c.lastName}</strong></p>
      <p><span>Email:</span><br/><strong>${c.email}</strong></p>
      <p><span>Teléfono:</span><br/><strong>${c.phone}</strong></p>
      <p><span>Ciudad:</span><br/><strong>${c.city}${c.postalCode ? ', CP: ' + c.postalCode : ''}</strong></p>
    </div>
    <p style="font-size:0.9rem; margin-top:8px;"><span style="color:#666">Dirección:</span> <strong>${c.address}${c.apartment ? ', ' + c.apartment : ''}</strong></p>
  </div>

  <div class="section">
    <h2>🛍️ Productos Comprados</h2>
    <table>
      <thead>
        <tr>
          <th>Producto</th>
          <th>SKU</th>
          <th style="text-align:center">Cant.</th>
          <th style="text-align:right">Precio Unit.</th>
          <th style="text-align:right">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${items.length > 0 ? items.map(item => `
          <tr>
            <td>${item.name}</td>
            <td style="color:#888">${item.sku}</td>
            <td style="text-align:center">${item.quantity}</td>
            <td style="text-align:right">$${Number(item.price).toFixed(2)}</td>
            <td style="text-align:right">$${(Number(item.price) * item.quantity).toFixed(2)}</td>
          </tr>
        `).join('') : '<tr><td colspan="5" style="text-align:center; color:#888; padding:20px;">Sin productos registrados</td></tr>'}
      </tbody>
    </table>

    <table class="totals-table" style="margin-top:10px; width:50%; margin-left:auto;">
      <tr>
        <td style="color:#666">Precio original:</td>
        <td style="text-align:right; text-decoration:line-through; color:#999;">$${totals.originalSubtotal.toFixed(2)}</td>
      </tr>
      <tr class="discount-row">
        <td>Descuento ${totals.discountPercent}% (${method === 'paypal' ? 'PayPal' : method === 'transfer' ? 'Transferencia' : 'Efectivo'}):</td>
        <td style="text-align:right">-$${totals.discountAmount.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="color:#666">Envío:</td>
        <td style="text-align:right" class="${totals.shipping === 0 ? 'free-ship' : ''}">${totals.shipping === 0 ? 'GRATIS ✓' : '$' + totals.shipping.toFixed(2)}</td>
      </tr>
      <tr class="total-final">
        <td>TOTAL A PAGAR:</td>
        <td style="text-align:right">$${totals.total.toFixed(2)}</td>
      </tr>
    </table>
  </div>

  ${method === 'transfer' ? `
  <div class="section">
    <h2>🏦 Datos Bancarios</h2>
    <div class="bank-box">
      <p><strong>Banco:</strong> Banco Pichincha</p>
      <p><strong>Tipo:</strong> Cuenta Corriente</p>
      <p><strong>Número:</strong> 2100291784</p>
      <p><strong>Beneficiario:</strong> Víctor Manuel Vargas Motoche</p>
      <p><strong>Monto:</strong> <strong style="color:#8C004B; font-size:1.1rem;">$${totals.total.toFixed(2)}</strong></p>
      <p><strong>Referencia:</strong> ${orderNumber}</p>
      <p style="margin-top:10px; color:#b45309; font-weight:600;">⚠️ Enviar comprobante de pago a WhatsApp: +593 98 183 2313</p>
    </div>
  </div>` : ''}

  <div class="footer">
    <p><strong>¿Preguntas?</strong> Estamos aquí para ayudarte</p>
    <p>📱 WhatsApp: +593 98 183 2313 &nbsp;|&nbsp; 📧 info@mawewe.com.ec</p>
    <p>🌐 https://mawewe.com.ec</p>
    <p style="margin-top:15px; font-size:0.8rem; color:#bbb;">Gracias por confiar en Mawewe 💖</p>
  </div>
</body>
</html>`;

    const blob = new Blob([receiptHTML], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `Comprobante-Mawewe-${orderNumber}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (window.mawewe && window.mawewe.ui)
      window.mawewe.ui.showNotification('📄 Comprobante descargado');
  },

  // ─────────────────────────────────────────
  // ✅ FIX: WhatsApp con datos reales del snapshot
  // ─────────────────────────────────────────
  sendToWhatsApp() {
    const items       = this.state.savedItems  || [];
    const totals      = this.state.savedTotals || { total: 0, discountPercent: 0, discountAmount: 0, shipping: 0 };
    const orderNumber = this.state.orderNumber || "N/A";
    const c           = this.state.customerData;
    const method      = this.state.paymentMethod;

    let msg = `🛒 *NUEVO PEDIDO - MAWEWE*\n\n`;
    msg += `📋 *Orden:* ${orderNumber}\n`;
    msg += `👤 *Cliente:* ${c.firstName} ${c.lastName}\n`;
    msg += `📧 *Email:* ${c.email}\n`;
    msg += `📱 *Teléfono:* ${c.phone}\n`;
    msg += `📍 *Dirección:* ${c.address}${c.apartment ? ', ' + c.apartment : ''}, ${c.city}\n\n`;

    msg += `🛍️ *PRODUCTOS:*\n`;
    if (items.length > 0) {
      items.forEach((item, i) => {
        msg += `${i + 1}. ${item.name}\n`;
        msg += `   SKU: ${item.sku} | Cant: ${item.quantity} × $${Number(item.price).toFixed(2)} = $${(Number(item.price) * item.quantity).toFixed(2)}\n`;
      });
    } else {
      msg += `(sin detalle de productos)\n`;
    }

    msg += `\n💰 *Descuento aplicado:* ${totals.discountPercent}% OFF (-$${totals.discountAmount.toFixed(2)})\n`;
    msg += `📦 *Envío:* ${totals.shipping === 0 ? 'GRATIS ✓' : '$' + totals.shipping.toFixed(2)}\n`;
    msg += `💳 *TOTAL A PAGAR: $${totals.total.toFixed(2)}*\n\n`;
    msg += `*Método de pago:* ${method === 'paypal' ? 'PayPal' : method === 'transfer' ? 'Transferencia Bancaria' : 'Efectivo'}\n\n`;

    if (method === 'transfer') {
      msg += `🏦 *DATOS BANCARIOS:*\n`;
      msg += `Banco Pichincha | Cta. Corriente: 2100291784\n`;
      msg += `Beneficiario: Víctor Manuel Vargas Motoche\n`;
      msg += `Referencia: ${orderNumber}\n\n`;
      msg += `📎 _Adjunto el comprobante de pago_`;
    } else if (method === 'cash') {
      msg += `💵 _Pagaré en efectivo al recibir el pedido_`;
    } else {
      msg += `✅ _Pago realizado vía PayPal_`;
    }

    window.open(`https://wa.me/593981832313?text=${encodeURIComponent(msg)}`, '_blank');

    if (window.mawewe && window.mawewe.ui)
      window.mawewe.ui.showNotification('📱 Abriendo WhatsApp...');
  },

  // ─────────────────────────────────────────
  // Cerrar checkout
  // ─────────────────────────────────────────
  closeCheckout() {
    const cartItems = document.getElementById("cart-items");
    const cartFooter = document.getElementById("cart-footer");
    const container  = document.getElementById("checkout-form-container");

    if (cartItems) cartItems.style.display = "block";
    if (cartFooter) cartFooter.style.display = "block";
    if (container) container.style.display = "none";

    this.state = {
      step: 1, customerData: {}, paymentMethod: null,
      orderNumber: null, orderId: null, paypalOrderId: null,
      savedItems: [], savedTotals: null,
    };
  },
};

// ─────────────────────────────────────────
// Actualizar el resumen del carrito con los nuevos umbrales
// ─────────────────────────────────────────
if (window.render && window.render.cartSummary) {
  const _orig = window.render.cartSummary.bind(window.render);
  window.render.cartSummary = function() {
    const container = document.getElementById("cart-summary");
    if (!container) return;
    const { subtotal } = cart.calculateTotals();
    const remaining = 60 - subtotal;

    container.innerHTML = `
      <div class="summary-row">
        <span>Subtotal:</span>
        <span class="amount">$${subtotal.toFixed(2)}</span>
      </div>
      <div class="summary-row">
        <span>Envío:</span>
        <span class="amount" style="color:#888;font-size:0.85rem;">Se calcula al pagar</span>
      </div>
      ${remaining > 0
        ? `<div style="background:#fef9c3; border:1px solid #fde68a; border-radius:8px; padding:0.6rem 0.75rem; font-size:0.82rem; color:#92400e; margin-top:0.5rem; text-align:center;">
            🚚 Agrega <strong>$${remaining.toFixed(2)}</strong> más para obtener envío gratis
           </div>`
        : `<div style="background:#dcfce7; border:1px solid #bbf7d0; border-radius:8px; padding:0.6rem 0.75rem; font-size:0.82rem; color:#166534; margin-top:0.5rem; text-align:center;">
            📦 ¡Envío gratis incluido en tu pedido! ✓
           </div>`
      }
      <div style="background:rgba(140,0,75,0.06); border-radius:8px; padding:0.6rem 0.75rem; font-size:0.8rem; color:var(--primary-800); margin-top:0.5rem; text-align:center; font-weight:600;">
        💡 Descuento -16% con PayPal &nbsp;|&nbsp; -20% con Transferencia/Efectivo
      </div>
    `;
  };
}

window.checkout = checkout;
if (window.mawewe) window.mawewe.checkout = checkout;

console.log("✅ Checkout v3.0 — Descuentos automáticos + Envío $60 + Fix PDF/WhatsApp");