const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const express = require('express');

const taxpayerUserId = '11111111-1111-4111-8111-111111111111';
const taxpayerId = '22222222-2222-4222-8222-222222222222';
const appNo = 'APP-TEST-PAY-001';

let rpcCalls = [];

const mockDatabase = {
  from(table) {
    const builder = {
      _select: null,
      _eq: {},
      select(fields) { this._select = fields; return this; },
      eq(col, val) { this._eq[col] = val; return this; },
      order() { return this; },
      in() { return this; },
      single() {
        let data = null;
        if (table === 'applications') {
          data = {
            application_no: appNo,
            status: 'For Payment',
            business_id: 'biz-001',
            businesses: {
              taxpayer_id: taxpayerId,
              business_name: 'Test Bakery'
            },
            assessments: [{
              id: 'ass-001',
              total_amount: 1500.00,
              transactions: [{
                transaction_id: 'tx-001',
                tendered_type: 'GCash',
                payment_reference_no: 'REF-123456',
                payment_date: '2026-11-08',
                proof_file_path: `${taxpayerId}/proof.jpg`,
                verification_status: 'Pending',
                rejection_reason: null,
                amount_due: 1500.00,
                amount_tendered: 1500.00
              }]
            }]
          };
        }
        return Promise.resolve({ data, error: null });
      },
      maybeSingle() {
        return this.single();
      },
      then(resolve, reject) {
        return Promise.resolve({ data: [], error: null }).then(resolve, reject);
      }
    };
    return builder;
  },
  async rpc(name, payload) {
    rpcCalls.push({ name, payload });
    return { data: { tendered_type: payload.p_channel, verification_status: 'Pending' }, error: null };
  },
  storage: {
    from(bucket) {
      return {
        async info(path) {
          return path.endsWith('missing.jpg') ? { data: null, error: { message: 'Not found' } } :
            { data: { size: 1024, contentType: 'image/jpeg' }, error: null };
        },
        createSignedUploadUrl(path) {
          return Promise.resolve({
            data: { signedUrl: `https://storage.test/${bucket}/${path}?token=signed` },
            error: null
          });
        },
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
stub('../src/services/application.service', {});
stub('../src/services/pdf.service', {});
stub('../src/services/email.service', { dispatchEmail() {}, EMAIL_TRIGGERS: {} });
stub('../src/controllers/correction.controller', new Proxy({}, {
  get: () => (req, res, next) => next ? next() : res.status(200).json({ success: true })
}));

stub('../src/middlewares/auth.middleware', {
  authenticate(req, res, next) {
    if (!req.headers['x-test-role']) return res.status(401).json({ success: false });
    req.user = {
      userId: taxpayerUserId,
      taxpayerId: taxpayerId,
      roleName: req.headers['x-test-role']
    };
    next();
  }
});

const { errorHandler } = require('../src/middlewares/error.middleware');
const treasuryRoutes = require('../src/routes/treasury.routes');

const app = express();
app.use(express.json());
app.use('/api/treasury', treasuryRoutes);
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
});

async function request(url, method = 'GET', body, role = 'Applicant') {
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
  return { status: res.status, body: parsedBody };
}

test('PayMongo endpoints are removed and return 404', async () => {
  const onlineRes = await request('/api/treasury/payments/online', 'POST', { application_no: appNo }, 'Treasury_Officer');
  assert.equal(onlineRes.status, 404);

  const webhookRes = await request('/api/webhooks/paymongo', 'POST', {}, 'Treasury_Officer');
  assert.equal(webhookRes.status, 404);
});

test('Proof upload URL validates file extensions and returns signed URL', async () => {
  // Invalid extension
  const invalidRes = await request('/api/treasury/payments/proof-upload-url', 'POST', {
    fileName: 'malicious.exe',
    fileType: 'application/x-msdownload'
  });
  assert.equal(invalidRes.status, 400);

  // Valid jpg upload
  const validRes = await request('/api/treasury/payments/proof-upload-url', 'POST', {
    fileName: 'deposit_slip.jpg',
    fileType: 'image/jpeg'
  });
  assert.equal(validRes.status, 200);
  assert.ok(validRes.body.data.uploadUrl.includes('proof-of-payments'));
  assert.ok(validRes.body.data.filePath.includes(taxpayerId));
});

test('submission checks owned uploaded files before forwarding one atomic call', async () => {
  const path = '/api/treasury/payments/proof';
  const proof = { application_no: appNo, payment_channel: 'GCash', payment_reference_no: 'REF-GCASH-98765',
    payment_date: '2026-11-08', proof_file_path: `${taxpayerId}/proof.jpg` };
  for (const invalid of [
    { payment_channel: 'PayMongo' }, { payment_date: '2026-02-30' },
    { proof_file_path: 'another-account/proof.jpg' }, { proof_file_path: `${taxpayerId}/missing.jpg` },
  ]) {
    assert.equal((await request(path, 'POST', { ...proof, ...invalid })).status, 400);
  }
  assert.deepEqual(rpcCalls, []);
  const result = await request(path, 'POST', proof);
  assert.equal(result.status, 200);
  assert.deepEqual(rpcCalls, [{ name: 'submit_online_payment_proof', payload: {
    p_application_no: appNo, p_actor: taxpayerUserId, p_channel: 'GCash',
    p_reference: proof.payment_reference_no, p_payment_date: proof.payment_date, p_file: proof.proof_file_path,
  } }]);
});

test('Get payment proof returns signed view URL for application proof', async () => {
  const res = await request(`/api/treasury/payments/${appNo}/proof`, 'GET');
  assert.equal(res.status, 200);
  assert.ok(res.body.data.url.includes('proof-of-payments'));
  assert.equal(res.body.data.transaction.payment_reference_no, 'REF-123456');
});
