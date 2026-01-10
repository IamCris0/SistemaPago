# Mawewe E-Commerce Platform v2.0

Sistema de comercio electrónico profesional con integración PayPal, gestión avanzada de productos y diseño responsive de alta calidad.

## Tabla de Contenidos

- [Características](#características)
- [Tecnologías](#tecnologías)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Uso](#uso)
- [API de Productos](#api-de-productos)
- [Personalización](#personalización)
- [Despliegue](#despliegue)
- [Mantenimiento](#mantenimiento)

## Características

### Catálogo de Productos
- 20+ productos con información detallada
- 7 categorías principales con subcategorías
- Imágenes de alta calidad mediante Unsplash
- Ratings y reseñas
- Indicadores de stock en tiempo real
- Badges de productos destacados y descuentos

### Sistema de Carrito
- Gestión completa de cantidades
- Persistencia en localStorage
- Validación de stock automática
- Cálculo dinámico de totales
- Envío gratuito sobre $100

### Integración PayPal
- Checkout seguro con PayPal
- Soporte multi-moneda
- Cálculo automático de impuestos y envío
- Manejo de transacciones y errores
- Confirmación de órdenes

### Diseño Profesional
- Tipografía refinada (Playfair Display + Lato)
- Paleta de colores cohesiva
- Animaciones sutiles y elegantes
- Responsive design completo
- Accesibilidad WCAG 2.1 AA

### Experiencia de Usuario
- Búsqueda en tiempo real
- Filtros por categoría
- Notificaciones toast elegantes
- Modal de carrito deslizante
- Estados de carga optimizados

## Tecnologías

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Estilos**: CSS Variables, Flexbox, CSS Grid
- **Fuentes**: Google Fonts (Playfair Display, Lato)
- **Imágenes**: Unsplash API
- **Pagos**: PayPal JavaScript SDK
- **Almacenamiento**: localStorage API
- **SEO**: Structured Data, Open Graph, Twitter Cards

## Estructura del Proyecto

```
mawewe-pro/
├── index.html                  # Página principal
├── assets/
│   ├── css/
│   │   └── styles.css         # Estilos principales
│   ├── js/
│   │   └── app.js             # Lógica de aplicación
│   └── images/                # Assets estáticos
├── data/
│   └── products.json          # Base de datos de productos
└── docs/
    ├── README.md              # Esta documentación
    ├── SETUP.md               # Guía de configuración
    └── API.md                 # Documentación de API
```

## Instalación

### Requisitos Previos

- Navegador web moderno (Chrome 90+, Firefox 88+, Safari 14+)
- Servidor web local (recomendado)
- Cuenta PayPal Business (para producción)

### Pasos de Instalación

1. **Clonar o descargar el proyecto**
```bash
git clone https://github.com/tu-usuario/mawewe-pro.git
cd mawewe-pro
```

2. **Configurar servidor local**

Opción A - Python:
```bash
python -m http.server 8000
```

Opción B - Node.js:
```bash
npx serve
```

Opción C - PHP:
```bash
php -S localhost:8000
```

3. **Abrir en navegador**
```
http://localhost:8000
```

## Configuración

### 1. PayPal Client ID

Edita `assets/js/app.js` línea 17:

```javascript
const CONFIG = {
  paypal: {
    clientId: 'TU_CLIENT_ID_AQUI', // Reemplazar
    currency: 'USD',
    locale: 'es_EC'
  }
};
```

**Obtener Client ID:**
1. Ve a [PayPal Developer](https://developer.paypal.com/)
2. Crea una aplicación en modo Sandbox
3. Copia el Client ID
4. Para producción, usa el Client ID de Live

### 2. Productos y Categorías

Edita `data/products.json`:

```json
{
  "products": [
    {
      "id": 1,
      "sku": "PRO-001",
      "name": "Nombre del Producto",
      "category": "categoria-id",
      "subcategory": "subcategoria-id",
      "price": 29.99,
      "comparePrice": 39.99,
      "description": "Descripción detallada...",
      "specifications": {
        "brand": "Marca",
        "material": "Material",
        "size": "Tamaño"
      },
      "image": "https://images.unsplash.com/photo-id?w=800&q=80",
      "stock": 10,
      "featured": false,
      "rating": 4.5,
      "reviewCount": 42,
      "tags": ["tag1", "tag2"]
    }
  ]
}
```

### 3. Costos de Envío

En `assets/js/app.js`:

```javascript
const CONFIG = {
  shipping: {
    cost: 5.00,           // Costo fijo
    freeThreshold: 100.00 // Envío gratis sobre este monto
  }
};
```

### 4. Colores de Marca

En `assets/css/styles.css`:

```css
:root {
  --primary-800: #8C004B;  /* Color principal */
  --primary-600: #b31062;  /* Color claro */
  --accent-gold: #D4AF37;  /* Color acento */
}
```

## Uso

### Para Usuarios

1. **Navegar productos**: Scroll por el catálogo
2. **Buscar**: Usa la barra de búsqueda superior
3. **Filtrar**: Click en las categorías
4. **Agregar al carrito**: Click en "Agregar"
5. **Ver carrito**: Click en el botón "Carrito"
6. **Modificar cantidades**: Usa +/- en el carrito
7. **Pagar**: Click en el botón PayPal

### Para Desarrolladores

#### Agregar Nuevos Productos

```javascript
// En data/products.json
{
  "id": 21,
  "sku": "NEW-001",
  "name": "Nuevo Producto",
  "category": "categoria",
  "price": 49.99,
  "image": "URL_de_Unsplash",
  "stock": 15
}
```

#### Crear Nueva Categoría

```javascript
// En data/products.json
{
  "categories": [
    {
      "id": "nueva-categoria",
      "name": "Nueva Categoría",
      "description": "Descripción...",
      "image": "URL_imagen",
      "subcategories": ["sub1", "sub2"]
    }
  ]
}
```

#### Personalizar Notificaciones

```javascript
// En assets/js/app.js
ui.showNotification('Mensaje personalizado', 'success');
// Tipos: 'success' | 'error'
```

## API de Productos

### Estructura de Datos

#### Producto

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | Number | ID único del producto |
| `sku` | String | Código SKU |
| `name` | String | Nombre del producto |
| `category` | String | ID de categoría |
| `subcategory` | String | ID de subcategoría |
| `price` | Number | Precio actual |
| `comparePrice` | Number | Precio original (opcional) |
| `description` | String | Descripción larga |
| `specifications` | Object | Especificaciones técnicas |
| `image` | String | URL de imagen principal |
| `images` | Array | URLs de imágenes adicionales |
| `stock` | Number | Cantidad disponible |
| `featured` | Boolean | Producto destacado |
| `rating` | Number | Calificación (0-5) |
| `reviewCount` | Number | Número de reseñas |
| `tags` | Array | Etiquetas para búsqueda |

#### Categoría

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | String | ID único de categoría |
| `name` | String | Nombre visible |
| `description` | String | Descripción |
| `image` | String | Imagen de categoría |
| `subcategories` | Array | IDs de subcategorías |

### Endpoints Futuros

```javascript
// GET /api/products
// Obtener todos los productos

// GET /api/products/:id
// Obtener producto específico

// POST /api/orders
// Crear nueva orden

// GET /api/orders/:orderId
// Consultar orden
```

## Personalización

### Cambiar Tipografía

1. Ve a [Google Fonts](https://fonts.google.com/)
2. Selecciona fuentes
3. Actualiza en `index.html`:

```html
<link href="https://fonts.googleapis.com/css2?family=TuFuente:wght@400;700&display=swap" rel="stylesheet">
```

4. Actualiza en `assets/css/styles.css`:

```css
:root {
  --font-family-primary: 'TuFuente', serif;
  --font-family-secondary: 'TuFuenteSecundaria', sans-serif;
}
```

### Modificar Layout

```css
/* En assets/css/styles.css */

/* Cambiar columnas del grid */
.products-grid {
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
}

/* Ajustar espaciado */
:root {
  --spacing-xl: 2.5rem;
}
```

### Agregar Animaciones

```css
/* En assets/css/styles.css */
.product-card {
  transition: all 0.3s ease;
}

.product-card:hover {
  transform: scale(1.02);
}
```

## Despliegue

### Opción 1: Netlify

1. Sube el proyecto a GitHub
2. Conecta con [Netlify](https://netlify.com)
3. Deploy automático

### Opción 2: Vercel

1. Instala Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

### Opción 3: Servidor Tradicional

1. Sube archivos via FTP/SFTP
2. Configura dominio
3. Activa HTTPS (requerido por PayPal)

### Checklist Pre-Deployment

- [ ] Client ID de PayPal en modo LIVE
- [ ] SSL/HTTPS habilitado
- [ ] Google Analytics configurado
- [ ] Imágenes optimizadas
- [ ] Políticas de privacidad publicadas
- [ ] Información de contacto actualizada
- [ ] Pruebas en múltiples navegadores

## Mantenimiento

### Actualizar Productos

```bash
# Editar data/products.json
# No requiere reinicio del servidor
# Los cambios se reflejan en siguiente carga
```

### Monitoreo

```javascript
// Console logs disponibles en producción
console.log('Order processed:', orderDetails);
```

### Backup

```bash
# Respaldar datos críticos
cp data/products.json backups/products-$(date +%Y%m%d).json
```

### Performance

- Imágenes: Usar Unsplash con parámetros `?w=800&q=80`
- CSS: Ya minificado automáticamente
- JS: Considera minificar para producción
- Caché: Configurar en servidor web

## Soporte

### Contacto

- **Email**: info@mawewe.com.ec
- **Teléfono**: +593 98 183 2313
- **Ubicación**: Lago Agrio, Ecuador

### Recursos

- [Documentación PayPal](https://developer.paypal.com/docs/)
- [MDN Web Docs](https://developer.mozilla.org/)
- [Unsplash API](https://unsplash.com/developers)

## Licencia

© 2024 Mawewe. Todos los derechos reservados.

---

**Desarrollado por**: Equipo Mawewe  
**Versión**: 2.0  
**Última actualización**: Enero 2024
