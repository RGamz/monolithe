/**
 * Migration: Add project_photos table
 * Run with: node db/migrate-photos.js
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dbPath = path.resolve(__dirname, '..', process.env.DB_PATH || './db/database.sqlite');

async function migrate() {
  const SQL = await initSqlJs();

  if (!fs.existsSync(dbPath)) {
    console.error('❌ Database not found. Run npm run init-db first.');
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(fileBuffer);

  db.run(`
    CREATE TABLE IF NOT EXISTS project_photos (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      uploaded_by TEXT NOT NULL,
      photo_type TEXT NOT NULL CHECK(photo_type IN ('before', 'after')),
      file_name TEXT NOT NULL,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (uploaded_by) REFERENCES users(id)
    )
  `);

  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  db.close();

  console.log('✅ project_photos table created (or already exists).');
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
