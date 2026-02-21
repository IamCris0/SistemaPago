/* ============================================================
   MAWEWE CRM - Core JS
   ============================================================ */

'use strict';

/* ============================================================
   CONFIG
   ============================================================ */

const CONFIG = {
  API_BASE: 'https://mawewe.com.ec/api',
  TOKEN_KEY: 'mawewe_token',
  USER_KEY:  'mawewe_user',
  VERSION:   '3.0.0'
};

/* ============================================================
   API CLIENT
   ============================================================ */

const API = {
  async request(endpoint, options = {}) {
    const token = Auth.getToken();
    const url = `${CONFIG.API_BASE}/${endpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    try {
      const res = await fetch(url, { ...options, headers });
      const data = await res.json();
      return data;
    } catch (err) {
      console.error('[API Error]', endpoint, err);
      throw err;
    }
  },

  get(endpoint, params = {}) {
    const qs = Object.keys(params).length
      ? '?' + new URLSearchParams(params).toString()
      : '';
    return this.request(endpoint + qs, { method: 'GET' });
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
};

/* ============================================================
   AUTH
   ============================================================ */

const Auth = {
  // sessionStorage: la sesión se cierra al cerrar la pestaña/navegador
  getToken() {
    return sessionStorage.getItem(CONFIG.TOKEN_KEY);
  },

  getUser() {
    try {
      return JSON.parse(sessionStorage.getItem(CONFIG.USER_KEY)) || null;
    } catch { return null; }
  },

  isLoggedIn() {
    return !!this.getToken();
  },

  isAdmin() {
    const u = this.getUser();
    return u && (u.is_admin == 1 || u.is_admin === true);
  },

  save(token, employee) {
    sessionStorage.setItem(CONFIG.TOKEN_KEY, token);
    sessionStorage.setItem(CONFIG.USER_KEY, JSON.stringify(employee));
  },

  clear() {
    sessionStorage.removeItem(CONFIG.TOKEN_KEY);
    sessionStorage.removeItem(CONFIG.USER_KEY);
  },

  async login(cedula) {
    const data = await API.post('auth.php?action=login', { cedula });
    if (data.success) {
      this.save(data.token, data.employee);
    }
    return data;
  },

  async logout() {
    const user = this.getUser();
    if (user) {
      try {
        await API.post('audit.php?action=log', {
          user_id: user.id,
          action: 'LOGOUT',
          entity_type: 'SESSION',
          description: 'Cierre de sesión manual'
        });
      } catch(e) {}
    }
    this.clear();
    window.location.href = 'index.html';
  },

  guard() {
    if (!this.isLoggedIn()) {
      window.location.href = 'index.html';
      return null;
    }
    return this.getUser();
  }
};

/* ============================================================
   TOAST NOTIFICATIONS
   ============================================================ */

const Toast = {
  container: null,

  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show(message, type = 'info', duration = 3500) {
    this.init();

    const icons = {
      success: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
      error:   `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
      warning: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>`,
      info:    `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `${icons[type] || icons.info} <span>${message}</span>`;
    this.container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  success(msg) { this.show(msg, 'success'); },
  error(msg)   { this.show(msg, 'error'); },
  warning(msg) { this.show(msg, 'warning'); },
  info(msg)    { this.show(msg, 'info'); }
};

/* ============================================================
   MODAL MANAGER
   ============================================================ */

const Modal = {
  open(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  close(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  closeAll() {
    document.querySelectorAll('.modal-overlay.active').forEach(m => {
      m.classList.remove('active');
    });
    document.body.style.overflow = '';
  },

  confirm(title, desc, onConfirm, danger = true) {
    let overlay = document.getElementById('_confirmModal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = '_confirmModal';
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal" style="max-width:400px;">
          <div class="modal-body" style="text-align:center;padding-top:32px;">
            <div class="confirm-icon ${danger ? 'confirm-icon-danger' : ''}" id="_confirmIcon">
              <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div class="confirm-title" id="_confirmTitle"></div>
            <div class="confirm-desc" id="_confirmDesc"></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="_confirmCancel">Cancelar</button>
            <button class="btn" id="_confirmOk">Confirmar</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      document.getElementById('_confirmCancel').addEventListener('click', () => {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
      });
    }

    document.getElementById('_confirmTitle').textContent = title;
    document.getElementById('_confirmDesc').textContent  = desc;

    const okBtn = document.getElementById('_confirmOk');
    okBtn.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
    okBtn.textContent = 'Confirmar';

    const newOk = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOk, okBtn);
    newOk.addEventListener('click', () => {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
      onConfirm();
    });

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
};

/* ============================================================
   SIDEBAR
   ============================================================ */

const Sidebar = {
  init() {
    const sidebar  = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    if (!sidebar) return;

    // Collapse toggle
    const collapseBtn = document.querySelector('.sidebar-collapse-btn');
    if (collapseBtn) {
      const collapsed = localStorage.getItem('sidebarCollapsed') === 'true';
      if (collapsed) {
        sidebar.classList.add('collapsed');
        mainContent && mainContent.classList.add('expanded');
      }

      collapseBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        mainContent && mainContent.classList.toggle('expanded');
        localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
      });
    }

    // Nav active state
    const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      if (item.dataset.page === currentPage) {
        item.classList.add('active');
      }
      item.addEventListener('click', function() {
        const page = this.dataset.page;
        if (page) window.location.href = page;
      });
    });

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        Modal.confirm(
          'Cerrar sesion',
          'Se cerrara tu sesion activa. La sesion se cierra automaticamente al cerrar el navegador.',
          () => Auth.logout(),
          true
        );
      });
    }

    // Profile button
    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn) {
      profileBtn.addEventListener('click', () => {
        window.location.href = 'profile.html';
      });
    }

    // User card
    this.renderUserCard();
  },

  renderUserCard() {
    const user = Auth.getUser();
    if (!user) return;

    const avatarEl = document.getElementById('userAvatar');
    const nameEl   = document.getElementById('userName');
    const roleEl   = document.getElementById('userRole');

    const initials = (user.nombre || 'U').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();

    if (avatarEl) avatarEl.textContent = initials;
    if (nameEl)   nameEl.textContent   = user.nombre;
    if (roleEl)   roleEl.textContent   = user.is_admin ? 'Administrador' : 'Empleado';
  }
};

