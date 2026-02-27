/**
 * Database Initialization Script (db/init.js)
 * --------------------------------------------
 * SAFE TO RUN ON EVERY DEPLOY.
 *
 * - Creates tables only if they don't exist (IF NOT EXISTS)
 * - Seeds demo data only if the users table is empty
 * - Will never delete existing data
 *
 * Run with: npm run init-db
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dbPath = path.resolve(__dirname, '..', process.env.DB_PATH || './db/database.sqlite');

async function initialize() {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const isNew = !fs.existsSync(dbPath);
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  console.log(isNew ? '🆕 No database found, creating new one...' : '📂 Existing database found, checking tables...');

  // ------------------------------------------------------------------
  // CREATE TABLES
  // ------------------------------------------------------------------
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('ADMIN', 'ARTISAN', 'CLIENT')),
      is_onboarded INTEGER NOT NULL DEFAULT 0,
      company_name TEXT,
      specialty TEXT,
      address TEXT,
      phone TEXT,
      lat REAL,
      lng REAL,
      documents_status TEXT CHECK(documents_status IN ('compliant', 'missing', 'expired'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      client_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'En attente'
        CHECK(status IN ('En cours', 'Terminé', 'En attente', 'Annulé')),
      start_date TEXT,
      description TEXT,
      end_of_work_signed INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (client_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS project_artisans (
      project_id TEXT NOT NULL,
      artisan_id TEXT NOT NULL,
      PRIMARY KEY (project_id, artisan_id),
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (artisan_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      artisan_id TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      date TEXT,
      status TEXT NOT NULL DEFAULT 'En attente'
        CHECK(status IN ('En attente', 'Payé', 'Rejeté')),
      file_name TEXT DEFAULT 'facture.pdf',
      file_url TEXT,
      file_key TEXT,
      moderation_status TEXT NOT NULL DEFAULT 'en_attente',
      moderation_note TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (artisan_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info' CHECK(type IN ('info', 'warning', 'error')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS artisan_documents (
      id TEXT PRIMARY KEY,
      artisan_id TEXT NOT NULL,
      document_type TEXT NOT NULL CHECK(document_type IN (
        'kbis',
        'assurance_decennale',
        'attestation_vigilance_urssaf',
        'liste_salaries_etrangers',
        'declaration_honneur'
      )),
      file_name TEXT,
      file_url TEXT,
      file_key TEXT,
      upload_date TEXT NOT NULL DEFAULT (datetime('now')),
      expiry_date TEXT,
      is_not_concerned INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'valid' CHECK(status IN ('valid', 'expired', 'missing')),
      moderation_status TEXT NOT NULL DEFAULT 'en_attente',
      moderation_note TEXT,
      FOREIGN KEY (artisan_id) REFERENCES users(id),
      UNIQUE(artisan_id, document_type)
    );

    CREATE TABLE IF NOT EXISTS project_photos (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      uploaded_by TEXT NOT NULL,
      photo_type TEXT NOT NULL CHECK(photo_type IN ('before', 'after')),
      file_name TEXT NOT NULL,
      file_url TEXT,
      file_key TEXT,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
      moderation_status TEXT NOT NULL DEFAULT 'en_attente',
      moderation_note TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (uploaded_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS contact_submissions (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL DEFAULT 'client' CHECK(source IN ('client', 'pro')),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      subject TEXT,
      company TEXT,
      request_type TEXT,
      message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      read_at TEXT
    );
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      project_description TEXT,
      project_category TEXT,
      property_type TEXT,
      property_age TEXT,
      renovation_type TEXT,
      area TEXT,
      current_condition TEXT,
      desired_finish TEXT,
      timeline TEXT,
      zip_code TEXT,
      estimate_low INTEGER,
      estimate_high INTEGER,
      estimate_average INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      read_at TEXT
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  console.log('✅ Tables verified.\n');

  // ------------------------------------------------------------------
  // SEED IF EMPTY
  // ------------------------------------------------------------------
  const { count } = db.prepare('SELECT COUNT(*) as count FROM users').get();

  if (count > 0) {
    console.log(`📊 Database already has ${count} users — skipping seed.`);
    console.log('   To force a fresh seed, delete db/database.sqlite and run again.');
  } else {
    console.log('🌱 Empty database detected — seeding demo data...\n');
    await seedData(db);
  }

  db.close();
  console.log(`\n💾 Database saved to: ${dbPath}`);
  console.log('🎉 Done!');
}

async function seedData(db) {
  const hashedPassword = await bcrypt.hash('password123', 10);

  const insertUser = db.prepare(
    `INSERT INTO users (id, name, email, password, role, is_onboarded, company_name, specialty, address, lat, lng, documents_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const users = [
    ['u1', 'Sarah Jenkins',      'admin@company.com',     hashedPassword, 'ADMIN',   1, null,            null,           null,                                          null,    null,   null],
    ['u2', 'Jean le Plombier',   'john@artisan.com',      hashedPassword, 'ARTISAN', 0, 'JP Services',   'Plomberie',    '12 Rue de Metz, 31000 Toulouse',              43.6000, 1.4430, 'missing'],
    ['u3', 'Alice Corporation',  'contact@alicecorp.com', hashedPassword, 'CLIENT',  1, 'Alice Corp HQ', null,           null,                                          null,    null,   null],
    ['u4', 'Mike Électricité',   'mike@sparky.com',       hashedPassword, 'ARTISAN', 1, 'Sparky Bros',   'Électricité',  '45 Avenue de Grande Bretagne, 31300 Toulouse', 43.6060, 1.4100, 'compliant'],
    ['u5', 'Pierre Menuiserie',  'pierre@woodworks.com',  hashedPassword, 'ARTISAN', 1, 'Au Cœur du Bois','Menuiserie', '8 Chemin de la Chasse, 31770 Colomiers',       43.6112, 1.3413, 'compliant'],
    ['u6', 'Marie Peinture',     'marie@couleurs.com',    hashedPassword, 'ARTISAN', 1, 'Déco 31',       'Peinture',     '22 Avenue des Mimosas, 31130 Balma',           43.6110, 1.4994, 'expired'],
  ];

  for (const u of users) insertUser.run(u);
  console.log(`  ✅ ${users.length} users seeded.`);

  const insertProject = db.prepare(
    `INSERT INTO projects (id, title, client_id, status, start_date, description, end_of_work_signed)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const projects = [
    ['p1', 'Rénovation Salles de Bain HQ',  'u3', 'En cours', '2023-10-15', 'Rénovation complète des salles de bain du 3ème étage.', 0],
    ['p2', 'Mise à jour Éclairage Hall',     'u3', 'Terminé',  '2023-09-01', 'Installation de luminaires LED dans le hall principal.', 1],
    ['p3', 'Aménagement Open Space',         'u3', 'En cours', '2023-11-02', 'Création de cloisons bois et peinture.', 0],
  ];
  for (const p of projects) insertProject.run(p);
  console.log(`  ✅ ${projects.length} projects seeded.`);

  const insertLink = db.prepare(`INSERT INTO project_artisans (project_id, artisan_id) VALUES (?, ?)`);
  for (const l of [['p1','u2'],['p2','u4'],['p3','u5'],['p3','u6']]) insertLink.run(l);
  console.log('  ✅ 4 project-artisan links seeded.');

  const insertInvoice = db.prepare(
    `INSERT INTO invoices (id, project_id, artisan_id, amount, date, status, file_name)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const invoices = [
    ['inv1', 'p2', 'u4', 1500.00, '2023-09-15', 'Payé',       'facture-1001.pdf'],
    ['inv2', 'p1', 'u2', 3200.00, '2023-10-20', 'En attente', 'facture-1002.pdf'],
    ['inv3', 'p3', 'u5', 2800.00, '2023-11-10', 'En attente', 'facture-1003.pdf'],
  ];
  for (const i of invoices) insertInvoice.run(i);
  console.log(`  ✅ ${invoices.length} invoices seeded.`);

  const insertAlert = db.prepare(`INSERT INTO alerts (id, message, type, created_at) VALUES (?, ?, ?, ?)`);
  const alerts = [
    ['a1', 'Jean le Plombier a des documents de conformité manquants.',  'warning', '2023-10-20'],
    ['a2', "Marie Peinture : attestation d'assurance expirée.",           'warning', '2023-11-01'],
    ['a3', 'Nouveau projet "Aménagement Open Space" créé.',               'info',    '2023-11-02'],
  ];
  for (const a of alerts) insertAlert.run(a);
  console.log(`  ✅ ${alerts.length} alerts seeded.`);
}

initialize().catch(err => {
  console.error('❌ Initialization failed:', err);
  process.exit(1);
});
