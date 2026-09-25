/**
 * PIN Management Service for Masar
 * Handles hashing, verification, brute-force throttling, and synchronization.
 * Framework-agnostic.
 */

import { db, PinConfigRecord } from '../db/db';
import { hashPin, generateSalt, isValidPinFormat } from '../utils/pinCrypto';
import { pushPinConfig } from './syncService';

const MAX_ATTEMPTS = 5;
const LOCK_MS = 60_000;

export async function getPinConfig(
  orgId: string,
  profileType: 'admin' | 'assistant'
): Promise<PinConfigRecord | undefined> {
  return await db.pinConfigs
    .where('[orgId+profileType]')
    .equals([orgId, profileType])
    .first();
}

export async function setPin(
  orgId: string,
  profileType: 'admin' | 'assistant',
  pin: string,
  opts?: { assistantPinRequired?: boolean; autoLockMinutes?: number }
): Promise<PinConfigRecord> {
  if (!isValidPinFormat(pin)) {
    throw new Error('رمز الدخول يجب أن يتكون من 4 أرقام بالضبط');
  }

  const salt = generateSalt();
  const iterations = 210000;
  const hash = await hashPin(pin, salt, iterations);
  const now = new Date().toISOString();

  const existing = await getPinConfig(orgId, profileType);
  const record: PinConfigRecord = {
    id: existing?.id || crypto.randomUUID(),
    orgId,
    profileType,
    pinHash: hash,
    pinSalt: salt,
    pinIterations: iterations,
    pinAlgorithm: 'PBKDF2-SHA256',
    assistantPinRequired: opts?.assistantPinRequired !== undefined 
      ? opts.assistantPinRequired 
      : (existing?.assistantPinRequired ?? false),
    autoLockMinutes: opts?.autoLockMinutes !== undefined 
      ? opts.autoLockMinutes 
      : (existing?.autoLockMinutes ?? 15),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    deletedAt: null
  };

  await db.pinConfigs.put(record);

  // Fire-and-forget push
  pushPinConfig(record).catch(() => {});

  return record;
}

export async function verifyPin(
  orgId: string,
  profileType: 'admin' | 'assistant',
  enteredPin: string
): Promise<boolean> {
  if (!isValidPinFormat(enteredPin)) {
    return false;
  }

  const record = await getPinConfig(orgId, profileType);

  if (record && record.deletedAt === null) {
    const hash = await hashPin(enteredPin, record.pinSalt, record.pinIterations);
    return hash === record.pinHash;
  }

  // Uninitialized or reset state: admin defaults to "1234"
  if (profileType === 'admin') {
    return enteredPin.trim() === '1234';
  }

  return false;
}

export async function updatePinFlags(
  orgId: string,
  profileType: 'admin' | 'assistant',
  flags: { assistantPinRequired?: boolean; autoLockMinutes?: number }
): Promise<void> {
  const existing = await getPinConfig(orgId, profileType);
  if (!existing) return;

  const now = new Date().toISOString();
  const updated: PinConfigRecord = {
    ...existing,
    assistantPinRequired: flags.assistantPinRequired !== undefined ? flags.assistantPinRequired : existing.assistantPinRequired,
    autoLockMinutes: flags.autoLockMinutes !== undefined ? flags.autoLockMinutes : existing.autoLockMinutes,
    updatedAt: now
  };

  await db.pinConfigs.put(updated);

  pushPinConfig(updated).catch(() => {});
}

export async function deletePin(
  orgId: string,
  profileType: 'admin' | 'assistant'
): Promise<void> {
  const existing = await getPinConfig(orgId, profileType);
  const now = new Date().toISOString();

  if (!existing) {
    const dummyRecord: PinConfigRecord = {
      id: crypto.randomUUID(),
      orgId,
      profileType,
      pinHash: '',
      pinSalt: '',
      pinIterations: 210000,
      pinAlgorithm: 'PBKDF2-SHA256',
      assistantPinRequired: false,
      autoLockMinutes: 15,
      createdAt: now,
      updatedAt: now,
      deletedAt: now
    };
    await db.pinConfigs.put(dummyRecord);
    pushPinConfig(dummyRecord).catch(() => {});
    return;
  }

  const updated: PinConfigRecord = {
    ...existing,
    deletedAt: now,
    updatedAt: now
  };

  await db.pinConfigs.put(updated);

  pushPinConfig(updated).catch(() => {});
}

export function isLockedOut(orgId: string, profileType: string): number {
  try {
    const key = `masar_pin_attempts_${orgId}_${profileType}`;
    const raw = sessionStorage.getItem(key);
    if (!raw) return 0;
    const data = JSON.parse(raw);
    if (data.lockedUntil) {
      const remaining = data.lockedUntil - Date.now();
      if (remaining > 0) {
        return remaining;
      }
    }
  } catch {}
  return 0;
}

export async function recordFailedAttempt(orgId: string, profileType: string): Promise<void> {
  try {
    const key = `masar_pin_attempts_${orgId}_${profileType}`;
    const raw = sessionStorage.getItem(key);
    let data = { count: 0, lockedUntil: 0 };
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {}
    }
    data.count = (data.count || 0) + 1;
    if (data.count >= MAX_ATTEMPTS) {
      data.lockedUntil = Date.now() + LOCK_MS;
    }
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

export function clearFailedAttempts(orgId: string, profileType: string): void {
  try {
    sessionStorage.removeItem(`masar_pin_attempts_${orgId}_${profileType}`);
  } catch {}
}
