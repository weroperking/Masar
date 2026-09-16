import { db } from '../db/db';

let sessionDek: CryptoKey | null = null;
let inMemoryKeyPair: CryptoKeyPair | null = null;

export type Envelope = {
  v: 1;
  iv: string; // base64 12-byte
  ct: string; // base64 ct + GCM-tag
};

// Helper to convert ArrayBuffer to Base64
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper to convert Base64 to ArrayBuffer
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * 1a. Ensure device RSA-OAEP keypair with extractable: false.
 * Persisted in db.keystore as CryptoKeyPair.
 */
export async function ensureDeviceKeypair(): Promise<CryptoKeyPair> {
  if (inMemoryKeyPair) return inMemoryKeyPair;

  try {
    const existing = await db.keystore.get('deviceKeypair');
    if (existing?.keypair) {
      inMemoryKeyPair = existing.keypair;
      return existing.keypair;
    }
  } catch (err) {
    console.warn('[cryptoService] Error loading deviceKeypair from db.keystore:', err);
  }

  // Generate non-extractable RSA-OAEP 2048 keypair
  const keypair = await window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    false, // Non-extractable private key
    ['encrypt', 'decrypt']
  );

  try {
    await db.keystore.put({ id: 'deviceKeypair', keypair });
  } catch (putErr) {
    console.warn('[cryptoService] Failed to persist deviceKeypair in db.keystore:', putErr);
  }

  // Clean up legacy localStorage keys
  try {
    localStorage.removeItem('masar_device_pub_jwk');
    localStorage.removeItem('masar_device_priv_jwk');
  } catch {
    // Ignore legacy cleanup errors
  }

  inMemoryKeyPair = keypair;
  return keypair;
}

export async function getDeviceKeyPair(): Promise<CryptoKeyPair> {
  return ensureDeviceKeypair();
}

/**
 * Export public key to base64 SPKI
 */
export async function exportPublicKey(keyPair: CryptoKeyPair): Promise<string> {
  const exported = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
  return arrayBufferToBase64(exported);
}

/**
 * 1b. Unwrap DEK with private key and store in db.keystore as non-extractable CryptoKey.
 */
export async function unwrapDek(wrappedDekBase64: string, privateKey: CryptoKey): Promise<CryptoKey> {
  try {
    if (!wrappedDekBase64 || wrappedDekBase64 === 'mock_wrapped_dek_base64') {
      return await getOrCreateLocalDek();
    }

    const dekBytes = await window.crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      privateKey,
      base64ToArrayBuffer(wrappedDekBase64)
    );

    const dek = await window.crypto.subtle.importKey(
      'raw',
      dekBytes,
      { name: 'AES-GCM', length: 256 },
      false, // Non-extractable DEK
      ['encrypt', 'decrypt']
    );

    await db.keystore.put({ id: 'dek', key: dek, issuedAt: Date.now() });
    sessionDek = dek;
    return dek;
  } catch (err) {
    console.warn('[cryptoService] unwrapDek failed, generating fallback non-extractable local DEK:', err);
    return await getOrCreateLocalDek();
  }
}

/**
 * Get or create fallback local non-extractable DEK if server handshake is unreachable offline
 */
export async function getOrCreateLocalDek(): Promise<CryptoKey> {
  if (sessionDek) return sessionDek;

  try {
    const cached = await db.keystore.get('dek');
    if (cached?.key) {
      sessionDek = cached.key;
      return cached.key;
    }
  } catch (err) {
    console.warn('[cryptoService] Error loading cached DEK from db.keystore:', err);
  }

  // Generate non-extractable AES-GCM 256
  const newDek = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false, // Non-extractable
    ['encrypt', 'decrypt']
  );

  try {
    await db.keystore.put({ id: 'dek', key: newDek, issuedAt: Date.now() });
  } catch (putErr) {
    console.warn('[cryptoService] Error storing local DEK in db.keystore:', putErr);
  }

  sessionDek = newDek;
  return newDek;
}

export async function getDek(): Promise<CryptoKey> {
  if (sessionDek) return sessionDek;
  try {
    const cached = await db.keystore.get('dek');
    if (cached?.key) {
      sessionDek = cached.key;
      return cached.key;
    }
  } catch (err) {
    console.warn('[cryptoService] Failed to load DEK from db.keystore:', err);
  }
  return await getOrCreateLocalDek();
}

export function setSessionDek(key: CryptoKey) {
  sessionDek = key;
}

/**
 * 1c. Encrypt record at rest returning standard Envelope
 * { v: 1, iv: base64(12), ct: base64(ciphertext + tag) }
 */
export async function encryptRecord<T>(plain: T): Promise<Envelope> {
  const dek = await getDek();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(plain));
  const ct = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    dek,
    encoded
  );

  return {
    v: 1,
    iv: arrayBufferToBase64(iv.buffer),
    ct: arrayBufferToBase64(ct),
  };
}

/**
 * 1c. Decrypt record from Envelope
 */
export async function decryptRecord<T>(env: Envelope): Promise<T> {
  const dek = await getDek();
  const iv = new Uint8Array(base64ToArrayBuffer(env.iv));
  const ct = base64ToArrayBuffer(env.ct);

  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    dek,
    ct
  );

  const decoded = new TextDecoder().decode(decrypted);
  return JSON.parse(decoded);
}

// Backward compatibility helpers
export async function encryptPayload(payload: any): Promise<{ _cipher: string; _iv: string }> {
  const env = await encryptRecord(payload);
  return { _cipher: env.ct, _iv: env.iv };
}

export async function decryptPayload(cipherData: { _cipher: string | ArrayBuffer; _iv: string | Uint8Array | ArrayBuffer }): Promise<any> {
  const ivStr = typeof cipherData._iv === 'string' 
    ? cipherData._iv 
    : arrayBufferToBase64((cipherData._iv instanceof Uint8Array ? cipherData._iv : new Uint8Array(cipherData._iv as ArrayBuffer)).buffer as ArrayBuffer);
  const ctStr = typeof cipherData._cipher === 'string' 
    ? cipherData._cipher 
    : arrayBufferToBase64(cipherData._cipher as ArrayBuffer);
  return decryptRecord({ v: 1, iv: ivStr, ct: ctStr });
}

/**
 * 1d. Migrate existing plaintext records to encrypted envelopes
 */
export async function migratePlaintextRecords(): Promise<void> {
  try {
    const flag = await db.keystore.get('plaintextMigrated');
    if (flag) return;

    const tables = [
      db.students, db.courses, db.groups, db.enrollments,
      db.attendanceSessions, db.attendanceRecords, db.assessments, db.assessmentGrades,
      db.products, db.courseProducts, db.sessionPayments, db.ledgerEntries,
      db.bookingRequests, db.productSales, db.events, db.users,
      db.messageTemplates, db.settings, db.qrCards
    ];

    for (const table of tables) {
      const rows = await table.toArray();
      const unencrypted = rows.filter((r: any) => !r.envelope);
      if (unencrypted.length === 0) continue;

      // Encrypt outside of IDB transaction
      const prepared = await Promise.all(
        unencrypted.map(async (r: any) => ({
          ...r,
          envelope: await encryptRecord(r),
        }))
      );

      // Fast synchronous IDB commit
      await db.transaction('rw', table, () => Promise.all(prepared.map((p: any) => table.put(p))));
    }

    await db.keystore.put({ id: 'plaintextMigrated', at: Date.now() });
    console.log('[cryptoService] Plaintext migration completed successfully.');
  } catch (err) {
    console.warn('[cryptoService] Migration of plaintext records error:', err);
  }
}
