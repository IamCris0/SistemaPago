# 🏪 Sistema CRM Mawewe - Guía de Instalación

## 📋 Descripción

Sistema completo de CRM para la gestión de empleados, asistencia, productos y órdenes de Mawewe.

## 🎯 Características

### Para Empleados:
- ✅ Login con cédula
- ✅ Marcar entrada y salida
- ✅ Ver historial de asistencia
- ✅ Estadísticas mensuales

### Para Administradores:
- ✅ Dashboard con métricas en tiempo real
- ✅ Gestión completa de productos
- ✅ Gestión de órdenes
- ✅ Gestión de empleados
- ✅ Control de asistencia
- ✅ Reportes detallados

## 📦 Archivos del Sistema

### Backend (API)
- `employees.php` - API de empleados
- `attendance.php` - API de asistencia
- `reports.php` - API de reportes
- `create-crm-tables.sql` - Script de creación de tablas

### Frontend
- `crm-login.html` - Página de login
- `crm.html` - Panel de empleados
- `crm.js` - JavaScript de empleados
- `admin.html` - Panel de administrador
- `admin.css` - Estilos del administrador
- `admin.js` - JavaScript del administrador

## 🚀 Instalación

### Paso 1: Crear las Tablas de Base de Datos

1. Accede a **phpMyAdmin** en tu cPanel
2. Selecciona la base de datos `maweweco_tienda_db`
3. Ve a la pestaña **SQL**
4. Copia y pega el contenido de `create-crm-tables.sql`
5. Haz clic en **Ejecutar**

Esto creará:
- Tabla `employees` (empleados)
- Tabla `attendance` (asistencia)
- Insertará los 6 empleados + 1 administrador

### Paso 2: Subir Archivos API

Sube estos archivos a la carpeta `/api/` en tu servidor:

```
/api/
├── employees.php      ← NUEVO
├── attendance.php     ← NUEVO
├── reports.php        ← NUEVO
└── config/
    └── database.php   (ya existe)
```

**Importante:** Verifica que `database.php` tiene las credenciales correctas:
```php
private $host = "localhost";
private $db_name = "maweweco_tienda_db";
private $username = "maweweco_cris";
private $password = "bdC(ZFro1rYd";
```

### Paso 3: Subir Archivos Frontend

Opción A: Crear carpeta específica para CRM
```
/crm/
├── crm-login.html
├── crm.html
├── crm.js
├── admin.html
├── admin.css
└── admin.js
```

Opción B: En la raíz del sitio
```
/
├── crm-login.html
├── crm.html
├── crm.js
├── admin.html
├── admin.css
└── admin.js
```

### Paso 4: Verificar Permisos

Asegúrate de que los archivos `.php` tienen permisos de ejecución (644 o 755).

## 🔐 Credenciales de Acceso

### Administrador:
- **Cédula:** `2100064753`
- **Nombre:** VARGAS CASTILLO MANUEL
- **Tipo:** Administrador

### Empleados:
1. **Cédula:** `2100603790` - BRAVO CAIZA VALERIA ESTEFANIA
2. **Cédula:** `2100996897` - CUELLO VARGAS JORGE STEVEN
3. **Cédula:** `2101050959` - LOPEZ MENDOZA SERGIO DAMIAN
4. **Cédula:** `1950105864` - PEÑARRETA ARELLANO JHERLY VANESSA
5. **Cédula:** `2100037981` - VARGAS MOTOCHE CARLOS RENE
6. **Cédula:** `0701908402` - VARGAS MOTOCHE MARFA MODESTA

## 📱 Uso del Sistema

### Para Empleados:

1. Ir a: `https://mawewe.com.ec/crm-login.html`
2. Ingresar cédula (10 dígitos)
3. Ver dashboard personal
4. Marcar entrada/salida
5. Ver historial de asistencia

### Para Administrador:

1. Ir a: `https://mawewe.com.ec/crm-login.html`
2. Ingresar cédula de administrador
3. Acceso al panel completo:
   - 📊 Dashboard general
   - 🛍️ Productos
   - 📦 Órdenes
   - 👥 Empleados
   - 📅 Asistencia
   - 📈 Reportes

