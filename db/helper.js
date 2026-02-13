/**
 * Database Helper (db/helper.js)
 * --------------------------------
 * Wraps sql.js with a friendlier API.
 * 
 * sql.js returns results as { columns: [...], values: [[...], ...] }
 * This helper converts them to arrays of objects like:
 *   [{ id: 'u1', name: 'Sarah' }, ...]
 * 
 * This way, our route files can work with normal objects
 * instead of dealing with sql.js's raw format.
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

let db = null;
let dbPath = '';

/**
 * Initialize the database connection.
 * Loads the .sqlite file from disk into memory.
 */
async function initDatabase(filePath) {
  dbPath = filePath;
  const SQL = await initSqlJs();
  
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
    console.log(`🗄️  Database loaded from: ${dbPath}`);
  } else {
    console.error(`❌ Database file not found: ${dbPath}`);
    console.error('   Run "npm run init-db" first to create the database.');
    process.exit(1);
  }
  
  db.run('PRAGMA foreign_keys = ON');
  return db;
}

/**
 * Convert sql.js result to array of objects.
 * Input:  [{ columns: ['id','name'], values: [['u1','Sarah'], ['u2','Jean']] }]
 * Output: [{ id: 'u1', name: 'Sarah' }, { id: 'u2', name: 'Jean' }]
 */
function resultToObjects(result) {
  if (!result || result.length === 0) return [];
  
  const { columns, values } = result[0];
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

/**
 * Run a SELECT query and return array of objects.
 * Usage: getAll('SELECT * FROM users WHERE role = ?', ['ARTISAN'])
 */
function getAll(sql, params = []) {
  const result = db.exec(sql, params);
  return resultToObjects(result);
}

/**
 * Run a SELECT query and return first row as object (or null).
 * Usage: getOne('SELECT * FROM users WHERE id = ?', ['u1'])
 */
function getOne(sql, params = []) {
  const rows = getAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Run an INSERT/UPDATE/DELETE statement.
 * Returns: { changes: number }
 * Usage: run('UPDATE users SET name = ? WHERE id = ?', ['New Name', 'u1'])
 */
function run(sql, params = []) {
  db.run(sql, params);
  const changes = db.getRowsModified();
  return { changes };
}

/**
 * Save the current in-memory database to disk.
 * Call this after INSERT/UPDATE/DELETE operations to persist data.
 */
function save() {
  if (!db || !dbPath) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

/**
 * Close the database connection.
 */
function close() {
  if (db) {
    save();
    db.close();
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
