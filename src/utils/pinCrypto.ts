/**
 * PIN Cryptography Utility for Masar
 * Uses Web Crypto PBKDF2-SHA256 with per-record random salt.
 */

export function isValidPinFormat(pin: string): boolean {
  if (!pin) return false;
  return /^\d{4}$/.test(pin.trim());
}

export function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function hashPin(pin: string, saltB64: string, iterations = 210000): Promise<string> {
  const enc = new TextEncoder();
  const pinBytes = enc.encode(pin.trim());
  const saltBin = atob(saltB64);
  const saltBytes = new Uint8Array(saltBin.length);
  for (let i = 0; i < saltBin.length; i++) {
    saltBytes[i] = saltBin.charCodeAt(i);
  }

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    pinBytes,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations,
      hash: 'SHA-256'
    },
    keyMaterial,
    256 // 256 bits = 32 bytes
  );

  const derivedBytes = new Uint8Array(derivedBits);
  let binary = '';
  for (let i = 0; i < derivedBytes.length; i++) {
    binary += String.fromCharCode(derivedBytes[i]);
  }
  return btoa(binary);
}
