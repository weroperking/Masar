/**
 * Masar (مسار) - Offline Ed25519 License Verification
 * 
 * Verifies Ed25519-signed license keys completely offline without network
 * requests, external servers, or private keys.
 * 
 * LICENSE KEY FORMAT:
 *   "<payloadB64>.<signatureB64>"
 *   - payloadB64:   base64url(JSON string, UTF-8)
 *   - signatureB64: base64url(64-byte Ed25519 signature)
 * 
 * The signature is computed over the raw ASCII bytes of `payloadB64`.
 */

import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';

// Configure synchronous SHA-512 hashing required by noble-ed25519 v3
ed.hashes.sha512 = sha512;

/**
 * Replace this constant with your base64url-encoded Ed25519 public key
 * generated from your admin licensing panel.
 * 
 * NEVER place the private key here. This public key is safe for client bundling.
 */
export const ED25519_PUBLIC_KEY = 'jhrvT/baqed1oOy82sIN2Fr0ivXGmnQMq6dLKTR/rL0=';

export interface LicensePayload {
  p: 'basic' | 'pro' | 'lifetime'; // Plan name
  i: number;                         // Issued at (unix seconds)
  e: number;                         // Expires at (unix seconds)
  d?: string;                        // Device fingerprint (optional, for locked keys)
  v: number;                         // Payload schema version (always 1)
}

export type VerifyResultReason =
  | 'ok'
  | 'malformed'
  | 'bad_signature'
  | 'unsupported_version'
  | 'expired'
  | 'wrong_device';

export interface VerifyResult {
  ok: boolean;
  reason: VerifyResultReason;
  payload?: LicensePayload;
}

/**
 * Standard base64url decode into Uint8Array (Node and browser compatible, zero Buffer).
 */
export function base64UrlToBytes(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Standard Uint8Array encode into base64url string (zero Buffer).
 */
export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * UTF-8 decode base64url payload.
 */
export function base64UrlToUtf8(base64url: string): string {
  const bytes = base64UrlToBytes(base64url);
  return new TextDecoder().decode(bytes);
}

/**
 * UTF-8 encode string to base64url payload.
 */
export function utf8ToBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  return bytesToBase64Url(bytes);
}

/**
 * Verifies a license key against the embedded Ed25519 public key and device ID.
 * Follows the strict verification order specified in requirements:
 * 
 * 1. Trim, split on "." — must produce exactly 2 parts, else "malformed"
 * 2. Decode signature from base64url
 * 3. Verify Ed25519 over payloadB64 — if fail, "bad_signature"
 * 4. Parse payloadB64 as JSON — if fail, "malformed"
 * 5. If payload.v !== 1 → "unsupported_version"
 * 6. If payload.e < now → "expired"
 * 7. If payload.d exists AND payload.d !== deviceId → "wrong_device"
 * 8. Else → ok
 */
export function verifyLicense(key: string, deviceId: string): VerifyResult {
  // 1. Trim, split on "." — must produce exactly 2 parts, else "malformed"
  if (!key || typeof key !== 'string') {
    return { ok: false, reason: 'malformed' };
  }

  const trimmed = key.trim();
  const parts = trimmed.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { ok: false, reason: 'malformed' };
  }

  const [payloadB64, signatureB64] = parts;

  // 2. Decode signature from base64url
  let signatureBytes: Uint8Array;
  try {
    signatureBytes = base64UrlToBytes(signatureB64);
    if (signatureBytes.length !== 64) {
      return { ok: false, reason: 'bad_signature' };
    }
  } catch {
    return { ok: false, reason: 'bad_signature' };
  }

  // 3. Verify Ed25519 over payloadB64 — if fail, "bad_signature"
  let isSignatureValid = false;
  try {
    const publicKeyBytes = base64UrlToBytes(ED25519_PUBLIC_KEY);
    const messageAsciiBytes = new TextEncoder().encode(payloadB64);
    isSignatureValid = ed.verify(signatureBytes, messageAsciiBytes, publicKeyBytes);
  } catch {
    isSignatureValid = false;
  }

  if (!isSignatureValid) {
    return { ok: false, reason: 'bad_signature' };
  }

  // 4. Parse payloadB64 as JSON — if fail, "malformed"
  let payload: LicensePayload;
  try {
    const jsonStr = base64UrlToUtf8(payloadB64);
    payload = JSON.parse(jsonStr) as LicensePayload;
    if (!payload || typeof payload !== 'object') {
      return { ok: false, reason: 'malformed' };
    }
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  // 5. If payload.v !== 1 → "unsupported_version"
  if (payload.v !== 1) {
    return { ok: false, reason: 'unsupported_version', payload };
  }

  // 6. If payload.e < now → "expired"
  const nowUnixSeconds = Math.floor(Date.now() / 1000);
  if (typeof payload.e !== 'number' || payload.e < nowUnixSeconds) {
    return { ok: false, reason: 'expired', payload };
  }

  // 7. If payload.d exists AND payload.d !== deviceId → "wrong_device"
  if (payload.d && payload.d !== deviceId) {
    return { ok: false, reason: 'wrong_device', payload };
  }

  // 8. Else → ok
  return { ok: true, reason: 'ok', payload };
}
