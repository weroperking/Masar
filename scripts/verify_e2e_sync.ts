import { API_BASE_URL } from '../src/config/api';

const token = process.env.BEARER_TOKEN;
const orgId = process.env.ORG_ID;

if (!token || !orgId) {
  console.error('[FATAL] Missing BEARER_TOKEN or ORG_ID in environment variables.');
  process.exit(1);
}

function redactBody(str: string): string {
  try {
    const obj = JSON.parse(str);
    const scrub = (o: any) => {
      if (typeof o !== 'object' || o === null) return o;
      for (const k of Object.keys(o)) {
        if (k === 'pinHash' || k === 'pinSalt' || k === 'token') {
          o[k] = '[REDACTED]';
        } else if (typeof o[k] === 'object') {
          scrub(o[k]);
        }
      }
      return o;
    };
    return JSON.stringify(scrub(obj));
  } catch {
    return str;
  }
}

async function runStep(stepName: string, fn: () => Promise<boolean>) {
  console.log(`\n--- Running Step: ${stepName} ---`);
  const success = await fn();
  if (!success) {
    console.error(`[FAIL] Step failed: ${stepName}`);
    process.exit(1);
  }
  console.log(`[PASS] Step passed: ${stepName}`);
}

async function main() {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const adminId = crypto.randomUUID();

  // Step a: GET /api/pin-configs
  await runStep('a. GET /api/pin-configs (initial)', async () => {
    const res = await fetch(`${API_BASE_URL}/api/pin-configs`, { method: 'GET', headers });
    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log(`Body: ${redactBody(text)}`);
    return res.status === 200 && Array.isArray(JSON.parse(text));
  });

  // Step b: PUT /api/pin-configs/admin with initial hash
  const initialUpdatedAt = new Date().toISOString();
  await runStep('b. PUT /api/pin-configs/admin (insert)', async () => {
    const body = {
      id: adminId,
      pinHash: 'aGFzaA==',
      pinSalt: 'c2FsdA==',
      pinIterations: 210000,
      pinAlgorithm: 'PBKDF2-SHA256',
      assistantPinRequired: false,
      autoLockMinutes: 15,
      updatedAt: initialUpdatedAt
    };
    const res = await fetch(`${API_BASE_URL}/api/pin-configs/admin`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body)
    });
    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log(`Body: ${text}`);
    return res.status === 200 && text.includes('"ok":true');
  });

  // Step c: GET /api/pin-configs — check admin row present and orgId matches
  await runStep('c. GET /api/pin-configs (verify insert)', async () => {
    const res = await fetch(`${API_BASE_URL}/api/pin-configs`, { method: 'GET', headers });
    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log(`Body: ${redactBody(text)}`);
    if (res.status !== 200) return false;
    const rows = JSON.parse(text);
    const adminRow = rows.find((r: any) => r.profileType === 'admin');
    return Boolean(adminRow && adminRow.orgId === orgId);
  });

  // Step d: PUT /api/pin-configs/admin with newer updatedAt and different hash
  await new Promise(r => setTimeout(r, 100));
  const updatedUpdatedAt = new Date().toISOString();
  await runStep('d. PUT /api/pin-configs/admin (upsert with newer updatedAt)', async () => {
    const body = {
      id: adminId,
      pinHash: 'bmV3aGFzaA==',
      pinSalt: 'bmV3c2FsdA==',
      pinIterations: 210000,
      pinAlgorithm: 'PBKDF2-SHA256',
      assistantPinRequired: false,
      autoLockMinutes: 15,
      updatedAt: updatedUpdatedAt
    };
    const res = await fetch(`${API_BASE_URL}/api/pin-configs/admin`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body)
    });
    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log(`Body: ${text}`);
    if (res.status !== 200 || !text.includes('"ok":true')) return false;

    // Verify GET shows exactly ONE admin row
    const getRes = await fetch(`${API_BASE_URL}/api/pin-configs`, { method: 'GET', headers });
    const getText = await getRes.text();
    const rows = JSON.parse(getText);
    const adminRows = rows.filter((r: any) => r.profileType === 'admin');
    console.log(`Admin rows count: ${adminRows.length}`);
    return adminRows.length === 1 && adminRows[0].pinHash === 'bmV3aGFzaA==';
  });

  // Step e: DELETE /api/pin-configs/admin
  await runStep('e. DELETE /api/pin-configs/admin', async () => {
    const res = await fetch(`${API_BASE_URL}/api/pin-configs/admin`, { method: 'DELETE', headers });
    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log(`Body: ${text}`);
    return res.status === 200 && text.includes('"ok":true');
  });

  // Step f: GET /api/pin-configs — soft delete check
  await runStep('f. GET /api/pin-configs (verify soft delete)', async () => {
    const res = await fetch(`${API_BASE_URL}/api/pin-configs`, { method: 'GET', headers });
    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log(`Body: ${redactBody(text)}`);
    if (res.status !== 200) return false;
    const rows = JSON.parse(text);
    const adminRow = rows.find((r: any) => r.profileType === 'admin');
    return Boolean(adminRow && adminRow.deletedAt !== null);
  });

  // Step g: GET /api/sync/pull?since=2020-01-01T00:00:00.000Z
  await runStep('g. GET /api/sync/pull?since=2020-01-01T00:00:00.000Z', async () => {
    const res = await fetch(`${API_BASE_URL}/api/sync/pull?since=2020-01-01T00:00:00.000Z`, { method: 'GET', headers });
    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log(`Body: ${redactBody(text)}`);
    if (res.status !== 200) return false;
    const data = JSON.parse(text);
    const pinConfigs = data.pinConfigs || [];
    const adminRow = pinConfigs.find((r: any) => r.profileType === 'admin');
    return Boolean(adminRow && adminRow.deletedAt !== null);
  });

  // Step h: POST /api/sync/push with fresh admin record
  await runStep('h. POST /api/sync/push with pinConfigs upsert op', async () => {
    const freshId = crypto.randomUUID();
    const op = {
      idempotencyKey: `verify-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      entityType: 'pinConfigs',
      entityId: freshId,
      operation: 'upsert',
      payload: {
        id: freshId,
        profileType: 'admin',
        pinHash: 'cHVzaGhhc2g=',
        pinSalt: 'cHVzaHNhbHQ=',
        pinIterations: 210000,
        pinAlgorithm: 'PBKDF2-SHA256',
        assistantPinRequired: false,
        autoLockMinutes: 15,
        updatedAt: new Date().toISOString(),
        deletedAt: null
      }
    };
    const res = await fetch(`${API_BASE_URL}/api/sync/push`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ operations: [op] })
    });
    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log(`Body: ${redactBody(text)}`);
    if (res.status !== 200) return false;
    const body = JSON.parse(text);
    return body.results && body.results[0] && body.results[0].status === 'success';
  });

  console.log('\n========================================');
  console.log('ALL STEP 2 E2E ENDPOINTS VERIFIED SUCCESSFULLY');
  console.log('========================================');
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