/* ============================================================
   FORM HELPERS
   ============================================================ */

const Form = {
  getData(formEl) {
    const fd = new FormData(formEl);
    const obj = {};
    fd.forEach((v, k) => { obj[k] = v; });
    return obj;
  },

  setData(formEl, data) {
    Object.entries(data).forEach(([k, v]) => {
      const el = formEl.elements[k];
      if (!el) return;
      if (el.type === 'checkbox') {
        el.checked = !!v;
      } else {
        el.value = v ?? '';
      }
    });
  },

  reset(formEl) {
    formEl.reset();
    formEl.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  },

  validate(formEl, rules = {}) {
    let valid = true;
    formEl.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));

    Object.entries(rules).forEach(([name, rule]) => {
      const el = formEl.elements[name];
      if (!el) return;
      const val = el.value.trim();

      if (rule.required && !val) {
        el.classList.add('is-invalid');
        valid = false;
      } else if (rule.minLength && val.length < rule.minLength) {
        el.classList.add('is-invalid');
        valid = false;
      } else if (rule.pattern && !rule.pattern.test(val)) {
        el.classList.add('is-invalid');
        valid = false;
      }
    });

    return valid;
  }
};

/* ============================================================
   FORMATTERS
   ============================================================ */

const Fmt = {
  money(n) {
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(n || 0);
  },

  date(d) {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  },

  datetime(d) {
    if (!d) return '-';
    return new Date(d).toLocaleString('es-EC', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  },

  initials(name) {
    return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  },

  statusBadge(status) {
    const map = {
      pending_payment: ['Pendiente',    'badge-warning'],
      completed:       ['Completado',   'badge-success'],
      cancelled:       ['Cancelado',    'badge-danger'],
      processing:      ['Procesando',   'badge-info'],
      shipped:         ['Enviado',      'badge-info']
    };
    const [label, cls] = map[status] || ['Desconocido', 'badge-neutral'];
    return `<span class="badge ${cls}">${label}</span>`;
  },

  stockBadge(stock) {
    if (stock === 0) return `<span class="badge badge-danger">Sin stock</span>`;
    if (stock < 5)   return `<span class="badge badge-warning">Bajo (${stock})</span>`;
    return `<span class="badge badge-success">${stock} uds</span>`;
  }
};

/* ============================================================
   PAGINATION
   ============================================================ */

function renderPagination(containerId, current, total, onChange) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';
  if (total <= 1) return;

  const pages = [];
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push('...');
    pages.push(total);
  }

  const prevBtn = document.createElement('button');
  prevBtn.className = 'page-btn';
  prevBtn.disabled = current === 1;
  prevBtn.innerHTML = `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>`;
  prevBtn.addEventListener('click', () => onChange(current - 1));
  container.appendChild(prevBtn);

  pages.forEach(p => {
    const btn = document.createElement('button');
    if (p === '...') {
      btn.className = 'page-btn';
      btn.textContent = '...';
      btn.disabled = true;
    } else {
      btn.className = `page-btn ${p === current ? 'active' : ''}`;
      btn.textContent = p;
      btn.addEventListener('click', () => onChange(p));
    }
    container.appendChild(btn);
  });

  const nextBtn = document.createElement('button');
  nextBtn.className = 'page-btn';
  nextBtn.disabled = current === total;
  nextBtn.innerHTML = `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>`;
  nextBtn.addEventListener('click', () => onChange(current + 1));
  container.appendChild(nextBtn);
}

