/**
 * Monolithe Unified Server
 * ========================
 * Single Express server that serves:
 * 1. Client site (/, /about-us, /contact-us, etc.)
 * 2. Pro landing page (/pro, /pro/about-us, /pro/contact-us)
 * 3. Portal app (/pro/portail/*)
 * 4. API routes (/api/*)
 */

const express = require('express');
const path = require('path');
require('dotenv').config();

const dbHelper = require('./db/helper');

const app = express();
const PORT = process.env.PORT || 3000;

// ------------------------------------------------------------------
// MIDDLEWARE
// ------------------------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static assets
app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
app.use('/js', express.static(path.join(__dirname, 'public', 'js')));
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));
app.use('/images', express.static(path.join(__dirname, 'public', 'assets', 'images')));
app.use('/templates', express.static(path.join(__dirname, 'public', 'templates')));

// Make db helper accessible to all routes
app.use((req, res, next) => {
  req.db = dbHelper;
  next();
});

// ------------------------------------------------------------------
// API ROUTES
// ------------------------------------------------------------------
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/users', require('./routes/users'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/forms', require('./routes/client-forms'));

// ------------------------------------------------------------------
// Helper: serve HTML with trailing slash support
// ------------------------------------------------------------------
function servePage(dir, file) {
  return (req, res) => {
    res.sendFile(path.join(__dirname, 'views', dir, file));
  };
}
function routeWithSlash(routePath, dir, file) {
  app.get(routePath, servePage(dir, file));
  if (!routePath.endsWith('/')) {
    app.get(routePath + '/', servePage(dir, file));
  }
}

// ------------------------------------------------------------------
// PORTAL ROUTES (/pro/portail/*)
// ------------------------------------------------------------------
routeWithSlash('/pro/portail', 'portal', 'login.html');

const portalPages = [
  'dashboard', 'invoices', 'directory', 'projects',
  'documents', 'onboarding', 'admin', 'artisan-profile',
  'client-submissions'
];
portalPages.forEach(page => {
  routeWithSlash(`/pro/portail/${page}`, 'portal', `${page}.html`);
});

// ------------------------------------------------------------------
// PRO LANDING ROUTES (/pro, /pro/about-us, /pro/contact-us)
// ------------------------------------------------------------------
routeWithSlash('/pro', 'pro-landing', 'index.html');
routeWithSlash('/pro/about-us', 'pro-landing', 'about-us.html');
routeWithSlash('/pro/contact-us', 'pro-landing', 'contact-us.html');

// ------------------------------------------------------------------
// CLIENT ROUTES
// ------------------------------------------------------------------
app.get('/', servePage('client', 'index.html'));
routeWithSlash('/about-us', 'client', 'about-us.html');
routeWithSlash('/contact-us', 'client', 'contact-us.html');
routeWithSlash('/tips-and-tricks', 'client', 'tips-and-tricks.html');
routeWithSlash('/mentions-legales', 'client', 'mentions-legales.html');

// ------------------------------------------------------------------
// 404
// ------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).send(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>404</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet">
<style>body{font-family:'Playfair Display',serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fafafa}
.c{text-align:center}.c h1{font-size:4rem;font-weight:300;margin:0}.c p{color:#666;margin:1rem 0 2rem}.c a{color:#171717}</style>
</head><body><div class="c"><h1>404</h1><p>Page non trouvée</p><a href="/">Retour à l'accueil</a></div></body></html>`);
});

// ------------------------------------------------------------------
// START
// ------------------------------------------------------------------
async function start() {
  const dbPath = path.resolve(process.env.DB_PATH || './db/database.sqlite');
  await dbHelper.initDatabase(dbPath);

  app.listen(PORT, () => {
    console.log(`\n🚀 Monolithe server running at http://localhost:${PORT}`);
    console.log(`   📄 Client:   http://localhost:${PORT}/`);
    console.log(`   💼 Pro:      http://localhost:${PORT}/pro`);
    console.log(`   🔧 Portal:   http://localhost:${PORT}/pro/portail`);
    console.log(`   📡 API:      http://localhost:${PORT}/api/*\n`);
  });
}

start().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

process.on('SIGINT', () => {
  dbHelper.close();
  process.exit(0);
});
