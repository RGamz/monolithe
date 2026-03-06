/**
 * Shared Navigation (nav.js)
 * ==========================
 * Injects header (with mobile hamburger) and footer into
 * client and pro-landing pages. Detects which section we're in
 * from the data-section attribute on <body>.
 *
 * Usage: <body data-section="client" data-page="/about-us/">
 *        <div id="site-header"></div>
 *        ... page content ...
 *        <div id="site-footer"></div>
 *        <script src="/js/shared/nav.js"></script>
 */

(function () {
  const section = document.body.dataset.section || 'client'; // 'client' or 'pro'
  const currentPage = document.body.dataset.page || '/';

  const isPro = section === 'pro';

  // ------------------------------------------------------------------
  // NAV LINKS
  // ------------------------------------------------------------------
  const clientLinks = [
    { href: '/', label: 'Accueil' },
    { href: '/about-us/', label: 'À Propos' },
    { href: '/contact-us/', label: 'Contact' },
  ];

  const proLinks = [
    { href: '/pro/', label: 'Accueil' },
    { href: '/pro/about-us/', label: 'À Propos' },
    { href: '/pro/contact-us/', label: 'Contact' },
  ];

  const links = isPro ? proLinks : clientLinks;

  // ------------------------------------------------------------------
  // BUILD HEADER
  // ------------------------------------------------------------------
  function buildNav() {
    const navLinks = links.map(link => {
      const active = currentPage === link.href ? ' nav-link-active' : '';
      return `<a href="${link.href}" class="nav-link${active}">${link.label}</a>`;
    }).join('\n            ');

    // Section toggle buttons
    let toggles = '';
    if (isPro) {
      toggles = `
            <a href="/pro/portail" class="nav-btn nav-btn-primary">Portail Artisan</a>
            <a href="/" class="nav-btn nav-btn-outline">Particuliers</a>`;
    } else {
      toggles = `
            <a href="/pro/" class="nav-btn nav-btn-dark">Espace Pro</a>`;
    }

    const logoHref = isPro ? '/pro/' : '/';
    const badge = isPro ? '<span class="logo-badge">PRO</span>' : '';

    return `
    <div class="topbar">
        <a href="tel:+33744303230" class="topbar-link">
            <svg class="topbar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 13.6 19.79 19.79 0 01.22 5.06 2 2 0 012.2 3h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 10.09a16 16 0 006 6l1.27-.64a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 17.92z"/></svg>
            07 44 30 32 30
        </a>
        <a href="mailto:contact@monolithe.pro" class="topbar-link">
            <svg class="topbar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            contact@monolithe.pro
        </a>
    </div>
    <header class="header${isPro ? ' header-sticky' : ''}">
        <div class="container header-inner">
            <div class="logo">
                <img src="/assets/images/logo.png" alt="Monolithe logo" />
                <div class="logo-text">
                    <a href="${logoHref}">Monolithe</a>
                    <span class="logo-tagline">Entreprise générale du bâtiment</span>
                </div>
                ${badge}
            </div>

            <nav class="nav nav-desktop">
            ${navLinks}
            ${toggles}
            </nav>

            <button class="nav-hamburger" onclick="toggleMobileNav()" aria-label="Menu">
                <span></span><span></span><span></span>
            </button>
        </div>

        <nav class="nav nav-mobile" id="mobile-nav">
            ${navLinks}
            <div class="nav-mobile-toggles">
                ${toggles}
            </div>
        </nav>
    </header>`;
  }

  // ------------------------------------------------------------------
  // BUILD FOOTER
  // ------------------------------------------------------------------
  function buildFooter() {
    const label = isPro ? '© 2026 Monolithe PRO.' : '© 2026 Monolithe.';
    return `
    <footer class="footer">
        <div class="container footer-inner">
            <div class="footer-bottom">
                ${label} Tous droits réservés. | <a href="/mentions-legales/" style="color:inherit;text-decoration:underline;">Mentions légales</a>
            </div>
        </div>
    </footer>`;
  }

  // ------------------------------------------------------------------
  // INJECT
  // ------------------------------------------------------------------
  const headerEl = document.getElementById('site-header');
  if (headerEl) headerEl.outerHTML = buildNav();

  // Footer — supports multiple placeholders (e.g. homepage has two views)
  const footerHTML = buildFooter();
  document.querySelectorAll('[id^="site-footer"]').forEach(el => {
    el.outerHTML = footerHTML;
  });

  // ------------------------------------------------------------------
  // MOBILE TOGGLE
  // ------------------------------------------------------------------
  window.toggleMobileNav = function () {
    const nav = document.getElementById('mobile-nav');
    const hamburger = document.querySelector('.nav-hamburger');
    if (nav) {
      nav.classList.toggle('open');
      hamburger?.classList.toggle('open');
    }
  };
})();
