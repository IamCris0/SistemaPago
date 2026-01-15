# 🚀 API Mawewe - Instalación con Usuario Nuevo

## ✅ CREDENCIALES CONFIGURADAS

```
Host: localhost
Base de datos: maweweco_tienda_db
Usuario: maweweco_cris      ✅ NUEVO
Contraseña: bdC(ZFro1rYd    ✅ NUEVA
Puerto: 3306
```

---

## 📋 PASO A PASO - INSTALACIÓN COMPLETA

### 1️⃣ VERIFICAR PERMISOS DEL USUARIO EN cPANEL

**MUY IMPORTANTE:** Antes de subir archivos, verifica esto:

1. Abre **cPanel → MySQL Databases**
2. Busca la sección **"Current Databases"**
   - Debe aparecer: `maweweco_tienda_db` ✅
3. Busca la sección **"Current Users"**
   - Debe aparecer: `maweweco_cris` ✅

#### ✅ Asignar Permisos (si no están asignados):

4. Baja hasta **"Add User To Database"**
5. Selecciona:
   - **User:** `maweweco_cris`
   - **Database:** `maweweco_tienda_db`
6. Click en **"Add"**
7. En la siguiente pantalla, selecciona **"ALL PRIVILEGES"** ☑️
8. Click en **"Make Changes"**

✅ **Deberías ver:** "User maweweco_cris was added to the database maweweco_tienda_db"

---

### 2️⃣ ELIMINAR CARPETA API ANTIGUA

En **File Manager** de cPanel:

1. Navega a: `/public_html/`
2. Si existe la carpeta `api/`, **BÓRRALA completamente**
3. Click derecho → Delete

---

### 3️⃣ SUBIR ARCHIVOS NUEVOS

Del ZIP que descargaste:

1. Descomprime el archivo `api_mawewe_CRIS.zip`
2. Verás una carpeta llamada `api_final/`
3. Sube toda la carpeta `api_final/` a `/public_html/`

Tu estructura debe quedar así:
```
public_html/
└── api_final/
    ├── config/
    │   └── database.php    ✅ Con nuevas credenciales
    ├── products.php
    ├── save-order.php
    ├── test-connection.php
    ├── .htaccess
    └── README.md
```

4. **RENOMBRA** la carpeta `api_final` a `api`:
   - Click derecho en `api_final` → Rename
   - Nuevo nombre: `api`

**Resultado final:**
```
public_html/
└── api/          ✅ Renombrada
    ├── config/
    ├── products.php
    └── ...
```

---

### 4️⃣ VERIFICAR PERMISOS DE ARCHIVOS

En File Manager, selecciona todos los archivos dentro de `/api/`:

- **Carpetas** (`config/`): permisos `755`
- **Archivos .php**: permisos `644`
- **Archivo .htaccess**: permisos `644`

Para cambiar permisos:
1. Click derecho en el archivo/carpeta → Change Permissions
2. Establece los permisos correctos
3. Click en "Change Permissions"

---

### 5️⃣ PROBAR LA CONEXIÓN

Abre tu navegador y ve a:
```
https://mawewe.com.ec/api/test-connection.php
```

✅ **DEBERÍAS VER:**

```
🔍 Test de Conexión MySQL - Mawewe

📊 INFORMACIÓN DEL SERVIDOR:
PHP Version: 7.2.34
Server: mawewe.com.ec

🔌 EXTENSIONES PHP:
PDO disponible: ✅ SÍ
PDO MySQL disponible: ✅ SÍ

✅ ¡CONEXIÓN EXITOSA!
🎉 Las credenciales del usuario 'maweweco_cris' funcionan correctamente!

📦 INFORMACIÓN DE LA BASE DE DATOS:
MySQL Version: 5.7.x

📋 TABLAS ENCONTRADAS (3):
  ✅ products: 48 registros
  ✅ categories: 8 registros
  ✅ orders: 0 registros
```

❌ **SI VES ERROR:**
- Revisa el paso 1 (permisos del usuario)
- Ve a cPanel → MySQL Databases y re-asigna los permisos
- Asegúrate de que seleccionaste "ALL PRIVILEGES"

---

### 6️⃣ PROBAR EL ENDPOINT DE PRODUCTOS

Abre:
```
https://mawewe.com.ec/api/products.php
```

✅ **DEBERÍAS VER JSON:**
```json
{
  "success": true,
  "products": [
    {
      "id": 1,
      "sku": "MAW001",
      "name": "Camiseta Básica",
      "price": 19.99,
      "stock": 10,
      "category": "tshirts",
      "images": ["https://..."]
    },
    ...
  ],
  "categories": [
    {"id": "tshirts", "name": "Camisetas", "count": 12},
    ...
  ],
  "total": 48
}
```

---

### 7️⃣ CONFIGURAR TU FRONTEND

