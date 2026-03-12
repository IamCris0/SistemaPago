/**
 * MAWEWE - routing.js v4
 * ✅ Instagram reemplaza Twitter en los botones de compartir
 * ✅ Facebook usa share.php → muestra imagen del producto (no el logo)
 * ✅ WhatsApp envía texto + enlace con preview de imagen
 * ✅ Instagram: copia enlace + guía visual para historia/publicación
 * ✅ NUEVO: Precios con descuento en modal de producto
 */

const routing = {

  SITE_URL: 'https://tienda.mawewe.com.ec',

  getURLParams() {
    const p = new URLSearchParams(window.location.search);
    return {
      category:    p.get('category'),
      subcategory: p.get('subcategory'),
      product:     p.get('product'),
      search:      p.get('search'),
    };
  },

  updateURL(params = {}) {
    const url = new URL(window.location.href);
    ['category','subcategory','product','search'].forEach(k => url.searchParams.delete(k));
    if (params.category    && params.category !== 'all') url.searchParams.set('category',    params.category);
    if (params.subcategory)                               url.searchParams.set('subcategory', params.subcategory);
    if (params.product)                                   url.searchParams.set('product',     params.product);
    if (params.search)                                    url.searchParams.set('search',      params.search);
    window.history.pushState({}, '', url.toString());
    this.updateMetaTags(params);
  },

  getShareURL(productId) {
    return `${this.SITE_URL}/share.php?product=${productId}`;
  },

  getProductURL(productId) {
    return `${this.SITE_URL}/?product=${productId}`;
  },

  getCategoryURL(categoryId, subcategoryId = null) {
    const url = new URL(this.SITE_URL);
    if (categoryId !== 'all') url.searchParams.set('category', categoryId);
    if (subcategoryId)        url.searchParams.set('subcategory', subcategoryId);
    return url.toString();
  },

  updateMetaTags(params) {
    if (!params.product || !state || !state.products) return;
    const product = state.products.find(p => p.id === parseInt(params.product));
    if (!product) return;

    let img = product.image;
    if (product.images && Array.isArray(product.images) && product.images.length > 0)
      img = product.images[0];
    if (!img.startsWith('http')) img = `${this.SITE_URL}/${img.replace(/^\//, '')}`;

    const title = `${product.name} - $${Number(product.price).toFixed(2)} | Mawewe Ecuador`;
    const desc  = (product.description || '').substring(0, 200) + '...';
    const shareUrl = this.getShareURL(product.id);

    document.title = title;
    this._setMeta('og:title',       title);
    this._setMeta('og:description', desc);
    this._setMeta('og:image',       img);
    this._setMeta('og:url',         shareUrl);
    this._setMeta('twitter:title',       title);
    this._setMeta('twitter:description', desc);
    this._setMeta('twitter:image',       img);
  },

  _setMeta(prop, content) {
    let tag = document.querySelector(`meta[property="${prop}"]`)
           || document.querySelector(`meta[name="${prop}"]`);
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute('property', prop);
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
  },

  async copyToClipboard(text) {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const i = document.createElement('input');
      i.value = text; document.body.appendChild(i); i.select();
      document.execCommand('copy'); document.body.removeChild(i);
    }
    if (window.mawewe?.ui) window.mawewe.ui.showNotification('✓ Enlace copiado');
  },

  shareOn(platform, shareUrl, encodedTitle, encodedText) {
    const enc = encodeURIComponent(shareUrl);

    if (platform === 'facebook') {
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${enc}`,
        '_blank', 'width=640,height=480,noopener,noreferrer'
      );
    }
    else if (platform === 'whatsapp') {
      window.open(
        `https://wa.me/?text=${encodedText}%20${enc}`,
        '_blank', 'noopener,noreferrer'
      );
    }
    else if (platform === 'instagram') {
      this._shareInstagram(shareUrl, decodeURIComponent(encodedText));
    }
  },

  async _shareInstagram(shareUrl, text) {
    if (navigator.share) {
      try {
        await navigator.share({ title: text, text: text, url: shareUrl });
        return;
      } catch (e) {}
    }
    await this.copyToClipboard(shareUrl);
    this._showInstagramGuide(shareUrl);
  },

  _showInstagramGuide(shareUrl) {
    const existing = document.getElementById('ig-guide-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'ig-guide-modal';
    modal.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:99999;
      display:flex;align-items:center;justify-content:center;padding:1rem;
      font-family:'Quicksand',sans-serif;
    `;

    modal.innerHTML = `
      <div style="
        background:#fff;border-radius:24px;padding:2rem;
        max-width:380px;width:100%;text-align:center;
        box-shadow:0 24px 64px rgba(0,0,0,0.35);
        animation: igPop 0.3s cubic-bezier(0.34,1.56,0.64,1);
      ">
        <style>
          @keyframes igPop {
            from { transform:scale(0.7); opacity:0; }
            to   { transform:scale(1);   opacity:1; }
          }
        </style>

        <div style="
          width:72px;height:72px;border-radius:20px;margin:0 auto 1rem;
          background:linear-gradient(45deg,#f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%);
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 8px 24px rgba(188,24,136,0.4);
        ">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2" width="20" height="20" rx="5" stroke="white" stroke-width="2"/>
            <circle cx="12" cy="12" r="4" stroke="white" stroke-width="2"/>
            <circle cx="17.5" cy="6.5" r="1" fill="white"/>
          </svg>
        </div>

        <h3 style="font-size:1.15rem;font-weight:700;color:#111;margin-bottom:0.4rem;">
          Compartir en Instagram
        </h3>
        <p style="font-size:0.82rem;color:#22c55e;font-weight:600;margin-bottom:1.25rem;">
          ✅ ¡Enlace copiado al portapapeles!
        </p>

        <div style="background:#f8f8f8;border-radius:14px;padding:1rem;text-align:left;margin-bottom:1.25rem;">
          <p style="font-size:0.82rem;font-weight:700;color:#333;margin-bottom:0.5rem;">
            📸 Para una <strong>Historia</strong>:
          </p>
          <div style="font-size:0.8rem;color:#555;line-height:1.9;padding-left:0.5rem">
            1. Abre <strong>Instagram</strong><br>
            2. Toca <strong>+</strong> → <strong>Historia</strong><br>
            3. Toca el ícono de enlace <strong>🔗</strong><br>
            4. Pega el enlace copiado
          </div>

          <hr style="border:none;border-top:1px solid #e5e5e5;margin:0.75rem 0;">

          <p style="font-size:0.82rem;font-weight:700;color:#333;margin-bottom:0.5rem;">
            📝 Para una <strong>Publicación</strong>:
          </p>
          <div style="font-size:0.8rem;color:#555;line-height:1.9;padding-left:0.5rem">
            1. Abre <strong>Instagram</strong> → <strong>+</strong><br>
            2. Sube la foto del producto<br>
            3. Pega el enlace en la <strong>descripción</strong>
          </div>
        </div>

        <div style="
          background:#f0e8f6;border:1px dashed #c084fc;border-radius:10px;
          padding:0.6rem 0.75rem;font-size:0.72rem;color:#7c3aed;
          word-break:break-all;text-align:left;margin-bottom:1.25rem;
          user-select:all;
        ">${shareUrl}</div>

        <div style="display:flex;gap:0.6rem;">
          <button id="ig-copy-again" style="
            flex:1;padding:0.75rem;background:#f3f0ff;color:#7c3aed;
            border:2px solid #c4b5fd;border-radius:12px;cursor:pointer;
            font-weight:700;font-size:0.82rem;transition:all 0.15s;
          ">🔗 Copiar de nuevo</button>
          <button id="ig-close" style="
            flex:1;padding:0.75rem;
            background:linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045);
            color:#fff;border:none;border-radius:12px;cursor:pointer;
            font-weight:700;font-size:0.82rem;transition:all 0.15s;
          ">Listo ✓</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('ig-copy-again').onclick = () => {
      this.copyToClipboard(shareUrl);
      document.getElementById('ig-copy-again').textContent = '✅ Copiado!';
      setTimeout(() => {
        const btn = document.getElementById('ig-copy-again');
        if (btn) btn.textContent = '🔗 Copiar de nuevo';
      }, 2000);
    };
    document.getElementById('ig-close').onclick = () => modal.remove();
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  },

  handleInitialURL() {
    const params = this.getURLParams();

    if (params.product) {
      const productId = parseInt(params.product);
      const timer = setInterval(() => {
        if (state.products && state.products.length > 0) {
          clearInterval(timer);
          if (state.products.find(p => p.id === productId))
            setTimeout(() => window.productModal?.show(productId), 400);
        }
      }, 100);
      setTimeout(() => clearInterval(timer), 5000);
      return;
    }

    if (params.search) {
      const input = document.getElementById('search-input');
      if (input) {
        input.value = params.search;
        state.searchQuery = params.search;
        state.currentFilter = 'all';
        window.mawewe?.filters?.setSearch(params.search);
      }
      return;
    }

    if (params.category) {
      const timer = setInterval(() => {
        if (state.categories && state.categories.length > 0) {
          clearInterval(timer);
          state.currentFilter = params.category;
          if (params.subcategory) state.currentSubcategory = params.subcategory;
          window.mawewe?.filters?.apply();
          setTimeout(() => {
            document.querySelectorAll('.filter-button').forEach(btn => {
              btn.classList.remove('active');
              if (btn.textContent.toLowerCase().includes(params.category.toLowerCase()))
                btn.classList.add('active');
            });
            window.render?.subcategories?.();
          }, 500);
        }
      }, 100);
      setTimeout(() => clearInterval(timer), 5000);
    }
  },
};

