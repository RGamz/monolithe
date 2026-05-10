/**
 * One-off migration: approve all existing project photos.
 * Run with: node db/approve-all-photos.js
 */

const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dbPath = path.resolve(__dirname, '..', process.env.DB_PATH || './db/database.sqlite');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

const result = db.prepare(
  "UPDATE project_photos SET moderation_status = 'approuvé' WHERE moderation_status != 'approuvé'"
).run();

console.log(`Done: ${result.changes} photo(s) approved.`);
db.close();