/* ============================================================
   DEBOUNCE
   ============================================================ */

function debounce(fn, delay = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

/* ============================================================
   ICON HELPER
   ============================================================ */

const Icons = {
  edit: `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash: `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>`,
  plus: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  eye:  `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  toggle_on:  `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="1" y="5" width="22" height="14" rx="7"/><circle cx="16" cy="12" r="3" fill="currentColor" stroke="none"/></svg>`,
  toggle_off: `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="1" y="5" width="22" height="14" rx="7"/><circle cx="8" cy="12" r="3" fill="currentColor" stroke="none"/></svg>`,
  search: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  filter: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`,
  download: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  refresh: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>`
};

/* ============================================================
   INIT ON LOAD
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  // Close modal on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) Modal.closeAll();
    });
  });

  // Close buttons
  document.querySelectorAll('[data-modal-close]').forEach(btn => {
    btn.addEventListener('click', () => Modal.closeAll());
  });

  // Mobile sidebar toggle
  const mobileToggle = document.getElementById('mobileSidebarToggle');
  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
      document.querySelector('.sidebar')?.classList.toggle('mobile-open');
    });
  }

  // Monitor de inactividad (30 minutos = auto logout)
  if (Auth.isLoggedIn()) {
    let inactivityTimer;
    let warningTimer;
    const INACTIVITY_MS = 30 * 60 * 1000; // 30 min
    const WARNING_MS    = 25 * 60 * 1000; // aviso a los 25 min

    function resetTimer() {
      clearTimeout(inactivityTimer);
      clearTimeout(warningTimer);

      warningTimer = setTimeout(() => {
        Toast.warning('Tu sesion se cerrara en 5 minutos por inactividad.', 8000);
      }, WARNING_MS);

      inactivityTimer = setTimeout(() => {
        Toast.error('Sesion cerrada por inactividad.');
        setTimeout(() => Auth.logout(), 1500);
      }, INACTIVITY_MS);
    }

    ['mousemove','keydown','click','scroll','touchstart'].forEach(ev => {
      document.addEventListener(ev, resetTimer, { passive: true });
    });
    resetTimer();
  }
});
