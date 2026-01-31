/**
 * MÓDULO DE ASISTENCIA
 * Control de entrada y salida de empleados
 */

Modules.Attendance = {
    data: [],
    currentDate: new Date().toISOString().split('T')[0],
    
    async load() {
        console.log('📅 Cargando módulo Asistencia');
        await this.fetchAttendance();
        this.render();
    },
    
    async fetchAttendance() {
        try {
            const response = await fetch(`${CONFIG.API_URL}/attendance.php?action=today`);
            const data = await response.json();
            if (data.success) {
                this.data = data.records || [];
            }
            return this.data;
        } catch (error) {
            console.error('Error fetching attendance:', error);
            return [];
        }
    },
    
    render() {
        const container = document.getElementById('module-attendance');
        if (!container) return;
        
        const present = this.data.filter(r => r.check_in && !r.check_out).length;
        const completed = this.data.filter(r => r.check_out).length;
        const totalHours = this.data.reduce((sum, r) => sum + (r.hours_worked || 0), 0);
        
        container.innerHTML = `
            <div class="page-header">
                <div class="page-header-top">
                    <div>
                        <h1 class="page-title">📅 Control de Asistencia</h1>
                        <p class="page-description">Registro de entrada y salida - ${new Date().toLocaleDateString('es-EC')}</p>
                    </div>
                    <div class="page-actions">
                        <button class="btn btn-outline" onclick="Modules.Attendance.checkIn()">
                            ⏱ Marcar Entrada
                        </button>
                        <button class="btn btn-primary" onclick="Modules.Attendance.checkOut()">
                            ✅ Marcar Salida
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="stats-row">
                <div class="stat-box success">
                    <div class="stat-box-icon">✓</div>
                    <div class="stat-box-label">Presentes</div>
                    <div class="stat-box-value">${present}</div>
                </div>
                <div class="stat-box primary">
                    <div class="stat-box-icon">📋</div>
                    <div class="stat-box-label">Registros Completos</div>
                    <div class="stat-box-value">${completed}</div>
                </div>
                <div class="stat-box info">
                    <div class="stat-box-icon">⏰</div>
                    <div class="stat-box-label">Horas Totales</div>
                    <div class="stat-box-value">${totalHours.toFixed(1)}h</div>
                </div>
            </div>
            
            <div class="data-table-wrapper">
                <div class="table-header">
                    <div class="table-title">Asistencia de Hoy</div>
                    <button class="btn btn-sm btn-outline" onclick="Modules.Attendance.load()">
                        🔄 Actualizar
                    </button>
                </div>
                
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Empleado</th>
                            <th>Cargo</th>
                            <th>Entrada</th>
                            <th>Salida</th>
                            <th>Horas</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.data.length > 0 ? this.data.map(record => `
                            <tr>
                                <td><strong>${record.nombre}</strong></td>
                                <td>${record.cargo}</td>
                                <td>${record.check_in ? formatTime(record.check_in) : '-'}</td>
                                <td>${record.check_out ? formatTime(record.check_out) : '-'}</td>
                                <td><strong>${record.hours_worked ? record.hours_worked.toFixed(1) + 'h' : '-'}</strong></td>
                                <td>
                                    <span class="chip ${record.check_out ? 'chip-success' : 'chip-warning'}">
                                        ${record.check_out ? '✓ Completado' : '⏱ En curso'}
                                    </span>
                                </td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="6" style="text-align: center; padding: 3rem; color: #6B7280;">
                                    <div style="font-size: 3rem; margin-bottom: 1rem;">📅</div>
                                    <div>No hay registros de asistencia hoy</div>
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        `;
    },
    
    async checkIn() {
        try {
            showLoading();
            const response = await fetch(`${CONFIG.API_URL}/attendance.php?action=check-in`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.getToken()}`
                },
                body: JSON.stringify({
                    employee_id: App.currentUser.id
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast('Éxito', 'Entrada registrada correctamente', 'success');
                await this.load();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            showToast('Error', error.message, 'error');
        } finally {
            hideLoading();
        }
    },
    
    async checkOut() {
        try {
            showLoading();
            const response = await fetch(`${CONFIG.API_URL}/attendance.php?action=check-out`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.getToken()}`
                },
                body: JSON.stringify({
                    employee_id: App.currentUser.id
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast('Éxito', `Salida registrada. Horas trabajadas: ${data.hours_worked}h`, 'success');
                await this.load();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            showToast('Error', error.message, 'error');
        } finally {
            hideLoading();
        }
    }
};

console.log('✅ Módulo Attendance cargado');
