import 'fake-indexeddb/auto';
import { db } from '../src/db/db';
import { setPin, verifyPin, deletePin } from '../src/services/pinService';
import {
  registerAuthTokenGetter,
  setActiveOrgId,
  pullPinConfigs,
  flushPendingPinPushes
} from '../src/services/syncService';
import { hashPin } from '../src/utils/pinCrypto';
import { API_BASE_URL } from '../src/config/api';

const token = process.env.BEARER_TOKEN;
const orgId = process.env.ORG_ID;

if (!token || !orgId) {
  console.error('[FATAL] Missing BEARER_TOKEN or ORG_ID in environment variables.');
  process.exit(1);
}

Object.defineProperty(globalThis.navigator, 'onLine', {
  value: true,
  writable: true,
  configurable: true
});

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

  // 1. Setup
  await db.pinConfigs.clear();
  await db.pendingPinPushes.clear();

  // 2. Register token getter and active org
  registerAuthTokenGetter(async () => token);
  setActiveOrgId(orgId);

  console.log('\n========================================');
  console.log('STEP 3: VERIFY FRONTEND SYNC AGAINST LIVE BACKEND');
  console.log('========================================');

  // Step 4 & 5: setPin and wait 2 seconds
  await runStep('3.4-3.6: setPin("5678") and check remote row via GET', async () => {
    console.log(`Setting admin PIN to "5678" for org ${orgId}...`);
    await setPin(orgId, 'admin', '5678');

    console.log('Waiting 2 seconds for fire-and-forget push...');
    await new Promise(r => setTimeout(r, 2000));

    const res = await fetch(`${API_BASE_URL}/api/pin-configs`, { method: 'GET', headers });
    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log(`Body: ${redactBody(text)}`);
    if (res.status !== 200) return false;
    const rows = JSON.parse(text);
    const adminRow = rows.find((r: any) => r.profileType === 'admin');
    return Boolean(adminRow && adminRow.orgId === orgId && adminRow.deletedAt === null);
  });

  // Step 7: Clear local Dexie, call pullPinConfigs(), assert local has row
  await runStep('3.7: Simulate cross-device (clear local, pullPinConfigs)', async () => {
    await db.pinConfigs.clear();
    const countBefore = await db.pinConfigs.count();
    console.log(`Local pinConfigs count before pull: ${countBefore}`);

    await pullPinConfigs(orgId);
    const localRow = await db.pinConfigs.where('[orgId+profileType]').equals([orgId, 'admin']).first();
    console.log(`Local row recovered: ${Boolean(localRow)}, id: ${localRow?.id}`);
    return Boolean(localRow && localRow.profileType === 'admin');
  });

  // Step 8 & 9: verifyPin
  await runStep('3.8-3.9: verifyPin checks', async () => {
    const is5678 = await verifyPin(orgId, 'admin', '5678');
    const is0000 = await verifyPin(orgId, 'admin', '0000');
    console.log(`verifyPin('5678'): ${is5678}, verifyPin('0000'): ${is0000}`);
    return is5678 === true && is0000 === false;
  });

  // Step 10: deletePin, wait 2s, assert remote deletedAt
  await runStep('3.10: deletePin and verify remote soft-delete', async () => {
    console.log('Calling deletePin("admin")...');
    await deletePin(orgId, 'admin');

    console.log('Waiting 2 seconds for push...');
    await new Promise(r => setTimeout(r, 2000));

    const res = await fetch(`${API_BASE_URL}/api/pin-configs`, { method: 'GET', headers });
    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log(`Body: ${redactBody(text)}`);
    if (res.status !== 200) return false;
    const rows = JSON.parse(text);
    const adminRow = rows.find((r: any) => r.profileType === 'admin');
    return Boolean(adminRow && adminRow.deletedAt !== null);
  });

  // Step 11: pullPinConfigs again, assert local deletedAt and verifyPin returns false
  await runStep('3.11: pullPinConfigs propagates soft-delete locally', async () => {
    await pullPinConfigs(orgId);
    const localRow = await db.pinConfigs.where('[orgId+profileType]').equals([orgId, 'admin']).first();
    const isOldPinValid = await verifyPin(orgId, 'admin', '5678');
    console.log(`Local record deletedAt: ${localRow?.deletedAt}, isOldPinValid: ${isOldPinValid}`);
    return Boolean(localRow && localRow.deletedAt !== null && isOldPinValid === false);
  });

  console.log('\n========================================');
  console.log('STEP 4: VERIFY OFFLINE RETRY QUEUE');
  console.log('========================================');

  // Step 4.2: setPin with network online -> confirms remote row
  await runStep('4.2: setPin("1111") online', async () => {
    (globalThis.navigator as any).onLine = true;
    await setPin(orgId, 'admin', '1111');
    await new Promise(r => setTimeout(r, 2000));

    const res = await fetch(`${API_BASE_URL}/api/pin-configs`, { method: 'GET', headers });
    const rows = await res.json();
    const adminRow = rows.find((r: any) => r.profileType === 'admin');
    return Boolean(adminRow && adminRow.deletedAt === null);
  });

  // Step 4.3 & 4.4: set offline, setPin('2222')
  let hash2222 = '';
  await runStep('4.3-4.4: setPin("2222") while offline -> pendingPinPushes entry exists', async () => {
    (globalThis.navigator as any).onLine = false;

    const record = await setPin(orgId, 'admin', '2222');
    hash2222 = record.pinHash;

    const localRec = await db.pinConfigs.where('[orgId+profileType]').equals([orgId, 'admin']).first();
    const pendingPushes = await db.pendingPinPushes.toArray();

    console.log(`Local row hash matches 2222: ${localRec?.pinHash === hash2222}`);
    console.log(`Pending pushes queue count: ${pendingPushes.length}`);
    return Boolean(localRec?.pinHash === hash2222 && pendingPushes.length > 0);
  });

  // Step 4.5 & 4.6: Restore online, flushPendingPinPushes, confirm remote row updated
  await runStep('4.5-4.6: Restore online and flushPendingPinPushes -> remote row updated to "2222"', async () => {
    (globalThis.navigator as any).onLine = true;
    console.log('Network restored. Flushing pending PIN pushes...');
    await flushPendingPinPushes();
    await new Promise(r => setTimeout(r, 2000));

    const pendingAfter = await db.pendingPinPushes.toArray();
    console.log(`Pending pushes queue count after flush: ${pendingAfter.length}`);

    const res = await fetch(`${API_BASE_URL}/api/pin-configs`, { method: 'GET', headers });
    const rows = await res.json();
    const adminRow = rows.find((r: any) => r.profileType === 'admin');
    const isRemoteHash2222 = adminRow?.pinHash === hash2222;
    console.log(`Remote row pinHash matches 2222: ${isRemoteHash2222}`);
    return Boolean(pendingAfter.length === 0 && isRemoteHash2222);
  });

  console.log('\n========================================');
  console.log('ALL STEP 3 & STEP 4 TESTS VERIFIED SUCCESSFULLY');
  console.log('========================================');
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