Actualiza tu archivo `assets/js/app.js` con esta configuración:

```javascript
// 🌐 CONFIGURACIÓN DE LA API - ACTUALIZADA
const CONFIG = {
  api: {
    // Detección automática de entorno
    baseUrl: window.location.hostname === 'localhost' || 
             window.location.hostname === '127.0.0.1'
      ? 'http://localhost:8000/api'           // Desarrollo local
      : 'https://mawewe.com.ec/api',          // Producción ✅
    
    endpoints: {
      products: '/products.php',
      saveOrder: '/save-order.php'
    }
  },
  
  paypal: {
    clientId: 'TU_PAYPAL_CLIENT_ID'           // ⚠️ Reemplazar
  }
};

// 📡 Función helper para llamadas a la API
async function fetchAPI(endpoint, options = {}) {
  try {
    const url = `${CONFIG.api.baseUrl}${endpoint}`;
    console.log('📡 Llamando a:', url);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Respuesta:', data);
    
    return data;
    
  } catch (error) {
    console.error('❌ Error en API:', error);
    throw error;
  }
}

// 🛍️ EJEMPLO: Cargar productos
async function loadProducts(filters = {}) {
  try {
    // Construir query string
    const params = new URLSearchParams();
    if (filters.category) params.append('category', filters.category);
    if (filters.search) params.append('search', filters.search);
    
    const queryString = params.toString();
    const endpoint = `${CONFIG.api.endpoints.products}${queryString ? '?' + queryString : ''}`;
    
    const data = await fetchAPI(endpoint);
    
    if (data.success) {
      console.log(`✅ ${data.total} productos cargados`);
      return data.products;
    } else {
      throw new Error(data.message || 'Error al cargar productos');
    }
    
  } catch (error) {
    console.error('Error al cargar productos:', error);
    return [];
  }
}

// 💳 EJEMPLO: Guardar orden
async function saveOrder(orderData) {
  try {
    const data = await fetchAPI(CONFIG.api.endpoints.saveOrder, {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
    
    if (data.success) {
      console.log(`✅ Orden guardada: ${data.orderNumber}`);
      return data;
    } else {
      throw new Error(data.message || 'Error al guardar orden');
    }
    
  } catch (error) {
    console.error('Error al guardar orden:', error);
    throw error;
  }
}

// 🚀 Inicializar al cargar la página
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Iniciando Mawewe...');
  
  // Cargar productos iniciales
  const products = await loadProducts();
  renderProducts(products);  // Tu función de renderizado
});
```

---

## 🔍 ENDPOINTS DISPONIBLES

### 📦 GET `/api/products.php`

Obtiene la lista de productos con filtros opcionales.

**Parámetros (query string):**
- `category` - Filtrar por categoría (ej: `tshirts`)
- `subcategory` - Filtrar por subcategoría
- `search` - Buscar por nombre o descripción

**Ejemplos:**
```
# Todos los productos
https://mawewe.com.ec/api/products.php

# Filtrar por categoría
https://mawewe.com.ec/api/products.php?category=tshirts

# Buscar productos
https://mawewe.com.ec/api/products.php?search=manga+larga

# Combinar filtros
https://mawewe.com.ec/api/products.php?category=tshirts&search=azul
```

**Respuesta:**
```json
{
  "success": true,
  "products": [
    {
      "id": 1,
      "sku": "MAW001",
      "name": "Camiseta Básica Azul",
      "description": "Camiseta de algodón 100%",
      "price": 19.99,
      "compareAtPrice": null,
      "stock": 15,
      "category": "tshirts",
      "subcategory": "basic",
      "sizes": ["S", "M", "L", "XL"],
      "colors": ["Azul", "Negro", "Blanco"],
      "images": [
        "https://mawewe.com.ec/images/products/maw001-1.jpg",
        "https://mawewe.com.ec/images/products/maw001-2.jpg"
      ],
      "featured": true,
      "newArrival": false,
      "createdAt": "2026-01-10 10:30:00"
    }
  ],
  "categories": [
    {
      "id": "tshirts",
      "name": "Camisetas",
      "count": 12
    },
    {
      "id": "hoodies",
      "name": "Sudaderas",
      "count": 8
    }
  ],
  "shippingConfig": {
    "freeShippingThreshold": 50,
    "standardShippingCost": 5
  },
  "total": 48
}
```

---

### 💳 POST `/api/save-order.php`

Guarda una nueva orden en la base de datos.

**Body (JSON):**
```json
{
  "paypalOrderId": "8UV90361L9537821F",
  "email": "cliente@example.com",
  "firstName": "Juan",
  "lastName": "Pérez",
  "items": [
    {
      "id": 1,
      "quantity": 2,
      "size": "M",
      "color": "Azul"
    },
    {
      "id": 5,
      "quantity": 1,
      "size": "L",
      "color": "Negro"
    }
  ],
  "totals": {
    "subtotal": 59.97,
    "shipping": 5.00,
    "total": 64.97
  }
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "orderId": 1,
  "orderNumber": "MW-000001",
  "message": "Orden guardada exitosamente"
}
```

