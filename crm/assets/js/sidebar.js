/* ============================================================
   Sistema de Seguimiento - Sidebar Component
   ============================================================ */

const SidebarHTML = {
  render(activePage) {
    const user = Auth.getUser();
    const isAdmin = user && (user.is_admin == 1 || user.is_admin === true);

    const nav = [
      {
        section: 'Principal',
        items: [
          { page: 'dashboard.html',   icon: 'home',      label: 'Dashboard' },
          { page: 'orders.html',      icon: 'orders',    label: 'Ordenes' },
          { page: 'products.html',    icon: 'products',  label: 'Productos' },
        ]
      },
      {
        section: 'Gestion',
        items: [
          { page: 'employees.html',   icon: 'employees', label: 'Empleados' },
          { page: 'attendance.html',  icon: 'clock',     label: 'Asistencia' },
          { page: 'reports.html',     icon: 'reports',   label: 'Reportes' },
          { page: 'audit.html',       icon: 'audit',     label: 'Auditoria', adminOnly: true },
        ]
      }
    ];

    const icons = {
      home:      `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
      orders:    `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>`,
      products:  `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/></svg>`,
      employees: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`,
      clock:     `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
      reports:   `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
      audit:     `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    };

    let sectionsHTML = '';
    nav.forEach(section => {
      const itemsHTML = section.items
        .filter(item => !item.adminOnly || isAdmin)
        .map(item => `
          <div class="nav-item ${item.page === activePage ? 'active' : ''}" data-page="${item.page}">
            <span class="nav-icon">${icons[item.icon]}</span>
            <span class="nav-label">${item.label}</span>
          </div>
        `).join('');

      sectionsHTML += `
        <div class="nav-section-title">${section.section}</div>
        ${itemsHTML}
      `;
    });

    const initials = Fmt.initials(user ? user.nombre : 'U');
    const rolLabel = isAdmin ? 'Administrador' : 'Empleado';
    const userName = user ? user.nombre : 'Usuario';
    const isProfilePage = activePage === 'profile.html';

    return `
      <aside class="sidebar" id="mainSidebar">
        <button class="sidebar-collapse-btn" id="sidebarCollapseBtn" title="Colapsar menu">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        <div class="sidebar-logo">
          <div class="sidebar-logo-mark">
            <img src="assets/img/logos.jpeg" alt="Logo" style="width:100%;height:100%;object-fit:contain;" onerror="this.outerHTML='<span style=font-weight:800;font-size:13px;color:#fff>SS</span>'"/>
          </div>
          <div class="sidebar-logo-text">Sistema de <span>Seguimiento</span></div>
        </div>

        <nav class="sidebar-nav">
          ${sectionsHTML}
        </nav>

        <div class="sidebar-footer">
          <div class="user-card ${isProfilePage ? 'active' : ''}" id="profileBtn" title="Ver mi perfil" style="cursor:pointer;">
            <div class="user-avatar" id="userAvatar">${initials}</div>
            <div class="user-info">
              <div class="user-name" id="userName">${userName}</div>
              <div class="user-role" id="userRole">${rolLabel}</div>
            </div>
          </div>
          <div style="padding:8px 16px 0; display:flex; gap:8px;">
            <button id="logoutBtn" title="Cerrar sesion" style="flex:1;padding:8px;background:rgba(239,68,68,0.1);color:#EF4444;border-radius:var(--radius-md);font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;border:none;transition:all 0.15s;">
              <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              <span class="nav-label">Salir</span>
            </button>
          </div>
        </div>
      </aside>
    `;
  }
};
