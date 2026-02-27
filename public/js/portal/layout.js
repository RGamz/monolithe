/**
 * Layout System (js/layout.js)
 * ----------------------------
 * This script is included on every page EXCEPT index.html (login).
 * 
 * It does 3 things:
 * 1. Checks if user is logged in (redirects to login if not)
 * 2. Injects the sidebar + header HTML into the page
 * 3. Handles mobile menu toggle and logout
 * 
 * Usage in any page:
 *   <div id="app">
 *     <div id="sidebar"></div>
 *     <div id="overlay"></div>
 *     <main class="main-area">
 *       <div id="header"></div>
 *       <div class="page-content">
 *         <div class="page-content-inner" id="page-content">
 *           <!-- Page-specific content goes here -->
 *         </div>
 *       </div>
 *     </main>
 *   </div>
 *   <script src="/js/layout.js"></script>
 */

// ---------------------------------------------------------------
// SESSION CHECK
// ---------------------------------------------------------------

/**
 * Get current user from session. Redirects to login if not found.
 */
function getCurrentUser() {
  const raw = sessionStorage.getItem('artisan_user');
  if (!raw) {
    window.location.href = '/pro/portail';
    return null;
  }
  
  const user = JSON.parse(raw);
  
  // If not onboarded and not already on onboarding page, redirect
  if (!user.is_onboarded && !window.location.pathname.includes('onboarding')) {
    window.location.href = '/pro/portail/onboarding';
    return null;
  }
  
  return user;
}

// ---------------------------------------------------------------
// SVG ICONS (inline, no external dependency)
// ---------------------------------------------------------------
const ICONS = {
  dashboard: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>',
  
  fileText: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>',
  
  users: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  
  userCog: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="15" r="3"/><circle cx="9" cy="7" r="4"/><path d="M10 15H6a4 4 0 0 0-4 4v2"/><path d="m21.7 16.4-.9-.3"/><path d="m15.2 13.9-.9-.3"/><path d="m16.6 18.7.3-.9"/><path d="m19.1 12.2.3-.9"/><path d="m19.6 18.7-.4-1"/><path d="m16.8 12.3-.4-1"/><path d="m14.3 16.6 1-.4"/><path d="m20.7 13.8 1-.4"/></svg>',
  
  folder: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>',
  
  logout: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>',
  
  menu: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>',
  
  close: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  
  bell: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',

  inbox: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
};

// ---------------------------------------------------------------
// PAGE TITLE MAP
// ---------------------------------------------------------------
const PAGE_TITLES = {
  'dashboard': 'Tableau de bord',
  'invoices': 'Factures',
  'documents': 'Documents',
  'directory': 'Annuaire des artisans',
  'projects': 'Suivi des projets',
  'admin': 'Gestion des utilisateurs',
  'client-submissions': 'Demandes clients',
  'moderation': 'Modération',
  'artisan-profile': 'Profil Artisan',
};

// ---------------------------------------------------------------
// BUILD SIDEBAR
// ---------------------------------------------------------------

function buildSidebar(user, currentPage) {
  const roleName = user.role === 'ADMIN' ? 'Administrateur' 
                 : user.role === 'ARTISAN' ? 'Artisan' 
                 : 'Client';

  // Build navigation items based on role
  let navItems = '';
  
  // Dashboard - everyone gets it
  navItems += navItem('dashboard', ICONS.dashboard, 'Tableau de bord', currentPage);
  
  // Role-specific items
  if (user.role === 'ARTISAN') {
    navItems += navItem('projects', ICONS.folder, 'Suivi des projets', currentPage);
    navItems += navItem('invoices', ICONS.fileText, 'Factures', currentPage);
    navItems += navItem('documents', ICONS.folder, 'Documents', currentPage);
  }

  if (user.role === 'CLIENT') {
    navItems += navItem('documents', ICONS.fileText, 'Documents du projet', currentPage);
  }
  
  if (user.role === 'ADMIN') {
    navItems += navItemWithBadge('client-submissions', ICONS.inbox, 'Demandes clients', currentPage);
    navItems += navItemWithBadge('moderation', ICONS.inbox, 'Modération', currentPage);
    navItems += navItem('directory', ICONS.users, 'Annuaire des artisans', currentPage);
    navItems += navItem('projects', ICONS.folder, 'Suivi des projets', currentPage);
    navItems += navItem('admin', ICONS.userCog, 'Gestion utilisateurs', currentPage);
  }

  return `
    <div class="sidebar-header">
      <div>
        <h1 class="sidebar-brand">ArtisanPortal</h1>
        <p class="sidebar-tagline">Plateforme de Services Gérés</p>
      </div>
      <button class="sidebar-close" onclick="toggleMobileMenu(false)">
        ${ICONS.close}
      </button>
    </div>

    <nav class="sidebar-nav">
      <p class="sidebar-nav-label">Menu</p>
      ${navItems}
    </nav>

    <div class="sidebar-footer">
      <div class="sidebar-user">
        <div class="sidebar-avatar">${user.name.charAt(0)}</div>
        <div>
          <p class="sidebar-user-name">${user.name}</p>
          <p class="sidebar-user-role">${roleName}</p>
        </div>
      </div>
      <button class="logout-btn" onclick="logout()">
        ${ICONS.logout}
        Déconnexion
      </button>
    </div>
  `;
}

