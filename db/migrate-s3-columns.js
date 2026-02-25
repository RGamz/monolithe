/**
 * Migration: Add file_url and file_key columns for S3 storage
 * -------------------------------------------------------------
 * Run ONCE on the live server after deploying S3 storage changes.
 *
 * Run with: node db/migrate-s3-columns.js
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dbPath = path.resolve(__dirname, '..', process.env.DB_PATH || './db/database.sqlite');

async function migrate() {
  const SQL = await initSqlJs();

  if (!fs.existsSync(dbPath)) {
    console.error('Database not found.');
    process.exit(1);
  }

  const db = new SQL.Database(fs.readFileSync(dbPath));

  const migrations = [
    // invoices table
    { table: 'invoices', column: 'file_url', type: 'TEXT' },
    { table: 'invoices', column: 'file_key', type: 'TEXT' },
    // artisan_documents table
    { table: 'artisan_documents', column: 'file_url', type: 'TEXT' },
    { table: 'artisan_documents', column: 'file_key', type: 'TEXT' },
    // project_photos table
    { table: 'project_photos', column: 'file_url', type: 'TEXT' },
    { table: 'project_photos', column: 'file_key', type: 'TEXT' },
  ];

  for (const { table, column, type } of migrations) {
    try {
      db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      console.log(`✅ Added ${column} to ${table}`);
    } catch (e) {
      if (e.message.includes('duplicate column')) {
        console.log(`⏭️  ${column} already exists in ${table} — skipping`);
      } else {
        throw e;
      }
    }
  }

  fs.writeFileSync(dbPath, Buffer.from(db.export()));
  db.close();
  console.log('\n💾 Database saved.');
  console.log('🎉 Migration complete.');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
