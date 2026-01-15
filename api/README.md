# 📁 API de Mawewe E-commerce - MySQL

## ✅ Conexión Configurada con Dominio

Esta API usa las siguientes credenciales de MySQL:

```
Host: mawewe.com.ec        ✅ Usando dominio
Puerto: 3306
Base de datos: maweweco_tienda_db
Usuario: maweweco_admin
Contraseña: Tr~RcW$bIE(U)
```

---

## 📂 Estructura de Archivos

```
/api/
├── config/
│   └── database.php          ← Configuración MySQL con dominio
├── products.php              ← Endpoint GET productos
├── save-order.php            ← Endpoint POST guardar orden
├── test-connection.php       ← Script de prueba
├── .htaccess                 ← Configuración CORS
└── README.md                 ← Este archivo
```

---

## 🚀 PASO A PASO PARA INSTALAR

### 1️⃣ Borrar tu carpeta `/api` actual

En tu cPanel File Manager:
```
Navega a: public_html/api
Click derecho → Delete
```

### 2️⃣ Subir esta nueva carpeta `/api`

1. Descomprime el ZIP
2. Renombra la carpeta a `api`
3. Súbela a `/public_html/api`

Estructura final:
```
/public_html/
├── index.html
├── assets/
├── data/
└── api/           ← Nueva carpeta aquí
    ├── config/
    │   └── database.php
    ├── products.php
    ├── save-order.php
    ├── test-connection.php
    └── .htaccess
```

### 3️⃣ Probar la conexión

Abre en tu navegador:
```
https://mawewe.com.ec/api/test-connection.php
```

Deberías ver:
```
✅ CONEXIÓN EXITOSA CON DOMINIO!
🎉 CONEXIÓN USANDO DOMINIO mawewe.com.ec FUNCIONANDO PERFECTAMENTE!
📦 INFORMACIÓN DE LA BASE DE DATOS
📋 TABLAS ENCONTRADAS
```

### 4️⃣ Probar el endpoint de productos

Abre en tu navegador:
```
https://mawewe.com.ec/api/products.php
```

Deberías recibir un JSON con todos los productos:
```json
{
    "success": true,
    "products": [...],
    "categories": [...],
    "total": 48
}
```

---

## 🔧 CONFIGURAR TU FRONTEND

En tu archivo `assets/js/app.js`, líneas 1-15:

```javascript
const CONFIG = {
  api: {
    // ✅ Detecta automáticamente el entorno
    baseUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:8000/api'  // Desarrollo local
      : 'https://mawewe.com.ec/api', // Producción ✅
    
    productsEndpoint: "/products.php",
    saveOrderEndpoint: "/save-order.php",
  },
  
  paypal: {
    clientId: 'TU_CLIENT_ID_AQUI',
    currency: 'USD',
    locale: 'es_ES',
  },
  
  shipping: {
    cost: 5.0,
    freeThreshold: 50.0,
    expressCost: 10.0,
  }
}
```

**Ventaja**: Con esta configuración, tu tienda funcionará tanto en:
- 🏠 **Local**: `http://localhost:8000` (desarrollo)
- 🌐 **Producción**: `https://mawewe.com.ec` (online)

---

## 🧪 PRUEBAS

### Probar GET productos
```bash
curl https://mawewe.com.ec/api/products.php
```

### Probar GET productos con filtros
```bash
# Por categoría
curl "https://mawewe.com.ec/api/products.php?category=ropa"

# Por búsqueda
curl "https://mawewe.com.ec/api/products.php?search=jeans"

# Por subcategoría
curl "https://mawewe.com.ec/api/products.php?category=ropa&subcategory=americanino"
```

### Probar POST guardar orden (con curl)
```bash
curl -X POST https://mawewe.com.ec/api/save-order.php \
  -H "Content-Type: application/json" \
  -d '{
    "paypalOrderId": "TEST123",
    "email": "test@example.com",
    "firstName": "Juan",
    "lastName": "Pérez",
    "address": "Calle Principal 123",
    "city": "Quito",
    "phone": "0991234567",
    "shippingMethod": "standard",
    "items": [
      {
        "productId": 1,
        "name": "Producto Test",
        "sku": "TEST-001",
        "price": 29.99,
        "quantity": 2
      }
    ],
    "totals": {
      "subtotal": 59.98,
      "shipping": 5.00,
      "total": 64.98
    }
  }'
```

---

## 🐛 TROUBLESHOOTING

### ❌ Error: "No se pudo conectar a MySQL"

**Solución 1**: Verifica que el dominio esté apuntando al servidor correcto
```bash
ping mawewe.com.ec
# Debe mostrar la IP de tu servidor
```

**Solución 2**: Verifica el DNS
```bash
nslookup mawewe.com.ec
# Debe resolver a la IP correcta
```

**Solución 3**: Si estás en el mismo servidor, puedes usar `localhost`

Edita `/api/config/database.php` línea 23:
```php
private $host = "localhost";  // En lugar de "mawewe.com.ec"
```

**Solución 4**: Verifica que MySQL acepte conexiones desde el dominio

En cPanel → MySQL Databases → Remote MySQL:
- Agrega `mawewe.com.ec` a los hosts permitidos
- O usa `%` para permitir cualquier host (menos seguro)

### ❌ Error: "CORS policy"

**Solución**: Verifica que `.htaccess` esté en `/api/` y contenga:
```apache
Header always set Access-Control-Allow-Origin "*"
```

### ❌ Error: "PDO extension not found"

**Solución**: En cPanel → Select PHP Version → Extensions:
- ✅ Habilita `pdo`
- ✅ Habilita `pdo_mysql`

### ❌ Error: "Table 'products' doesn't exist"

