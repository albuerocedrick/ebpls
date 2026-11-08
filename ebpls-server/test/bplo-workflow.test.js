const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

const officer = '11111111-1111-4111-8111-111111111111';
let rpcCalls = [];
let dbTables = {};

const mockDatabase = {
  from(table) {
    let updating = false;
    let updatePayload = null;
    let selectedEq = {};
    const builder = {
      select() { return this; },
      update(payload) { updating = true; updatePayload = payload; return this; },
      eq(col, val) { selectedEq[col] = val; return this; },
      single() { return this; },
      maybeSingle() { return this; },
      then(resolve, reject) {
        if (updating) {
          if (table === 'applications') {
            dbTables.applications = { ...dbTables.applications, ...updatePayload };
            return Promise.resolve({ data: dbTables.applications, error: null }).then(resolve, reject);
          }
          return Promise.resolve({ data: null, error: null }).then(resolve, reject);
        }
        if (table === 'applications') {
          return Promise.resolve({ data: dbTables.applications, error: null }).then(resolve, reject);
        }
        if (table === 'barangays') {
          return Promise.resolve({ data: dbTables.barangays, error: null }).then(resolve, reject);
        }
        if (table === 'application_activities') {
          return Promise.resolve({ data: dbTables.activities || [], error: null }).then(resolve, reject);
        }
        if (table === 'doc_verifications') {
          return Promise.resolve({ data: dbTables.doc_verifications || [], error: null }).then(resolve, reject);
        }
        if (table === 'application_data_reviews') {
          return Promise.resolve({ data: dbTables.data_reviews || [], error: null }).then(resolve, reject);
        }
        return Promise.resolve({ data: null, error: null }).then(resolve, reject);
      },
    };
    return builder;
  },
  storage: { from() { return { async info() { return { data: { size: 1024, contentType: 'application/pdf' }, error: null }; } }; } },
  async rpc(name, payload) {
    rpcCalls.push({ name, payload });
    if (name === 'get_assessment_inputs') {
      return {
        data: {
          application: { application_no: 'APP-BPLO-1' },
          barangay_active: true,
          zone: { is_active: true, fee_multiplier: 1.25, min_capital_floor: 50000 },
          activities: [{ name: 'Retail', capitalization: 50000, gross_sales_prev_year: 0 }],
          fee_types: [{ id: 1, name: 'Mayor Permit Fee', computation_basis: 'Fixed', fixed_amount: 1000 }],
          fee_schedule: [],
          rules: [],
        },
        error: null,
      };
    }
    if (name === 'approve_and_assess_application') {
      return {
        data: {
          assessment_id: 'assess-123',
          application_no: 'APP-BPLO-1',
          status: 'Assessed',
          total_amount: 1250,
          already_assessed: false,
        },
        error: null,
      };
    }
    return { data: null, error: null };
  },
};

function stub(name, exports) {
  const id = require.resolve(name);
  require.cache[id] = { id, filename: id, loaded: true, exports };
}

stub('../src/config/supabase', { supabaseAdmin: mockDatabase });
stub('../src/services/pdf.service', {});
stub('../src/services/email.service', { dispatchEmail() {}, EMAIL_TRIGGERS: {} });
stub('../src/services/audit.service', { logAction: async () => {}, AUDIT_ACTIONS: require('../src/utils/constants').AUDIT_ACTIONS });
stub('../src/services/storage.service', {
  generatePresignedDownloadUrl: async (p) => `https://example.test/download/${p}`,
  generatePresignedUploadUrl: async () => ({ signedUrl: 'https://example.test/upload', path: 'upload.pdf' }),
});
stub('../src/controllers/correction.controller', new Proxy({}, {
  get: () => (req, res, next) => (next ? next() : res.status(200).json({ success: true }))
}));
stub('../src/middlewares/auth.middleware', {
  authenticate(req, res, next) {
    const role = req.headers['x-test-role'];
    if (!role) return res.status(401).json({ success: false, message: 'Unauthenticated' });
    req.user = { userId: officer, roleName: role };
    next();
  },
});

const mainApp = require('../src/app');

