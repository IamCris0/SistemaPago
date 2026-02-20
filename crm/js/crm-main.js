/**
 * MAWEWE CRM - Core App
 * Maneja layout, navegación, toasts, y modales globales
 */

/* ============================================================
   ESTADO GLOBAL
   ============================================================ */
const App = {
  currentUser: null,
  currentModule: null,
  sidebarCollapsed: false,

  /* ---- Init ---- */
  init() {
    if (!this._checkAuth()) {
      window.location.href = 'login.html';
      return;
    }
    this._loadUser();
    this._bindNav();
    this._bindSidebar();
    this._bindHash();

    // Módulo inicial por hash o dashboard
    const hash = location.hash.replace('#', '') || 'dashboard';
    this.navigate(hash);
  },

  /* ---- Auth ---- */
  _checkAuth() {
    const user  = CONFIG.getUser();
    const token = CONFIG.getToken();
    if (!user || !token) return false;
    this.currentUser = user;
    return true;
  },

  _loadUser() {
    const u = this.currentUser;
    const initials = u.nombre
      ? u.nombre.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
      : '??';

    _setText('userName',   u.nombre  || 'Usuario');
    _setText('userRole',   u.cargo   || 'Empleado');
    _setText('userInitials', initials);

    // Ocultar items admin si no es admin
    if (!u.is_admin) {
      document.querySelectorAll('[data-admin-only]').forEach(el => el.remove());
    }
  },

  /* ---- Navegación ---- */
  async navigate(moduleName) {
    if (this.currentModule === moduleName) return;

    // Ocultar todos los módulos
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    // Activar módulo
    const moduleEl = document.getElementById(`module-${moduleName}`);
    if (moduleEl) moduleEl.classList.add('active');

    // Activar nav item
    const navEl = document.querySelector(`.nav-item[data-module="${moduleName}"]`);
    if (navEl) navEl.classList.add('active');

    // Actualizar topbar
    const titles = {
      dashboard:          { title: 'Dashboard',          breadcrumb: 'Inicio' },
      employees:          { title: 'Empleados',          breadcrumb: 'Gestion / Empleados' },
      attendance:         { title: 'Asistencia',         breadcrumb: 'Gestion / Asistencia' },
      products:           { title: 'Productos',          breadcrumb: 'Gestion / Productos' },
      orders:             { title: 'Ordenes',            breadcrumb: 'Gestion / Ordenes' },
      'reports-sales':    { title: 'Ventas',             breadcrumb: 'Reportes / Ventas' },
      'reports-inventory':{ title: 'Inventario',         breadcrumb: 'Reportes / Inventario' },
      'reports-employees':{ title: 'Recursos Humanos',   breadcrumb: 'Reportes / RRHH' },
      audit:              { title: 'Auditoria',          breadcrumb: 'Sistema / Auditoria' },
      settings:           { title: 'Configuracion',      breadcrumb: 'Sistema / Configuracion' }
    };

    const info = titles[moduleName] || { title: 'Sistema', breadcrumb: '' };
    _setText('pageTitle',   info.title);
    _setText('breadcrumb',  info.breadcrumb);
    document.title = `${info.title} — MAWEWE CRM`;

    location.hash = moduleName;
    this.currentModule = moduleName;

    // Cargar datos del módulo
    await this._loadModule(moduleName);

    // Cerrar sidebar en móvil
    if (window.innerWidth < 1024) {
      document.getElementById('sidebar').classList.remove('mobile-open');
    }
  },

  async _loadModule(name) {
    switch (name) {
      case 'dashboard':   await Modules.Dashboard?.load?.();   break;
      case 'employees':   await Modules.Employees?.load?.();   break;
      case 'attendance':  await Modules.Attendance?.load?.();  break;
      case 'products':    await Modules.Products?.load?.();    break;
      case 'orders':      await Modules.Orders?.load?.();      break;
      case 'audit':       await Modules.Audit?.load?.();       break;
      default: break;
    }
  },

  /* ---- Sidebar ---- */
  _bindSidebar() {
    document.getElementById('sidebarToggle')?.addEventListener('click', () => this.toggleSidebar());
  },

  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('mainContent');
    this.sidebarCollapsed = !this.sidebarCollapsed;
    sidebar.classList.toggle('collapsed', this.sidebarCollapsed);
    content.classList.toggle('sidebar-collapsed', this.sidebarCollapsed);
  },

  /* ---- Nav items ---- */
  _bindNav() {
    document.querySelectorAll('.nav-item[data-module]').forEach(item => {
      item.addEventListener('click', e => {
        e.preventDefault();
        this.navigate(item.dataset.module);
      });
    });
  },

  /* ---- Hash routing ---- */
  _bindHash() {
    window.addEventListener('hashchange', () => {
      const h = location.hash.replace('#', '');
      if (h && h !== this.currentModule) this.navigate(h);
    });
  },

  /* ---- Logout ---- */
  logout() {
    if (!confirm('Cerrar sesion?')) return;
    localStorage.clear();
    window.location.href = 'login.html';
  }
};

