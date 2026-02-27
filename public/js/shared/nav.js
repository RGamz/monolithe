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
    <header class="header${isPro ? ' header-sticky' : ''}">
        <div class="container header-inner">
            <div class="logo">
                <img src="/assets/images/logo.png" alt="Monolithe logo" />
                <a href="${logoHref}">Monolithe</a>
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