function navItem(page, icon, label, currentPage) {
  const isActive = page === currentPage ? 'active' : '';
  const href = `/pro/portail/${page}`;
  
  return `
    <a href="${href}" class="nav-item ${isActive}">
      ${icon}
      ${label}
    </a>
  `;
}

function navItemWithBadge(page, icon, label, currentPage) {
  const isActive = page === currentPage ? 'active' : '';
  const href = `/pro/portail/${page}`;
  const badgeId = page + '-badge';

  return `
    <a href="${href}" class="nav-item ${isActive}" style="justify-content: space-between;">
      <span style="display: flex; align-items: center; gap: 10px;">${icon}${label}</span>
      <span id="${badgeId}" style="display:none; background: #ef4444; color: white; font-size: 0.7rem; font-weight: 700; padding: 1px 7px; border-radius: 12px; min-width: 20px; text-align: center;"></span>
    </a>
  `;
}

// Load moderation counter for sidebar badge
async function loadModerationBadge() {
  try {
    const res = await fetch('/api/moderation/pending');
    const data = await res.json();
    const total = data.reduce((n, a) => n + a.items.length, 0);
    const badge = document.getElementById('moderation-badge');
    if (badge) {
      badge.textContent = total;
      badge.style.display = total > 0 ? 'inline-block' : 'none';
    }
  } catch {}
}

// Load unread client submissions counter for sidebar badge
async function loadSubmissionsBadge() {
  try {
    const res = await fetch('/api/forms/unread-count');
    const data = await res.json();
    const badge = document.getElementById('client-submissions-badge');
    if (badge) {
      badge.textContent = data.count;
      badge.style.display = data.count > 0 ? 'inline-block' : 'none';
    }
  } catch {}
}

// ---------------------------------------------------------------
// BUILD HEADER
// ---------------------------------------------------------------

function buildHeader(user, currentPage) {
  const title = PAGE_TITLES[currentPage] || 'ArtisanPortal';
  
  let rightContent = '';
  if (user.role === 'ADMIN') {
    rightContent = `
      <button class="notification-btn">
        ${ICONS.bell}
        <span class="notification-dot"></span>
      </button>
    `;
  }

  return `
    <div class="header-left">
      <button class="hamburger" onclick="toggleMobileMenu(true)">
        ${ICONS.menu}
      </button>
      <h2 class="header-title">${title}</h2>
    </div>
    <div class="header-right">
      ${rightContent}
    </div>
  `;
}

// ---------------------------------------------------------------
// MOBILE MENU
// ---------------------------------------------------------------

function toggleMobileMenu(open) {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  
  if (open) {
    sidebar.classList.add('open');
    overlay.classList.add('visible');
  } else {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
  }
}

// ---------------------------------------------------------------
// LOGOUT
// ---------------------------------------------------------------

function logout() {
  sessionStorage.removeItem('artisan_user');
  window.location.href = '/pro/portail';
}

// ---------------------------------------------------------------
// INITIALIZE LAYOUT
// ---------------------------------------------------------------

/**
 * Call this from each page's script to set up the layout.
 * @param {string} pageName - The current page identifier (e.g., 'dashboard')
 * @returns {object|null} The current user, or null if not logged in
 */
function initLayout(pageName) {
  const user = getCurrentUser();
  if (!user) return null;
  
  // Inject sidebar
  const sidebarEl = document.getElementById('sidebar');
  if (sidebarEl) {
    sidebarEl.innerHTML = buildSidebar(user, pageName);
  }
  
  // Inject header
  const headerEl = document.getElementById('header');
  if (headerEl) {
    headerEl.innerHTML = buildHeader(user, pageName);
  }
  
  // Set up overlay click to close mobile menu
  const overlay = document.getElementById('overlay');
  if (overlay) {
    overlay.addEventListener('click', function() {
      toggleMobileMenu(false);
    });
  }

  // Load badges for admin
  if (user.role === 'ADMIN') {
    loadModerationBadge();
    loadSubmissionsBadge();
  }
  
  return user;
}
