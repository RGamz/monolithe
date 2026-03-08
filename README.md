# Monolithe — Plateforme unifiée

Application Express unique qui regroupe trois sections distinctes sur un seul serveur et un seul domaine.

| Section | URL | Audience |
|---|---|---|
| Site client | `/` | Grand public — devis rénovation |
| Espace Pro (landing) | `/pro` | Artisans — marketing / recrutement |
| Portail Artisan | `/pro/portail` | Artisans + Admin — gestion opérationnelle |

---

## Table des matières

1. [Architecture générale](#1-architecture-générale)
2. [Installation et démarrage](#2-installation-et-démarrage)
3. [Variables d'environnement](#3-variables-denvironnement)
4. [Section client](#4-section-client-)
5. [Espace Pro](#5-espace-pro-pro)
6. [Portail Artisan](#6-portail-artisan-proportail)
7. [API — référence complète](#7-api--référence-complète)
8. [Base de données](#8-base-de-données)
9. [Fichiers et stockage S3](#9-fichiers-et-stockage-s3)
10. [Authentification](#10-authentification)
11. [Email SMTP OVH](#11-email-smtp-ovh)
12. [Navigation partagée](#12-navigation-partagée-navjs)
13. [SEO](#13-seo)
14. [Déploiement VPS OVH](#14-déploiement-vps-ovh)
15. [Comptes de démo](#15-comptes-de-démo)
16. [Structure des fichiers](#16-structure-des-fichiers)

---

## 1. Architecture générale

```
Requête HTTP
     │
     ▼
server.js (Express)
     │
     ├── Middleware
     │   ├── express.json / urlencoded
     │   ├── cookie-parser          ← sessions
     │   └── express.static         ← css / js / assets / robots.txt / sitemap.xml
     │
     ├── /api/auth/*                ← public (login, forgot, reset)
     ├── /api/forms/*               ← public (contact, devis)
     ├── /api/*       [requireAuth] ← toutes les autres routes API
     │   ├── /api/alerts     [requireAdmin]
     │   └── /api/moderation [requireAdmin]
     │
     └── Pages HTML (servi statiquement par Express)
         ├── /                      → views/client/index.html
         ├── /pro                   → views/pro-landing/index.html
         └── /pro/portail/*         → views/portal/*.html
```

**Principe clé :** le serveur ne fait que du rendu côté client. Chaque page HTML charge ses propres scripts JS (dans `public/js/`) qui appellent l'API pour récupérer et afficher les données. Il n'y a pas de moteur de template (pas d'EJS, pas de Handlebars).

---

## 2. Installation et démarrage

```bash
# 1. Installer les dépendances
npm install

# 2. Créer le fichier .env (voir section 3)
cp .env.example .env

# 3. Initialiser la base de données (crée les tables + données de démo)
npm run init-db

# 4. Démarrer en développement (rechargement automatique)
npm run dev

# 5. Démarrer en production
npm start
```

L'application tourne sur `http://localhost:3000` par défaut.

---

## 3. Variables d'environnement

Créer un fichier `.env` à la racine :

```env
# Serveur
PORT=3000
NODE_ENV=production

# Base de données
DB_PATH=./db/database.sqlite

# Auth
SESSION_SECRET=un-secret-long-et-aleatoire-a-changer-en-production

# Email — compte noreply (réinitialisation de mot de passe, modération)
NOREPLY_EMAIL=noreply@monolithe.pro
NOREPLY_PASS=mot-de-passe-ovh

# Email — compte contact (notifications de formulaires client)
SMTP_USER=contact@monolithe.pro
SMTP_PASS=mot-de-passe-ovh
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=465

# Stockage OVH Object Storage (S3-compatible)
S3_ENDPOINT=s3.gra.io.cloud.ovh.net
S3_REGION=gra
S3_ACCESS_KEY=clé-accès-ovh
S3_SECRET_KEY=clé-secrète-ovh
S3_BUCKET=nom-du-bucket
S3_PUBLIC_URL=https://storage.gra.cloud.ovh.net/v1/AUTH_xxx/nom-du-bucket
```

> **Important :** `SESSION_SECRET` doit être changé en production. Sans lui, les sessions utilisent un secret par défaut non sécurisé.

---

## 4. Section client (`/`)

### Objectif
Permettre aux particuliers de décrire leur projet de rénovation et recevoir une estimation de prix.

### Pages

| URL | Fichier | Description |
|---|---|---|
| `/` | `views/client/index.html` | Homepage + questionnaire devis |
| `/about-us` | `views/client/about-us.html` | Présentation de l'entreprise |
| `/contact-us` | `views/client/contact-us.html` | Formulaire de contact |
| `/mentions-legales` | `views/client/mentions-legales.html` | Mentions légales |

### Questionnaire devis (`public/js/client/devis.js`)

Le questionnaire est un formulaire multi-étapes en vanilla JS :

1. L'utilisateur répond à une série de questions (type de logement, surface, type de travaux, etc.)
2. À chaque étape, `devis.js` met à jour l'état local et affiche la question suivante
3. À la dernière étape, une estimation est calculée côté client (algorithme de prix dans `devis.js`)
4. Le résultat et les coordonnées de l'utilisateur sont envoyés à `POST /api/forms/devis`
5. Un email de notification est envoyé à l'équipe via `contact@monolithe.pro`

### Design
- Police : **Playfair Display** (Google Fonts)
- Thème : clair, fond blanc/beige, noir `#171717`
- Feuille de style principale : `public/css/client.css`

---

## 5. Espace Pro (`/pro`)

### Objectif
Pages de marketing destinées aux artisans pour les inciter à rejoindre le réseau Monolithe.

### Pages

| URL | Fichier | Description |
|---|---|---|
| `/pro` | `views/pro-landing/index.html` | Landing page artisans |
| `/pro/about-us` | `views/pro-landing/about-us.html` | À propos (version pro) |
| `/pro/contact-us` | `views/pro-landing/contact-us.html` | Contact professionnel |

### Design
- Thème **sombre** : fond `#0a0a0a`, texte blanc, accents bleu `#3b82f6`
- Feuille de style : `public/css/pro-landing.css`
- Navigation sticky en haut de page

---

## 6. Portail Artisan (`/pro/portail`)

### Objectif
Application de gestion interne pour les artisans et les administrateurs.

### Accès
- Entrée : `/pro/portail` → page de login
- Session requise pour toutes les pages du portail
- Les pages admin nécessitent le rôle `ADMIN`

### Pages du portail

| URL | Fichier | Rôle | Description |
|---|---|---|---|
| `/pro/portail` | `login.html` | Tous | Page de connexion |
| `/pro/portail/dashboard` | `dashboard.html` | Tous | Tableau de bord |
| `/pro/portail/onboarding` | `onboarding.html` | ARTISAN | Profil initial + documents |
| `/pro/portail/projects` | `projects.html` | Tous | Suivi des chantiers |
| `/pro/portail/invoices` | `invoices.html` | ARTISAN | Gestion des factures |
| `/pro/portail/documents` | `documents.html` | ARTISAN | Documents de conformité |
| `/pro/portail/artisan-profile` | `artisan-profile.html` | ARTISAN | Modifier son profil |
| `/pro/portail/directory` | `directory.html` | ADMIN | Annuaire des artisans |
| `/pro/portail/admin` | `admin.html` | ADMIN | Gestion des utilisateurs |
| `/pro/portail/moderation` | `moderation.html` | ADMIN | Modération documents/factures/photos |
| `/pro/portail/client-submissions` | `client-submissions.html` | ADMIN | Soumissions formulaires clients |
| `/pro/portail/reset-password` | `reset-password.html` | Tous | Réinitialisation mot de passe |

### Rôles utilisateurs

| Rôle | Capacités |
|---|---|
| `ADMIN` | Accès total — gestion utilisateurs, modération, soumissions clients, alertes |
| `ARTISAN` | Ses propres projets, factures, documents, photos |
| `CLIENT` | Lecture seule de ses projets |

---

## 7. API — référence complète

### Auth (public)

| Méthode | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Connexion → set cookie `monolithe_session` |
| `POST` | `/api/auth/logout` | Déconnexion → clear cookie |
| `POST` | `/api/auth/forgot` | Envoie un email de réinitialisation |
| `POST` | `/api/auth/reset-password` | Valide le token, met à jour le mot de passe |

### Formulaires client (public)

| Méthode | Endpoint | Description |
|---|---|---|
| `POST` | `/api/forms/contact` | Formulaire de contact (client ou pro) |
| `POST` | `/api/forms/devis` | Soumission du questionnaire devis |
| `GET` | `/api/forms/submissions` | Admin : liste toutes les soumissions |
| `GET` | `/api/forms/unread-count` | Nombre de soumissions non lues |
| `POST` | `/api/forms/submissions/:type/:id/read` | Marquer comme lu |
| `DELETE` | `/api/forms/submissions/:type/:id` | Supprimer une soumission |

### Projets (session requise)

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/projects?userId=&role=` | Projets filtrés par rôle |
| `POST` | `/api/projects` | Créer un projet |
| `PUT` | `/api/projects/:id` | Modifier un projet |
| `DELETE` | `/api/projects/:id` | Supprimer un projet |

### Factures (session requise)

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/invoices?artisanId=` | Factures d'un artisan |
| `POST` | `/api/invoices` | Créer une facture (multipart/form-data) |
| `DELETE` | `/api/invoices/:id` | Supprimer (statut "En attente" uniquement) |

### Utilisateurs (session requise)

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/users` | Tous les utilisateurs (Admin) |
| `GET` | `/api/users/artisans` | Artisans uniquement |
| `GET` | `/api/users/clients` | Clients uniquement |
| `POST` | `/api/users` | Créer un utilisateur (Admin) |
| `PUT` | `/api/users/:id` | Modifier un utilisateur (Admin) |
| `DELETE` | `/api/users/:id` | Supprimer un utilisateur (Admin) |
| `POST` | `/api/users/profile` | Mettre à jour son propre profil (onboarding) |

### Documents artisan (session requise)

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/documents/download/:filename` | Redirection vers l'URL S3 |
| `GET` | `/api/documents/templates/:type` | Télécharger un modèle PDF |
| `GET` | `/api/documents/:artisanId` | Documents d'un artisan |
| `POST` | `/api/documents` | Uploader/mettre à jour un document |
| `POST` | `/api/documents/not-concerned` | Marquer "non concerné" |
| `DELETE` | `/api/documents/:id` | Supprimer un document |

### Photos (session requise)

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/photos/:projectId` | Photos d'un chantier |
| `POST` | `/api/photos/:projectId` | Uploader des photos (multiple) |
| `DELETE` | `/api/photos/:photoId` | Supprimer une photo |

**Règles photos :**
- Max 10 photos "before" + 10 photos "after" par chantier
- ADMIN : upload/suppression sans restriction
- ARTISAN : upload si affecté au chantier ; suppression uniquement dans les 24h

### Alertes (Admin uniquement)

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/alerts` | Toutes les alertes (plus récentes en premier) |

### Modération (Admin uniquement)

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/moderation/pending` | Éléments en attente groupés par artisan |
| `POST` | `/api/moderation/review` | Soumettre des décisions + envoyer email récap |
| `PUT` | `/api/moderation/item` | Modifier un champ (montant, date, expiry) |

---

## 8. Base de données

**Moteur :** SQLite via `better-sqlite3` (synchrone, pas de callback).  
**Fichier :** `db/database.sqlite` (chemin configurable via `DB_PATH`)

### Tables

| Table | Description |
|---|---|
| `users` | Tous les utilisateurs (ADMIN / ARTISAN / CLIENT) |
| `projects` | Chantiers, liés à un client |
| `project_artisans` | Table de jointure projet ↔ artisan (N:N) |
| `invoices` | Factures par artisan et par projet |
| `artisan_documents` | Documents de conformité (KBIS, assurance, URSSAF…) |
| `project_photos` | Photos avant/après par chantier |
| `alerts` | Alertes système pour l'admin |
| `contact_submissions` | Soumissions formulaire contact |
| `devis_submissions` | Soumissions questionnaire devis |
| `password_reset_tokens` | Tokens de réinitialisation (TTL 30 min) |

### Scripts utilitaires

```bash
npm run init-db                  # Crée tables + seed démo (safe en prod)
npm run migrate-moderation       # Migration : ajout colonnes modération
npm run migrate-phone            # Migration : ajout colonne phone
npm run migrate-submissions-read # Migration : ajout colonne read_at
npm run import-artisans          # Import d'une liste d'artisans depuis CSV/JSON
npm run geocode-missing          # Géocode les artisans sans lat/lng
```

> `init-db` est **safe en production** : il ne supprime jamais de données existantes. Il crée les tables si elles n'existent pas et seed uniquement si la table `users` est vide.

---

## 9. Fichiers et stockage S3

Les fichiers uploadés (factures, documents, photos) sont stockés sur **OVH Object Storage** (API S3-compatible).

### Flux d'upload

```
Client (navigateur)
     │  multipart/form-data
     ▼
Express route (ex. POST /api/invoices)
     │  multer → memoryStorage (le fichier ne touche jamais le disque)
     ▼
lib/storage.js → S3Client (OVH)
     │  PutObjectCommand, ACL: public-read
     ▼
OVH Object Storage
     │  retourne { key, url }
     ▼
URL publique stockée en base (ex. invoices.file_url)
```

### Fallback local
Pour les environnements sans S3 (développement), les photos peuvent être servies depuis `uploads/photos/` via `/uploads/photos/*`.

### Types acceptés

| Upload | Formats | Limite |
|---|---|---|
| `documentUpload` (factures, documents) | PDF, JPG, PNG | 10 MB |
| `photoUpload` (photos chantier) | JPG, PNG | 10 MB |

---

## 10. Authentification

**Mécanisme :** cookie HttpOnly signé avec HMAC-SHA256.

### Format du token
```
base64url(JSON({ userId, role, exp })) + "." + HMAC-SHA256(data, SESSION_SECRET)
```

### Durée de vie
7 jours. Le token est renouvelé à chaque login.

### Middleware

```javascript
requireAuth    // Vérifie le cookie, attache req.session = { userId, role }
requireAdmin   // Vérifie que req.session.role === 'ADMIN' (après requireAuth)
```

### Routes publiques (pas de cookie requis)
- `POST /api/auth/login`, `/api/auth/logout`, `/api/auth/forgot`, `/api/auth/reset-password`
- `POST /api/forms/contact`, `/api/forms/devis`
- Toutes les pages HTML

---

## 11. Email SMTP OVH

Deux comptes email distincts, deux transporteurs Nodemailer dans `lib/mailer.js` :

| Transporteur | Compte | Utilisé par |
|---|---|---|
| `noreplyTransporter` | `noreply@monolithe.pro` | Réinitialisation de mot de passe, résultats de modération |
| `contactTransporter` | `contact@monolithe.pro` | Notifications de formulaires (contact, devis) |

Serveur SMTP : `ssl0.ovh.net:465` (SSL)

---

## 12. Navigation partagée (nav.js)

`public/js/shared/nav.js` génère dynamiquement le header et le footer sur toutes les pages client et pro-landing. Il n'est **pas** utilisé sur le portail (qui a sa propre navigation dans `layout.js`).

### Utilisation dans les pages HTML

```html
<body data-section="client" data-page="/about-us/">
    <div id="site-header"></div>
    ...
    <div id="site-footer"></div>
    <script src="/js/shared/nav.js"></script>
```

`nav.js` lit `data-section` pour adapter le style et les liens, et `data-page` pour surligner le lien actif.

### Topbar de contact

La barre de contact au-dessus du header s'adapte selon la section :

| Section | Classe CSS | Apparence |
|---|---|---|
| Client | `topbar-minimal` | Fond gris clair `#f9f9f9`, texte `#666` |
| Pro | `topbar-pro` | Fond noir `#0a0a0a`, texte `#a3a3a3`, hover blanc |

Les styles sont dans `public/css/nav-shared.css`.

---

## 13. SEO

Chaque page HTML contient :
- `<title>` optimisé avec mots-clés locaux (Toulouse, rénovation, bâtiment)
- `<meta name="description">` unique par page
- `<meta name="robots">` — `noindex` sur `/mentions-legales` uniquement
- `<link rel="canonical">` — évite le contenu dupliqué lié au trailing slash
- Open Graph (`og:title`, `og:description`, `og:url`, `og:locale`)
- Balises géo (`geo.region: FR-31`, `geo.placename: Toulouse`)

La homepage contient un bloc **JSON-LD Schema.org** (`GeneralContractor`) avec téléphone, email, adresse et horaires — permet à Google d'afficher les informations directement dans les résultats de recherche.

`public/robots.txt` et `public/sitemap.xml` sont servis automatiquement depuis `public/` par Express.

Après déploiement, soumettre `https://monolithe.pro/sitemap.xml` dans [Google Search Console](https://search.google.com/search-console).

---

## 14. Déploiement VPS OVH

### Stack serveur
- Ubuntu 24, VPS OVH
- Node.js + PM2
- Nginx (reverse proxy → `localhost:3000`)
- SSL Certbot (Let's Encrypt)

### Procédure de mise à jour

```bash
cd /var/www/monolithe

# Si conflit sur package-lock.json
git stash

git pull

# Appliquer le stash si utilisé
git stash drop

# Si package.json a changé
npm install

pm2 restart monolithe
```

### Vérification

```bash
pm2 status
pm2 logs monolithe
```

---

## 15. Comptes de démo

Mot de passe commun : **`password123`**

| Rôle | Email | Particularités |
|---|---|---|
| Admin | `admin@company.com` | Accès total |
| Artisan (non onboardé) | `john@artisan.com` | Documents manquants |
| Artisan (conforme) | `mike@sparky.com` | Profil complet |
| Artisan (conforme) | `pierre@woodworks.com` | Profil complet |
| Artisan (expiré) | `marie@couleurs.com` | Assurance expirée |
| Client | `contact@alicecorp.com` | 3 projets liés |

---

## 16. Structure des fichiers

```
monolithe/
├── server.js                          # Serveur Express — toutes les routes
│
├── db/
│   ├── helper.js                      # Wrapper better-sqlite3 (getAll, getOne, run)
│   └── init.js                        # Création tables + seed démo
│
├── lib/
│   ├── auth.js                        # Session cookie HMAC (issueToken, requireAuth)
│   ├── mailer.js                      # Deux transporteurs Nodemailer OVH
│   ├── storage.js                     # Upload/delete S3 (OVH Object Storage)
│   └── upload.js                      # Multer : documentUpload + photoUpload
│
├── routes/
│   ├── auth.js                        # Login, logout, forgot, reset-password
│   ├── client-forms.js                # Formulaires contact + devis
│   ├── projects.js                    # CRUD projets
│   ├── invoices.js                    # CRUD factures + upload S3
│   ├── documents.js                   # Documents conformité + upload S3
│   ├── photos.js                      # Photos chantier + upload S3
│   ├── users.js                       # Gestion utilisateurs (Admin)
│   ├── alerts.js                      # Alertes système (Admin)
│   └── moderation.js                  # Modération docs/factures/photos (Admin)
│
├── views/
│   ├── client/                        # Pages site grand public
│   │   ├── index.html                 # Homepage + questionnaire devis
│   │   ├── about-us.html
│   │   ├── contact-us.html
│   │   └── mentions-legales.html
│   ├── pro-landing/                   # Pages espace pro (marketing)
│   │   ├── index.html
│   │   ├── about-us.html
│   │   └── contact-us.html
│   └── portal/                        # Portail artisan (application)
│       ├── login.html
│       ├── dashboard.html
│       ├── onboarding.html
│       ├── projects.html
│       ├── invoices.html
│       ├── documents.html
│       ├── artisan-profile.html
│       ├── directory.html
│       ├── admin.html
│       ├── moderation.html
│       ├── client-submissions.html
│       └── reset-password.html
│
├── public/
│   ├── css/
│   │   ├── client.css                 # Thème clair (Playfair Display)
│   │   ├── pro-landing.css            # Thème sombre
│   │   ├── nav-shared.css             # Header/topbar/footer partagés
│   │   └── portal.css                 # Styles portail
│   ├── js/
│   │   ├── shared/nav.js              # Génère header + footer dynamiquement
│   │   ├── client/
│   │   │   ├── devis.js               # Questionnaire multi-étapes + estimation
│   │   │   ├── contact.js             # Formulaire contact client
│   │   │   └── contact-pro.js         # Formulaire contact pro
│   │   └── portal/
│   │       ├── auth.js                # Vérification session + logout
│   │       ├── layout.js              # Sidebar + navigation portail
│   │       ├── dashboard.js
│   │       ├── onboarding.js
│   │       ├── projects.js
│   │       ├── invoices.js
│   │       ├── documents.js
│   │       ├── artisan-profile.js
│   │       ├── directory.js
│   │       ├── admin.js
│   │       ├── moderation.js
│   │       └── client-submissions.js
│   ├── assets/images/                 # Logo, photos équipe, backgrounds
│   ├── templates/                     # Modèles PDF téléchargeables
│   ├── robots.txt
│   └── sitemap.xml
│
└── uploads/
    └── photos/                        # Fallback local (hors S3)
```