## 🔧 Endpoints de la API

### Empleados
- `GET /api/employees.php?action=list` - Listar empleados
- `POST /api/employees.php?action=login` - Login
- `POST /api/employees.php?action=create` - Crear empleado
- `PUT /api/employees.php?action=update` - Actualizar empleado
- `PUT /api/employees.php?action=toggle-status` - Activar/Desactivar

### Asistencia
- `POST /api/attendance.php?action=check-in` - Marcar entrada
- `POST /api/attendance.php?action=check-out` - Marcar salida
- `GET /api/attendance.php?action=today` - Asistencia de hoy
- `GET /api/attendance.php?action=history` - Historial
- `GET /api/attendance.php?action=stats` - Estadísticas

### Reportes
- `GET /api/reports.php?action=dashboard` - Dashboard general
- `GET /api/reports.php?action=sales` - Reporte de ventas
- `GET /api/reports.php?action=products` - Reporte de productos
- `GET /api/reports.php?action=employees` - Reporte de empleados

## ✅ Verificación de Instalación

### 1. Verificar Tablas

Ejecuta en phpMyAdmin:
```sql
SHOW TABLES LIKE 'employees';
SHOW TABLES LIKE 'attendance';
SELECT * FROM employees;
```

Deberías ver 7 registros (1 admin + 6 empleados).

### 2. Probar Endpoints

Abre en el navegador:
```
https://mawewe.com.ec/api/employees.php?action=list
```

Debería retornar un JSON con la lista de empleados.

### 3. Probar Login

1. Ir a `https://mawewe.com.ec/crm-login.html`
2. Ingresar una cédula válida
3. Debería redirigir al panel correspondiente

## 🐛 Solución de Problemas

### Error: "No se pudo conectar a la base de datos"
- Verifica las credenciales en `config/database.php`
- Verifica que el usuario tenga permisos en la BD

### Error: "Empleado no encontrado"
- Verifica que ejecutaste el script SQL completo
- Verifica que la tabla `employees` tiene datos:
  ```sql
  SELECT * FROM employees;
  ```

### Error 404 en archivos
- Verifica que subiste todos los archivos
- Verifica la ruta correcta en la URL
- Verifica permisos de archivos (644)

### La página no carga estilos
- Verifica que `admin.css` está en la misma carpeta que `admin.html`
- Limpia el caché del navegador (Ctrl + F5)

### No marca entrada/salida
- Abre la consola del navegador (F12)
- Busca errores en la pestaña "Console"
- Verifica que la URL de la API es correcta

## 📊 Base de Datos

### Estructura de `employees`
```sql
id              INT (PK, AUTO_INCREMENT)
nombre          VARCHAR(200)
cedula          VARCHAR(10) UNIQUE
cargo           VARCHAR(100)
sucursal        VARCHAR(100)
is_admin        TINYINT(1)
active          TINYINT(1)
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### Estructura de `attendance`
```sql
id              INT (PK, AUTO_INCREMENT)
employee_id     INT (FK → employees.id)
date            DATE
check_in        DATETIME
check_out       DATETIME
hours_worked    DECIMAL(5,2)
notes           TEXT
created_at      TIMESTAMP
```

## 🎨 Personalización

### Cambiar Colores

Edita `admin.css` y busca:
```css
/* Color principal */
#8C004B → Tu color

/* Gradientes */
linear-gradient(135deg, #8C004B 0%, #6B0038 100%)
```

### Agregar Más Sucursales

Edita el formulario en `admin.html`:
```html
<select id="empSucursal">
    <option>JOYERÍA MATRIZ</option>
    <option>SUCURSAL 2</option>
    <option>SUCURSAL 3</option>
</select>
```

## 📞 Soporte

Para soporte adicional:
- Email: info@mawewe.com.ec
- WhatsApp: +593 98 183 2313

## 📄 Licencia

© 2026 Mawewe - Todos los derechos reservados

---

**Versión:** 1.0.0  
**Fecha:** Enero 2026  
**Desarrollado para:** Mawewe E-commerce
