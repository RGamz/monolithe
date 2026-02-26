/**
 * Database Helper (db/helper.js)
 * --------------------------------
 * Wraps better-sqlite3 with the same API as before.
 *
 * better-sqlite3 is synchronous and writes directly to disk on every
 * run() call — no manual save() needed, no in-memory state to worry about.
 *
 * save() is kept as a no-op for backward compatibility with all route files.
 */

const Database = require('better-sqlite3');
const path = require('path');

let db = null;

/**
 * Initialize the database connection.
 */
function initDatabase(filePath) {
  db = new Database(filePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  console.log(`🗄️  Database loaded from: ${filePath}`);
  return Promise.resolve(db);
}

/**
 * Run a SELECT query and return array of objects.
 */
function getAll(sql, params = []) {
  return db.prepare(sql).all(params);
}

/**
 * Run a SELECT query and return first row as object (or null).
 */
function getOne(sql, params = []) {
  return db.prepare(sql).get(params) || null;
}

/**
 * Run an INSERT/UPDATE/DELETE statement.
 * Returns: { changes: number }
 */
function run(sql, params = []) {
  const result = db.prepare(sql).run(params);
  return { changes: result.changes };
}

/**
 * No-op — better-sqlite3 writes to disk synchronously on every run().
 * Kept for backward compatibility with route files that call req.db.save().
 */
function save() {
  // no-op
}

/**
 * Close the database connection.
 */
function close() {
  if (db) {
    db.close();
    db = null;
    console.log('🛑 Database connection closed.');
  }
}

module.exports = {
  initDatabase,
  getAll,
  getOne,
  run,
  save,
  close,
};
