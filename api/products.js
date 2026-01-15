// api/products.js
// API Serverless para Vercel (Node.js)

import { Client } from 'pg';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  
  try {
    // Conectar a base de datos MySQL
    const client = new Client({
      host: '192.99.84.47',
      port: 3306,
      user: 'maweweco_admin',
      password: 'Tr~RcW$bIE(U)',
      database: 'maweweco_tienda_db',
    });
    
    await client.connect();
    
    // Obtener parámetros de búsqueda
    const { category, subcategory, search } = req.query;
    
    // Construir query
    let sql = `
      SELECT 
        id, sku, name, category, subcategory, price, description,
        image, images, stock, featured, rating, review_count,
        created_at, updated_at
      FROM products
      WHERE active = 1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (category && category !== 'all') {
      sql += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    
    if (subcategory) {
      sql += ` AND subcategory = $${paramIndex}`;
      params.push(subcategory);
      paramIndex++;
    }
    
    if (search) {
      sql += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR sku ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    sql += ' ORDER BY featured DESC, created_at DESC';
    
    const result = await client.query(sql, params);
    const products = result.rows;
    
    // Procesar imágenes
    products.forEach(product => {
      if (typeof product.images === 'string') {
        try {
          product.images = JSON.parse(product.images);
        } catch (e) {
          product.images = [product.image, product.image, product.image];
        }
      }
      
      if (!Array.isArray(product.images)) {
        product.images = [product.image, product.image, product.image];
      }
      
      // Convertir tipos
      product.id = parseInt(product.id);
      product.price = parseFloat(product.price);
      product.stock = parseInt(product.stock);
      product.featured = Boolean(product.featured);
      product.rating = parseFloat(product.rating);
      product.review_count = parseInt(product.review_count);
    });
    
    // Obtener categorías
    const categoriesResult = await client.query(`
      SELECT category, COUNT(*) as count
      FROM products
      WHERE active = 1
      GROUP BY category
      ORDER BY category
    `);
    
    const categories = categoriesResult.rows.map(cat => ({
      id: cat.category.toLowerCase().replace(/ /g, '-'),
      name: cat.category.charAt(0).toUpperCase() + cat.category.slice(1),
      count: parseInt(cat.count)
    }));
    
    await client.end();
    
    // Respuesta
    return res.status(200).json({
      success: true,
      products,
      categories,
      shippingConfig: {
        cost: 5.0,
        freeThreshold: 50.0,
        expressCost: 10.0
      },
      total: products.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener productos',
      error: error.message
    });
  }
}