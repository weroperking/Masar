/**
 * Masar (مسار) - Device Fingerprinting
 * 
 * Generates a stable device identifier offline without external telemetry or tracking.
 * 
 * WEB IMPLEMENTATION:
 * Hashes a stable set of browser attributes using SHA-256 from @noble/hashes:
 * userAgent, language, screen dimensions, color depth, timezone offset,
 * hardwareConcurrency, platform.
 * 
 * Returns uppercase hex formatted with a hyphen (e.g. A3F92B-B719E4).
 * 
 * ELECTRON MIGRATION:
 * In Electron, replace or supplement the browser-based fingerprint with `node-machine-id`:
 * ```ts
 * import { machineIdSync } from 'node-machine-id';
 * export async function getDeviceFingerprint(): Promise<string> {
 *   const rawId = machineIdSync({ original: true });
 *   const hash = sha256(new TextEncoder().encode(rawId));
 *   const hex = bytesToHex(hash).slice(0, 12).toUpperCase();
 *   return `${hex.slice(0, 6)}-${hex.slice(6, 12)}`;
 * }
 * ```
 */

import { sha256 } from '@noble/hashes/sha2.js';

function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex.toUpperCase();
}

/**
 * Checks if running inside an Electron environment.
 */
export function isElectronEnvironment(): boolean {
  if (typeof window !== 'undefined') {
    const nav = window.navigator as { userAgent?: string };
    if (nav.userAgent && nav.userAgent.includes('Electron')) {
      return true;
    }
    const win = window as unknown as { process?: { type?: string } };
    if (win.process && win.process.type) {
      return true;
    }
  }
  return false;
}

/**
 * Gathers stable host/browser characteristics and returns a deterministic fingerprint.
 */
export async function getDeviceFingerprint(): Promise<string> {
  const components: string[] = [];

  // Check if we are running in headless Node.js or Electron main process
  if (typeof window === 'undefined') {
    // Node environment fallback / stub
    components.push(
      typeof process !== 'undefined' ? process.platform || 'node' : 'unknown',
      typeof process !== 'undefined' ? process.arch || 'unknown' : 'unknown',
      typeof process !== 'undefined' ? process.version || '' : ''
    );
  } else {
    // Browser / Electron renderer environment
    const nav = window.navigator as unknown as {
      userAgent?: string;
      language?: string;
      hardwareConcurrency?: number;
      platform?: string;
      userAgentData?: { platform?: string };
    };

    components.push(
      nav.userAgent || 'unknown_agent',
      nav.language || 'unknown_lang',
      typeof window.screen !== 'undefined'
        ? `${window.screen.width}x${window.screen.height}`
        : '0x0',
      typeof window.screen !== 'undefined' ? `${window.screen.colorDepth}` : '24',
      new Date().getTimezoneOffset().toString(),
      `${nav.hardwareConcurrency || 4}`,
      nav.userAgentData?.platform || nav.platform || 'unknown_plat'
    );
  }

  const rawString = components.join('|#|');
  const encoded = new TextEncoder().encode(rawString);
  const hashBytes = sha256(encoded);
  const fullHex = bytesToHex(hashBytes);

  // Take the first 12 characters and format with a hyphen in the center
  const first12 = fullHex.slice(0, 12);
  const formatted = `${first12.slice(0, 6)}-${first12.slice(6, 12)}`;

  return formatted;
}