let server, base;
before(async () => {
  server = mainApp.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

beforeEach(() => {
  rpcCalls = [];
  dbTables = {
    applications: {
      application_no: 'APP-BPLO-1',
      status: 'Under Review',
      submitted_at: '2026-11-08T00:00:00Z',
      type_id: 1,
      application_types: { name: 'New' },
      businesses: {
        business_name: 'Liliw Footwear Craft',
        trade_name: 'Liliw Shoes',
        org_type_id: 1,
        organization_types: { name: 'Sole Proprietorship' },
        dti_sec_cda_reg_no: 'DTI-1234567',
        is_franchise: false,
        address_line1: '123 Gat Tayaw St',
        barangay: 'Bagong Anyo (Poblacion)',
        city: 'Liliw',
        province: 'Laguna',
        latitude: 14.1302736,
        longitude: 121.4370584,
        tenancy_type: 'Rented',
        stall_unit_numbers: ['Stall 1', 'Stall 2'],
      },
    },
    barangays: {
      zone_id: 1,
      location_zones: {
        id: 1,
        name: 'Zone 1 (Prime Commercial)',
        foot_traffic_level: 'High',
        min_capital_floor: 50000,
        fee_multiplier: 1.25,
      },
    },
    activities: [
      {
        activity_id: 1,
        capitalization: 50000,
        gross_sales_prev_year: 0,
        business_activities: { name: 'Retail Trade' },
      },
    ],
    doc_verifications: [
      { requirement_id: 1, status: 'Verified', remarks: null, file_path: 'taxpayer/dti.pdf', requirement_types: { name: 'DTI Registration', max_files: 1 } },
      { requirement_id: 2, status: 'Verified', remarks: null, file_path: 'taxpayer/clearance.pdf', requirement_types: { name: 'Barangay Business Clearance', max_files: 1 } },
    ],
    data_reviews: [
      { section: 'business_details', status: 'Verified', remarks: null },
      { section: 'location', status: 'Verified', remarks: null },
      { section: 'business_activities', status: 'Verified', remarks: null },
      { section: 'financial_declaration', status: 'Verified', remarks: null },
    ],
  };
});

async function request(url, method = 'GET', body, role = 'BPLO_Officer') {
  const res = await fetch(base + url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(role ? { 'x-test-role': role } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsedBody;
  try {
    parsedBody = JSON.parse(text);
  } catch {
    parsedBody = text;
  }
  return { status: res.status, body: parsedBody };
}

test('GET /api/bplo/applications/:app_no returns tenancy, stalls, and location zone', async () => {
  const res = await request('/api/bplo/applications/APP-BPLO-1', 'GET');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.application_no, 'APP-BPLO-1');
  assert.equal(res.body.data.businesses.tenancy_type, 'Rented');
  assert.deepEqual(res.body.data.businesses.stall_unit_numbers, ['Stall 1', 'Stall 2']);
  assert.equal(res.body.data.zone.name, 'Zone 1 (Prime Commercial)');
  assert.equal(res.body.data.zone.fee_multiplier, 1.25);
  assert.equal(res.body.data.checklist.length, 2);
});

test('PUT /api/bplo/applications/verify/:app_no approves and assesses without requiring barangay_clearances row', async () => {
  const payload = {
    checklist: [
      { requirementId: 1, status: 'Verified' },
      { requirementId: 2, status: 'Verified' },
    ],
  };

  const res = await request('/api/bplo/applications/verify/APP-BPLO-1', 'PUT', payload);
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.status, 'Assessed');
  assert.equal(res.body.data.total_amount, 1250);

  // Verifies that fee calculation and atomic assessment RPCs were executed
  assert.deepEqual(rpcCalls.map(c => c.name), ['get_assessment_inputs', 'approve_and_assess_application']);
});

test('PUT /api/bplo/applications/return/:app_no requires remarks and transitions status to Returned', async () => {
  // Reject without remarks
  const emptyRes = await request('/api/bplo/applications/return/APP-BPLO-1', 'PUT', { remarks: '' });
  assert.equal(emptyRes.status, 400);

  // Accept with valid remarks
  const validRes = await request('/api/bplo/applications/return/APP-BPLO-1', 'PUT', { remarks: 'Illegible DTI registration document' });
  assert.equal(validRes.status, 200);
  assert.equal(validRes.body.data.status, 'Returned');
  assert.equal(validRes.body.data.return_remarks, 'Illegible DTI registration document');
  assert.equal(dbTables.applications.status, 'Returned');
});

test('Barangay module is completely unmounted (/api/barangay returns 404)', async () => {
  const res = await request('/api/barangay/clearances', 'GET', undefined, 'Admin');
  assert.equal(res.status, 404);
});

test('Barangay_Officer role cannot access BPLO verification routes', async () => {
  const res = await request('/api/bplo/applications/APP-BPLO-1', 'GET', undefined, 'Barangay_Officer');
  assert.equal(res.status, 403);
});
