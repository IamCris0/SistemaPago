/**
 * MÓDULO DE DASHBOARD
 * Estadísticas y reportes en tiempo real
 */

Modules.Dashboard = {
    stats: {},
    refreshInterval: null,
    
    async load() {
        console.log('📊 Cargando Dashboard');
        await this.fetchStats();
        this.render();
        this.startAutoRefresh();
    },
    
    async fetchStats() {
        try {
            const response = await fetch(`${CONFIG.API_URL}/reports.php?action=dashboard`);
            const data = await response.json();
            
            if (data.success) {
                this.stats = data;
                return data;
            }
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            return null;
        }
    },
    
    render() {
        const container = document.getElementById('module-dashboard');
        if (!container) return;
        
        const today = this.stats.today || {};
        const month = this.stats.month || {};
        const alerts = this.stats.alerts || {};
        
        container.innerHTML = `
            <div class="page-header">
                <div class="page-header-top">
                    <div>
                        <h1 class="page-title">📊 Dashboard</h1>
                        <p class="page-description">Resumen ejecutivo en tiempo real</p>
                    </div>
                    <div class="page-actions">
                        <button class="btn btn-outline" onclick="Modules.Dashboard.exportReport()">
                            📥 Exportar
                        </button>
                        <button class="btn btn-primary" onclick="Modules.Dashboard.load()">
                            🔄 Actualizar
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="stats-row">
                <div class="stat-box primary">
                    <div class="stat-box-header">
                        <div class="stat-box-icon">💰</div>
                    </div>
                    <div class="stat-box-label">Ventas Hoy</div>
                    <div class="stat-box-value">${formatCurrency(today.revenue || 0)}</div>
                    <div class="stat-box-change positive">
                        <span>↗</span> ${today.orders || 0} órdenes
                    </div>
                </div>
                
                <div class="stat-box info">
                    <div class="stat-box-header">
                        <div class="stat-box-icon">📦</div>
                    </div>
                    <div class="stat-box-label">Órdenes del Mes</div>
                    <div class="stat-box-value">${month.orders || 0}</div>
                    <div class="stat-box-change positive">
                        <span>💰</span> ${formatCurrency(month.revenue || 0)}
                    </div>
                </div>
                
                <div class="stat-box success">
                    <div class="stat-box-header">
                        <div class="stat-box-icon">👥</div>
                    </div>
                    <div class="stat-box-label">Empleados Presentes</div>
                    <div class="stat-box-value">${today.employees_present || 0}</div>
                    <div class="stat-box-change">De turno hoy</div>
                </div>
                
                <div class="stat-box warning">
                    <div class="stat-box-header">
                        <div class="stat-box-icon">⚠️</div>
                    </div>
                    <div class="stat-box-label">Alertas de Stock</div>
                    <div class="stat-box-value">${alerts.low_stock || 0}</div>
                    <div class="stat-box-change">${alerts.pending_orders || 0} órdenes pendientes</div>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px; margin-bottom: 24px;">
                ${this.renderSalesChart()}
                ${this.renderQuickActions()}
            </div>
            
            ${this.renderRecentActivity()}
        `;
    },
    
    renderSalesChart() {
        return `
            <div class="data-table-wrapper">
                <div class="table-header">
                    <div class="table-title">📈 Tendencia de Ventas</div>
                    <select class="filter-dropdown" onchange="Modules.Dashboard.changePeriod(this.value)">
                        <option value="week">Esta Semana</option>
                        <option value="month">Este Mes</option>
                        <option value="year">Este Año</option>
                    </select>
                </div>
                <div style="padding: 40px; text-align: center; color: #6B7280;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">📊</div>
                    <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Gráfico de Ventas</div>
                    <div style="font-size: 14px;">Los datos se visualizarán aquí próximamente</div>
                </div>
            </div>
        `;
    },
    
    renderQuickActions() {
        return `
            <div class="data-table-wrapper">
                <div class="table-header">
                    <div class="table-title">⚡ Acciones Rápidas</div>
                </div>
                <div style="padding: 20px; display: flex; flex-direction: column; gap: 12px;">
                    <button class="btn btn-primary" onclick="showModule('products')" style="width: 100%; justify-content: flex-start;">
                        🛍️ Ver Productos
                    </button>
                    <button class="btn btn-primary" onclick="showModule('orders')" style="width: 100%; justify-content: flex-start;">
                        📦 Ver Órdenes
                    </button>
                    ${App.currentUser.is_admin ? `
                        <button class="btn btn-primary" onclick="showModule('employees')" style="width: 100%; justify-content: flex-start;">
                            👥 Ver Empleados
                        </button>
                    ` : ''}
                    <button class="btn btn-primary" onclick="showModule('attendance')" style="width: 100%; justify-content: flex-start;">
                        📅 Marcar Asistencia
                    </button>
                    <button class="btn btn-outline" onclick="showModule('reports')" style="width: 100%; justify-content: flex-start;">
                        📊 Ver Reportes
                    </button>
                    <button class="btn btn-outline" onclick="showModule('audit')" style="width: 100%; justify-content: flex-start;">
                        📝 Auditoría
                    </button>
                </div>
            </div>
        `;
    },
    
    renderRecentActivity() {
        return `
            <div class="data-table-wrapper">
                <div class="table-header">
                    <div class="table-title">🕐 Actividad Reciente</div>
                    <button class="btn btn-sm btn-outline" onclick="showModule('audit')">
                        Ver Todas
                    </button>
                </div>
                <div id="recentActivityContainer" style="padding: 20px;">
                    <div style="text-align: center; padding: 40px; color: #6B7280;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">📝</div>
                        <div>Cargando actividad reciente...</div>
                    </div>
                </div>
            </div>
        `;
    },
    
    async loadRecentActivity() {
        try {
            const response = await fetch(`${CONFIG.API_URL}/audit.php?action=list&limit=5`);
            const data = await response.json();
            
            const container = document.getElementById('recentActivityContainer');
            if (!container) return;
            
            if (data.success && data.logs && data.logs.length > 0) {
                container.innerHTML = data.logs.map(log => `
                    <div style="padding: 12px; border-bottom: 1px solid #F3F4F6; display: flex; align-items: center; gap: 12px;">
                        <div style="width: 40px; height: 40px; border-radius: 8px; background: ${this.getActionColor(log.action)}; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;">
                            ${this.getActionIcon(log.action)}
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-weight: 600; font-size: 14px; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                ${log.user_name || 'Sistema'}
                            </div>
                            <div style="font-size: 13px; color: #6B7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                ${log.description || log.action}
                            </div>
                        </div>
                        <div style="font-size: 12px; color: #9CA3AF; flex-shrink: 0;">
                            ${this.getTimeAgo(log.created_at)}
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #6B7280;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">📝</div>
                        <div>No hay actividad reciente</div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading recent activity:', error);
        }
    },
    
    getActionColor(action) {
        const colors = {
            'CREATE': '#D1FAE5',
            'UPDATE': '#DBEAFE',
            'DELETE': '#FEE2E2',
            'LOGIN': '#E0E7FF',
            'LOGOUT': '#F3F4F6'
        };
        return colors[action] || '#F3F4F6';
    },
    
    getActionIcon(action) {
        const icons = {
            'CREATE': '➕',
            'UPDATE': '✏️',
            'DELETE': '🗑️',
            'LOGIN': '🔐',
            'LOGOUT': '🚪'
        };
        return icons[action] || '📝';
    },
    
    getTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        
        if (seconds < 60) return 'Ahora';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
        return `${Math.floor(seconds / 86400)}d`;
    },
    
    changePeriod(period) {
        console.log('Cambiar período:', period);
    },
    
    exportReport() {
        showToast('Exportar', 'Preparando reporte para exportación...', 'info');
    },
    
    startAutoRefresh() {
        // Refrescar cada 5 minutos
        this.refreshInterval = setInterval(() => {
            this.load();
        }, 5 * 60 * 1000);
    },
    
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
};

// Cargar actividad reciente después de renderizar
setTimeout(() => {
    if (Modules.Dashboard && document.getElementById('recentActivityContainer')) {
        Modules.Dashboard.loadRecentActivity();
    }
}, 100);

console.log('✅ Módulo Dashboard cargado');
