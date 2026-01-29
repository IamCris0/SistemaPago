// ==========================================
// CART.JS - SISTEMA DE CARRITO CORREGIDO
// Soluciona el problema: "El carrito está vacío"
// ==========================================

const cart = {
    // Inicializar el carrito desde localStorage
    init() {
        console.log('🛒 Inicializando carrito...');
        
        // Intentar cargar el carrito desde localStorage
        const savedCart = localStorage.getItem('cart');
        
        if (savedCart) {
            try {
                const parsedCart = JSON.parse(savedCart);
                if (Array.isArray(parsedCart)) {
                    window.state.cart = parsedCart;
                    console.log('✅ Carrito cargado desde localStorage:', parsedCart);
                } else {
                    console.warn('⚠️ Datos del carrito inválidos, inicializando vacío');
                    window.state.cart = [];
                    localStorage.setItem('cart', JSON.stringify([]));
                }
            } catch (e) {
                console.error('❌ Error al parsear carrito:', e);
                window.state.cart = [];
                localStorage.setItem('cart', JSON.stringify([]));
            }
        } else {
            console.log('📦 No hay carrito guardado, inicializando vacío');
            window.state.cart = [];
            localStorage.setItem('cart', JSON.stringify([]));
        }
        
        // Actualizar el contador del carrito
        this.updateCartCount();
        
        // Si estamos en la página del carrito, renderizar
        if (window.location.pathname.includes('cart.html')) {
            this.render();
        }
    },

    // Guardar el carrito en localStorage
    save() {
        try {
            localStorage.setItem('cart', JSON.stringify(window.state.cart));
            console.log('💾 Carrito guardado:', window.state.cart);
        } catch (e) {
            console.error('❌ Error al guardar carrito:', e);
        }
    },

    // Agregar producto al carrito
    addItem(product) {
        console.log('➕ Agregando producto:', product);
        
        // Validar que el producto tenga los datos necesarios
        if (!product || !product.id || !product.name || !product.price) {
            console.error('❌ Producto inválido:', product);
            alert('Error al agregar el producto al carrito');
            return false;
        }

        // Verificar si el producto ya está en el carrito
        const existingItem = window.state.cart.find(item => item.id === product.id);

        if (existingItem) {
            // Incrementar cantidad si ya existe
            existingItem.quantity += 1;
            console.log('✅ Cantidad incrementada:', existingItem);
        } else {
            // Agregar nuevo producto
            window.state.cart.push({
                id: product.id,
                name: product.name,
                price: parseFloat(product.price),
                image: product.image,
                quantity: 1
            });
            console.log('✅ Producto agregado al carrito');
        }

        // Guardar en localStorage
        this.save();
        
        // Actualizar UI
        this.updateCartCount();
        this.render();

        // Mostrar notificación
        this.showNotification(`${product.name} agregado al carrito`);
        
        return true;
    },

    // Eliminar producto del carrito
    removeItem(productId) {
        console.log('➖ Eliminando producto ID:', productId);
        
        const index = window.state.cart.findIndex(item => item.id === productId);
        
        if (index !== -1) {
            const removedItem = window.state.cart.splice(index, 1)[0];
            console.log('✅ Producto eliminado:', removedItem);
            
            // Guardar cambios
            this.save();
            
            // Actualizar UI
            this.updateCartCount();
            this.render();
            
            // Mostrar notificación
            this.showNotification(`${removedItem.name} eliminado del carrito`);
            
            return true;
        }
        
        console.warn('⚠️ Producto no encontrado en el carrito');
        return false;
    },

    // Actualizar cantidad de un producto
    updateQuantity(productId, change) {
        console.log(`🔄 Actualizando cantidad del producto ${productId}:`, change);
        
        const item = window.state.cart.find(item => item.id === productId);
        
        if (item) {
            item.quantity += change;
            
            // No permitir cantidades menores a 1
            if (item.quantity < 1) {
                this.removeItem(productId);
                return;
            }
            
            console.log('✅ Cantidad actualizada:', item.quantity);
            
            // Guardar cambios
            this.save();
            
            // Actualizar UI
            this.render();
            this.updateCartCount();
        } else {
            console.warn('⚠️ Producto no encontrado en el carrito');
        }
    },

    // Calcular totales
    calculateTotals() {
        const subtotal = window.state.cart.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);

        // Configuración de envío
        const shippingRates = {
            standard: 0,    // Envío gratis
            express: 5.00   // Envío express $5
        };

        const shippingMethod = window.state.shippingMethod || 'standard';
        const shipping = shippingRates[shippingMethod];
        const total = subtotal + shipping;

        console.log('💰 Totales calculados:', { subtotal, shipping, total });

        return {
            subtotal: subtotal.toFixed(2),
            shipping: shipping.toFixed(2),
            total: total.toFixed(2),
            itemCount: window.state.cart.reduce((sum, item) => sum + item.quantity, 0)
        };
    },

    // Renderizar el carrito en la página
    render() {
        console.log('🎨 Renderizando carrito...');
        
        const cartItemsContainer = document.getElementById('cart-items');
        const cartSummary = document.getElementById('cart-summary');
        
        if (!cartItemsContainer) {
            console.warn('⚠️ Contenedor del carrito no encontrado');
            return;
        }

        // Verificar si el carrito está vacío
        if (!window.state.cart || window.state.cart.length === 0) {
            cartItemsContainer.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-cart"></i>
                    <h3>Tu carrito está vacío</h3>
                    <p>Agrega productos para empezar a comprar</p>
                    <a href="index.html" class="btn-primary">Ir a la tienda</a>
                </div>
            `;
            
            if (cartSummary) {
                cartSummary.style.display = 'none';
            }
            
            console.log('📦 Carrito vacío renderizado');
            return;
        }

        // Renderizar productos
        cartItemsContainer.innerHTML = window.state.cart.map(item => `
            <div class="cart-item" data-product-id="${item.id}">
                <img src="${item.image}" alt="${item.name}" class="cart-item-image">
                <div class="cart-item-details">
                    <h3 class="cart-item-name">${item.name}</h3>
                    <p class="cart-item-price">$${item.price.toFixed(2)}</p>
                </div>
                <div class="cart-item-quantity">
                    <button class="qty-btn" onclick="window.cart.updateQuantity(${item.id}, -1)">
                        <i class="fas fa-minus"></i>
                    </button>
                    <input type="number" value="${item.quantity}" readonly class="qty-input">
                    <button class="qty-btn" onclick="window.cart.updateQuantity(${item.id}, 1)">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
                <div class="cart-item-total">
                    $${(item.price * item.quantity).toFixed(2)}
                </div>
                <button class="cart-item-remove" onclick="window.cart.removeItem(${item.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');

        // Renderizar resumen
        if (cartSummary) {
            const totals = this.calculateTotals();
            cartSummary.style.display = 'block';
            cartSummary.innerHTML = `
                <h3>Resumen del Pedido</h3>
                <div class="summary-row">
                    <span>Subtotal:</span>
                    <span>$${totals.subtotal}</span>
                </div>
                <div class="summary-row">
                    <span>Envío:</span>
                    <span>${totals.shipping === '0.00' ? 'GRATIS' : '$' + totals.shipping}</span>
                </div>
                <div class="summary-row total">
                    <span>Total:</span>
                    <span>$${totals.total}</span>
                </div>
                <button onclick="window.location.href='checkout.html'" class="btn-primary btn-checkout">
                    Proceder al Pago
                </button>
            `;
        }

        console.log('✅ Carrito renderizado con', window.state.cart.length, 'productos');
    },

    // Actualizar contador del carrito en el header
    updateCartCount() {
        const cartCountElements = document.querySelectorAll('.cart-count');
        const count = window.state.cart.reduce((sum, item) => sum + item.quantity, 0);
        
        cartCountElements.forEach(el => {
            el.textContent = count;
            el.style.display = count > 0 ? 'flex' : 'none';
        });
        
        console.log('🔢 Contador actualizado:', count);
    },

    // Mostrar notificación
    showNotification(message) {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = 'cart-notification';
        notification.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        `;
        
        // Agregar al body
        document.body.appendChild(notification);
        
        // Mostrar con animación
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Ocultar y eliminar después de 3 segundos
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },

    // Vaciar el carrito completamente
    clear() {
        console.log('🗑️ Vaciando carrito...');
        window.state.cart = [];
        this.save();
        this.updateCartCount();
        this.render();
        this.showNotification('Carrito vaciado');
    }
};

// Exportar al objeto window para acceso global
window.cart = cart;

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        cart.init();
        console.log('✅ Cart.js inicializado correctamente');
    });
} else {
    cart.init();
    console.log('✅ Cart.js inicializado correctamente');
}

// Agregar estilos para la notificación si no existen
if (!document.getElementById('cart-notification-styles')) {
    const style = document.createElement('style');
    style.id = 'cart-notification-styles';
    style.textContent = `
        .cart-notification {
            position: fixed;
            top: -100px;
            left: 50%;
            transform: translateX(-50%);
            background: #4CAF50;
            color: white;
            padding: 15px 30px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 10000;
            transition: top 0.3s ease;
            font-size: 16px;
            font-weight: 500;
        }
        
        .cart-notification.show {
            top: 20px;
        }
        
        .cart-notification i {
            font-size: 20px;
        }
        
        .empty-cart {
            text-align: center;
            padding: 60px 20px;
        }
        
        .empty-cart i {
            font-size: 80px;
            color: #ccc;
            margin-bottom: 20px;
        }
        
        .empty-cart h3 {
            font-size: 24px;
            margin-bottom: 10px;
            color: #333;
        }
        
        .empty-cart p {
            color: #666;
            margin-bottom: 30px;
        }
    `;
    document.head.appendChild(style);
}
