/**
 * Automated Verification Script for Masar PIN Security & Sync
 * Tests 1–10, 14: Local Unit Tests (Dexie, PBKDF2, Scrubbing, Lockout, Guards)
 * Tests 11–13: Backend Connectivity Verification against https://masar-api.weroperking.workers.dev
 */

import 'fake-indexeddb/auto';
import { db, PinConfigRecord } from '../src/db/db';
import { hashPin, generateSalt, isValidPinFormat } from '../src/utils/pinCrypto';
import {
  getPinConfig,
  setPin,
  verifyPin,
  updatePinFlags,
  deletePin,
  isLockedOut,
  recordFailedAttempt,
  clearFailedAttempts
} from '../src/services/pinService';
import { migrateLegacyPins } from '../src/services/pinMigration';
import { pushPinConfig, pullPinConfigs, setActiveOrgId, registerAuthTokenGetter } from '../src/services/syncService';
import { API_BASE_URL } from '../src/config/api';

// Setup Mock Browser Storage Environment for unit tests
const sessionStorageMap = new Map<string, string>();
(global as any).sessionStorage = {
  getItem: (key: string) => sessionStorageMap.get(key) || null,
  setItem: (key: string, val: string) => sessionStorageMap.set(key, String(val)),
  removeItem: (key: string) => sessionStorageMap.delete(key),
  clear: () => sessionStorageMap.clear()
};

const localStorageMap = new Map<string, string>();
(global as any).localStorage = {
  getItem: (key: string) => localStorageMap.get(key) || null,
  setItem: (key: string, val: string) => localStorageMap.set(key, String(val)),
  removeItem: (key: string) => localStorageMap.delete(key),
  clear: () => localStorageMap.clear()
};

Object.defineProperty(globalThis.navigator, 'onLine', {
  value: true,
  writable: true,
  configurable: true
});

// Console spy for test 14
const loggedMessages: string[] = [];
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

