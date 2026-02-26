/**
 * Geocode artisans with missing coordinates
 * Usage: node db/geocode-missing.js
 *
 * Cleans addresses before geocoding — strips apartment/building
 * references, fixes typos, removes duplicated city segments.
 * Only saves coords when Nominatim returns a result.
 * Never falls back to just a postcode or city.
 */

const Database = require('better-sqlite3');
const path     = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DB_PATH = path.resolve(__dirname, '..', process.env.DB_PATH || './db/database.sqlite');
const sleep   = ms => new Promise(r => setTimeout(r, ms));

// ── Address cleaner ────────────────────────────────────────────────────────────
function cleanAddress(raw) {
  if (!raw) return null;
  let s = raw.trim();

  // 1. Strip leading building/office prefix before the actual street address
  //    Matches: "BAT E PORTE B9,", "BAT B APT 101,", "BUREAU 3,"
  s = s.replace(/^(BAT(IMENT)?\s+[A-Z0-9]+(\s*(PORTE|APT?)\s*[A-Z0-9]+)?\s*,?\s*|BUREAU\s+\d+\s*,?\s*)/i, '');

  // 2. Strip remaining APT/APPT prefix that may have been exposed after step 1
  s = s.replace(/^APT\s*\d+\s*,?\s*/i, '');

  // 3. Remove inline building references: "bat H no 360", "bâtiment B3 apt 159", "bat B"
  s = s.replace(/,?\s*b[âa]t(iment)?\s+[A-Z0-9]+(\s*(no|n°|apt?|porte)\s*[A-Z0-9]+)*/gi, '');

  // 4. Remove inline apartment references: "appt 120", "apt 10"
  s = s.replace(/,?\s*appt?\s*\d+/gi, '');

  // 5. Fix numeric-alpha typos: "96or" → "96"
  s = s.replace(/\b(\d+)[a-z]{1,2}\b/gi, '$1');

  // 6. Remove duplicated postcode+city: "31200 Toulouse, 31200 Toulouse"
  s = s.replace(/(\b\d{5}\s+[^,]+),\s*\1/gi, '$1');

  // 7. Tidy up
  s = s.replace(/,\s*,/g, ',').replace(/\s{2,}/g, ' ').replace(/,\s*$/, '').trim();

  return s || null;
}

// ── Nominatim ──────────────────────────────────────────────────────────────────
async function geocode(address) {
  if (!address) return null;
  try {
    const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=fr&q='
              + encodeURIComponent(address);
    const res  = await fetch(url, {
      headers: { 'User-Agent': 'MonolithePortal/1.0 (contact@monolithe.pro)' }
    });
    const data = await res.json();
    if (data && data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (_) {}
  return null;
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  const db = new Database(DB_PATH);

  const missing = db.prepare(
    "SELECT id, name, address FROM users WHERE role = 'ARTISAN' AND lat IS NULL AND address IS NOT NULL AND address != ''"
  ).all();

  console.log('Found ' + missing.length + ' artisans without coordinates\n');

  if (!missing.length) {
    console.log('Nothing to do.');
    db.close();
    return;
  }

  const update = db.prepare('UPDATE users SET lat = ?, lng = ? WHERE id = ?');
  let fixed = 0, failed = 0;

  for (let i = 0; i < missing.length; i++) {
    const { id, name, address } = missing[i];
    const pad = '[' + String(i + 1).padStart(3, '0') + '/' + missing.length + ']';

    const cleaned = cleanAddress(address);
    const wasChanged = cleaned !== address;

    // Log the artisan name
    process.stdout.write(pad + ' ' + (name + '                         ').slice(0, 25));

    if (wasChanged) {
      // Show what was cleaned for transparency
      process.stdout.write('\n  original: ' + address + '\n  cleaned:  ' + cleaned + '\n  result:   ');
    }

    const coords = await geocode(cleaned);

    if (coords) {
      update.run(coords.lat, coords.lng, id);
      process.stdout.write('OK  ' + coords.lat.toFixed(4) + ', ' + coords.lng.toFixed(4) + '\n');
      fixed++;
    } else {
      process.stdout.write('FAILED  (' + (cleaned || 'no address') + ')\n');
      failed++;
    }

    await sleep(1100);
  }

  db.close();
  console.log('\n' + '-'.repeat(40));
  console.log('Fixed:  ' + fixed);
  console.log('Failed: ' + failed + (failed ? '  <-- check addresses above' : ''));
  console.log('-'.repeat(40));
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
