/**
 * Employee Panel JavaScript - Mawewe CRM v2.0
 * Manejo completo de asistencia y estadísticas
 */

let currentEmployee = null;
let checkInInterval = null;
let currentCheckIn = null;

// ========================================
// INICIALIZACIÓN
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadStats();
    loadTodayStatus();
    loadHistory();
    setCurrentMonth();
});

// ========================================
// AUTENTICACIÓN
// ========================================

function checkAuth() {
    const employeeData = localStorage.getItem(CONFIG.SESSION.EMPLOYEE_KEY);
    
    if (!employeeData) {
        window.location.href = 'index.html';
        return;
    }

    currentEmployee = JSON.parse(employeeData);
    
    // Redirigir si es admin
    if (currentEmployee.is_admin) {
        window.location.href = 'admin.html';
        return;
    }

    // Mostrar nombre del empleado
    document.getElementById('employeeName').textContent = currentEmployee.nombre;
}

function logout() {
    if (confirm('¿Estás seguro de cerrar sesión?')) {
        // Detener timer si existe
        if (checkInInterval) {
            clearInterval(checkInInterval);
        }
        
        localStorage.removeItem(CONFIG.SESSION.EMPLOYEE_KEY);
        localStorage.removeItem(CONFIG.SESSION.TOKEN_KEY);
        window.location.href = 'index.html';
    }
}

// ========================================
// ESTADÍSTICAS DEL MES
// ========================================

async function loadStats() {
    try {
        const month = new Date().toISOString().slice(0, 7);
        const response = await fetch(
            `${CONFIG.API_URL}/attendance.php?action=stats&employee_id=${currentEmployee.id}&month=${month}`
        );
        
        const data = await response.json();

        if (data.success) {
            const stats = data.stats;
            
            document.getElementById('daysWorked').textContent = stats.complete_days || 0;
            document.getElementById('totalHours').textContent = (stats.total_hours || 0).toFixed(1) + 'h';
            document.getElementById('avgHours').textContent = (stats.avg_hours || 0).toFixed(1) + 'h';
        }
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

// ========================================
// ESTADO DE HOY
// ========================================

async function loadTodayStatus() {
    try {
        const response = await fetch(
            `${CONFIG.API_URL}/attendance.php?action=today&employee_id=${currentEmployee.id}`
        );
        
        const data = await response.json();

        if (data.success && data.records && data.records.length > 0) {
            const record = data.records[0];
            
            if (record.check_out === null) {
                // Tiene entrada pero no salida - En trabajo
                currentCheckIn = record;
                showWorkingStatus(record);
                document.getElementById('btnCheckIn').disabled = true;
                document.getElementById('btnCheckOut').disabled = false;
                startTimer(record.check_in);
                
                updateStatusBadge('working', 'En trabajo');
            } else {
                // Ya completó su jornada
                document.getElementById('btnCheckIn').disabled = true;
                document.getElementById('btnCheckOut').disabled = true;
                
                updateStatusBadge('not-working', 'Jornada completada');
            }
        } else {
            // No hay registro hoy
            updateStatusBadge('not-working', 'Sin registro');
        }
    } catch (error) {
        console.error('Error cargando estado de hoy:', error);
    }
}

function showWorkingStatus(record) {
    const statusDiv = document.getElementById('currentStatus');
    statusDiv.style.display = 'block';

    const checkInTime = new Date(record.check_in);
    document.getElementById('checkInTime').textContent = formatTime(checkInTime);
}

function updateStatusBadge(type, text) {
    const badge = document.getElementById('statusBadge');
    badge.className = `card-badge ${type}`;
    document.getElementById('statusText').textContent = text;
}

// ========================================
// MARCAR ENTRADA
// ========================================

async function checkIn() {
    const btn = document.getElementById('btnCheckIn');
    const originalContent = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = `
        <div class="btn-icon">⏳</div>
        <div class="btn-content">
            <div class="btn-title">Marcando...</div>
            <div class="btn-subtitle">Por favor espera</div>
        </div>
    `;

    try {
        const response = await fetch(`${CONFIG.API_URL}/attendance.php?action=check-in`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                employee_id: currentEmployee.id
            })
        });

        const data = await response.json();

        if (data.success) {
            showAlert(`✅ Entrada marcada exitosamente a las ${data.time}`, 'success');
            
            // Recargar todo
            setTimeout(() => {
                loadTodayStatus();
                loadHistory();
                loadStats();
            }, 1000);
        } else {
            showAlert('❌ ' + data.message, 'error');
            btn.disabled = false;
            btn.innerHTML = originalContent;
        }
    } catch (error) {
        console.error('Error marcando entrada:', error);
        showAlert('❌ Error de conexión. Por favor intenta nuevamente.', 'error');
        btn.disabled = false;
        btn.innerHTML = originalContent;
    }
}

