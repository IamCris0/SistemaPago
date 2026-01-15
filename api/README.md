# 📁 API de Mawewe E-commerce - MySQL

## ✅ Conexión Configurada

Esta API usa las siguientes credenciales de MySQL:

```
Host: 192.99.84.47
Puerto: 3306
Base de datos: maweweco_tienda_db
Usuario: maweweco_admin
Contraseña: Tr~RcW$bIE(U
```

---

## 📂 Estructura de Archivos

```
/api/
├── config/
│   └── database.php          ← Configuración de MySQL
├── products.php              ← Endpoint GET productos
├── save-order.php            ← Endpoint POST guardar orden
├── test-connection.php       ← Script de prueba
├── .htaccess                 ← Configuración CORS
└── README.md                 ← Este archivo
```

---

## 🚀 PASO A PASO PARA INSTALAR

### 1️⃣ Borrar tu carpeta `/api` actual

En tu cPanel o por FTP:
```bash
# Elimina la carpeta /public_html/api actual
rm -rf /public_html/api
```

### 2️⃣ Subir esta nueva carpeta `/api`

Sube esta carpeta `api_new` a tu cPanel y renómbrala a `api`:

```
/public_html/
├── index.html
├── assets/
├── data/
└── api/           ← Nueva carpeta aquí
    ├── config/
    ├── products.php
    ├── save-order.php
    ├── test-connection.php
    └── .htaccess
```

### 3️⃣ Probar la conexión

Abre en tu navegador:
```
http://192.99.84.47/api/test-connection.php
```

Deberías ver:
```
✅ CONEXIÓN EXITOSA!
📦 INFORMACIÓN DE LA BASE DE DATOS
📋 TABLAS ENCONTRADAS
🛍️ ESTRUCTURA DE LA TABLA 'products'
```

### 4️⃣ Probar el endpoint de productos

Abre en tu navegador o usa curl:
```
http://192.99.84.47/api/products.php
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

En tu archivo `assets/js/app.js`, línea 1-10:

```javascript
const CONFIG = {
  api: {
    baseUrl: "http://192.99.84.47/api",  // ✅ Tu servidor
    productsEndpoint: "/products.php",
    saveOrderEndpoint: "/save-order.php",
  },
  // ... resto de configuración
}
```

---

## 🧪 PRUEBAS

### Probar GET productos
```bash
curl http://192.99.84.47/api/products.php
```

### Probar GET productos con filtros
```bash
# Por categoría
curl "http://192.99.84.47/api/products.php?category=ropa"

# Por búsqueda
curl "http://192.99.84.47/api/products.php?search=jeans"

# Por subcategoría
curl "http://192.99.84.47/api/products.php?category=ropa&subcategory=americanino"
```

### Probar POST guardar orden
```bash
curl -X POST http://192.99.84.47/api/save-order.php \
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

**Solución 1**: Verifica que el host sea accesible
```bash
ping 192.99.84.47
```

**Solución 2**: Verifica el puerto 3306
```bash
telnet 192.99.84.47 3306
```

**Solución 3**: Verifica las credenciales en phpMyAdmin

### ❌ Error: "CORS policy"

**Solución**: Asegúrate que el archivo `.htaccess` esté en la carpeta `/api/`

### ❌ Error: "PDO extension not found"

**Solución**: Contacta a tu hosting para habilitar PDO y PDO_MYSQL

### ❌ Error: "Table 'products' doesn't exist"

**Solución**: Asegúrate que la tabla existe en tu base de datos. Verifica en phpMyAdmin.

---

## 📊 ENDPOINTS DISPONIBLES

### 1. GET `/api/products.php`

Obtiene la lista de productos.

**Parámetros opcionales:**
- `category`: Filtrar por categoría (ej: `ropa`, `peluches`)
- `subcategory`: Filtrar por subcategoría (ej: `americanino`)
- `search`: Buscar por nombre, descripción o SKU

**Respuesta:**
```json
{
  "success": true,
  "products": [...],
  "categories": [...],
  "shippingConfig": {...},
  "total": 48
}
```

### 2. POST `/api/save-order.php`

Guarda una orden de compra.

**Body requerido:**
```json
{
  "paypalOrderId": "string",
  "email": "string",
  "firstName": "string",
  "lastName": "string",
  "items": [...],
  "totals": {...}
}
```

**Respuesta:**
```json
{
  "success": true,
  "orderId": 123,
  "orderNumber": "MW-000123"
}
```

### 3. GET `/api/test-connection.php`

Script de diagnóstico para verificar la conexión.

---

## 🔐 SEGURIDAD

✅ Headers CORS configurados
✅ Validación de datos de entrada
✅ Prepared statements (protección contra SQL injection)
✅ Transacciones para órdenes (rollback en caso de error)
✅ .htaccess configurado

---

## 📝 NOTAS IMPORTANTES

1. **Contraseña especial**: La contraseña contiene caracteres especiales (`$`), por eso se escapa con `\` en PHP: `Tr~RcW\$bIE(U)`

2. **Puerto**: Asegúrate que el puerto 3306 esté abierto en tu firewall

3. **Charset**: Todas las conexiones usan UTF-8 (utf8mb4) para soportar emojis y caracteres especiales

4. **Tablas requeridas**: 
   - `products` (obligatoria)
   - `orders` (se crea automáticamente al guardar primera orden)
   - `order_items` (se crea automáticamente)

---

## ✅ CHECKLIST DE INSTALACIÓN

- [ ] Borrar carpeta `/api` antigua
- [ ] Subir carpeta `/api` nueva
- [ ] Verificar que `.htaccess` esté presente
- [ ] Probar `test-connection.php`
- [ ] Probar `products.php`
- [ ] Actualizar `CONFIG.api.baseUrl` en `app.js`
- [ ] Probar frontend completo
- [ ] Hacer compra de prueba

---

## 🎉 ¡LISTO!

Tu API está configurada y lista para funcionar. Si tienes algún problema, revisa la sección de **TROUBLESHOOTING** arriba.
