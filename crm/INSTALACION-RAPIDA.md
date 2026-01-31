# 🚀 INSTALACIÓN RÁPIDA - CRM MAWEWE

## ⚡ Pasos Rápidos (15 minutos)

### 1️⃣ BASE DE DATOS (5 min)
1. Abre **phpMyAdmin** en cPanel
2. Selecciona base de datos: `maweweco_tienda_db`
3. Clic en pestaña **SQL**
4. Pega el contenido de **`create-crm-tables.sql`**
5. Clic **Ejecutar**

✅ **Resultado:** Tablas `employees` y `attendance` creadas con 7 usuarios

---

### 2️⃣ ARCHIVOS API (3 min)
Sube a la carpeta `/api/` en tu servidor:
```
/api/
├── employees.php    ← NUEVO
├── attendance.php   ← NUEVO
└── reports.php      ← NUEVO
```

✅ **Verificar:** Abre `https://mawewe.com.ec/api/employees.php?action=list`  
Debe mostrar JSON con empleados

---

### 3️⃣ ARCHIVOS FRONTEND (5 min)
Sube a la raíz del sitio `/` o crea carpeta `/crm/`:
```
/
├── crm-login.html
├── crm.html
├── crm.js
├── admin.html
├── admin.css
└── admin.js
```

✅ **Verificar:** Abre `https://mawewe.com.ec/crm-login.html`  
Debe mostrar la página de login

---

### 4️⃣ PROBAR EL SISTEMA (2 min)

#### Probar como ADMINISTRADOR:
1. Ir a: `https://mawewe.com.ec/crm-login.html`
2. Ingresar cédula: **2100064753**
3. Debe redirigir a panel de administrador

#### Probar como EMPLEADO:
1. Ir a: `https://mawewe.com.ec/crm-login.html`
2. Ingresar cédula: **2100603790** (Valeria)
3. Debe redirigir a panel de empleado

---

## 🔐 CREDENCIALES

### 👔 Administrador:
- **Cédula:** 2100064753
- **Nombre:** VARGAS CASTILLO MANUEL

### 👥 Empleados (usar cualquiera):
1. 2100603790 - BRAVO CAIZA VALERIA ESTEFANIA
2. 2100996897 - CUELLO VARGAS JORGE STEVEN
3. 2101050959 - LOPEZ MENDOZA SERGIO DAMIAN
4. 1950105864 - PEÑARRETA ARELLANO JHERLY VANESSA
5. 2100037981 - VARGAS MOTOCHE CARLOS RENE
6. 0701908402 - VARGAS MOTOCHE MARFA MODESTA

---

## 📁 ARCHIVOS INCLUIDOS

| Archivo | Descripción | Ubicación |
|---------|-------------|-----------|
| `create-crm-tables.sql` | Script de base de datos | Ejecutar en phpMyAdmin |
| `employees.php` | API de empleados | `/api/` |
| `attendance.php` | API de asistencia | `/api/` |
| `reports.php` | API de reportes | `/api/` |
| `crm-login.html` | Página de login | `/` o `/crm/` |
| `crm.html` | Panel de empleados | `/` o `/crm/` |
| `crm.js` | JS de empleados | `/` o `/crm/` |
| `admin.html` | Panel de admin | `/` o `/crm/` |
| `admin.css` | Estilos de admin | `/` o `/crm/` |
| `admin.js` | JS de admin | `/` o `/crm/` |
| `README-CRM.md` | Documentación completa | Referencia |

---

## ✅ CHECKLIST DE INSTALACIÓN

- [ ] Ejecutar `create-crm-tables.sql` en phpMyAdmin
- [ ] Verificar que existen 7 empleados: `SELECT * FROM employees;`
- [ ] Subir `employees.php` a `/api/`
- [ ] Subir `attendance.php` a `/api/`
- [ ] Subir `reports.php` a `/api/`
- [ ] Probar: `https://mawewe.com.ec/api/employees.php?action=list`
- [ ] Subir archivos HTML/CSS/JS al servidor
- [ ] Probar login con cédula de admin
- [ ] Probar login con cédula de empleado
- [ ] Probar marcar entrada/salida
- [ ] Verificar que se guardan en la tabla `attendance`

---

## 🐛 PROBLEMAS COMUNES

### ❌ Error: "No se pudo conectar a la base de datos"
**Solución:** Verifica en `/api/config/database.php`:
```php
private $host = "localhost";
private $db_name = "maweweco_tienda_db";
private $username = "maweweco_cris";
private $password = "bdC(ZFro1rYd";
```

### ❌ Error: "Empleado no encontrado"
**Solución:** Ejecuta en phpMyAdmin:
```sql
SELECT * FROM employees;
```
Deben existir 7 registros. Si no, ejecuta de nuevo `create-crm-tables.sql`

### ❌ Error 404 - Página no encontrada
**Solución:** 
- Verifica que subiste los archivos HTML
- Verifica la URL completa: `https://mawewe.com.ec/crm-login.html`

### ❌ Los estilos no cargan
**Solución:** 
- Verifica que `admin.css` está en la misma carpeta que `admin.html`
- Presiona Ctrl + F5 para limpiar caché

---

## 📊 VERIFICAR QUE TODO FUNCIONA

### 1. Base de Datos
```sql
-- Ver empleados
SELECT * FROM employees;  -- Deben ser 7

-- Ver asistencia de hoy
SELECT * FROM attendance WHERE DATE(check_in) = CURDATE();
```

### 2. API
```
https://mawewe.com.ec/api/employees.php?action=list
```
Debe retornar JSON con empleados

### 3. Frontend
```
https://mawewe.com.ec/crm-login.html
```
Debe mostrar página de login

---

## 🎯 FUNCIONALIDADES

### Panel de Empleado:
- ✅ Ver estadísticas del mes
- ✅ Marcar entrada
- ✅ Marcar salida
- ✅ Ver historial de asistencia

### Panel de Administrador:
- ✅ Dashboard con métricas
- ✅ Gestión de productos
- ✅ Gestión de órdenes
- ✅ Gestión de empleados
- ✅ Control de asistencia
- ✅ Reportes detallados

---

## 📞 SOPORTE

Si tienes problemas:
1. Revisa la **Consola del Navegador** (F12)
2. Revisa los **logs de PHP** en cPanel
3. Lee el **README-CRM.md** completo

**WhatsApp:** +593 98 183 2313  
**Email:** info@mawewe.com.ec

---

## 🎉 ¡LISTO!

Una vez instalado correctamente:
- Los empleados pueden marcar entrada/salida
- El administrador puede ver todo el panel
- Se generan reportes automáticos
- El sistema está 100% funcional

**Última actualización:** Enero 2026
