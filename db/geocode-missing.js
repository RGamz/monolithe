/**
 * Geocode artisans with missing coordinates
 * Usage: node db/geocode-missing.js
 *
 * Multi-pass strategy per address:
 *   Pass 1 — clean full address (strip apt/bat/typos) and geocode
 *   Pass 2 — drop street number, keep street name + postcode + city
 *   Pass 3 — postcode + city only (only if passes 1&2 fail AND address has valid postcode+city)
 *
 * Pass 3 is intentionally conservative: it requires a 5-digit postcode AND a
 * city name to be present so we never pin someone to a wrong region.
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

  // Strip leading building/office prefix
  s = s.replace(/^(BAT(IMENT)?\s+[A-Z0-9]+(\s*(PORTE|APT?)\s*[A-Z0-9]+)?\s*,?\s*|BUREAU\s+\d+\s*,?\s*|APPT?\s*[A-Z0-9]+\s*,?\s*)/i, '');

  // Strip inline building references (must come before generic number cleanup)
  s = s.replace(/,?\s*b[âa]t(iment)?\s+[A-Z0-9]+(\s*(no|n°|apt?|porte|appt?)\s*[A-Z0-9]+)*/gi, '');

  // Strip inline apartment references
  s = s.replace(/,?\s*appt?\s*\d+/gi, '');

  // Strip orphaned number left after bat/apt removal (e.g. "RUE X 10, city" where 10 was appt)
  // Only strip trailing standalone number before a comma that follows a street name
  s = s.replace(/\s+\d+(\s*,)/, '$1');

  // Strip leading street number anomalies: "x654", "2A", "30is" etc.
  s = s.replace(/^[xX]\d+\s+/, '');         // x654 Chemin...
  s = s.replace(/^\d+[A-Z]\s+(?=\D)/i, ''); // 2A DU TERLON... → DU TERLON
  s = s.replace(/\b(\d+)[a-z]{1,2}\b/g, '$1'); // 30is→30, 96or→96, 12h→12

  // Remove duplicated postcode+city
  s = s.replace(/(\b\d{5}\s+[^,\n]+),\s*\1/gi, '$1');

  // Fix "BALMA (31130)" → "BALMA"
  s = s.replace(/\s*\(\d{5}\)/g, '');

  // Tidy
  s = s.replace(/,\s*,/g, ',').replace(/\s{2,}/g, ' ').replace(/,\s*$/, '').trim();
  return s || null;
}

// Drop street number from beginning of address for pass 2
function dropStreetNumber(address) {
  // Remove leading number with optional letter suffix and bis/ter: "12 rue", "37B route", "2bis chemin"
  return address.replace(/^\d+[A-Za-z]?\s*(bis|ter)?\s*/i, '').trim();
}

// Extract postcode+city from address for pass 3
function extractPostcodeCity(address) {
  const m = address.match(/\b(\d{5})\s+([A-Za-zÀ-ÿ\s\-]+?)(?:,|$)/);
  if (!m) return null;
  const city = m[2].trim();
  // Reject if city is suspiciously short or looks like a street
  if (city.length < 3) return null;
  return m[1] + ' ' + city + ', France';
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

async function geocodeWithPasses(raw) {
  // Pass 1: cleaned full address
  const cleaned = cleanAddress(raw);
  let coords = await geocode(cleaned);
  if (coords) return { coords, pass: 1, used: cleaned };
  await sleep(1100);

  // Pass 2: drop street number (helps when OSM has street but not exact number)
  const noNumber = dropStreetNumber(cleaned);
  if (noNumber !== cleaned) {
    coords = await geocode(noNumber);
    if (coords) return { coords, pass: 2, used: noNumber };
    await sleep(1100);
  }

  // Pass 3: postcode + city only — ONLY if we have both pieces
  const postcodeCity = extractPostcodeCity(raw);
  if (postcodeCity) {
    coords = await geocode(postcodeCity);
    if (coords) return { coords, pass: 3, used: postcodeCity };
    await sleep(1100);
  }

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
  const stillFailed = [];

  for (let i = 0; i < missing.length; i++) {
    const { id, name, address } = missing[i];
    const pad = '[' + String(i + 1).padStart(3, '0') + '/' + missing.length + ']';
    const label = (name + '                         ').slice(0, 25);

    process.stdout.write(pad + ' ' + label);

    const result = await geocodeWithPasses(address);

    if (result) {
      update.run(result.coords.lat, result.coords.lng, id);
      const passLabel = result.pass === 1 ? 'full' : result.pass === 2 ? 'no-num' : 'city';
      process.stdout.write('  OK[' + passLabel + ']  ' + result.coords.lat.toFixed(4) + ', ' + result.coords.lng.toFixed(4) + '\n');
      if (result.pass === 3) {
        process.stdout.write('         ⚠ city-level only: ' + result.used + '\n');
      }
      fixed++;
    } else {
      process.stdout.write('  FAILED\n');
      stillFailed.push({ name, address });
      failed++;
    }

    await sleep(1100);
  }

  db.close();

  console.log('\n' + '-'.repeat(50));
  console.log('Fixed:  ' + fixed);
  console.log('Failed: ' + failed);
  if (stillFailed.length) {
    console.log('\nStill unresolved (need manual fix):');
    stillFailed.forEach(f => console.log('  ' + f.name + ' — ' + f.address));
  }
  console.log('-'.repeat(50));
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
