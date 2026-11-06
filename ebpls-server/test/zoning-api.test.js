const { test, before, after, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const express = require('express');

// Replace only external boundaries; exercise the real routes, controllers,
// request schemas, error handler, and role guard without touching Supabase.
const pending = [];
const queries = [];
const audit = [];
const supabaseAdmin = {
  from(table) {
    const query = { table, steps: [] };
    queries.push(query);
    const builder = {};
    for (const method of ['select', 'insert', 'update', 'delete', 'eq', 'order', 'single', 'maybeSingle']) {
      builder[method] = (...args) => { query.steps.push([method, ...args]); return builder; };
    }
    builder.then = (resolve, reject) => {
      const result = pending.shift();
      if (!result) return Promise.reject(new Error(`Unexpected database access: ${table}`)).then(resolve, reject);
      assert.equal(table, result.table);
      return Promise.resolve({ data: result.data ?? null, error: result.error ?? null }).then(resolve, reject);
    };
    return builder;
  },
};
function stub(modulePath, exports) {
  const id = require.resolve(modulePath);
  require.cache[id] = { id, filename: id, loaded: true, exports };
}
stub('../src/config/supabase', { supabaseAdmin });
stub('../src/services/audit.service', {
  AUDIT_ACTIONS: { MASTER_DATA_UPDATED: 'MASTER_DATA_UPDATED' },
  logAction: async entry => { audit.push(entry); },
});
for (const service of ['application', 'requirement', 'storage', 'email']) stub(`../src/services/${service}.service`, {});
stub('../src/middlewares/auth.middleware', {
  authenticate(req, res, next) {
    if (!req.headers['x-test-role']) return res.status(401).json({ success: false });
    req.user = { userId: 'admin-id', taxpayerId: 'applicant-id', roleName: req.headers['x-test-role'] };
    next();
  },
});

const { authenticate } = require('../src/middlewares/auth.middleware');
const { authorize } = require('../src/middlewares/rbac.middleware');
const { errorHandler } = require('../src/middlewares/error.middleware');
const app = express();
app.use(express.json());
app.use('/api/admin', authenticate, authorize('Admin'), require('../src/routes/admin.routes'));
app.use('/api/applications', require('../src/routes/application.routes'));
app.use(errorHandler);
let server, base;
before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });
afterEach(() => {
  assert.equal(pending.length, 0, 'all expected database requests were made');
  queries.length = 0;
  audit.length = 0;
});
async function request(url, { method = 'GET', body, role = 'Admin' } = {}) {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(role ? { 'x-test-role': role } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}
const zone = { id: 1, name: 'Zone 1 (Prime Commercial)', foot_traffic_level: 'High', min_capital_floor: 50000, fee_multiplier: 1.25, is_active: true };

test('master-data routes require authentication and Admin access', async () => {
  assert.equal((await request('/api/admin/master-data/location_zones', { role: null })).status, 401);
  for (const role of ['Applicant', 'BPLO_Officer', 'Treasury_Officer']) {
    assert.equal((await request('/api/admin/master-data/location_zones', { role })).status, 403);
  }
  assert.equal(queries.length, 0);
});

test('Admin can list and create zones and creation is audited', async () => {
  pending.push({ table: 'location_zones', data: [zone] });
  assert.deepEqual((await request('/api/admin/master-data/location_zones')).body.data, [zone]);
  pending.push({ table: 'location_zones', data: zone });
  const { id, ...payload } = zone;
  const res = await request('/api/admin/master-data/location_zones', { method: 'POST', body: payload });
  assert.equal(res.status, 201);
  assert.equal(audit[0].entityId, String(id));
  assert.deepEqual(audit[0].newValue, payload);
});

test('updating a zone records its previous values and never injects is_active', async () => {
  pending.push({ table: 'location_zones', data: zone }, { table: 'location_zones', data: { ...zone, min_capital_floor: 60000 } });
  const res = await request('/api/admin/master-data/location_zones/1', { method: 'PUT', body: { min_capital_floor: 60000 } });
  assert.equal(res.status, 200);
  assert.deepEqual(audit[0].oldValue, zone);
  assert.deepEqual(queries[1].steps.find(step => step[0] === 'update')[1], { min_capital_floor: 60000 });
});

test('invalid rates and unknown fields return 400 before writing', async () => {
  for (const body of [{ fee_multiplier: -2 }, { name: '' }, { id: 10 }, { latitude: 91 }]) {
    const table = body.latitude ? 'barangays' : 'location_zones';
    assert.equal((await request(`/api/admin/master-data/${table}/1`, { method: 'PUT', body })).status, 400);
  }
  assert.equal(queries.length, 0);
  assert.equal(audit.length, 0);
});

test('barangay reassignment rejects inactive or missing zones', async () => {
  for (const data of [{ id: 2, is_active: false }, null]) {
    pending.push({ table: 'barangays', data: { id: 1, name: 'Bayate', zone_id: 1 } }, { table: 'location_zones', data });
    const res = await request('/api/admin/master-data/barangays/1', { method: 'PUT', body: { zone_id: 2 } });
    assert.equal(res.status, 400);
  }
  assert.equal(audit.length, 0);
});

test('barangay reassignment to an active zone saves and audits', async () => {
  const old = { id: 1, name: 'Bayate', zone_id: 1, latitude: 14.1, longitude: 121.4, is_active: true };
  pending.push({ table: 'barangays', data: old }, { table: 'location_zones', data: { id: 2, is_active: true } }, { table: 'barangays', data: { ...old, zone_id: 2 } });
  const res = await request('/api/admin/master-data/barangays/1', { method: 'PUT', body: { zone_id: 2 } });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.zone_id, 2);
  assert.deepEqual(audit[0].oldValue, old);
  assert.deepEqual(audit[0].newValue, { zone_id: 2 });
});