/* ============================================================
   CONTENEDOR DE MÓDULOS
   ============================================================ */
const Modules = {};

/* ============================================================
   TOAST SYSTEM
   ============================================================ */
const Toast = {
  _icons: {
    success: `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:   `<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    warning: `<svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info:    `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
  },

  show(title, message = '', type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-icon">${this._icons[type]}</div>
      <div class="toast-body">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-message">${message}</div>` : ''}
      </div>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 250);
    }, 4000);
  },

  success(title, msg) { this.show(title, msg, 'success'); },
  error(title, msg)   { this.show(title, msg, 'error'); },
  warning(title, msg) { this.show(title, msg, 'warning'); },
  info(title, msg)    { this.show(title, msg, 'info'); }
};

/* ============================================================
   MODAL SYSTEM
   ============================================================ */
const Modal = {
  open(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('open');
    document.body.style.overflow = 'hidden';
  },

  close(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('open');
    document.body.style.overflow = '';
  },

  confirm({ title, message, onConfirm, dangerLabel = 'Eliminar' }) {
    const bd = document.getElementById('confirmBackdrop');
    const dlg = document.getElementById('confirmDialog');
    if (!bd || !dlg) return;

    _setText('confirmTitle',   title);
    _setText('confirmMessage', message);
    _setText('confirmBtnOk',   dangerLabel);

    bd.classList.add('open');
    document.body.style.overflow = 'hidden';

    const okBtn = document.getElementById('confirmBtnOk');
    const newBtn = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newBtn, okBtn);

    newBtn.addEventListener('click', () => {
      this._closeConfirm();
      onConfirm();
    });
  },

  _closeConfirm() {
    document.getElementById('confirmBackdrop')?.classList.remove('open');
    document.body.style.overflow = '';
  }
};

// Cerrar modales al click en backdrop
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-backdrop')) {
    e.target.classList.remove('open');
    document.body.style.overflow = '';
  }
});

// Cerrar confirm con btn cancelar
document.getElementById('confirmBtnCancel')?.addEventListener('click', () => Modal._closeConfirm());

/* ============================================================
   API HELPER
   ============================================================ */
const API = {
  async get(endpoint, params = {}) {
    const url = new URL(CONFIG.url(endpoint));
    Object.entries(params).forEach(([k, v]) => v !== undefined && url.searchParams.set(k, v));
    const res = await fetch(url, { headers: CONFIG.authHeaders() });
    return res.json();
  },

  async post(endpoint, body) {
    const res = await fetch(CONFIG.url(endpoint), {
      method:  'POST',
      headers: CONFIG.authHeaders(),
      body:    JSON.stringify(body)
    });
    return res.json();
  },

  async put(endpoint, body) {
    const res = await fetch(CONFIG.url(endpoint), {
      method:  'PUT',
      headers: CONFIG.authHeaders(),
      body:    JSON.stringify(body)
    });
    return res.json();
  },

  async delete(endpoint) {
    const res = await fetch(CONFIG.url(endpoint), {
      method:  'DELETE',
      headers: CONFIG.authHeaders()
    });
    return res.json();
  }
};

/* ============================================================
   UTILIDADES DOM
   ============================================================ */
function _setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-EC', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-EC', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatCurrency(n) {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(n || 0);
}

function initials(name) {
  if (!name) return '??';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str ?? '';
  return d.innerHTML;
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => App.init());