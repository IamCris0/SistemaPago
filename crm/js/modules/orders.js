/**
 * MÓDULO DE ÓRDENES - MAWEWE CRM
 * Sin Bootstrap. Usa CSS del sistema (modules.css / crm-main.css).
 * Renderiza dentro de #ordersContainer.
 */

const OrdersModule = {

    orders: [],
    filters: { status: '', search: '', dateFrom: '', dateTo: '' },

    // ─── Punto de entrada ───────────────────────────────────────────────────

    async init() {
        console.log('🚀 Inicializando módulo de órdenes...');

        const container = document.getElementById('ordersContainer');
        if (!container) {
            console.error('❌ #ordersContainer no encontrado');
            return;
        }

        container.innerHTML = this._loadingHTML('Cargando órdenes...');

        await this._fetchOrders();
        this._render();
    },

    // ─── Carga de datos ─────────────────────────────────────────────────────

    async _fetchOrders() {
        try {
            const params = new URLSearchParams();
            if (this.filters.status)   params.append('status',    this.filters.status);
            if (this.filters.search)   params.append('search',    this.filters.search);
            if (this.filters.dateFrom) params.append('date_from', this.filters.dateFrom);
            if (this.filters.dateTo)   params.append('date_to',   this.filters.dateTo);

            const qs  = params.toString();
            const url = `${CONFIG.API_URL}/orders.php${qs ? '?' + qs : ''}`;

            const resp = await fetch(url);
            const data = await resp.json();

            if (data.success) {
                this.orders = data.data || [];
                // Actualizar badge del sidebar
                const badge = document.getElementById('orderCount');
                if (badge) badge.textContent = this.orders.length;
            } else {
                throw new Error(data.message || 'Error al cargar órdenes');
            }
        } catch (err) {
            console.error('Error cargando órdenes:', err);
            this.orders = [];
        }
    },

    // ─── Render principal ───────────────────────────────────────────────────

    _render() {
        const container = document.getElementById('ordersContainer');
        if (!container) return;

        container.innerHTML = `
            ${this._renderHeader()}
            ${this._renderStats()}
            ${this._renderFilters()}
            ${this._renderTable()}
        `;

        this._attachEvents();
    },

    // ─── Header ─────────────────────────────────────────────────────────────

    _renderHeader() {
        return `
        <div style="display:flex;justify-content:space-between;align-items:center;
                    margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #e5e7eb;">
            <div>
                <h2 style="font-size:28px;font-weight:700;color:#003d82;margin:0 0 4px 0;">
                    Gestión de Órdenes
                </h2>
                <p style="font-size:14px;color:#6b7280;margin:0;">
                    ${this.orders.length} orden${this.orders.length !== 1 ? 'es' : ''} encontrada${this.orders.length !== 1 ? 's' : ''}
                </p>
            </div>
            <button class="btn btn-outline" id="btnRefreshOrders">🔄 Actualizar</button>
        </div>`;
    },

    // ─── Estadísticas ───────────────────────────────────────────────────────

    _renderStats() {
        const total     = this.orders.length;
        const pending   = this.orders.filter(o => o.status === 'pending').length;
        const inProcess = this.orders.filter(o => ['confirmed','processing','shipped'].includes(o.status)).length;
        const delivered = this.orders.filter(o => o.status === 'delivered').length;
        const cancelled = this.orders.filter(o => o.status === 'cancelled').length;

        return `
        <div class="stats-row" style="margin-bottom:24px;">
            ${this._statBox('primary','📦','Total',total)}
            ${this._statBox('warning','⏳','Pendientes',pending)}
            ${this._statBox('info','⚙️','En proceso',inProcess)}
            ${this._statBox('success','✅','Entregadas',delivered)}
            ${this._statBox('danger','❌','Canceladas',cancelled)}
        </div>`;
    },

    _statBox(color, icon, label, value) {
        return `
        <div class="stat-box ${color}">
            <div class="stat-box-header">
                <div class="stat-box-icon">${icon}</div>
            </div>
            <div class="stat-box-label">${label}</div>
            <div class="stat-box-value">${value}</div>
        </div>`;
    },

    // ─── Filtros ────────────────────────────────────────────────────────────

    _renderFilters() {
        const statusOptions = [
            { value: '',          label: 'Todos los estados' },
            { value: 'pending',   label: '⏳ Pendiente' },
            { value: 'confirmed', label: '✔ Confirmado' },
            { value: 'processing',label: '⚙️ Procesando' },
            { value: 'shipped',   label: '🚚 Enviado' },
            { value: 'delivered', label: '✅ Entregado' },
            { value: 'cancelled', label: '❌ Cancelado' },
        ];

        return `
        <div style="background:white;padding:20px;border-radius:12px;border:2px solid #e5e7eb;
                    margin-bottom:24px;display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
            <div style="flex:2;min-width:200px;">
                <input type="text" id="ordersSearch" placeholder="🔍 Buscar por orden, cliente, email…"
                       value="${this._esc(this.filters.search)}"
                       style="width:100%;padding:10px 14px;border:2px solid #e5e7eb;border-radius:8px;font-size:14px;">
            </div>
            <div style="flex:1;min-width:180px;">
                <select id="ordersStatusFilter"
                        style="width:100%;padding:10px 14px;border:2px solid #e5e7eb;border-radius:8px;font-size:14px;cursor:pointer;">
                    ${statusOptions.map(o => `
                        <option value="${o.value}" ${this.filters.status === o.value ? 'selected' : ''}>${o.label}</option>
                    `).join('')}
                </select>
            </div>
            <div style="flex:1;min-width:150px;">
                <input type="date" id="ordersDateFrom" value="${this.filters.dateFrom}"
                       style="width:100%;padding:10px 14px;border:2px solid #e5e7eb;border-radius:8px;font-size:14px;">
            </div>
            <div style="flex:1;min-width:150px;">
                <input type="date" id="ordersDateTo" value="${this.filters.dateTo}"
                       style="width:100%;padding:10px 14px;border:2px solid #e5e7eb;border-radius:8px;font-size:14px;">
            </div>
            <button class="btn btn-secondary" id="btnClearOrderFilters">🔄 Limpiar</button>
        </div>`;
    },

    // ─── Tabla ──────────────────────────────────────────────────────────────

    _renderTable() {
        if (this.orders.length === 0) {
            return `
            <div style="text-align:center;padding:80px 40px;background:white;
                        border-radius:12px;border:2px solid #e5e7eb;">
                <div style="font-size:80px;margin-bottom:20px;">📭</div>
                <h3 style="font-size:24px;color:#1f2937;margin-bottom:12px;">No hay órdenes</h3>
                <p style="font-size:16px;color:#6b7280;">
                    ${this.filters.search || this.filters.status
                        ? 'No se encontraron órdenes con esos filtros.'
                        : 'Aún no se han registrado órdenes en el sistema.'}
                </p>
            </div>`;
        }

        const rows = this.orders.map(o => `
        <tr>
            <td><strong style="color:#003d82;">${this._esc(o.order_number)}</strong></td>
            <td>
                <div style="font-weight:600;">${this._esc(o.customer_name)}</div>
                <div style="font-size:12px;color:#6b7280;">${this._esc(o.customer_email)}</div>
                <div style="font-size:12px;color:#6b7280;">${this._esc(o.customer_phone || '')}</div>
            </td>
            <td style="text-align:center;">${o.items_count || 0}</td>
            <td><strong>$${parseFloat(o.total || 0).toFixed(2)}</strong></td>
            <td>${this._statusBadge(o.status)}</td>
            <td>${this._paymentBadge(o.payment_status)}</td>
            <td style="font-size:12px;">${this._formatDate(o.created_at)}</td>
            <td>
                <div style="display:flex;gap:6px;justify-content:center;">
                    <button class="btn-icon btn-icon-view" onclick="OrdersModule.viewOrder(${o.id})" title="Ver detalle">👁</button>
                    <button class="btn-icon btn-icon-edit" onclick="OrdersModule.openStatusModal(${o.id})" title="Actualizar estado">✏️</button>
                </div>
            </td>
        </tr>`).join('');

        return `
        <div class="data-table-wrapper">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>N° Orden</th>
                        <th>Cliente</th>
                        <th style="text-align:center;">Items</th>
                        <th>Total</th>
                        <th>Estado</th>
                        <th>Pago</th>
                        <th>Fecha</th>
                        <th style="text-align:center;">Acciones</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
    },

    // ─── Modal: ver detalle ──────────────────────────────────────────────────

    viewOrder(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        const items = Array.isArray(order.items) ? order.items : [];

        const itemRows = items.length
            ? items.map(item => `
                <tr>
                    <td>${this._esc(item.name || 'Producto')}</td>
                    <td style="text-align:center;">${item.quantity || 1}</td>
                    <td style="text-align:right;">$${parseFloat(item.price || 0).toFixed(2)}</td>
                    <td style="text-align:right;">$${(parseFloat(item.price || 0) * parseInt(item.quantity || 1)).toFixed(2)}</td>
                </tr>`).join('')
            : `<tr><td colspan="4" style="text-align:center;color:#6b7280;">Sin productos</td></tr>`;

        const html = `
        <div id="orderDetailOverlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.55);
                backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;">
            <div style="background:white;border-radius:16px;max-width:720px;width:100%;
                        max-height:90vh;overflow:hidden;display:flex;flex-direction:column;
                        box-shadow:0 25px 50px rgba(0,0,0,0.3);">
                <!-- header -->
                <div style="padding:24px 28px;background:linear-gradient(135deg,#003d82,#002952);
                            color:white;display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <h3 style="margin:0;font-size:20px;font-weight:700;">Detalle de Orden</h3>
                        <div style="font-size:14px;opacity:0.85;margin-top:4px;">${this._esc(order.order_number)}</div>
                    </div>
                    <button onclick="document.getElementById('orderDetailOverlay').remove()"
                            style="background:rgba(255,255,255,0.2);border:none;color:white;
                                   font-size:24px;width:36px;height:36px;border-radius:50%;cursor:pointer;">×</button>
                </div>
                <!-- body -->
                <div style="padding:28px;overflow-y:auto;flex:1;">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px;">
                        <div>
                            <h4 style="font-size:14px;font-weight:700;color:#6b7280;text-transform:uppercase;
                                       letter-spacing:.5px;margin:0 0 12px 0;padding-bottom:8px;border-bottom:2px solid #e5e7eb;">
                                Cliente
                            </h4>
                            <p style="margin:0 0 6px;"><strong>${this._esc(order.customer_name)}</strong></p>
                            <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">${this._esc(order.customer_email)}</p>
                            <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">${this._esc(order.customer_phone || '—')}</p>
                            ${order.customer_cedula ? `<p style="margin:0;font-size:13px;color:#6b7280;">CI: ${this._esc(order.customer_cedula)}</p>` : ''}
                            <p style="margin:6px 0 0;font-size:13px;color:#6b7280;">${this._esc(order.customer_address || '—')}</p>
                        </div>
                        <div>
                            <h4 style="font-size:14px;font-weight:700;color:#6b7280;text-transform:uppercase;
                                       letter-spacing:.5px;margin:0 0 12px 0;padding-bottom:8px;border-bottom:2px solid #e5e7eb;">
                                Envío y Pago
                            </h4>
                            <p style="margin:0 0 6px;font-size:13px;"><strong>Envío:</strong> ${this._esc(order.shipping_method || '—')}</p>
                            <p style="margin:0 0 6px;font-size:13px;"><strong>Costo envío:</strong> $${parseFloat(order.shipping_cost || 0).toFixed(2)}</p>
                            <p style="margin:0 0 6px;font-size:13px;"><strong>Pago:</strong> ${this._esc(order.payment_method || '—')}</p>
                            <p style="margin:0 0 6px;font-size:13px;"><strong>Estado:</strong> ${this._statusBadge(order.status)}</p>
                            <p style="margin:0 0 6px;font-size:13px;"><strong>Pago:</strong> ${this._paymentBadge(order.payment_status)}</p>
                            ${order.tracking_number ? `<p style="margin:6px 0 0;font-size:13px;"><strong>Tracking:</strong> ${this._esc(order.tracking_number)}</p>` : ''}
                        </div>
                    </div>

                    <h4 style="font-size:14px;font-weight:700;color:#6b7280;text-transform:uppercase;
                               letter-spacing:.5px;margin:0 0 12px 0;padding-bottom:8px;border-bottom:2px solid #e5e7eb;">
                        Productos
                    </h4>
                    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
                        <thead>
                            <tr style="background:#f9fafb;">
                                <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase;">Producto</th>
                                <th style="padding:10px 12px;text-align:center;font-size:12px;color:#6b7280;text-transform:uppercase;">Cant.</th>
                                <th style="padding:10px 12px;text-align:right;font-size:12px;color:#6b7280;text-transform:uppercase;">Precio</th>
                                <th style="padding:10px 12px;text-align:right;font-size:12px;color:#6b7280;text-transform:uppercase;">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>${itemRows}</tbody>
                        <tfoot>
                            <tr><td colspan="3" style="padding:8px 12px;text-align:right;font-weight:600;">Subtotal</td>
                                <td style="padding:8px 12px;text-align:right;">$${parseFloat(order.subtotal||0).toFixed(2)}</td></tr>
                            <tr><td colspan="3" style="padding:8px 12px;text-align:right;font-weight:600;">Envío</td>
                                <td style="padding:8px 12px;text-align:right;">$${parseFloat(order.shipping_cost||0).toFixed(2)}</td></tr>
                            ${parseFloat(order.tax||0) > 0 ? `<tr><td colspan="3" style="padding:8px 12px;text-align:right;font-weight:600;">IVA</td>
                                <td style="padding:8px 12px;text-align:right;">$${parseFloat(order.tax||0).toFixed(2)}</td></tr>` : ''}
                            <tr style="background:#f0f7ff;">
                                <td colspan="3" style="padding:12px;text-align:right;font-weight:700;font-size:16px;">TOTAL</td>
                                <td style="padding:12px;text-align:right;font-weight:700;font-size:16px;color:#003d82;">
                                    $${parseFloat(order.total||0).toFixed(2)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>

                    ${order.notes ? `
                    <div style="background:#fef9e7;padding:14px 16px;border-radius:8px;border-left:4px solid #f59e0b;">
                        <strong style="font-size:13px;">Notas:</strong>
                        <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">${this._esc(order.notes)}</p>
                    </div>` : ''}

                    <p style="font-size:12px;color:#9ca3af;margin-top:16px;">
                        Creado: ${this._formatDate(order.created_at)} &nbsp;|&nbsp;
                        Actualizado: ${this._formatDate(order.updated_at)}
                    </p>
                </div>
                <!-- footer -->
                <div style="padding:20px 28px;background:#f9fafb;border-top:2px solid #e5e7eb;
                            display:flex;justify-content:flex-end;gap:12px;">
                    <button class="btn btn-secondary"
                            onclick="document.getElementById('orderDetailOverlay').remove()">Cerrar</button>
                    <button class="btn btn-primary"
                            onclick="document.getElementById('orderDetailOverlay').remove(); OrdersModule.openStatusModal(${order.id})">
                        ✏️ Actualizar Estado
                    </button>
                </div>
            </div>
        </div>`;

        // Eliminar overlay previo si existe
        const prev = document.getElementById('orderDetailOverlay');
        if (prev) prev.remove();
        document.body.insertAdjacentHTML('beforeend', html);
    },

    // ─── Modal: actualizar estado ────────────────────────────────────────────

    openStatusModal(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        const statusOpts = [
            { value: 'pending',    label: '⏳ Pendiente' },
            { value: 'confirmed',  label: '✔ Confirmado' },
            { value: 'processing', label: '⚙️ Procesando' },
            { value: 'shipped',    label: '🚚 Enviado' },
            { value: 'delivered',  label: '✅ Entregado' },
            { value: 'cancelled',  label: '❌ Cancelado' },
        ];

        const payOpts = [
            { value: 'pending',  label: '⏳ Pendiente' },
            { value: 'paid',     label: '✅ Pagado' },
            { value: 'refunded', label: '↩ Reembolsado' },
            { value: 'failed',   label: '❌ Fallido' },
        ];

        const html = `
        <div id="orderStatusOverlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.55);
                backdrop-filter:blur(4px);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;">
            <div style="background:white;border-radius:16px;max-width:480px;width:100%;
                        box-shadow:0 25px 50px rgba(0,0,0,0.3);">
                <div style="padding:24px 28px;background:linear-gradient(135deg,#003d82,#002952);
                            color:white;display:flex;justify-content:space-between;align-items:center;
                            border-radius:16px 16px 0 0;">
                    <h3 style="margin:0;font-size:18px;font-weight:700;">Actualizar Estado</h3>
                    <button onclick="document.getElementById('orderStatusOverlay').remove()"
                            style="background:rgba(255,255,255,0.2);border:none;color:white;
                                   font-size:22px;width:32px;height:32px;border-radius:50%;cursor:pointer;">×</button>
                </div>
                <div style="padding:28px;">
                    <p style="margin:0 0 20px;font-size:13px;color:#6b7280;">
                        Orden: <strong style="color:#003d82;">${this._esc(order.order_number)}</strong>
                        — ${this._esc(order.customer_name)}
                    </p>

                    <div style="margin-bottom:16px;">
                        <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;">Estado de la Orden</label>
                        <select id="newOrderStatus"
                                style="width:100%;padding:10px 14px;border:2px solid #e5e7eb;border-radius:8px;font-size:14px;cursor:pointer;">
                            ${statusOpts.map(o => `<option value="${o.value}" ${order.status===o.value?'selected':''}>${o.label}</option>`).join('')}
                        </select>
                    </div>

                    <div style="margin-bottom:16px;">
                        <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;">Estado de Pago</label>
                        <select id="newPaymentStatus"
                                style="width:100%;padding:10px 14px;border:2px solid #e5e7eb;border-radius:8px;font-size:14px;cursor:pointer;">
                            ${payOpts.map(o => `<option value="${o.value}" ${order.payment_status===o.value?'selected':''}>${o.label}</option>`).join('')}
                        </select>
                    </div>

                    <div style="margin-bottom:16px;">
                        <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;">N° Seguimiento (opcional)</label>
                        <input type="text" id="newTrackingNumber" value="${this._esc(order.tracking_number||'')}"
                               placeholder="Ej: ABC123456789"
                               style="width:100%;padding:10px 14px;border:2px solid #e5e7eb;border-radius:8px;font-size:14px;">
                    </div>

                    <div style="margin-bottom:8px;">
                        <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;">Notas (opcional)</label>
                        <textarea id="newOrderNotes" rows="3"
                                  style="width:100%;padding:10px 14px;border:2px solid #e5e7eb;border-radius:8px;font-size:14px;resize:vertical;"
                                  >${this._esc(order.notes||'')}</textarea>
                    </div>
                </div>
                <div style="padding:16px 28px 24px;display:flex;justify-content:flex-end;gap:12px;">
                    <button class="btn btn-secondary"
                            onclick="document.getElementById('orderStatusOverlay').remove()">Cancelar</button>
                    <button class="btn btn-primary"
                            onclick="OrdersModule._saveStatus(${order.id})">💾 Guardar Cambios</button>
                </div>
            </div>
        </div>`;

        const prev = document.getElementById('orderStatusOverlay');
        if (prev) prev.remove();
        document.body.insertAdjacentHTML('beforeend', html);
    },

    async _saveStatus(orderId) {
        const status         = document.getElementById('newOrderStatus')?.value;
        const paymentStatus  = document.getElementById('newPaymentStatus')?.value;
        const trackingNumber = document.getElementById('newTrackingNumber')?.value?.trim();
        const notes          = document.getElementById('newOrderNotes')?.value?.trim();

        if (!status) return;

        try {
            showLoading && showLoading();

            const resp = await fetch(`${CONFIG.API_URL}/orders.php`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: orderId, status, payment_status: paymentStatus, tracking_number: trackingNumber, notes })
            });

            const data = await resp.json();

            if (data.success) {
                document.getElementById('orderStatusOverlay')?.remove();
                showToast && showToast('Éxito', 'Estado de la orden actualizado', 'success');
                await this._fetchOrders();
                this._render();
            } else {
                throw new Error(data.message || 'Error al actualizar');
            }
        } catch (err) {
            console.error('Error actualizando estado:', err);
            showToast && showToast('Error', err.message, 'error');
        } finally {
            hideLoading && hideLoading();
        }
    },

    // ─── Eventos ────────────────────────────────────────────────────────────

    _attachEvents() {
        const searchInput = document.getElementById('ordersSearch');
        const statusSel   = document.getElementById('ordersStatusFilter');
        const dateFrom    = document.getElementById('ordersDateFrom');
        const dateTo      = document.getElementById('ordersDateTo');
        const btnRefresh  = document.getElementById('btnRefreshOrders');
        const btnClear    = document.getElementById('btnClearOrderFilters');

        let searchTimer;
        if (searchInput) {
            searchInput.addEventListener('input', e => {
                clearTimeout(searchTimer);
                searchTimer = setTimeout(() => {
                    this.filters.search = e.target.value.trim();
                    this._applyFilters();
                }, 350);
            });
        }

        if (statusSel) {
            statusSel.addEventListener('change', e => {
                this.filters.status = e.target.value;
                this._applyFilters();
            });
        }

        if (dateFrom) {
            dateFrom.addEventListener('change', e => {
                this.filters.dateFrom = e.target.value;
                this._applyFilters();
            });
        }

        if (dateTo) {
            dateTo.addEventListener('change', e => {
                this.filters.dateTo = e.target.value;
                this._applyFilters();
            });
        }

        if (btnRefresh) {
            btnRefresh.addEventListener('click', async () => {
                btnRefresh.disabled = true;
                btnRefresh.textContent = '⏳ Actualizando...';
                await this._fetchOrders();
                this._render();
            });
        }

        if (btnClear) {
            btnClear.addEventListener('click', () => {
                this.filters = { status: '', search: '', dateFrom: '', dateTo: '' };
                this._applyFilters();
            });
        }
    },

    async _applyFilters() {
        const container = document.getElementById('ordersContainer');
        if (container) {
            // Solo actualizar la tabla, no todo (para preservar el estado de los filtros en el DOM)
            await this._fetchOrders();
            this._render();
        }
    },

    // ─── Helpers ────────────────────────────────────────────────────────────

    _statusBadge(status) {
        const map = {
            pending:    { label: 'Pendiente',   cls: 'badge-warning'   },
            confirmed:  { label: 'Confirmado',  cls: 'badge-info'      },
            processing: { label: 'Procesando',  cls: 'badge-primary'   },
            shipped:    { label: 'Enviado',      cls: 'badge-success'   },
            delivered:  { label: 'Entregado',   cls: 'badge-success'   },
            cancelled:  { label: 'Cancelado',   cls: 'badge-danger'    },
        };
        const s = map[status] || { label: status || '—', cls: 'badge-secondary' };
        return `<span class="badge ${s.cls}">${s.label}</span>`;
    },

    _paymentBadge(status) {
        const map = {
            pending:  { label: 'Pendiente',     cls: 'badge-warning'  },
            paid:     { label: 'Pagado',        cls: 'badge-success'  },
            refunded: { label: 'Reembolsado',   cls: 'badge-info'     },
            failed:   { label: 'Fallido',       cls: 'badge-danger'   },
        };
        const s = map[status] || { label: status || '—', cls: 'badge-secondary' };
        return `<span class="badge ${s.cls}">${s.label}</span>`;
    },

    _formatDate(str) {
        if (!str) return '—';
        return new Date(str).toLocaleString('es-EC', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
    },

    _esc(text) {
        if (text === null || text === undefined) return '';
        const d = document.createElement('div');
        d.textContent = String(text);
        return d.innerHTML;
    },

    _loadingHTML(msg) {
        return `
        <div style="text-align:center;padding:80px 40px;">
            <div style="width:60px;height:60px;border:6px solid #e5e7eb;border-top-color:#003d82;
                        border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 20px;"></div>
            <p style="font-size:16px;color:#6b7280;">${msg}</p>
        </div>`;
    },
};

// Registrar en Router cuando esté disponible
if (typeof Router !== 'undefined') {
    Router.register('orders', () => OrdersModule.init());
}

window.OrdersModule = OrdersModule;
console.log('✅ Módulo Orders cargado (sin Bootstrap)');