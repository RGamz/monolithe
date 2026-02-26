/**
 * Migration: Add phone column to users
 * Run with: npm run migrate-phone
 */

const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dbPath = path.resolve(__dirname, '..', process.env.DB_PATH || './db/database.sqlite');
const db = new Database(dbPath);

const cols = db.prepare('PRAGMA table_info(users)').all();
if (!cols.find(c => c.name === 'phone')) {
  db.prepare('ALTER TABLE users ADD COLUMN phone TEXT').run();
  console.log('✅ Added users.phone');
} else {
  console.log('⏭️  users.phone already exists');
}

db.close();
console.log('Done.');
