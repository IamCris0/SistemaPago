/* ============================================================
   mobile-nav.js — inicializa el sidebar móvil en todas las páginas
   Incluir después de sidebar.js en todos los HTML
   ============================================================ */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {

    // Esperar a que el layout esté renderizado (por si es dinámico)
    setTimeout(initMobileNav, 50);

    function initMobileNav() {
      const sidebar = document.querySelector('.sidebar');
      if (!sidebar) return;

      // ── Crear overlay si no existe ──────────────────────────
      let overlay = document.getElementById('sidebarOverlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'sidebarOverlay';
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
      }

      // ── Crear botón hamburguesa si no existe en el topbar ───
      const topbarLeft = document.querySelector('.topbar-left');
      let menuBtn = document.getElementById('mobileMenuBtn') ||
                    document.getElementById('mobileSidebarToggle');

      if (topbarLeft && !menuBtn) {
        menuBtn = document.createElement('button');
        menuBtn.id = 'mobileMenuBtn';
        menuBtn.className = 'mobile-menu-btn';
        menuBtn.setAttribute('aria-label', 'Abrir menú');
        menuBtn.innerHTML = `
          <svg width="18" height="18" fill="none" stroke="currentColor"
               stroke-width="2" viewBox="0 0 24 24">
            <line x1="3" y1="6"  x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>`;
        // Insertar al inicio del topbar-left
        topbarLeft.insertBefore(menuBtn, topbarLeft.firstChild);
      }

      // ── Funciones abrir/cerrar ──────────────────────────────
      function openSidebar() {
        sidebar.classList.add('mobile-open');
        overlay.classList.add('visible');
        document.body.style.overflow = 'hidden';
      }

      function closeSidebar() {
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('visible');
        document.body.style.overflow = '';
      }

      // ── Eventos ─────────────────────────────────────────────
      if (menuBtn) {
        menuBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          if (sidebar.classList.contains('mobile-open')) {
            closeSidebar();
          } else {
            openSidebar();
          }
        });
      }

      overlay.addEventListener('click', closeSidebar);

      // Cerrar al hacer clic en un nav-item
      sidebar.querySelectorAll('.nav-item').forEach(function (item) {
        item.addEventListener('click', function () {
          if (window.innerWidth <= 1024) closeSidebar();
        });
      });

      // Cerrar con Escape
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeSidebar();
      });

      // Cerrar si la pantalla se agranda a desktop
      window.addEventListener('resize', function () {
        if (window.innerWidth > 1024) closeSidebar();
      });
    }
  });
})();
