# Guía de Inicio Rápido - Mawewe Pro

## En 3 Pasos

### Paso 1: Configurar PayPal (2 minutos)

1. Abre `assets/js/app.js`
2. Línea 17, reemplaza:
```javascript
clientId: 'TU_CLIENT_ID_AQUI'
```

[¿Cómo obtener Client ID?](https://developer.paypal.com/)

### Paso 2: Abrir el Proyecto (1 minuto)

**Método A - Servidor Python:**
```bash
cd mawewe-pro
python -m http.server 8000
```

**Método B - Servidor Node:**
```bash
cd mawewe-pro
npx serve
```

Abre: `http://localhost:8000`

### Paso 3: ¡Listo!

Tu tienda está funcionando. Prueba:
- Buscar productos
- Filtrar por categorías
- Agregar al carrito
- Hacer checkout (modo Sandbox)

## Personalización Rápida

### Cambiar Colores

`assets/css/styles.css` línea 15:
```css
--primary-800: #TU_COLOR;
```

### Agregar Productos

`data/products.json`:
```json
{
  "id": 21,
  "name": "Nuevo Producto",
  "price": 29.99,
  "image": "URL_unsplash",
  "stock": 10
}
```

### Ajustar Envío

`assets/js/app.js` línea 22:
```javascript
shipping: {
  cost: 5.00,
  freeThreshold: 100.00
}
```

## Próximos Pasos

- Lee la [Documentación Completa](./docs/README.md)
- Agrega tus productos en `data/products.json`
- Personaliza colores en `assets/css/styles.css`
- Configura PayPal Live para producción
- Despliega en Netlify/Vercel

## ¿Problemas?

**PayPal no carga:**
- Verifica Client ID
- Usa servidor local (no archivos directos)

**Productos no aparecen:**
- Revisa consola del navegador (F12)
- Verifica formato JSON en `data/products.json`

**Carrito no guarda:**
- Habilita localStorage en navegador
- Limpia caché

## Soporte

📧 info@mawewe.com.ec  
📞 +593 98 183 2313

---

**¡Éxito con tu tienda! 🚀**
