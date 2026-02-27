/**
 * Migration: Add read_at column to submissions tables
 * Run with: npm run migrate-submissions-read
 */

const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dbPath = path.resolve(__dirname, '..', process.env.DB_PATH || './db/database.sqlite');
const db = new Database(dbPath);

function addIfMissing(table, column, def) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.find(c => c.name === column)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`).run();
    console.log(`  ✅ Added ${table}.${column}`);
  } else {
    console.log(`  ⏭️  ${table}.${column} already exists`);
  }
}

console.log('🔧 Running submissions read_at migration...\n');
addIfMissing('contact_submissions', 'read_at', 'TEXT');
addIfMissing('devis_submissions',   'read_at', 'TEXT');

db.close();
console.log('\n✅ Done.');
