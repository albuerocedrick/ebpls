const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const { booleanPointInPolygon } = require('@turf/boolean-point-in-polygon');
const { centroid } = require('../../scripts/generate-location-zones-migration');
const { parseZoningMasterData } = require('../src/utils/zoning.schemas');

const migration = fs.readFileSync(path.join(__dirname, '../supabase/migrations/044_location_zones_and_centroids.sql'), 'utf8');
const lookup = fs.readFileSync(path.join(__dirname, '../supabase/migrations/030_barangays_lookup.sql'), 'utf8');
const boundaries = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/liliw-barangays.geojson'), 'utf8'));
let db;

async function prepareDatabase() {
  const instance = new PGlite();
  await instance.exec(`
    CREATE ROLE authenticated;
    CREATE ROLE service_role BYPASSRLS;
    CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE AS
    $$ SELECT coalesce(current_setting('test.is_admin', true), 'false') = 'true' $$;
  `);
  await instance.exec(lookup);
  return instance;
}

before(async () => {
  db = await prepareDatabase();
  await db.exec(migration);
});
after(async () => { await db?.close(); });

test('migration seeds the approved three zone rates and all 33 barangays without changing IDs', async () => {
  const { rows: zones } = await db.query('SELECT name, foot_traffic_level, min_capital_floor::float8 AS floor, fee_multiplier::float8 AS multiplier FROM location_zones ORDER BY id');
  assert.deepEqual(zones.map(z => [z.foot_traffic_level, z.floor, z.multiplier]), [
    ['High', 50000, 1.25], ['Medium', 25000, 1], ['Low', 10000, 0.8],
  ]);
  const { rows } = await db.query('SELECT b.id, b.name, b.latitude::float8 AS latitude, b.longitude::float8 AS longitude, z.name AS zone FROM barangays b JOIN location_zones z ON z.id = b.zone_id ORDER BY b.id');
  assert.equal(rows.length, 33);
  for (const [index, row] of rows.entries()) {
    assert.equal(row.id, index + 1);
    const feature = boundaries.features.find(f => f.properties.name === row.name);
    assert.ok(feature, row.name);
    assert.ok(booleanPointInPolygon([row.longitude, row.latitude], feature), `${row.name} must have an in-boundary point`);
    assert.equal(row.zone, row.name.includes('(Poblacion)') ? 'Zone 1 (Prime Commercial)' : 'Zone 3 (Rural)');
  }
});

test('centroid calculation weights polygon areas and subtracts holes', () => {
  assert.deepEqual(centroid({ type: 'Polygon', coordinates: [[[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]]] }), [2, 2]);
  const point = centroid({ type: 'Polygon', coordinates: [
    [[0, 0], [6, 0], [6, 6], [0, 6], [0, 0]],
    [[1, 1], [2, 1], [2, 2], [1, 2], [1, 1]],
  ] });
  assert.deepEqual(point, [3.0428571, 3.0428571]);
  assert.throws(() => centroid({ type: 'Polygon', coordinates: [[[0, 0], [1, 1], [2, 2], [0, 0]]] }));
});

test('Admin data changes persist and referenced zones cannot be deleted', async () => {
  const { rows: [barangay] } = await db.query("UPDATE barangays SET zone_id = (SELECT id FROM location_zones WHERE foot_traffic_level = 'Medium') WHERE name = 'Bayate' RETURNING zone_id");
  await db.query('UPDATE location_zones SET min_capital_floor = 30000 WHERE id = $1', [barangay.zone_id]);
  const { rows: [saved] } = await db.query('SELECT min_capital_floor::float8 AS floor FROM location_zones WHERE id = $1', [barangay.zone_id]);
  assert.equal(saved.floor, 30000);
  await assert.rejects(db.query('DELETE FROM location_zones WHERE id = $1', [barangay.zone_id]), err => ['23503', '23001'].includes(err.code));
  const { rows: [created] } = await db.query("INSERT INTO location_zones (name, foot_traffic_level, min_capital_floor, fee_multiplier) VALUES ('Temporary zone', 'Low', 0, 1) RETURNING id");
  await db.query('DELETE FROM location_zones WHERE id = $1', [created.id]);
});

test('database rejects invalid rates, coordinates, and zone references', async () => {
  for (const sql of [
    'UPDATE location_zones SET fee_multiplier = 0 WHERE id = 1',
    'UPDATE location_zones SET min_capital_floor = -1 WHERE id = 1',
    "UPDATE location_zones SET foot_traffic_level = 'Unknown' WHERE id = 1",
    'UPDATE barangays SET latitude = 91 WHERE id = 1',
    'UPDATE barangays SET longitude = -181 WHERE id = 1',
  ]) await assert.rejects(db.exec(sql), { code: '23514' });
  await assert.rejects(db.exec('UPDATE barangays SET zone_id = 999999 WHERE id = 1'), { code: '23503' });
  await assert.rejects(db.exec('UPDATE barangays SET zone_id = NULL WHERE id = 1'), { code: '23502' });
});

test('RLS allows authenticated reading but restricts writes to Admin', async () => {
  try {
    await db.exec('SET ROLE authenticated');
    const { rows } = await db.query('SELECT * FROM location_zones');
    assert.equal(rows.length, 3);
    const { rows: changed } = await db.query('UPDATE location_zones SET fee_multiplier = 9 WHERE id = 1 RETURNING id');
    assert.equal(changed.length, 0);
    await assert.rejects(db.exec("INSERT INTO location_zones (name, foot_traffic_level, min_capital_floor, fee_multiplier) VALUES ('Forbidden', 'High', 0, 1)"), { code: '42501' });
    await db.exec("SET test.is_admin = 'true'");
    const { rows: allowed } = await db.query('UPDATE location_zones SET fee_multiplier = 1.25 WHERE id = 1 RETURNING id');
    assert.equal(allowed.length, 1);
  } finally {
    await db.exec("RESET ROLE; SET test.is_admin = 'false'");
  }
});

test('migration rolls back cleanly if a barangay lookup does not match', async () => {
  const incomplete = await prepareDatabase();
  try {
    await incomplete.exec("DELETE FROM barangays WHERE name = 'Bayate'");
    await assert.rejects(incomplete.exec(migration), /Expected 33 matching barangays/);
    await incomplete.exec('ROLLBACK');
    const { rows: [result] } = await incomplete.query("SELECT to_regclass('public.location_zones') AS table_name");
    assert.equal(result.table_name, null);
  } finally { await incomplete.close(); }
});

test('zoning request validation rejects invalid inputs and preserves partial-update intent', () => {
  const zone = { name: 'Zone', foot_traffic_level: 'High', min_capital_floor: 0, fee_multiplier: 1.25 };
  assert.equal(parseZoningMasterData('location_zones', zone).is_active, true);
  assert.deepEqual(parseZoningMasterData('location_zones', { min_capital_floor: 25000 }, true), { min_capital_floor: 25000 });
  for (const patch of [
    { fee_multiplier: -1 }, { fee_multiplier: 0.00001 }, { fee_multiplier: NaN }, { foot_traffic_level: 'Other' },
    { min_capital_floor: null }, { name: '  ' }, { id: 1 }, { is_active: 'true' },
  ]) assert.throws(() => parseZoningMasterData('location_zones', { ...zone, ...patch }));
  assert.throws(() => parseZoningMasterData('barangays', { name: 'Bayate' }));
  for (const patch of [{ latitude: 91 }, { longitude: -181 }, { zone_id: null }, { zone_id: -1 }]) {
    assert.throws(() => parseZoningMasterData('barangays', patch, true));
  }
});