// ========================================
// MARCAR SALIDA
// ========================================

async function checkOut() {
    if (!confirm('¿Estás seguro de marcar tu salida?')) {
        return;
    }

    const btn = document.getElementById('btnCheckOut');
    const originalContent = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = `
        <div class="btn-icon">⏳</div>
        <div class="btn-content">
            <div class="btn-title">Marcando...</div>
            <div class="btn-subtitle">Por favor espera</div>
        </div>
    `;

    try {
        const response = await fetch(`${CONFIG.API_URL}/attendance.php?action=check-out`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                employee_id: currentEmployee.id
            })
        });

        const data = await response.json();

        if (data.success) {
            showAlert(
                `✅ Salida marcada exitosamente. Trabajaste ${data.hours_worked} horas hoy. ¡Buen trabajo!`, 
                'success'
            );
            
            // Detener timer
            if (checkInInterval) {
                clearInterval(checkInInterval);
            }

            // Recargar página después de 2 segundos
            setTimeout(() => {
                location.reload();
            }, 2000);
        } else {
            showAlert('❌ ' + data.message, 'error');
            btn.disabled = false;
            btn.innerHTML = originalContent;
        }
    } catch (error) {
        console.error('Error marcando salida:', error);
        showAlert('❌ Error de conexión. Por favor intenta nuevamente.', 'error');
        btn.disabled = false;
        btn.innerHTML = originalContent;
    }
}

// ========================================
// HISTORIAL DEL MES
// ========================================

async function loadHistory() {
    const tbody = document.getElementById('historyBody');
    
    try {
        const startDate = new Date();
        startDate.setDate(1); // Primer día del mes
        
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1, 0); // Último día del mes

        const response = await fetch(
            `${CONFIG.API_URL}/attendance.php?action=history` +
            `&employee_id=${currentEmployee.id}` +
            `&start_date=${startDate.toISOString().split('T')[0]}` +
            `&end_date=${endDate.toISOString().split('T')[0]}`
        );
        
        const data = await response.json();

        if (data.success) {
            displayHistory(data.records);
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="table-empty">
                        <div class="table-empty-icon">❌</div>
                        <h3>Error al cargar</h3>
                        <p>No se pudo obtener el historial</p>
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('Error cargando historial:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="table-empty">
                    <div class="table-empty-icon">❌</div>
                    <h3>Error de conexión</h3>
                    <p>No se pudo cargar el historial</p>
                </td>
            </tr>
        `;
    }
}

function displayHistory(records) {
    const tbody = document.getElementById('historyBody');

    if (!records || records.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="table-empty">
                    <div class="table-empty-icon">📅</div>
                    <h3>Sin registros</h3>
                    <p>No hay registros de asistencia este mes</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = records.map(record => {
        const date = new Date(record.date);
        const checkIn = record.check_in ? new Date(record.check_in) : null;
        const checkOut = record.check_out ? new Date(record.check_out) : null;
        const isComplete = checkOut !== null;
        
        return `
            <tr>
                <td><strong>${formatDate(date)}</strong></td>
                <td>${checkIn ? formatTime(checkIn) : '-'}</td>
                <td>${checkOut ? formatTime(checkOut) : '-'}</td>
                <td><strong>${record.hours_worked ? record.hours_worked.toFixed(1) + 'h' : '-'}</strong></td>
                <td>
                    <span class="badge ${isComplete ? 'complete' : 'incomplete'}">
                        ${isComplete ? '✓ Completo' : '⏱ En curso'}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

// ========================================
// TIMER EN TIEMPO REAL
// ========================================

function startTimer(checkInTime) {
    const checkIn = new Date(checkInTime);
    
    // Actualizar inmediatamente
    updateElapsedTime(checkIn);
    
    // Actualizar cada segundo
    checkInInterval = setInterval(() => {
        updateElapsedTime(checkIn);
    }, 1000);
}

function updateElapsedTime(checkIn) {
    const now = new Date();
    const diff = now - checkIn;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    document.getElementById('elapsedTime').textContent = 
        `${hours}h ${minutes}m ${seconds}s`;
}

// ========================================
// UTILIDADES
// ========================================

function formatDate(date) {
    const options = { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    };
    return date.toLocaleDateString('es-EC', options);
}

function formatTime(date) {
    return date.toLocaleTimeString('es-EC', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

function setCurrentMonth() {
    const now = new Date();
    const monthName = now.toLocaleDateString('es-EC', { 
        month: 'long', 
        year: 'numeric' 
    });
    document.getElementById('historyMonth').textContent = 
        monthName.charAt(0).toUpperCase() + monthName.slice(1);
}

function showAlert(message, type) {
    const alertBox = document.getElementById('alert');
    alertBox.textContent = message;
    alertBox.className = `alert ${type} show`;

    setTimeout(() => {
        alertBox.classList.remove('show');
    }, 5000);
}