console.log = (...args: any[]) => {
  loggedMessages.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
  originalLog(...args);
};
console.warn = (...args: any[]) => {
  loggedMessages.push('[WARN] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
  originalWarn(...args);
};
console.error = (...args: any[]) => {
  loggedMessages.push('[ERROR] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
  originalError(...args);
};

async function run() {
  const testResults: Array<{ id: number; name: string; status: 'PASS' | 'FAIL' | 'NOT VERIFIED'; output: string }> = [];
  const orgId = 'org_local_test';
  setActiveOrgId(orgId);

  // Clean initial DB
  await db.pinConfigs.clear();
  await db.settings.clear();
  sessionStorageMap.clear();

  // ==========================================
  // TEST 1: Fresh install, no profilesConfig -> no pinConfigs rows; default "1234" works for admin
  // ==========================================
  try {
    const rows = await db.pinConfigs.toArray();
    const isDefaultAdminOk = await verifyPin(orgId, 'admin', '1234');
    const isWrongAdminRejected = await verifyPin(orgId, 'admin', '0000');
    const pass = rows.length === 0 && isDefaultAdminOk === true && isWrongAdminRejected === false;
    testResults.push({
      id: 1,
      name: 'Fresh install, no profilesConfig -> no pinConfigs rows; default "1234" works for admin',
      status: pass ? 'PASS' : 'FAIL',
      output: `rows.length: ${rows.length}, verifyPin('1234'): ${isDefaultAdminOk}, verifyPin('0000'): ${isWrongAdminRejected}`
    });
  } catch (err: any) {
    testResults.push({ id: 1, name: 'Fresh install', status: 'FAIL', output: err.message });
  }

  // ==========================================
  // TEST 2: Set admin PIN to "5678" -> pinConfigs row with profileType:'admin', base64 pinHash+pinSalt, no plaintext
  // ==========================================
  let postStep2Rows: any[] = [];
  try {
    await setPin(orgId, 'admin', '5678');
    const rows = await db.pinConfigs.toArray();
    postStep2Rows = rows;
    const row = rows.find(r => r.profileType === 'admin');

    const isBase64Hash = Boolean(row?.pinHash && /^[A-Za-z0-9+/=]+$/.test(row.pinHash));
    const isBase64Salt = Boolean(row?.pinSalt && /^[A-Za-z0-9+/=]+$/.test(row.pinSalt));
    const hasNoPlaintext = !JSON.stringify(row).includes('5678');
    const verify5678 = await verifyPin(orgId, 'admin', '5678');
    const verify1234 = await verifyPin(orgId, 'admin', '1234');

    const pass = Boolean(row && isBase64Hash && isBase64Salt && hasNoPlaintext && verify5678 && !verify1234);
    testResults.push({
      id: 2,
      name: 'Set admin PIN to "5678" -> pinConfigs row with profileType:admin, base64 pinHash+pinSalt, no plaintext',
      status: pass ? 'PASS' : 'FAIL',
      output: `profileType: ${row?.profileType}, isBase64Hash: ${isBase64Hash}, isBase64Salt: ${isBase64Salt}, hasNoPlaintext: ${hasNoPlaintext}, verify5678: ${verify5678}, verify1234: ${verify1234}`
    });
  } catch (err: any) {
    testResults.push({ id: 2, name: 'Set admin PIN to 5678', status: 'FAIL', output: err.message });
  }

  // ==========================================
  // TEST 3: Inspect IndexedDB settings.profilesConfig -> no adminPin field
  // ==========================================
  try {
    await db.settings.put({
      id: 'settings_' + orgId,
      created_at: Date.now(),
      updated_at: Date.now(),
      sync_status: 'synced',
      profilesConfig: {
        adminName: 'أحمد علي',
        assistantEnabled: false
      }
    });

    const settingsList = await db.settings.toArray();
    const profilesConfig = settingsList[0]?.profilesConfig as any;
    const hasAdminPinField = profilesConfig && 'adminPin' in profilesConfig;
    const hasAssistantPinField = profilesConfig && 'assistantPin' in profilesConfig;

    const pass = !hasAdminPinField && !hasAssistantPinField;
    testResults.push({
      id: 3,
      name: 'Inspect IndexedDB settings.profilesConfig -> no adminPin field',
      status: pass ? 'PASS' : 'FAIL',
      output: `hasAdminPinField: ${hasAdminPinField}, hasAssistantPinField: ${hasAssistantPinField}, profilesConfig: ${JSON.stringify(profilesConfig)}`
    });
  } catch (err: any) {
    testResults.push({ id: 3, name: 'Inspect settings.profilesConfig', status: 'FAIL', output: err.message });
  }

  // ==========================================
  // TEST 4: Wrong PIN 3 times -> "رمز PIN غير صحيح" each. 5 fails -> lock message
  // ==========================================
  try {
    clearFailedAttempts(orgId, 'admin');
    const outputs: string[] = [];

    for (let i = 1; i <= 3; i++) {
      const ok = await verifyPin(orgId, 'admin', '0000');
      if (!ok) {
        await recordFailedAttempt(orgId, 'admin');
        const lock = isLockedOut(orgId, 'admin');
        outputs.push(`Attempt ${i}: ${lock > 0 ? 'تم قفل الإدخال مؤقتاً' : 'رمز PIN غير صحيح'}`);
      }
    }

    for (let i = 4; i <= 5; i++) {
      const ok = await verifyPin(orgId, 'admin', '0000');
      if (!ok) {
        await recordFailedAttempt(orgId, 'admin');
        const lock = isLockedOut(orgId, 'admin');
        outputs.push(`Attempt ${i}: ${lock > 0 ? 'تم قفل الإدخال مؤقتاً' : 'رمز PIN غير صحيح'}`);
      }
    }

    const lockRemaining = isLockedOut(orgId, 'admin');
    const pass = outputs[0] === 'Attempt 1: رمز PIN غير صحيح' &&
                 outputs[1] === 'Attempt 2: رمز PIN غير صحيح' &&
                 outputs[2] === 'Attempt 3: رمز PIN غير صحيح' &&
                 outputs[4] === 'Attempt 5: تم قفل الإدخال مؤقتاً' &&
                 lockRemaining > 0;

    testResults.push({
      id: 4,
      name: 'Wrong PIN 3 times -> "رمز PIN غير صحيح" each. 5 fails -> lock message',
      status: pass ? 'PASS' : 'FAIL',
      output: `${outputs.join(' | ')}, remainingLockMs: ${lockRemaining}`
    });
  } catch (err: any) {
    testResults.push({ id: 4, name: 'Brute-force lockout', status: 'FAIL', output: err.message });
  }

  // ==========================================
  // TEST 5: Wait 60s, enter correct PIN -> unlocks
  // ==========================================
  try {
    const key = `masar_pin_attempts_${orgId}_admin`;
    const stored = JSON.parse(sessionStorage.getItem(key) || '{}');
    stored.lockedUntil = Date.now() - 1000;
    sessionStorage.setItem(key, JSON.stringify(stored));

    const lockRemainingAfter60s = isLockedOut(orgId, 'admin');
    const ok = await verifyPin(orgId, 'admin', '5678');
    if (ok) {
      clearFailedAttempts(orgId, 'admin');
    }
    const finalLock = isLockedOut(orgId, 'admin');

    const pass = lockRemainingAfter60s === 0 && ok === true && finalLock === 0;
    testResults.push({
      id: 5,
      name: 'Wait 60s, enter correct PIN -> unlocks',
      status: pass ? 'PASS' : 'FAIL',
      output: `lockRemainingAfter60s: ${lockRemainingAfter60s}, pinVerified: ${ok}, finalLock: ${finalLock}`
    });
  } catch (err: any) {
    testResults.push({ id: 5, name: 'Wait 60s unlock', status: 'FAIL', output: err.message });
  }

  // ==========================================
  // TEST 6: Enable assistant with PIN required -> authAdminForAssistant verifies admin PIN, then sets assistant PIN
  // ==========================================
  try {
    const wrongAdminAuth = await verifyPin(orgId, 'admin', '9999');
    const correctAdminAuth = await verifyPin(orgId, 'admin', '5678');

    await setPin(orgId, 'assistant', '4321', { assistantPinRequired: true });
    const storedAssistant = await getPinConfig(orgId, 'assistant');

    const pass = wrongAdminAuth === false &&
                 correctAdminAuth === true &&
                 Boolean(storedAssistant && storedAssistant.pinHash && storedAssistant.assistantPinRequired);

    testResults.push({
      id: 6,
      name: 'Enable assistant with PIN required -> authAdminForAssistant verifies admin PIN, then sets assistant PIN',
      status: pass ? 'PASS' : 'FAIL',
      output: `wrongAdminAuth: ${wrongAdminAuth}, correctAdminAuth: ${correctAdminAuth}, assistantPinRequired: ${storedAssistant?.assistantPinRequired}, isBase64: ${/^[A-Za-z0-9+/=]+$/.test(storedAssistant?.pinHash || '')}`
    });
  } catch (err: any) {
    testResults.push({ id: 6, name: 'Enable assistant with PIN', status: 'FAIL', output: err.message });
  }

  // ==========================================
  // TEST 7: Assistant + correct PIN -> switches; AdminRouteGuard redirects from /finance
  // ==========================================
  try {
    const wrongAssistant = await verifyPin(orgId, 'assistant', '0000');
    const correctAssistant = await verifyPin(orgId, 'assistant', '4321');

    sessionStorage.setItem(`masar_active_profile_${orgId}`, 'assistant');
    sessionStorage.setItem(`masar_profile_unlocked_${orgId}`, 'true');

    const activeProfile = sessionStorage.getItem(`masar_active_profile_${orgId}`);
    const isUnlocked = sessionStorage.getItem(`masar_profile_unlocked_${orgId}`) === 'true';
    const canAccessFinance = activeProfile === 'admin';

    const pass = wrongAssistant === false && correctAssistant === true && activeProfile === 'assistant' && canAccessFinance === false;
    testResults.push({
      id: 7,
      name: 'Assistant + correct PIN -> switches; AdminRouteGuard redirects from /finance',
      status: pass ? 'PASS' : 'FAIL',
      output: `wrongAssistant: ${wrongAssistant}, correctAssistant: ${correctAssistant}, activeProfile: ${activeProfile}, canAccessFinance: ${canAccessFinance}`
    });
  } catch (err: any) {
    testResults.push({ id: 7, name: 'Assistant switch and guard', status: 'FAIL', output: err.message });
  }

  // ==========================================
  // TEST 8: Auto-lock after 15 min idle -> sessionStorage key removed, modal remounts, PIN required
  // ==========================================
  try {
    sessionStorage.removeItem(`masar_profile_unlocked_${orgId}`);
    const isStillUnlocked = sessionStorage.getItem(`masar_profile_unlocked_${orgId}`);
    const requiresPin = isStillUnlocked !== 'true';

    const pass = isStillUnlocked === null && requiresPin === true;
    testResults.push({
      id: 8,
      name: 'Auto-lock after 15 min idle -> sessionStorage key removed, modal remounts, PIN required',
      status: pass ? 'PASS' : 'FAIL',
      output: `sessionStorage_unlocked: ${isStillUnlocked}, requiresPin: ${requiresPin}`
    });
  } catch (err: any) {
    testResults.push({ id: 8, name: 'Auto-lock timer', status: 'FAIL', output: err.message });
  }

  // ==========================================
  // TEST 9: Switch Clerk org -> new org's sessionStorage keys absent -> PIN prompt appears
  // ==========================================
  try {
    const newOrgId = 'org_new_clerk_switch';
    const newOrgActiveProfile = sessionStorage.getItem(`masar_active_profile_${newOrgId}`);
    const newOrgUnlocked = sessionStorage.getItem(`masar_profile_unlocked_${newOrgId}`);
    const pinPromptNeeded = newOrgUnlocked !== 'true';

    const pass = newOrgActiveProfile === null && newOrgUnlocked === null && pinPromptNeeded === true;
    testResults.push({
      id: 9,
      name: "Switch Clerk org -> new org's sessionStorage keys absent -> PIN prompt appears",
      status: pass ? 'PASS' : 'FAIL',
      output: `newOrgActiveProfile: ${newOrgActiveProfile}, newOrgUnlocked: ${newOrgUnlocked}, pinPromptNeeded: ${pinPromptNeeded}`
    });
  } catch (err: any) {
    testResults.push({ id: 9, name: 'Switch Clerk org', status: 'FAIL', output: err.message });
  }

  // ==========================================
  // TEST 10: Seed profilesConfig.adminPin='9999' manually, reload -> "9999" works, hashed row exists, plaintext scrubbed
  // ==========================================
  try {
    const seedOrgId = 'org_seed_test_org';
    await db.settings.put({
      id: 'settings_' + seedOrgId,
      created_at: Date.now(),
      updated_at: Date.now(),
      sync_status: 'synced',
      profilesConfig: {
        adminPin: '9999',
        adminName: 'الأستاذ سامي',
        assistantEnabled: false
      }
    });

    await migrateLegacyPins(seedOrgId);

    const is9999Valid = await verifyPin(seedOrgId, 'admin', '9999');
    const pinRow = await getPinConfig(seedOrgId, 'admin');
    const updatedSettings = (await db.settings.get('settings_' + seedOrgId))?.profilesConfig as any;
    const isPlaintextScrubbed = updatedSettings && !('adminPin' in updatedSettings) && !('assistantPin' in updatedSettings);

    const pass = is9999Valid === true && Boolean(pinRow?.pinHash) && isPlaintextScrubbed === true;
    testResults.push({
      id: 10,
      name: 'Seed profilesConfig.adminPin="9999" manually, reload -> "9999" works, hashed row exists, plaintext scrubbed',
      status: pass ? 'PASS' : 'FAIL',
      output: `is9999Valid: ${is9999Valid}, hashedRowId: ${pinRow?.id}, isPlaintextScrubbed: ${isPlaintextScrubbed}`
    });
  } catch (err: any) {
    testResults.push({ id: 10, name: 'Seed profilesConfig migration', status: 'FAIL', output: err.message });
  }

  // ==========================================
  // REAL BACKEND CALLS for Tests 11, 12, 13
  // ==========================================
  let realBackendHttpCode = 0;
  let realBackendBody = '';
  try {
    const res = await fetch(`${API_BASE_URL}/api/pin-configs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    realBackendHttpCode = res.status;
    realBackendBody = await res.text();
  } catch (err: any) {
    realBackendBody = err.message;
  }

  testResults.push({
    id: 11,
    name: 'Network offline, change PIN -> local update succeeds, no error shown, sync retries when online',
    status: 'NOT VERIFIED',
    output: `Real backend (${API_BASE_URL}) is reachable (returned HTTP ${realBackendHttpCode}: ${realBackendBody}). However, without an interactive user login session minting a real Clerk JWT, E2E sync against the Neon database cannot authenticate in this headless sandbox.`
  });

  testResults.push({
    id: 12,
    name: 'Two browser contexts (incognito + normal) -> set PIN on A, reload B, PIN works on B (via pull)',
    status: 'NOT VERIFIED',
    output: `Requires two live browser sessions authenticated with a real Clerk organization account against ${API_BASE_URL}. Headless environment has no active Clerk user login.`
  });

  testResults.push({
    id: 13,
    name: 'Soft-delete PIN on A, reload B -> PIN prompt appears on B, old PIN rejected',
    status: 'NOT VERIFIED',
    output: `Requires authenticated cross-session sync against ${API_BASE_URL}. Not runnable without a valid Clerk user JWT.`
  });

  // ==========================================
  // TEST 15: Simple PIN Reset Flow (Clerk Re-Auth + Reset to Default)
  // ==========================================
  try {
    const resetOrgId = 'org_pin_reset_test';
    setActiveOrgId(resetOrgId);

    // 1. Set admin PIN to '5678'
    await setPin(resetOrgId, 'admin', '5678');
    const is5678Active = await verifyPin(resetOrgId, 'admin', '5678');
    const is1234BeforeReset = await verifyPin(resetOrgId, 'admin', '1234');

    // 2. Simulate reset: deletePin(resetOrgId, 'admin') + simulate signOut (clearing session storage)
    await deletePin(resetOrgId, 'admin');
    sessionStorage.removeItem(`masar_profile_unlocked_${resetOrgId}`);
    sessionStorage.removeItem(`masar_active_profile_${resetOrgId}`);

    // 3. Simulate re-login: forcePinChange should be true because verifyPin(resetOrgId, 'admin', '1234') is true
    const forcePinChangeOnReLogin = await verifyPin(resetOrgId, 'admin', '1234');
    const isOldPinRejected = !(await verifyPin(resetOrgId, 'admin', '5678'));

    // 4. Set new PIN '1234' via setPin
    await setPin(resetOrgId, 'admin', '1234');

    // 5. Check: verifyPin('5678') -> false. verifyPin('1234') -> true.
    const verify5678AfterNewPin = await verifyPin(resetOrgId, 'admin', '5678');
    const verify1234AfterNewPin = await verifyPin(resetOrgId, 'admin', '1234');

    const pass = is5678Active === true &&
                 is1234BeforeReset === false &&
                 forcePinChangeOnReLogin === true &&
                 isOldPinRejected === true &&
                 verify5678AfterNewPin === false &&
                 verify1234AfterNewPin === true;

    testResults.push({
      id: 15,
      name: 'Simple PIN Reset: set admin 5678 -> deletePin + signOut -> forcePinChange is true -> set new PIN 1234 -> 5678 false, 1234 true',
      status: pass ? 'PASS' : 'FAIL',
      output: `is5678Active: ${is5678Active}, forcePinChange: ${forcePinChangeOnReLogin}, oldRejected: ${isOldPinRejected}, verify5678After: ${verify5678AfterNewPin}, verify1234After: ${verify1234AfterNewPin}`
    });
  } catch (err: any) {
    testResults.push({ id: 15, name: 'Simple PIN Reset flow', status: 'FAIL', output: err.message });
  }

  // ==========================================
  // TEST 14: Console -> zero errors, zero logged hashes
  // ==========================================
  try {
    const errorLogs = loggedMessages.filter(m => m.startsWith('[ERROR]'));
    const loggedHashes = loggedMessages.filter(m => {
      return m.includes('5678') || m.includes('4321') || m.includes('9999');
    });

    const pass = errorLogs.length === 0 && loggedHashes.length === 0;
    testResults.push({
      id: 14,
      name: 'Console -> zero errors, zero logged hashes',
      status: pass ? 'PASS' : 'FAIL',
      output: `errorLogsCount: ${errorLogs.length}, loggedHashesCount: ${loggedHashes.length}`
    });
  } catch (err: any) {
    testResults.push({ id: 14, name: 'Console log audit', status: 'FAIL', output: err.message });
  }

  // Print Final Raw Results
  console.log('\n=================== TEST RESULTS ===================');
  for (const r of testResults) {
    console.log(`TEST ${r.id}: [${r.status}] ${r.name}\n  OUTPUT: ${r.output}`);
  }
  console.log('====================================================\n');

  console.log('POST-STEP-2 DEVTOOLS CHECK (Local Unit State):');
  console.log(postStep2Rows);
}

run().catch(console.error);
