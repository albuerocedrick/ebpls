const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const express = require('express');

const officerUserId = '33333333-3333-4333-8333-333333333333';
const taxpayerId = '22222222-2222-4222-8222-222222222222';
const appNo = 'APP-TEST-VERIFY-001';
const txId = '44444444-4444-4444-8444-444444444444';

let rpcCalls = [];
let auditLogs = [];
let statusUpdates = [];
let updatedTransactions = [];
let currentAppStatus = 'PaymentVerificationPending';

const mockTxRecord = {
  transaction_id: txId,
  assessment_id: 'ass-001',
  amount_due: 2500.00,
  amount_tendered: 2500.00,
  change_amount: 0.00,
  tendered_type: 'GCash',
  payment_reference_no: 'GCASH-REF-888999',
  payment_date: '2026-11-08',
  proof_file_path: `${taxpayerId}/proof.jpg`,
  verification_status: 'Pending',
  rejection_reason: null,
  or_number: null,
  assessments: {
    id: 'ass-001',
    application_no: appNo,
    total_amount: 2500.00,
    applications: {
      application_no: appNo,
      status: currentAppStatus,
      submitted_at: '2026-11-08T08:00:00Z',
      businesses: {
        business_name: 'Liliw Footwear Craft',
        trade_name: 'Liliw Shoes',
        address_line1: '123 Gat Tayaw St',
        barangay: 'Poblacion',
        contact_no: '09170001111',
        taxpayers: {
          first_name: 'Juan',
          last_name: 'Dela Cruz',
          users: {
            email: 'juan@example.test',
            user_id: 'user-001'
          }
        }
      }
    }
  }
};

const mockDatabase = {
  from(table) {
    const builder = {
      _select: null,
      _eq: {},
      select(fields) { this._select = fields; return this; },
      eq(col, val) { this._eq[col] = val; return this; },
      not() { return this; },
      order() { return this; },
      limit() { return this; },
      in() { return this; },
      like() { return this; },
      maybeSingle() { return this.single(); },
      single() {
        let data = null;
        if (table === 'transactions') {
          data = mockTxRecord;
        }
        if (table === 'applications') {
          data = mockTxRecord.assessments.applications;
        }
        return Promise.resolve({ data, error: null });
      },
      update(values) {
        updatedTransactions.push(values);
        return {
          eq(col, val) {
            return {
              select() {
                return {
                  single() {
                    return Promise.resolve({
                      data: { ...mockTxRecord, ...values },
                      error: null
                    });
                  }
                };
              }
            };
          }
        };
      },
      insert() {
        return Promise.resolve({ error: null });
      },
      then(resolve, reject) {
        let data = [];
        if (table === 'transactions') {
          data = [mockTxRecord];
        }
        if (table === 'applications') {
          data = [mockTxRecord.assessments.applications];
        }
        return Promise.resolve({ data, error: null }).then(resolve, reject);
      }
    };
    return builder;
  },
  storage: {
    from(bucket) {
      return {
        createSignedUrl(path, expiry) {
          return Promise.resolve({
            data: { signedUrl: `https://storage.test/${bucket}/${path}?expiry=${expiry}` },
            error: null
          });
        }
      };
    }
  }
};

function stub(name, exports) {
  const id = require.resolve(name);
  require.cache[id] = { id, filename: id, loaded: true, exports };
}

stub('../src/config/supabase', { supabaseAdmin: mockDatabase });
stub('../src/services/application.service', {
  updateApplicationStatus: async (appNoParam, newStatus) => {
    statusUpdates.push({ appNo: appNoParam, newStatus });
    currentAppStatus = newStatus;
    return { success: true };
  }
});
stub('../src/services/email.service', { dispatchEmail() {}, EMAIL_TRIGGERS: {} });
stub('../src/services/audit.service', {
  logAction: async (entry) => {
    auditLogs.push(entry);
  },
  AUDIT_ACTIONS: require('../src/utils/constants').AUDIT_ACTIONS
});

stub('../src/middlewares/auth.middleware', {
  authenticate(req, res, next) {
    if (!req.headers['x-test-role']) return res.status(401).json({ success: false });
    req.user = {
      userId: officerUserId,
      roleName: req.headers['x-test-role']
    };
    next();
  }
});

