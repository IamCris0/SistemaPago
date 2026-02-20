/**
 * MAWEWE CRM - Configuración Global
 */
const CONFIG = {
  API_URL: 'https://mawewe.com.ec/api',
  VERSION: '4.1.0',
  APP_NAME: 'MAWEWE CRM',

  STORAGE: {
    USER:        'mw_user',
    TOKEN:       'mw_token',
    PERMISSIONS: 'mw_permissions'
  },

  ENDPOINTS: {
    AUTH: {
      LOGIN:  '/auth.php?action=login',
      VERIFY: '/auth.php?action=verify'
    },
    EMPLOYEES: {
      LIST:          '/employees.php?action=list',
      GET:           '/employees.php?action=get',
      CREATE:        '/employees.php?action=create',
      UPDATE:        '/employees.php?action=update',
      DELETE:        '/employees.php?action=delete',
      TOGGLE_STATUS: '/employees.php?action=toggle-status'
    },
    PRODUCTS: {
      LIST:         '/products_crud.php?action=list',
      GET:          '/products_crud.php?action=get',
      CREATE:       '/products_crud.php?action=create',
      UPDATE:       '/products_crud.php?action=update',
      DELETE:       '/products_crud.php?action=delete',
      TOGGLE:       '/products_crud.php?action=toggle-status',
      UPDATE_STOCK: '/products_crud.php?action=update-stock'
    },
    ORDERS: {
      LIST:   '/orders.php',
      UPDATE: '/orders.php'
    },
    ATTENDANCE: {
      TODAY:     '/attendance.php?action=today',
      HISTORY:   '/attendance.php?action=history',
      CHECK_IN:  '/attendance.php?action=check-in',
      CHECK_OUT: '/attendance.php?action=check-out',
      STATS:     '/attendance.php?action=stats'
    },
    REPORTS: {
      DASHBOARD: '/reports.php?action=dashboard',
      SALES:     '/reports.php?action=sales',
      PRODUCTS:  '/reports.php?action=products',
      EMPLOYEES: '/reports.php?action=employees'
    },
    AUDIT: {
      LIST:           '/audit.php?action=list',
      LOG:            '/audit.php?action=log',
      ENTITY_HISTORY: '/audit.php?action=entity-history'
    }
  },

  getToken() {
    return localStorage.getItem(this.STORAGE.TOKEN);
  },

  getUser() {
    const d = localStorage.getItem(this.STORAGE.USER);
    try { return d ? JSON.parse(d) : null; } catch { return null; }
  },

  isAuthenticated() {
    return !!(this.getToken() && this.getUser());
  },

  authHeaders() {
    return {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${this.getToken()}`
    };
  },

  url(endpoint) {
    return this.API_URL + endpoint;
  }
};