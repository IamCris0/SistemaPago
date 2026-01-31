# 🚀 Mawewe CRM - Desarrollo Local

## 📁 Estructura del Proyecto

```
crm-dev/
├── index.html                      # 🏠 Página principal
├── login.html                      # 🔐 Login
├── package.json                    # 📦 Configuración npm
├── create-crm-tables.sql          # 🗄️ Script de BD
├── README-CRM.md                   # 📚 Documentación completa
├── INSTALACION-RAPIDA.md          # ⚡ Guía rápida
├── api/                           # 🔌 Backend
│   ├── employees.php              # Gestión de empleados
│   ├── attendance.php             # Control de asistencia
│   └── reports.php                # Reportes
├── employee/                      # 👤 Panel Empleado
│   ├── panel.html
│   └── panel.js
├── admin/                         # 👔 Panel Admin
│   ├── panel.html
│   ├── panel.css
│   └── panel.js
└── assets/                        # 📦 Recursos
    ├── css/
    └── js/
        └── config.js              # Configuración
```

## 🎯 Inicio Rápido

### 1. Abrir Terminal en esta carpeta

```bash
cd crm-dev
```

### 2. Iniciar Servidor Local

**Opción A - Automático (Recomendado):**
```bash
npm start
```

**Opción B - Manual:**
```bash
npx serve
```

**Opción C - Puerto Específico:**
```bash
npx serve -p 3000
```

### 3. Abrir en el Navegador

El servidor te mostrará la URL, normalmente:
```
http://localhost:3000
```

## 🔐 Credenciales de Prueba

### Administrador:
- **Cédula:** `2100064753`
- **Nombre:** VARGAS CASTILLO MANUEL

### Empleados:
- **Cédula:** `2100603790` - BRAVO CAIZA VALERIA
- **Cédula:** `2100996897` - CUELLO VARGAS JORGE
- **Cédula:** `2101050959` - LOPEZ MENDOZA SERGIO

## 🛠️ Comandos Disponibles

```bash
npm start          # Iniciar servidor (puerto automático)
npm run dev        # Iniciar en puerto 3000
npm run serve      # Modo SPA (Single Page App)
```

## 📱 Páginas Disponibles

Desde `index.html` puedes navegar a:

- **Login:** `/login.html`
- **Panel Empleado:** `/employee/panel.html`
- **Panel Admin:** `/admin/panel.html`

## ⚙️ Configuración de API

El archivo `assets/js/config.js` contiene la configuración de API.

### En Desarrollo Local:
Por defecto, apunta a la API de producción:
```javascript
apiURL: 'https://mawewe.com.ec/api'
```

### Para usar API Local (XAMPP/MAMP):
1. Instala XAMPP o MAMP
2. Copia la carpeta `api/` a `htdocs/`
3. Cambia en `config.js`:
```javascript
apiURL: 'http://localhost:8080/api'
```

## 🔍 Características del Modo Desarrollo

✅ **Hot Reload** - Los cambios se reflejan automáticamente  
✅ **Console Logs** - Información de debug en consola  
✅ **API Status** - Verificación automática de conexión  
✅ **Error Handling** - Mensajes de error detallados  
✅ **Network Inspector** - Ver todas las peticiones HTTP

## 🧪 Testing

### Verificar Conexión con API
Abre la consola del navegador (F12) y verás:
```
🔧 Configuración de Desarrollo
✅ API Conectada
Empleados encontrados: 7
```

### Probar Login
1. Ir a `http://localhost:3000/login.html`
2. Ingresar cédula: `2100064753`
3. Debe redirigir al panel de admin

## 📂 Archivos Importantes

| Archivo | Descripción | Modificar |
|---------|-------------|-----------|
| `index.html` | Página principal | ✅ |
| `login.html` | Login del sistema | ✅ |
| `employee/panel.html` | Panel empleado | ✅ |
| `employee/panel.js` | Lógica empleado | ✅ |
| `admin/panel.html` | Panel admin | ✅ |
| `admin/panel.js` | Lógica admin | ✅ |
| `admin/panel.css` | Estilos admin | ✅ |
| `assets/js/config.js` | Configuración | ✅ |
| `api/*.php` | Backend | ❌ Solo en servidor |

## 🎨 Personalización

### Cambiar Colores
Edita `admin/panel.css`:
```css
/* Busca */
#8C004B

/* Reemplaza con tu color */
#TU_COLOR
```

### Cambiar Logo
1. Guarda tu logo en `assets/images/logo.png`
2. Actualiza en `index.html`:
```html
<img src="assets/images/logo.png" alt="Logo">
```

## 🐛 Troubleshooting

### Error: "serve: command not found"
**Solución:**
```bash
npm install -g serve
```

### Error: "Cannot GET /api/..."
**Solución:** Las APIs PHP no funcionan con `serve`. Necesitas:
1. XAMPP/MAMP para PHP
2. O apuntar a API de producción (ya configurado)

### Error: "Port already in use"
**Solución:**
```bash
npx serve -p 3001  # Usar otro puerto
```

### Los estilos no cargan
**Solución:**
```bash
# Limpia caché
Ctrl + F5 (Windows)
Cmd + Shift + R (Mac)
```

## 📊 Estructura de Navegación

```
index.html
    ↓
login.html → (Login con cédula)
    ↓
    ├─→ employee/panel.html  (Si es empleado)
    │       ↓
    │   Control de asistencia
    │   Ver historial
    │   Estadísticas personales
    │
    └─→ admin/panel.html     (Si es admin)
            ↓
        Dashboard
        Productos
        Órdenes
        Empleados
        Asistencia
        Reportes
```

## 🚀 Deploy a Producción

Cuando estés listo para subir a producción:

1. **Subir archivos API:**
```bash
/api/employees.php    → /public_html/api/
/api/attendance.php   → /public_html/api/
/api/reports.php      → /public_html/api/
```

2. **Subir archivos Frontend:**
```bash
/login.html           → /public_html/crm/
/employee/            → /public_html/crm/employee/
/admin/               → /public_html/crm/admin/
```

3. **Actualizar URLs:**
En todos los archivos JS, cambiar:
```javascript
const API_URL = 'https://mawewe.com.ec/api';
```

## 📝 Notas Importantes

⚠️ **Los archivos PHP solo funcionan con servidor PHP (XAMPP/MAMP)**  
⚠️ **`npx serve` solo sirve archivos estáticos (HTML/CSS/JS)**  
⚠️ **Para desarrollo completo, necesitas XAMPP + configurar BD local**  

## 🎓 Recursos

- [Serve Documentation](https://github.com/vercel/serve)
- [PHP Documentation](https://www.php.net/)
- [MySQL Documentation](https://dev.mysql.com/doc/)

## 📞 Soporte

**Email:** info@mawewe.com.ec  
**WhatsApp:** +593 98 183 2313

---

**Happy Coding! 🎉**

*Desarrollado con ❤️ para Mawewe*
