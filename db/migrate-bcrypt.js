/**
 * Migration: Hash all plaintext passwords with bcrypt
 * ----------------------------------------------------
 * Run ONCE on the live server after deploying the bcrypt auth changes.
 * Safe to run — skips passwords that are already bcrypt hashes.
 *
 * Run with: node db/migrate-bcrypt.js
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
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

  // Get all users with their current passwords
  const result = db.exec('SELECT id, email, password FROM users');
  if (!result || result.length === 0) {
    console.log('No users found.');
    db.close();
    return;
  }

  const users = result[0].values.map(row => ({
    id: row[0],
    email: row[1],
    password: row[2],
  }));

  let updated = 0;
  let skipped = 0;

  for (const user of users) {
    // bcrypt hashes always start with $2b$ or $2a$ — skip if already hashed
    if (user.password && (user.password.startsWith('$2b$') || user.password.startsWith('$2a$'))) {
      console.log(`⏭️  Skipping ${user.email} — already hashed`);
      skipped++;
      continue;
    }

    const hashed = await bcrypt.hash(user.password, 10);
    db.run('UPDATE users SET password = ? WHERE id = ?', [hashed, user.id]);
    console.log(`✅ Hashed password for ${user.email}`);
    updated++;
  }

  // Save to disk
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  db.close();

  console.log(`\n💾 Database saved.`);
  console.log(`✅ ${updated} passwords hashed, ${skipped} already hashed.`);
  console.log('🎉 Migration complete.');
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
