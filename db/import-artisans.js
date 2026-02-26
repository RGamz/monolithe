/**
 * Import Artisans from CSV
 * Usage: node db/import-artisans.js path/to/file.csv
 */

const Database = require('better-sqlite3');
const bcrypt   = require('bcrypt');
const path     = require('path');
const fs       = require('fs');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const CSV_PATH = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, 'artisans.csv');

const DB_PATH = path.resolve(__dirname, '..', process.env.DB_PATH || './db/database.sqlite');

// --- CSV parser (handles quoted commas) ---
function parseCSV(filePath) {
  const text = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const headers = splitLine(lines[0]).map(h => h.trim());
  return lines.slice(1).map(line => {
    const vals = splitLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = (vals[i] || '').trim(); });
    return row;
  });
}

function splitLine(line) {
  const out = [];
  let cur = '', inQ = false;
  for (const ch of line) {
    if (ch === '"')           { inQ = !inQ; }
    else if (ch === ',' && !inQ) { out.push(cur); cur = ''; }
    else                      { cur += ch; }
  }
  out.push(cur);
  return out;
}

// --- Nominatim geocoder ---
async function geocode(address) {
  if (!address) return { lat: null, lng: null };
  try {
    const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=fr&q='
              + encodeURIComponent(address);
    const res  = await fetch(url, {
      headers: { 'User-Agent': 'MonolithePortal/1.0 (contact@monolithe.pro)' }
    });
    const data = await res.json();
    if (data && data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (_) {}
  return { lat: null, lng: null };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error('CSV not found: ' + CSV_PATH);
    console.error('Usage: node db/import-artisans.js path/to/artisans.csv');
    process.exit(1);
  }

  const rows = parseCSV(CSV_PATH);

  // Print actual column names found (helps debug encoding)
  console.log('Columns: ' + Object.keys(rows[0]).join(' | '));
  console.log('Total rows: ' + rows.length + '\n');

  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');
  const hashedPwd = await bcrypt.hash('password123', 10);

  const insert = db.prepare(
    'INSERT INTO users ' +
    '(id, name, email, password, role, is_onboarded, company_name, specialty, address, phone, lat, lng, documents_status) ' +
    "VALUES (@id, @name, @email, @pwd, 'ARTISAN', 0, @company, @specialty, @address, @phone, @lat, @lng, 'missing')"
  );

  let ok = 0, skipped = 0, dupes = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const pad = '[' + String(i + 1).padStart(3, '0') + '/' + rows.length + ']';

    // Find columns by partial match to handle encoding variations
    const getCol = (...candidates) => {
      for (const key of Object.keys(r)) {
        for (const c of candidates) {
          if (key.toLowerCase().includes(c.toLowerCase())) return (r[key] || '').trim();
        }
      }
      return '';
    };

    const email       = getCol('mail').toLowerCase();
    const phone       = getCol('phone', 'telephone', 'phon');
    const companyName = (r['Name'] || '').trim();
    const legalRep    = getCol('sentant', 'legal');
    const address     = getCol('siege', 'ège');
    const catRaw      = getCol('gorie');
    const specialty   = catRaw.split(',')[0].trim() || null;
    const name        = legalRep || companyName;

    // Skip if missing required fields
    if (!email || !phone || !name) {
      console.log(pad + ' SKIP    ' + (companyName || '?') + ' (missing: '
        + (!email ? 'email ' : '') + (!phone ? 'phone ' : '') + (!name ? 'name' : '') + ')');
      skipped++;
      continue;
    }

    // Skip duplicates
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
      console.log(pad + ' DUPE    ' + email);
      dupes++;
      continue;
    }

    // Geocode
    const { lat, lng } = await geocode(address);
    const coords = lat ? lat.toFixed(3) + ',' + lng.toFixed(3) : 'no coords';
    const label  = (companyName + '                              ').slice(0, 30);
    console.log(pad + ' OK      ' + label + '  ' + coords);

    const id = 'art' + Date.now() + '_' + Math.random().toString(36).slice(2, 5);
    insert.run({ id, name, email, pwd: hashedPwd, company: companyName || null,
                 specialty, address: address || null, phone, lat, lng });
    ok++;

    await sleep(1100); // Nominatim: 1 req/sec max
  }

  db.close();
  console.log('\n' + '-'.repeat(40));
  console.log('Inserted:   ' + ok);
  console.log('Skipped:    ' + skipped);
  console.log('Duplicates: ' + dupes);
  console.log('-'.repeat(40));
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
