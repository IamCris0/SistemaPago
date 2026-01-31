// CRM JavaScript - Panel de Empleado
const API_URL = 'https://mawewe.com.ec/api';

let currentEmployee = null;
let checkInInterval = null;
let currentCheckIn = null;

// Inicializar al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadStats();
    loadTodayStatus();
    loadHistory();
});

// Verificar autenticación
function checkAuth() {
    const employeeData = localStorage.getItem('mawewe_employee');
    if (!employeeData) {
        window.location.href = '../login.html';
        return;
    }

    currentEmployee = JSON.parse(employeeData);
    
    // Redirigir si es admin
    if (currentEmployee.is_admin) {
        window.location.href = '../admin/panel.html';
        return;
    }

    // Mostrar nombre del empleado
    document.getElementById('employeeName').textContent = currentEmployee.nombre;
}

// Cargar estadísticas del mes
async function loadStats() {
    try {
        const month = new Date().toISOString().slice(0, 7);
        const response = await fetch(`${API_URL}/attendance.php?action=stats&employee_id=${currentEmployee.id}&month=${month}`);
        const data = await response.json();

        if (data.success) {
            document.getElementById('daysWorked').textContent = data.stats.complete_days;
            document.getElementById('totalHours').textContent = data.stats.total_hours.toFixed(1) + 'h';
            document.getElementById('avgHours').textContent = data.stats.avg_hours.toFixed(1) + 'h';
        }
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

// Cargar estado de hoy
async function loadTodayStatus() {
    try {
        const response = await fetch(`${API_URL}/attendance.php?action=today&employee_id=${currentEmployee.id}`);
        const data = await response.json();

        if (data.success && data.records.length > 0) {
            const record = data.records[0];
            
            if (record.check_out === null) {
                // Tiene entrada pero no salida
                currentCheckIn = record;
                showCurrentStatus(record);
                document.getElementById('btnCheckIn').disabled = true;
                document.getElementById('btnCheckOut').disabled = false;
                startTimer(record.check_in);
            } else {
                // Ya completó su jornada
                document.getElementById('btnCheckIn').disabled = true;
                document.getElementById('btnCheckOut').disabled = true;
            }
        }
    } catch (error) {
        console.error('Error cargando estado de hoy:', error);
    }
}

// Mostrar estado actual
function showCurrentStatus(record) {
    const statusDiv = document.getElementById('currentStatus');
    statusDiv.style.display = 'block';

    const checkInTime = new Date(record.check_in);
    document.getElementById('checkInTime').textContent = formatTime(checkInTime);
}

// Marcar entrada
async function checkIn() {
    const btn = document.getElementById('btnCheckIn');
    btn.disabled = true;
    btn.textContent = 'Marcando...';

    try {
        const response = await fetch(`${API_URL}/attendance.php?action=check-in`, {
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
            showAlert('✅ Entrada marcada exitosamente a las ' + data.time, 'success');
            
            // Recargar estado
            setTimeout(() => {
                loadTodayStatus();
                loadHistory();
            }, 1000);
        } else {
            showAlert('❌ ' + data.message, 'error');
            btn.disabled = false;
        }
    } catch (error) {
        console.error('Error marcando entrada:', error);
        showAlert('❌ Error de conexión', 'error');
        btn.disabled = false;
    } finally {
        btn.innerHTML = '<span>🕐</span> Marcar Entrada';
    }
}

// Marcar salida
async function checkOut() {
    if (!confirm('¿Estás seguro de marcar tu salida?')) {
        return;
    }

    const btn = document.getElementById('btnCheckOut');
    btn.disabled = true;
    btn.textContent = 'Marcando...';

    try {
        const response = await fetch(`${API_URL}/attendance.php?action=check-out`, {
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
            showAlert(`✅ Salida marcada exitosamente. Trabajaste ${data.hours_worked} horas hoy.`, 'success');
            
            // Detener timer
            if (checkInInterval) {
                clearInterval(checkInInterval);
            }

            // Recargar
            setTimeout(() => {
                location.reload();
            }, 2000);
        } else {
            showAlert('❌ ' + data.message, 'error');
            btn.disabled = false;
        }
    } catch (error) {
        console.error('Error marcando salida:', error);
        showAlert('❌ Error de conexión', 'error');
        btn.disabled = false;
    } finally {
        btn.innerHTML = '<span>🕐</span> Marcar Salida';
    }
}

// Cargar historial
async function loadHistory() {
    try {
        const startDate = new Date();
        startDate.setDate(1); // Primer día del mes
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1, 0); // Último día del mes

        const response = await fetch(
            `${API_URL}/attendance.php?action=history&employee_id=${currentEmployee.id}` +
            `&start_date=${startDate.toISOString().split('T')[0]}` +
            `&end_date=${endDate.toISOString().split('T')[0]}`
        );
        
        const data = await response.json();

        if (data.success) {
            displayHistory(data.records);
        }
    } catch (error) {
        console.error('Error cargando historial:', error);
        document.getElementById('historyBody').innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: #dc3545;">
                    Error cargando historial
                </td>
            </tr>
        `;
    }
}

// Mostrar historial en tabla
function displayHistory(records) {
    const tbody = document.getElementById('historyBody');

    if (records.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 30px; color: #666;">
                    No hay registros de asistencia este mes
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = records.map(record => {
        const date = new Date(record.date);
        const checkIn = record.check_in ? new Date(record.check_in) : null;
        const checkOut = record.check_out ? new Date(record.check_out) : null;
        
        return `
            <tr>
                <td>${formatDate(date)}</td>
                <td>${checkIn ? formatTime(checkIn) : '-'}</td>
                <td>${checkOut ? formatTime(checkOut) : '-'}</td>
                <td><strong>${record.hours_worked ? record.hours_worked.toFixed(1) + 'h' : '-'}</strong></td>
                <td>
                    <span class="badge ${checkOut ? 'complete' : 'incomplete'}">
                        ${checkOut ? 'Completo' : 'En curso'}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

// Iniciar timer
function startTimer(checkInTime) {
    const checkIn = new Date(checkInTime);
    
    checkInInterval = setInterval(() => {
        const now = new Date();
        const diff = now - checkIn;
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        document.getElementById('elapsedTime').textContent = `${hours}h ${minutes}m`;
    }, 1000);
}

// Formatear fecha
function formatDate(date) {
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('es-EC', options);
}

// Formatear hora
function formatTime(date) {
    return date.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
}

// Mostrar alerta
function showAlert(message, type) {
    const alertBox = document.getElementById('alert');
    alertBox.textContent = message;
    alertBox.className = `alert ${type} show`;

    setTimeout(() => {
        alertBox.classList.remove('show');
    }, 5000);
}

// Cerrar sesión
function logout() {
    if (confirm('¿Estás seguro de cerrar sesión?')) {
        localStorage.removeItem('mawewe_employee');
        localStorage.removeItem('mawewe_token');
        window.location.href = '../login.html';
    }
}
