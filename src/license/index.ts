/**
 * Masar (مسار) - License Management Engine
 * 
 * Central entrypoint for offline license verification, device fingerprinting,
 * and 14-day trial management.
 */

import { verifyLicense, LicensePayload } from './license';
import { getDeviceFingerprint } from './fingerprint';
import { startTrial, getTrialStatus } from './trial';
import { loadLicense, clearLicense, loadTrialState } from './storage';
import { getFeatures } from './entitlements';

export * from './license';
export * from './fingerprint';
export * from './trial';
export * from './storage';
export * from './entitlements';

export interface LicenseInitResult {
  unlocked: boolean;
  plan: 'trial' | 'basic' | 'pro' | 'lifetime' | string | null;
  features: string[];
  message: string | null;
}

/**
 * Executes startup license and trial resolution:
 * 
 * 1. Load stored license
 * 2. If present -> verifyLicense(storedKey, await getDeviceFingerprint())
 *    - ok       -> return { unlocked: true, plan: payload.p, features, message: null }
 *    - not ok   -> clearLicense() and fall through
 * 3. Check trial via getTrialStatus()
 *    - If no trial_start exists yet -> startTrial(), treat as active
 *    - active   -> return { unlocked: true, plan: 'trial', features: getFeatures('trial'),
 *                           message: `Trial: ${daysLeft} days left` }
 *    - expired  -> return { unlocked: false, plan: null, features: [],
 *                           message: 'Your trial has ended. Please activate a license.' }
 *    - never started -> same as active (start it now)
 */
export async function initializeLicense(): Promise<LicenseInitResult> {
  // 1. Load stored license
  const storedKey = loadLicense();

  // 2. If present -> verify against current device fingerprint
  if (storedKey) {
    const deviceId = await getDeviceFingerprint();
    const result = verifyLicense(storedKey, deviceId);

    if (result.ok && result.payload) {
      const plan = result.payload.p;
      return {
        unlocked: true,
        plan,
        features: getFeatures(plan),
        message: null,
      };
    } else {
      // License is invalid or expired -> purge stored key and fall through to trial check
      clearLicense();
    }
  }

  // 3. Check trial status
  const trialState = loadTrialState();
  if (trialState.trialStart === null) {
    // Never started -> start trial now and treat as active
    startTrial();
    const initialStatus = getTrialStatus();
    return {
      unlocked: true,
      plan: 'trial',
      features: getFeatures('trial'),
      message: `Trial: ${initialStatus.daysLeft} days left`,
    };
  }

  const status = getTrialStatus();

  if (status.active) {
    return {
      unlocked: true,
      plan: 'trial',
      features: getFeatures('trial'),
      message: `Trial: ${status.daysLeft} days left`,
    };
  }

  // Trial expired or clock was tampered
  return {
    unlocked: false,
    plan: null,
    features: [],
    message: 'Your trial has ended. Please activate a license.',
  };
}
