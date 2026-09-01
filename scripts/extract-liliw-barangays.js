/**
 * extract-liliw-barangays.js
 *
 * One-time script to filter the BetterGov PH-wide barangays GeoJSON
 * down to the 33 official barangays of Liliw, Laguna.
 *
 * Usage:
 *   node scripts/extract-liliw-barangays.js
 *
 * Output:
 *   ebpls-frontend/src/data/liliw-barangays.geojson
 *   ebpls-server/src/data/liliw-barangays.geojson
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Name mapping: ADM4_EN (BetterGov) -> system barangay name (030_barangays_lookup.sql)
// BetterGov uses "(Pob.)" abbreviation; the system uses the full "(Poblacion)"
// ---------------------------------------------------------------------------
const NAME_MAP = {
  'Bagong Anyo (Pob.)':  'Bagong Anyo (Poblacion)',
  'Masikap (Pob.)':      'Masikap (Poblacion)',
  'Maslun (Pob.)':       'Maslun (Poblacion)',
  'Pag-asa (Pob.)':      'Pag-asa (Poblacion)',
  'Pag-Asa (Pob.)':      'Pag-asa (Poblacion)',
  'Rizal (Pob.)':        'Rizal (Poblacion)',
  'Cabuyew':             'Cabuyao',
  'Daniw (Danliw)':      'Daniw',
};

function normalizeName(adm4en) {
  return NAME_MAP[adm4en] ?? adm4en;
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const ROOT         = path.resolve(__dirname, '..');
const SOURCE       = path.join(ROOT, 'barangays.geojson');
const FRONTEND_OUT = path.join(ROOT, 'ebpls-frontend', 'src', 'data', 'liliw-barangays.geojson');
const SERVER_OUT   = path.join(ROOT, 'ebpls-server',   'src', 'data', 'liliw-barangays.geojson');

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
console.log('Reading source GeoJSON (this may take a moment for 66MB)...');
const raw = fs.readFileSync(SOURCE, 'utf-8');

console.log('Parsing...');
const full = JSON.parse(raw);

console.log(`Total features in source: ${full.features.length}`);

// Filter to Liliw, Laguna only
const liliw = full.features.filter(
  (f) =>
    f.properties.ADM3_EN === 'Liliw' &&
    f.properties.ADM2_EN === 'Laguna'
);

console.log(`Liliw barangays found: ${liliw.length}`);

if (liliw.length === 0) {
  console.error('ERROR: No Liliw barangays found. Check ADM3_EN / ADM2_EN values in the source file.');
  process.exit(1);
}

// Build lean FeatureCollection — only keep name + geometry
const output = {
  type: 'FeatureCollection',
  metadata: {
    source:      'BetterGov / NAMRIA 2023',
    municipality: 'Liliw',
    province:    'Laguna',
    extracted_at: new Date().toISOString(),
    feature_count: liliw.length,
  },
  features: liliw.map((f) => ({
    type: 'Feature',
    properties: {
      name: normalizeName(f.properties.ADM4_EN),
      adm4_pcode: f.properties.ADM4_PCODE,
    },
    geometry: f.geometry,
  })),
};

// Log all barangay names extracted for verification
console.log('\nExtracted barangays:');
output.features.forEach((f, i) => console.log(`  ${i + 1}. ${f.properties.name}`));

// Write outputs
const json = JSON.stringify(output, null, 2);

for (const outPath of [FRONTEND_OUT, SERVER_OUT]) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, json, 'utf-8');
  const sizeKB = (Buffer.byteLength(json, 'utf-8') / 1024).toFixed(1);
  console.log(`\nWritten to: ${outPath} (${sizeKB} KB)`);
}

console.log('\nDone!');