**Respuesta con error:**
```json
{
  "success": false,
  "message": "Stock insuficiente para el producto ID 1"
}
```

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### ❌ Error 500 Internal Server Error

**Posibles causas:**
1. Permisos de archivos incorrectos
2. Error de sintaxis en PHP
3. Archivo .htaccess con configuración incorrecta

**Solución:**
1. Ve a cPanel → Error Log
2. Lee el último error para identificar el archivo problemático
3. Verifica permisos: `.php` = 644, carpetas = 755
4. Verifica que `.htaccess` existe y tiene permisos 644

---

### ❌ "Access denied for user 'maweweco_cris'@'localhost'"

**Causa:** El usuario no tiene permisos en la base de datos.

**Solución:**
1. Ve a cPanel → MySQL Databases
2. En "Current Users", busca `maweweco_cris`
3. En "Databases", busca `maweweco_tienda_db`
4. Si no están conectados, usa "Add User To Database"
5. Selecciona el usuario y la base de datos
6. Marca **ALL PRIVILEGES** ☑️
7. Click en "Make Changes"
8. Vuelve a probar `test-connection.php`

---

### ❌ CORS Error en el navegador

```
Access to fetch at 'https://mawewe.com.ec/api/products.php' from origin 
'https://mawewe.com.ec' has been blocked by CORS policy
```

**Solución:**
1. Verifica que `.htaccess` está en `/public_html/api/`
2. Abre `.htaccess` y verifica que contiene:
```apache
Header set Access-Control-Allow-Origin "*"
Header set Access-Control-Allow-Methods "GET, POST, OPTIONS"
```
3. Limpia caché del navegador (Ctrl+Shift+R)
4. Si persiste, contacta al soporte de tu hosting

---

### ❌ "No products found" pero sé que hay productos

**Causa:** Posible error en la consulta SQL o estructura de tabla.

**Solución:**
1. Abre `test-connection.php` para ver cuántos productos hay
2. Verifica que la tabla se llama exactamente `products`
3. En phpMyAdmin, ejecuta:
```sql
SELECT COUNT(*) FROM products;
```
4. Si el conteo es > 0 pero la API no los muestra, verifica la estructura de la tabla

---

### ❌ Productos sin imágenes

**Causa:** Campo `images` en la BD no es un JSON válido.

**Solución:**
1. Las imágenes deben estar en formato JSON array:
```sql
UPDATE products 
SET images = '["https://mawewe.com.ec/img/product1.jpg"]' 
WHERE images IS NULL OR images = '';
```

---

## 📝 NOTAS TÉCNICAS

### Seguridad
✅ PDO con prepared statements (protección SQL injection)  
✅ Credenciales en archivo protegido por `.htaccess`  
✅ Validación de datos de entrada  
✅ No exponer credenciales en respuestas de error  

### Base de Datos
✅ Charset UTF-8 (utf8mb4) - soporta emojis  
✅ Transacciones para órdenes (rollback automático en error)  
✅ Actualización automática de stock  
✅ Índices en tablas para mejor rendimiento  

### CORS
✅ Configurado para permitir requests desde cualquier origen  
✅ Soporta métodos: GET, POST, PUT, DELETE, OPTIONS  
✅ Headers permitidos: Content-Type, Authorization  

---

## 🎯 CHECKLIST FINAL

Antes de considerar que todo está funcionando, verifica:

- [ ] `test-connection.php` muestra "✅ CONEXIÓN EXITOSA"
- [ ] `products.php` retorna JSON con productos
- [ ] Los productos tienen imágenes
- [ ] El frontend puede cargar productos
- [ ] CORS no da error en la consola del navegador
- [ ] PayPal está configurado (Client ID)
- [ ] Las órdenes se guardan correctamente

---

## 📞 SOPORTE

Si después de seguir todos los pasos sigues teniendo problemas:

1. **Toma capturas de pantalla de:**
   - El error en el navegador (consola F12)
   - cPanel Error Log (últimas 10 líneas)
   - El resultado de `test-connection.php`

2. **Verifica que completaste:**
   - Permisos del usuario en MySQL Databases ✅
   - Permisos de archivos (644 para .php) ✅
   - Archivo .htaccess existe ✅
   - Credenciales correctas en database.php ✅

---

**Versión:** 2.0 - Usuario maweweco_cris  
**Última actualización:** Enero 15, 2026  
**Hosting:** cPanel (jemima.dongee.com)  
**PHP:** 7.2.34  

🚀 ¡Tu API está lista para funcionar!
