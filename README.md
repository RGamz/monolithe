# Monolithe — Unified Platform

Site client + Espace Professionnel + Portail Artisan, unifié en une seule application Express.

## Architecture

```
monolithe/
├── server.js                    # Express server — routing for all sections
├── db/
│   ├── helper.js                # sql.js wrapper
│   └── init.js                  # Tables + safe seeding
├── routes/
│   ├── auth.js                  # Login, forgot/reset password
│   ├── projects.js              # Projects CRUD (role-filtered)
│   ├── invoices.js              # Invoice management
│   ├── users.js                 # User/artisan management (admin)
│   ├── alerts.js                # System alerts
│   ├── documents.js             # Artisan document management + uploads
│   └── client-forms.js          # Contact + devis form submissions
├── views/
│   ├── client/                  # Pages grand public
│   │   ├── index.html           # Homepage + devis questionnaire
│   │   ├── about-us.html
│   │   ├── contact-us.html
│   │   ├── tips-and-tricks.html
│   │   └── mentions-legales.html
│   ├── pro-landing/             # Espace Pro (marketing)
│   │   ├── index.html           # /pro
│   │   ├── about-us.html
│   │   └── contact-us.html
│   └── portal/                  # Portail Artisan (app)
│       ├── login.html           # /pro/portail
│       ├── dashboard.html
│       ├── invoices.html
│       ├── directory.html
│       ├── projects.html
│       ├── documents.html
│       ├── onboarding.html
│       ├── admin.html
│       └── artisan-profile.html
├── public/
│   ├── css/
│   │   ├── client.css           # Styles site client (Playfair, light)
│   │   ├── pro-landing.css      # Styles espace pro (dark mode)
│   │   └── portal.css           # Styles portail (dashboard blue)
│   ├── js/
│   │   ├── client/              # devis.js, contact.js, contact-pro.js
│   │   └── portal/              # auth, layout, dashboard, etc.
│   └── assets/images/           # Logo, team photos, backgrounds
└── uploads/documents/           # Artisan document uploads
```

## URLs

| URL | Section |
|---|---|
| `/` | Homepage client + devis |
| `/about-us` | À propos |
| `/contact-us` | Contact client |
| `/tips-and-tricks` | Astuces rénovation |
| `/mentions-legales` | Mentions légales |
| `/pro` | Espace Pro (landing) |
| `/pro/about-us` | À propos (pro) |
| `/pro/contact-us` | Contact pro |
| `/pro/portail` | Login portail |
| `/pro/portail/dashboard` | Tableau de bord |
| `/pro/portail/invoices` | Factures |
| `/pro/portail/directory` | Annuaire artisans |
| `/pro/portail/projects` | Suivi projets |
| `/pro/portail/documents` | Documents |
| `/pro/portail/admin` | Gestion utilisateurs |

## Installation

```bash
npm install
npm run init-db    # Crée la base + données de démo
npm run dev        # Démarre avec --watch
```

## Comptes de démo

Mot de passe : `password123`

| Rôle | Email |
|---|---|
| Admin | admin@company.com |
| Artisan | john@artisan.com |
| Client | contact@alicecorp.com |

## API

| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Connexion |
| POST | `/api/forms/contact` | Soumission contact |
| POST | `/api/forms/devis` | Soumission devis |
| GET | `/api/forms/submissions` | Admin: voir soumissions |
| GET | `/api/projects` | Projets (filtrés par rôle) |
| GET | `/api/invoices` | Factures |
| GET/POST/PUT/DELETE | `/api/users` | Gestion utilisateurs |

## Déploiement sur Render.com

1. Créer un Web Service → connecter le dépôt GitHub
2. Build Command: `npm install && npm run init-db`
3. Start Command: `npm start`
4. Ajouter variable: `PORT=3000`

## Migration depuis les anciens repos

Ce projet remplace :
- `monolithe_renovation` (Netlify) → section client dans `/views/client/`
- `monolithe-pro-V2` (Render) → portail dans `/views/portal/`

Changements majeurs :
- Eleventy supprimé — HTML servi directement par Express
- React/Babel CDN supprimé — questionnaire en vanilla JS
- Netlify Forms remplacé par `/api/forms/*` → SQLite
- Toutes les pages sur un seul domaine avec routing par chemin
