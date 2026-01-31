# 🏪 Mawewe CRM v2.0 - Sistema Profesional

## ✨ Características

✅ **Sistema completamente funcional** conectado a tu API en producción  
✅ **Diseño moderno y profesional** con animaciones suaves  
✅ **100% responsive** - funciona en móviles, tablets y desktop  
✅ **Panel de Empleado** con control de asistencia en tiempo real  
✅ **Panel de Administrador** con gestión completa  
✅ **Sin errores de carga** - optimizado para tu base de datos  

## 📁 Estructura de Archivos

```
mawewe-crm/
├── index.html              # Login principal
├── employee.html           # Panel de empleado
├── admin.html              # Panel de administrador
├── css/
│   ├── employee.css       # Estilos del panel empleado
│   └── admin.css          # Estilos del panel admin
└── js/
    ├── config.js          # Configuración global
    ├── employee.js        # Lógica del panel empleado
    └── admin.js           # Lógica del panel admin
```

## 🚀 Instalación en tu Servidor

### Paso 1: Subir Archivos

Sube todos los archivos a tu servidor en la ruta que prefieras:

**Opción A:** En la raíz
```
/public_html/
├── index.html
├── employee.html
├── admin.html
├── css/
└── js/
```

**Opción B:** En carpeta /crm/
```
/public_html/crm/
├── index.html
├── employee.html
├── admin.html
├── css/
└── js/
```

### Paso 2: Verificar la API

Tu API ya está funcionando en:
```
https://mawewe.com.ec/api/
```

El sistema ya está configurado para conectarse automáticamente.

### Paso 3: Probar el Sistema

1. Abre en tu navegador:
   - `https://mawewe.com.ec/` (si subiste a raíz)
   - `https://mawewe.com.ec/crm/` (si subiste a carpeta crm)

2. Usa las credenciales de prueba:

**Administrador:**
- Cédula: `2100064753`

**Empleados:**
- Cédula: `2100603790` (Valeria)
- Cédula: `2100996897` (Jorge)
- Cédula: `2101050959` (Sergio)

## ✅ Características del Sistema

### Panel de Empleado

✅ Vista de estadísticas del mes (días trabajados, horas totales, promedio)  
✅ Botones para marcar entrada y salida  
✅ Timer en tiempo real cuando está trabajando  
✅ Historial completo del mes  
✅ Diseño limpio y fácil de usar  

### Panel de Administrador

✅ Dashboard con métricas en tiempo real  
✅ Gestión de empleados  
✅ Control de asistencia de todo el equipo  
✅ Reportes detallados  
✅ Vista de productos (conectado a tu API real)  

## 🔧 Configuración

### Si necesitas cambiar la URL de la API

Edita el archivo `js/config.js`:

```javascript
const CONFIG = {
    API_URL: 'https://tu-nueva-url.com/api',  // Cambiar aquí
    // ... resto de configuración
};
```

### Si quieres cambiar los colores

Edita los archivos CSS:
- `css/employee.css` para el panel de empleado
- `css/admin.css` para el panel de administrador

Busca el color principal `#8C004B` y reemplázalo.

## 🐛 Solución de Problemas

### Problema: "Error de conexión"

**Solución:** Verifica que tu API esté funcionando:
```
https://mawewe.com.ec/api/employees.php?action=list
```

Debe retornar un JSON con la lista de empleados.

### Problema: "Los productos no cargan"

**Solución:** Este nuevo sistema usa tu endpoint real:
```
https://mawewe.com.ec/api/products.php
```

Ya no tendrás el problema de "Cargando..." infinito.

### Problema: "No puedo marcar entrada/salida"

**Solución:** Abre la consola del navegador (F12) y verifica:
1. Que la API responde correctamente
2. Que no hay errores de CORS
3. Que la tabla `attendance` existe en tu BD

## 📊 Verificar que Todo Funciona

### 1. Verificar Base de Datos

En phpMyAdmin, ejecuta:
```sql
SELECT * FROM employees;
SELECT * FROM attendance WHERE DATE(check_in) = CURDATE();
```

### 2. Verificar API

Abre en el navegador:
```
https://mawewe.com.ec/api/employees.php?action=list
https://mawewe.com.ec/api/products.php
https://mawewe.com.ec/api/reports.php?action=dashboard
```

Todos deben retornar JSON válido.

### 3. Verificar Frontend

1. Abre la consola del navegador (F12)
2. Deberías ver: `✅ API Conectada`
3. No debe haber errores en rojo

## 🎨 Características del Nuevo Diseño

✅ **Moderno y Profesional** - Inspirado en las mejores apps empresariales  
✅ **Animaciones Suaves** - Transiciones fluidas y agradables  
✅ **Responsive** - Se adapta a cualquier pantalla  
✅ **Loading States** - Indicadores visuales de carga  
✅ **Feedback Visual** - Alertas y notificaciones claras  
✅ **Optimizado** - Carga rápida y eficiente  

## 📱 Compatibilidad

✅ Chrome 90+  
✅ Firefox 88+  
✅ Safari 14+  
✅ Edge 90+  
✅ Móviles iOS y Android  

## 📞 Soporte

Si tienes problemas:

1. Revisa la consola del navegador (F12)
2. Verifica los logs de PHP en cPanel
3. Confirma que la API responde correctamente

**Contacto:**
- Email: info@mawewe.com.ec
- WhatsApp: +593 98 183 2313

## 📝 Notas Importantes

⚠️ **Este sistema está optimizado para tu configuración actual:**
- Base de datos: `maweweco_tienda_db`
- Usuario: `maweweco_cris`
- API URL: `https://mawewe.com.ec/api`

⚠️ **No uses el sistema anterior:**
Este es el sistema v2.0 completamente reescrito y optimizado.

## 🎉 ¡Listo!

Una vez subido, el sistema debería funcionar de inmediato.

**Características principales:**
- ✅ Login rápido con cédula
- ✅ Control de asistencia en tiempo real
- ✅ Estadísticas automáticas
- ✅ Historial completo
- ✅ Panel de administración

---

**Desarrollado para Mawewe - 2026**  
**Versión:** 2.0.0  
**Última actualización:** Enero 2026
