/**
 * DOCUMENT VERSION MANAGER - Integration Test Suite
 * Validates Authentication, Backend API routes, Database Operations, and Security Constraints
 */

const assert = require('assert');
const app = require('../server/server');
const { userDAO, docDAO, versionDAO, notificationDAO, activityDAO } = require('../server/db');

let server;
const PORT = 3055;
const BASE_URL = `http://localhost:${PORT}`;

async function runTests() {
  console.log('================================================================');
  console.log('🚀 Running DVM Test Suite: Auth, Backend, and Database');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    return async () => {
      try {
        await fn();
        console.log(`  ✅ PASS: ${name}`);
        passed++;
      } catch (err) {
        console.error(`  ❌ FAIL: ${name}`);
        console.error(`     Error: ${err.message}`);
        failed++;
      }
    };
  }

  // Start temporary test server
  await new Promise((resolve) => {
    server = app.listen(PORT, resolve);
  });

  try {
    // 1. Healthcheck Test
    await test('GET /api/health returns healthy status', async () => {
      const res = await fetch(`${BASE_URL}/api/health`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'healthy');
    })();

    // 2. Safe Public Config Test (No secrets leaked)
    await test('GET /api/config returns safe public config and no secrets', async () => {
      const res = await fetch(`${BASE_URL}/api/config`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.firebase);
      assert.strictEqual(typeof data.firebase.apiKey, 'string');
      // Ensure no private keys or database passwords leaked
      assert.strictEqual(data.JWT_SECRET, undefined);
      assert.strictEqual(data.FIREBASE_PRIVATE_KEY, undefined);
    })();

    // 2b. Real Mobile SMS OTP Send & Verify Flow
    const testTimestamp = Date.now().toString().slice(-8);
    const realTestPhone = '+9197' + testTimestamp;
    let realOtpGenerated = '';
    let testToken = '';
    let testUserId = '';

    await test('POST /api/auth/send-otp validates mobile and dispatches OTP', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: realTestPhone })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.phone, realTestPhone);
      assert.ok(data.message);
      // SECURITY: the OTP must never be present in the API response
      assert.strictEqual(data.code, undefined);
      assert.strictEqual(data.otp, undefined);
      assert.strictEqual(data.devCode, undefined);
      // Grab the code from the SERVER-SIDE database only (never from the API)
      const { otpDAO } = require('../server/db');
      const rec = otpDAO.findLatestPending(realTestPhone);
      assert.ok(rec, 'OTP record must exist in database');
      assert.strictEqual(rec.phone_number, realTestPhone);
      realOtpGenerated = rec.code;
      // The 6-digit code must not leak anywhere in the serialized response
      assert.ok(
        !JSON.stringify(data).includes(realOtpGenerated),
        'OTP code must not appear anywhere in the API response'
      );
    })();

    await test('POST /api/auth/verify-otp rejects incorrect OTP code', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: realTestPhone,
          otp: '000000'
        })
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.message.includes('Incorrect OTP'));
    })();

    await test('POST /api/auth/verify-otp successfully authenticates with correct OTP', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: realTestPhone,
          otp: realOtpGenerated,
          name: 'Real Mobile User'
        })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.token, 'Must return signed session token');
      assert.strictEqual(data.user.phone_number, realTestPhone);
      // SECURITY: OTP never echoed back
      assert.ok(!JSON.stringify(data).includes(realOtpGenerated));
      testToken = data.token;
      testUserId = data.user.id;
    })();

    // 2c. Duplicate prevention: a returning user logs into the SAME profile
    await test('Repeat verified login for same phone returns same profile (no duplicates)', async () => {
      const sendRes = await fetch(`${BASE_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: realTestPhone })
      });
      assert.strictEqual(sendRes.status, 200);

      const { otpDAO } = require('../server/db');
      const rec = otpDAO.findLatestPending(realTestPhone);
      assert.ok(rec, 'Fresh OTP must be pending for the second login');

      const verRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: realTestPhone, otp: rec.code })
      });
      assert.strictEqual(verRes.status, 200);
      const verData = await verRes.json();
      assert.strictEqual(verData.success, true);
      assert.strictEqual(verData.user.id, testUserId, 'Same phone must map to the same account');
      assert.strictEqual(verData.user.phone_number, realTestPhone);
    })();

    // 2d. Refresh endpoint must safely reject a missing / invalid refresh token
    await test('POST /api/auth/refresh rejects a missing refresh token', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    })();

    // 5. Protected Route Guard (401 without Token)
    await test('GET /api/auth/me returns 401 when token is missing', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/me`);
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    })();

    // 6. Protected Route Guard (403 with Invalid Token)
    await test('GET /api/auth/me returns 403 when token is invalid or tampered', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { 'Authorization': 'Bearer invalid.tampered.token' }
      });
      assert.strictEqual(res.status, 403);
    })();

    // 7. Authenticated Session Verification
    await test('GET /api/auth/me returns verified user profile with valid token', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${testToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.user.id, testUserId);
      assert.strictEqual(data.user.phone_number, realTestPhone);
    })();

    // 8. Profile Update Operation
    await test('PUT /api/user/profile updates user details in database', async () => {
      const res = await fetch(`${BASE_URL}/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testToken}`
        },
        body: JSON.stringify({
          full_name: 'Dinesh Kumar Updated',
          email: 'dinesh.updated@college.edu'
        })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.profile.full_name, 'Dinesh Kumar Updated');
      assert.strictEqual(data.profile.email, 'dinesh.updated@college.edu');

      // Verify in DB directly
      const fromDb = userDAO.findById(testUserId);
      assert.strictEqual(fromDb.full_name, 'Dinesh Kumar Updated');
      assert.strictEqual(fromDb.email, 'dinesh.updated@college.edu');
    })();

    // 9. Document Creation & Retrieval
    let createdDocId = '';
    await test('POST /api/documents creates new document & initial baseline in database', async () => {
      const res = await fetch(`${BASE_URL}/api/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testToken}`
        },
        body: JSON.stringify({
          name: 'Semester Architecture.docx',
          type: 'docx',
          version: 'v1.0',
          size: '2.5 MB',
          description: 'Initial architectural baseline',
          content: 'Architecture content v1.0'
        })
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.document.name, 'Semester Architecture.docx');
      assert.strictEqual(data.document.current_version, 'v1.0');
      createdDocId = data.document.id;
    })();

    // 10. Document Version Addition
    await test('POST /api/documents/:id/versions adds new revision and bumps version', async () => {
      const res = await fetch(`${BASE_URL}/api/documents/${createdDocId}/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testToken}`
        },
        body: JSON.stringify({
          version: 'v2.0',
          size: '2.8 MB',
          description: 'Added SCM pipeline diagrams',
          content: 'Architecture content v2.0 with diagrams'
        })
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.version.version, 'v2.0');

      // Check versions count
      const versions = versionDAO.getByDocId(createdDocId);
      assert.strictEqual(versions.length, 2);
    })();

    // 11. Document Version Safe Non-Destructive Restore
    await test('POST /api/documents/:id/restore points baseline pointer to target version safely', async () => {
      const res = await fetch(`${BASE_URL}/api/documents/${createdDocId}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testToken}`
        },
        body: JSON.stringify({ targetVersion: 'v1.0' })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);

      // Verify active version is now v1.0 while history remains 2 versions
      const doc = docDAO.getById(createdDocId, testUserId);
      assert.strictEqual(doc.current_version, 'v1.0');
      const versions = versionDAO.getByDocId(createdDocId);
      assert.strictEqual(versions.length, 2, 'History must not be destroyed');
    })();

    // 12. Notifications Retrieval and Read Status
    await test('GET /api/notifications & POST /api/notifications/read update read status', async () => {
      const res = await fetch(`${BASE_URL}/api/notifications`, {
        headers: { 'Authorization': `Bearer ${testToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data.notifications));

      const readRes = await fetch(`${BASE_URL}/api/notifications/read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${testToken}` }
      });
      assert.strictEqual(readRes.status, 200);
    })();

  } finally {
    server.close();
  }

  console.log('\n================================================================');
  console.log(`Test Execution Finished: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