test('barangay renames are rejected before any write, including combined zoning changes', async () => {
  for (const body of [{ name: 'Bayate renamed' }, { name: 'Bayate renamed', zone_id: 2 }]) {
    pending.push({ table: 'barangays', data: { id: 1, name: 'Bayate', zone_id: 1 } });
    const res = await request('/api/admin/master-data/barangays/1', { method: 'PUT', body });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /Barangay names cannot be changed/);
  }
  assert.ok(queries.every(query => !query.steps.some(([method]) => method === 'update')));
  assert.equal(audit.length, 0);
});

test('saving an unchanged barangay name still permits coordinate and zone edits', async () => {
  const old = { id: 1, name: 'Bayate', zone_id: 1, latitude: 14.1, longitude: 121.4, is_active: true };
  const body = { name: 'Bayate', zone_id: 2, latitude: 14.2, longitude: 121.5, is_active: true };
  pending.push({ table: 'barangays', data: old }, { table: 'location_zones', data: { id: 2, is_active: true } }, { table: 'barangays', data: { ...old, ...body } });
  const res = await request('/api/admin/master-data/barangays/1', { method: 'PUT', body });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.name, 'Bayate');
  assert.deepEqual(audit[0].newValue, body);
});

test('returned-app edit response preserves gross sales through the wizard and tax calculation', async () => {
  const { pathToFileURL } = require('node:url');
  const path = require('node:path');
  const { normalizeDraftFormData, buildSubmissionPayload } = await import(pathToFileURL(path.join(__dirname, '../../ebpls-frontend/src/utils/uafForm.js')));
  const { computeAssessment } = require('../src/utils/assessment-engine');
  for (const grossSales of [500000, 0]) {
    pending.push(
      { table: 'applications', data: { application_no: 'APP-RETURNED', status: 'Returned', type_id: 2, businesses: { business_name: 'Returned business', org_type_id: 1, tenancy_type: 'Owned Commercial', stall_unit_numbers: ['12'] } } },
      { table: 'application_activities', data: [{ capitalization: 20000, gross_sales_prev_year: grossSales, metric_count: 12, business_activities: { name: 'Retail' } }] },
      { table: 'application_data_reviews', data: [] },
      { table: 'doc_verifications', data: [] },
    );
    const res = await request('/api/applications/APP-RETURNED/edit', { role: 'Applicant' });
    assert.equal(res.status, 200);
    const payload = buildSubmissionPayload(normalizeDraftFormData(res.body.data), [], 'APP-RETURNED');
    assert.equal(payload.activities[0].gross_sales_prev_year, grossSales);
    assert.equal(payload.activities[0].capitalization, 20000);
    assert.deepEqual(payload.stall_unit_numbers, ['12']);
    const result = computeAssessment({ application: { type_id: 2 }, barangay_active: true,
      zone: { is_active: true, fee_multiplier: 0.8, min_capital_floor: 10000 }, activities: payload.activities,
      fee_types: [{ id: 1, name: 'Business Tax', computation_basis: 'Gross_Sales', percentage_value: 0.02 }],
    });
    assert.equal(result.totalAmount, grossSales ? 10000 : 400);
  }
  assert.ok(queries[0].steps.some(step => step[0] === 'eq' && step[1] === 'businesses.taxpayer_id' && step[2] === 'applicant-id'));
});

test('failed activity loading cannot return an incomplete edit form', async () => {
  pending.push(
    { table: 'applications', data: { application_no: 'APP-RETURNED', status: 'Returned', businesses: {} } },
    { table: 'application_activities', error: { message: 'Database unavailable' } },
  );
  assert.equal((await request('/api/applications/APP-RETURNED/edit', { role: 'Applicant' })).status, 500);
});

test('duplicate names, missing records, and referenced-zone deletion return useful errors', async () => {
  pending.push({ table: 'location_zones', error: { code: '23505' } });
  const { id, ...payload } = zone;
  assert.equal((await request('/api/admin/master-data/location_zones', { method: 'POST', body: payload })).status, 409);
  pending.push({ table: 'location_zones', data: null });
  assert.equal((await request(`/api/admin/master-data/location_zones/${id}`, { method: 'PUT', body: { is_active: false } })).status, 404);
  pending.push({ table: 'location_zones', data: zone }, { table: 'location_zones', error: { code: '23503' } });
  assert.equal((await request('/api/admin/master-data/location_zones/1', { method: 'DELETE' })).status, 400);
  assert.equal(audit.length, 0);
});

test('applicant lookup returns coordinates and zone metadata, filtered to active barangays', async () => {
  const data = [{ id: 1, name: 'Bayate', latitude: 14.1, longitude: 121.4, zone_id: 1, zone }];
  pending.push({ table: 'barangays', data });
  const res = await request('/api/applications/barangays', { role: 'Applicant' });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data, data);
  assert.ok(queries[0].steps.some(step => step[0] === 'eq' && step[1] === 'is_active' && step[2] === true));
  const selection = queries[0].steps.find(step => step[0] === 'select')[1];
  for (const field of ['latitude', 'longitude', 'zone_id', 'fee_multiplier', 'min_capital_floor']) assert.ok(selection.includes(field));
});