// =============================================================================
// SOBREESCRIBIR productModal.show — CON PRECIOS DE DESCUENTO
// =============================================================================
if (window.productModal) {

  window.productModal.show = function(productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;

    this.currentProduct    = product;
    this.currentImageIndex = 0;

    const images = (product.images && Array.isArray(product.images) && product.images.length > 0)
      ? product.images.slice(0, 3)
      : [product.image, product.image, product.image];

    const shareUrl    = routing.getShareURL(productId);
    const storeUrl    = routing.getProductURL(productId);
    const titleEnc    = encodeURIComponent(`${product.name} - $${Number(product.price).toFixed(2)} | Mawewe Ecuador`);
    const textEnc     = encodeURIComponent(`¡Mira este producto en Mawewe! ${product.name} - $${Number(product.price).toFixed(2)}`);

    // ✅ Calcular precios con descuento
    const originalPrice  = Number(product.price);
    const pricePaypal    = (originalPrice * 0.84).toFixed(2);
    const priceTransfer  = (originalPrice * 0.80).toFixed(2);
    const savePaypal     = (originalPrice * 0.16).toFixed(2);
    const saveTransfer   = (originalPrice * 0.20).toFixed(2);

    const modal = document.createElement('div');
    modal.className = 'product-modal-overlay';
    modal.id = 'product-detail-modal';
    modal.innerHTML = `
      <div class="product-modal">
        <button class="modal-close" onclick="productModal.close()">&times;</button>
        <div class="modal-content">

          <!-- IMÁGENES -->
          <div class="modal-image-section">
            <div class="modal-main-image">
              <img id="modal-main-img" src="${images[0]}" alt="${product.name}">
              <button class="modal-carousel-btn prev" onclick="productModal.prevImage()">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <button class="modal-carousel-btn next" onclick="productModal.nextImage()">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
            <div class="modal-thumbnails">
              ${images.map((img, i) => `
                <img src="${img}" alt="${product.name} ${i+1}"
                  class="thumbnail ${i===0?'active':''}"
                  onclick="productModal.selectImage(${i})">`
              ).join('')}
            </div>
          </div>

          <!-- INFO -->
          <div class="modal-info">
            <div class="product-category">${(product.category||'').toUpperCase()}</div>
            ${product.subcategory ? `<div class="product-subcategory">${product.subcategory.toUpperCase()}</div>` : ''}
            <h2 class="modal-title">${product.name}</h2>

            <!-- ✅ BLOQUE DE PRECIO CON DESCUENTOS -->
            <div style="margin-bottom:1rem;">

              <!-- Precio original tachado -->
              <div style="display:flex; align-items:baseline; gap:8px; margin-bottom:10px;">
                <span style="font-size:1.1rem; color:var(--gray-400); text-decoration:line-through;">$${originalPrice.toFixed(2)}</span>
                <span style="font-size:0.72rem; color:var(--gray-500); font-weight:500;">precio sin descuento</span>
              </div>

              <!-- Tarjetas de precio con descuento -->
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">

                <!-- Transferencia / Efectivo -->
                <div style="
                  padding:10px 12px;
                  border-radius:10px;
                  background:#f0fdf4;
                  border:1px solid #86efac;
                ">
                  <div style="font-size:0.62rem; font-weight:700; color:#15803d; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:3px;">
                    Transferencia / Efectivo
                  </div>
                  <div style="font-size:1.35rem; font-weight:700; color:#15803d; line-height:1;">
                    $${priceTransfer}
                  </div>
                  <div style="font-size:0.68rem; color:#16a34a; margin-top:3px; font-weight:600;">
                    Ahorras $${saveTransfer} · 20% OFF
                  </div>
                </div>

                <!-- PayPal -->
                <div style="
                  padding:10px 12px;
                  border-radius:10px;
                  background:#eff6ff;
                  border:1px solid #93c5fd;
                ">
                  <div style="font-size:0.62rem; font-weight:700; color:#1d4ed8; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:3px;">
                    PayPal
                  </div>
                  <div style="font-size:1.35rem; font-weight:700; color:#1d4ed8; line-height:1;">
                    $${pricePaypal}
                  </div>
                  <div style="font-size:0.68rem; color:#2563eb; margin-top:3px; font-weight:600;">
                    Ahorras $${savePaypal} · 16% OFF
                  </div>
                </div>

              </div>

              <!-- Nota envío gratis -->
              <div style="
                margin-top:8px;
                padding:6px 10px;
                background:#fefce8;
                border:1px solid #fde68a;
                border-radius:8px;
                font-size:0.72rem;
                color:#92400e;
                font-weight:500;
              ">
                📦 Envío gratis en compras superiores a $60
              </div>
            </div>

            <p class="modal-description">${product.description}</p>

            <!-- BOTONES DE COMPARTIR -->
            <div style="
              margin: var(--spacing-lg) 0;
              padding: var(--spacing-md);
              background: var(--gray-50);
              border-radius: var(--radius-lg);
              border: 1px solid var(--gray-200);
            ">
              <p style="font-size:var(--font-size-sm);font-weight:600;margin-bottom:0.6rem;color:var(--gray-700);">
                📤 Compartir este producto:
              </p>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;">

                <button onclick="routing.copyToClipboard('${shareUrl}')" style="
                  padding:0.65rem 0.5rem;background:#f1f5f9;color:#334155;
                  border:1px solid #cbd5e1;border-radius:10px;cursor:pointer;
                  font-size:0.8rem;font-weight:600;
                  display:flex;align-items:center;justify-content:center;gap:5px;
                  transition:all 0.15s;
                " onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">
                  🔗 Copiar enlace
                </button>

                <button onclick="routing.shareOn('whatsapp','${shareUrl}','${titleEnc}','${textEnc}')" style="
                  padding:0.65rem 0.5rem;background:#25D366;color:#fff;
                  border:none;border-radius:10px;cursor:pointer;
                  font-size:0.8rem;font-weight:600;
                  display:flex;align-items:center;justify-content:center;gap:5px;
                  transition:all 0.15s;
                " onmouseover="this.style.background='#1ebe5d'" onmouseout="this.style.background='#25D366'">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                  WhatsApp
                </button>

                <button onclick="routing.shareOn('facebook','${shareUrl}','${titleEnc}','${textEnc}')" style="
                  padding:0.65rem 0.5rem;background:#1877F2;color:#fff;
                  border:none;border-radius:10px;cursor:pointer;
                  font-size:0.8rem;font-weight:600;
                  display:flex;align-items:center;justify-content:center;gap:5px;
                  transition:all 0.15s;
                " onmouseover="this.style.background='#1565d8'" onmouseout="this.style.background='#1877F2'">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                  Facebook
                </button>

                <button onclick="routing.shareOn('instagram','${shareUrl}','${titleEnc}','${textEnc}')" style="
                  padding:0.65rem 0.5rem;
                  background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);
                  color:#fff;border:none;border-radius:10px;cursor:pointer;
                  font-size:0.8rem;font-weight:600;
                  display:flex;align-items:center;justify-content:center;gap:5px;
                  transition:all 0.15s;
                ">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="2" width="20" height="20" rx="5"/>
                    <circle cx="12" cy="12" r="4"/>
                    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
                  </svg>
                  Instagram
                </button>

              </div>
            </div>

            <!-- DETALLES -->
            <div class="product-details-list">
              <h3>Detalles del Producto</h3>
              <ul>
                <li><strong>SKU:</strong> ${product.sku}</li>
                <li><strong>Stock disponible:</strong> ${product.stock} unidades</li>
                <li><strong>Categoría:</strong> ${(product.category||'').toUpperCase()}</li>
                ${product.subcategory ? `<li><strong>Subcategoría:</strong> ${product.subcategory.toUpperCase()}</li>` : ''}
              </ul>
            </div>

            <div class="modal-actions">
              <button class="btn-add-to-cart-large"
                onclick="cart.addItem(${product.id}); productModal.close();"
                ${product.stock===0?'disabled':''}>
                ${product.stock===0?'Sin Stock':'Agregar al Carrito'}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    modal.addEventListener('click', e => { if (e.target === modal) this.close(); });

    routing.updateURL({ product: productId });
    routing.updateMetaTags({ product: productId });
  };

  window.productModal.close = function() {
    const modal = document.getElementById('product-detail-modal');
    if (modal) { modal.remove(); document.body.style.overflow = ''; }
    this.currentProduct = null;
    this.currentImageIndex = 0;
    routing.updateURL({
      category:    state.currentFilter !== 'all' ? state.currentFilter : null,
      subcategory: state.currentSubcategory,
    });
  };
}

// ─── Integración filtros ──────────────────────────────────────────────────────
if (window.filters) {
  const _cat = window.filters.setCategory.bind(window.filters);
  window.filters.setCategory = function(cat) {
    _cat(cat);
    routing.updateURL({ category: cat !== 'all' ? cat : null });
  };
  const _sub = window.filters.setSubcategory.bind(window.filters);
  window.filters.setSubcategory = function(sub) {
    _sub(sub);
    routing.updateURL({ category: state.currentFilter, subcategory: state.currentSubcategory });
  };
  const _search = window.filters.setSearch.bind(window.filters);
  window.filters.setSearch = function(q) {
    _search(q);
    routing.updateURL(q.trim() ? { search: q } : {});
  };
}

window.addEventListener('popstate', () => routing.handleInitialURL());

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => routing.handleInitialURL(), 100);
  console.log('✅ routing.js v4 — Precios descuento en modal + Instagram');
});

window.routing = routing;
if (window.mawewe) window.mawewe.routing = routing;