**Solución**: Verifica en phpMyAdmin que las tablas existan

### ❌ Error: "Connection timeout"

**Solución**: El puerto 3306 puede estar bloqueado. Usa `localhost` en su lugar.

---

## 📊 ENDPOINTS DISPONIBLES

### 1. GET `/api/products.php`

**URL**: `https://mawewe.com.ec/api/products.php`

Obtiene la lista de productos.

**Parámetros opcionales:**
- `category`: Filtrar por categoría (ej: `ropa`, `peluches`)
- `subcategory`: Filtrar por subcategoría (ej: `americanino`)
- `search`: Buscar por nombre, descripción o SKU

**Ejemplo:**
```
https://mawewe.com.ec/api/products.php?category=ropa&subcategory=americanino
```

**Respuesta:**
```json
{
  "success": true,
  "products": [
    {
      "id": 28,
      "sku": "ROP-AME-001",
      "name": "Jeans Americanino Wear 1975 Oscuro",
      "price": 89.99,
      "stock": 40,
      "images": ["image1.jpg", "image2.jpg"]
    }
  ],
  "categories": [
    {"id": "ropa", "name": "Ropa", "count": 16}
  ],
  "shippingConfig": {
    "cost": 5.0,
    "freeThreshold": 50.0
  },
  "total": 48
}
```

### 2. POST `/api/save-order.php`

**URL**: `https://mawewe.com.ec/api/save-order.php`

Guarda una orden de compra en la base de datos.

**Body requerido:**
```json
{
  "paypalOrderId": "ORDER123",
  "email": "cliente@example.com",
  "firstName": "Juan",
  "lastName": "Pérez",
  "address": "Calle Principal 123",
  "apartment": "Apto 4B",
  "city": "Quito",
  "postalCode": "170101",
  "phone": "0991234567",
  "shippingMethod": "standard",
  "items": [
    {
      "productId": 28,
      "name": "Jeans Americanino",
      "sku": "ROP-AME-001",
      "price": 89.99,
      "quantity": 2
    }
  ],
  "totals": {
    "subtotal": 179.98,
    "shipping": 5.00,
    "total": 184.98
  }
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "orderId": 123,
  "orderNumber": "MW-000123",
  "customer": {
    "name": "Juan Pérez",
    "email": "cliente@example.com"
  },
  "totals": {
    "subtotal": 179.98,
    "shipping": 5.00,
    "total": 184.98
  }
}
```

### 3. GET `/api/test-connection.php`

**URL**: `https://mawewe.com.ec/api/test-connection.php`

Script de diagnóstico para verificar:
- ✅ Conexión a MySQL
- ✅ Tablas existentes
- ✅ Estructura de la base de datos
- ✅ Productos de ejemplo

---

## 🔐 SEGURIDAD

✅ **HTTPS**: Usa dominio con SSL  
✅ **CORS**: Headers configurados correctamente  
✅ **Prepared Statements**: Protección contra SQL injection  
✅ **Transacciones**: Rollback automático en errores  
✅ **Validación**: Datos validados antes de guardar  
✅ **Error Handling**: Manejo robusto de errores  

---

## 📝 VENTAJAS DE USAR DOMINIO

### ✅ Ventajas sobre usar IP directa:

1. **Más profesional**: `mawewe.com.ec` vs `192.99.84.47`
2. **SSL/HTTPS**: Fácil de configurar con dominio
3. **Flexibilidad**: Si cambias de servidor, solo actualizas el DNS
4. **SEO**: Mejor para posicionamiento
5. **Confianza**: Los usuarios confían más en dominios

### 🏠 Conexión Local (mismo servidor)

Si tu aplicación está en el **mismo servidor** que MySQL, es mejor usar `localhost`:

```php
// En /api/config/database.php
private $host = "localhost";  // Más rápido y seguro
```

**¿Cuándo usar cada uno?**
- `localhost` → Si todo está en el mismo servidor ✅ (RECOMENDADO)
- `mawewe.com.ec` → Si necesitas acceso remoto o múltiples servidores

---

## ✅ CHECKLIST DE INSTALACIÓN

- [ ] Borrar carpeta `/api` antigua
- [ ] Subir carpeta `/api` nueva a cPanel
- [ ] Verificar que `.htaccess` esté presente
- [ ] Probar `https://mawewe.com.ec/api/test-connection.php`
- [ ] Ver ✅ CONEXIÓN EXITOSA CON DOMINIO
- [ ] Probar `https://mawewe.com.ec/api/products.php`
- [ ] Ver JSON con productos
- [ ] Actualizar `CONFIG.api.baseUrl` en `app.js`
- [ ] Probar frontend completo
- [ ] Hacer compra de prueba con PayPal Sandbox
- [ ] Verificar que la orden se guarde en la base de datos

---

## 🎯 PRÓXIMOS PASOS

1. ✅ **Activar SSL**: Asegúrate que `https://mawewe.com.ec` funcione
2. ✅ **PayPal Live**: Cambiar a credenciales de producción
3. ✅ **Email**: Configurar notificaciones de órdenes
4. ✅ **Backup**: Programar respaldos de la base de datos
5. ✅ **Monitoring**: Configurar alertas de errores

---

## 🎉 ¡LISTO!

Tu API está configurada con:
- ✅ Dominio profesional: `mawewe.com.ec`
- ✅ Conexión MySQL funcionando
- ✅ CORS habilitado
- ✅ Endpoints completos
- ✅ Manejo de errores robusto

Si tienes algún problema, revisa la sección **TROUBLESHOOTING**.

---

## 📞 SOPORTE

**Dominio**: https://mawewe.com.ec  
**Email**: info@mawewe.com.ec  
**WhatsApp**: +593 98 183 2313
