/**
 * MÓDULO DE REPORTES
 */
Modules.Reports = {
    async load() {
        console.log('📈 Cargando módulo Reportes');
        this.render();
    },
    
    render() {
        const container = document.getElementById('module-reports-sales');
        if (!container) return;
        
        container.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">📊 Reportes y Análisis</h1>
            </div>
            <div class="data-table-wrapper">
                <div style="text-align: center; padding: 60px;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">📊</div>
                    <h3>Módulo de Reportes</h3>
                    <p style="color: #6B7280;">Disponible próximamente</p>
                </div>
            </div>
        `;
    }
};

/**
 * MÓDULO DE AUDITORÍA
 */
Modules.Audit = {
    data: [],
    currentPage: 1,
    pageSize: 20,
    
    async load() {
        console.log('📝 Cargando módulo Auditoría');
        await this.fetchAuditLogs();
        this.render();
    },
    
    async fetchAuditLogs() {
        try {
            const response = await fetch(`${CONFIG.API_URL}/audit.php?action=list&limit=50`);
            const data = await response.json();
            if (data.success) {
                this.data = data.logs || [];
            }
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        }
    },
    
    render() {
        const container = document.getElementById('module-audit');
        if (!container) return;
        
        const paginated = this.getPaginatedData();
        
        container.innerHTML = `
            <div class="page-header">
                <div class="page-header-top">
                    <div>
                        <h1 class="page-title">📝 Registro de Auditoría</h1>
                        <p class="page-description">Historial completo de acciones del sistema</p>
                    </div>
                    <button class="btn btn-primary" onclick="Modules.Audit.load()">
                        🔄 Actualizar
                    </button>
                </div>
            </div>
            
            <div class="data-table-wrapper">
                <div class="table-header">
                    <div class="table-title">Últimos ${this.data.length} registros</div>
                </div>
                
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Fecha/Hora</th>
                            <th>Usuario</th>
                            <th>Acción</th>
                            <th>Entidad</th>
                            <th>Descripción</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paginated.map(log => `
                            <tr>
                                <td>${formatDateTime(log.created_at)}</td>
                                <td><strong>${log.user_name || 'Sistema'}</strong></td>
                                <td>
                                    <span class="chip ${this.getActionClass(log.action)}">
                                        ${log.action}
                                    </span>
                                </td>
                                <td>${log.entity_type || '-'}</td>
                                <td style="max-width: 300px;" class="text-truncate">${log.description || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },
    
    getPaginatedData() {
        const start = (this.currentPage - 1) * this.pageSize;
        return this.data.slice(start, start + this.pageSize);
    },
    
    getActionClass(action) {
        const classes = {
            'CREATE': 'chip-success',
            'UPDATE': 'chip-info',
            'DELETE': 'chip-danger',
            'LOGIN': 'chip-primary',
            'LOGOUT': 'chip-secondary'
        };
        return classes[action] || 'chip-secondary';
    }
};

console.log('✅ Módulos Reports y Audit cargados');