const { errorHandler } = require('../src/middlewares/error.middleware');
const treasuryRoutes = require('../src/routes/treasury.routes');
const adminRoutes = require('../src/routes/admin.routes');
const bploRoutes = require('../src/routes/bplo.routes');

const { authenticate } = require('../src/middlewares/auth.middleware');

const app = express();
app.use(express.json());
app.use('/api/treasury', treasuryRoutes);
app.use('/api/admin', authenticate, adminRoutes);
app.use('/api/bplo', authenticate, bploRoutes);
app.use(errorHandler);

let server, base;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

beforeEach(() => {
  rpcCalls = [];
  auditLogs = [];
  statusUpdates = [];
  updatedTransactions = [];
  currentAppStatus = 'PaymentVerificationPending';
});

async function request(url, method = 'GET', body, role = 'Treasury_Officer') {
  const res = await fetch(base + url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-test-role': role
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let parsedBody;
  try {
    parsedBody = JSON.parse(text);
  } catch {
    parsedBody = text;
  }
  return { status: res.status, body: parsedBody, headers: res.headers };
}

test('Cashier can fetch pending deposit slips with signed preview URLs', async () => {
  const res = await request('/api/treasury/payments/pending-proofs', 'GET', null, 'Treasury_Officer');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(Array.isArray(res.body.data));
  assert.equal(res.body.data.length, 1);
  assert.equal(res.body.data[0].payment_reference_no, 'GCASH-REF-888999');
  assert.ok(res.body.data[0].proof_url.includes('proof-of-payments'));
});

test('Confirming payment proof verifies transaction, issues OR number, and completes application', async () => {
  const res = await request(`/api/treasury/payments/${txId}/verify-proof`, 'PUT', {
    action: 'VERIFY'
  }, 'Treasury_Officer');

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.data.or_number.startsWith('OTC-'));

  // Transaction verified
  assert.equal(updatedTransactions.length, 1);
  assert.equal(updatedTransactions[0].verification_status, 'Verified');
  assert.ok(updatedTransactions[0].or_number.startsWith('OTC-'));
  assert.equal(updatedTransactions[0].cashier_id, officerUserId);

  // Status progression: Paid -> Completed
  assert.equal(statusUpdates.length, 2);
  assert.equal(statusUpdates[0].newStatus, 'Paid');
  assert.equal(statusUpdates[1].newStatus, 'Completed');

  // Audit logged
  const verifyAudit = auditLogs.find((l) => l.action === 'PAYMENT_PROOF_VERIFIED');
  assert.ok(verifyAudit);
});

test('Rejecting payment proof requires reason, updates transaction, and reverts application to For Payment', async () => {
  // Missing reason
  const badRes = await request(`/api/treasury/payments/${txId}/verify-proof`, 'PUT', {
    action: 'REJECT'
  }, 'Treasury_Officer');
  assert.equal(badRes.status, 400);

  // Valid rejection
  const res = await request(`/api/treasury/payments/${txId}/verify-proof`, 'PUT', {
    action: 'REJECT',
    rejection_reason: 'Unreadable receipt screenshot. Please re-upload a clear image.'
  }, 'Treasury_Officer');

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);

  assert.equal(updatedTransactions.length, 1);
  assert.equal(updatedTransactions[0].verification_status, 'Rejected');
  assert.equal(updatedTransactions[0].rejection_reason, 'Unreadable receipt screenshot. Please re-upload a clear image.');

  // Application returned to For Payment
  assert.equal(statusUpdates.length, 1);
  assert.equal(statusUpdates[0].newStatus, 'For Payment');

  const rejectAudit = auditLogs.find((l) => l.action === 'PAYMENT_PROOF_REJECTED');
  assert.ok(rejectAudit);
});

test('Joint Inspection List (JIL) PDF report generates valid PDF document', async () => {
  // Admin download
  const adminRes = await request('/api/admin/reports/joint-inspection-list', 'GET', null, 'Admin');
  assert.equal(adminRes.status, 200);
  assert.equal(adminRes.headers.get('content-type'), 'application/pdf');
  assert.ok(adminRes.body.startsWith('%PDF-'));

  // BPLO download
  const bploRes = await request('/api/bplo/reports/joint-inspection-list', 'GET', null, 'BPLO_Officer');
  assert.equal(bploRes.status, 200);
  assert.equal(bploRes.headers.get('content-type'), 'application/pdf');
  assert.ok(bploRes.body.startsWith('%PDF-'));
});
