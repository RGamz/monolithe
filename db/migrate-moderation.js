/**
 * Migration: Add moderation columns
 * ----------------------------------
 * Adds moderation_status and moderation_note to invoices,
 * artisan_documents, and project_photos.
 *
 * Run with: npm run migrate-moderation
 */

const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dbPath = path.resolve(__dirname, '..', process.env.DB_PATH || './db/database.sqlite');
const db = new Database(dbPath);

function addColumnIfMissing(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.find(c => c.name === column)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
    console.log(`  ✅ Added ${table}.${column}`);
  } else {
    console.log(`  ⏭️  ${table}.${column} already exists`);
  }
}

console.log('🔧 Running moderation migration...\n');

addColumnIfMissing('invoices',          'moderation_status', "TEXT NOT NULL DEFAULT 'en_attente'");
addColumnIfMissing('invoices',          'moderation_note',   'TEXT');
addColumnIfMissing('artisan_documents', 'moderation_status', "TEXT NOT NULL DEFAULT 'en_attente'");
addColumnIfMissing('artisan_documents', 'moderation_note',   'TEXT');
addColumnIfMissing('project_photos',    'moderation_status', "TEXT NOT NULL DEFAULT 'en_attente'");
addColumnIfMissing('project_photos',    'moderation_note',   'TEXT');

// Existing approved records (before moderation feature) should be auto-approved
db.prepare(`UPDATE invoices          SET moderation_status = 'approuvé' WHERE moderation_status = 'en_attente' AND date < date('now', '-1 day')`).run();
db.prepare(`UPDATE artisan_documents SET moderation_status = 'approuvé' WHERE moderation_status = 'en_attente' AND upload_date < datetime('now', '-1 day')`).run();
db.prepare(`UPDATE project_photos    SET moderation_status = 'approuvé' WHERE moderation_status = 'en_attente' AND uploaded_at < datetime('now', '-1 day')`).run();

db.close();
console.log('\n✅ Migration complete.');
