/**
 * Masar (مسار) - 14-Day Free Trial Engine
 * 
 * Provides offline trial evaluation with clock-tamper detection.
 * 
 * Rules:
 * - 14-day duration
 * - First launch with no license: trial starts, saving `trial_start` and `trial_last_seen`
 * - On every check: if now < trial_last_seen -> treat as expired (clock tamper detected)
 * - Otherwise update `trial_last_seen` and compute `daysLeft`
 * 
 * ELECTRON MIGRATION NOTE:
 * Uses storage.ts for persistence. In Electron, swapping storage.ts to safeStorage
 * automatically encrypts the trial timestamps on the host device.
 */

import {
  loadTrialState,
  saveTrialStart,
  updateTrialLastSeen,
  markTrialTampered,
  clearTrialState,
} from './storage';

export const TRIAL_DURATION_DAYS = 14;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const TRIAL_DURATION_MS = TRIAL_DURATION_DAYS * ONE_DAY_MS;

export interface TrialStatus {
  active: boolean;
  daysLeft: number;
  expired: boolean;
}

/**
 * Initializes the trial period if it hasn't started yet.
 */
export function startTrial(): void {
  const state = loadTrialState();
  if (state.trialStart === null) {
    const now = Date.now();
    saveTrialStart(now);
  }
}

/**
 * Checks current trial status with clock tampering protection.
 */
export function getTrialStatus(): TrialStatus {
  const state = loadTrialState();
  const now = Date.now();

  // If trial was previously marked tampered, treat as expired permanently
  if (state.isTampered) {
    return {
      active: false,
      daysLeft: 0,
      expired: true,
    };
  }

  // If trial has never started
  if (state.trialStart === null) {
    return {
      active: false,
      daysLeft: TRIAL_DURATION_DAYS,
      expired: false,
    };
  }

  const { trialStart, trialLastSeen } = state;

  // Clock tampering check: if current time is before the last recorded time
  // (user rolled system clock backwards), flag and immediately expire.
  if (trialLastSeen !== null && now < trialLastSeen) {
    markTrialTampered();
    return {
      active: false,
      daysLeft: 0,
      expired: true,
    };
  }

  // Update last seen timestamp to current verified timestamp
  updateTrialLastSeen(now);

  const elapsedMs = now - trialStart;
  const remainingMs = TRIAL_DURATION_MS - elapsedMs;

  if (remainingMs <= 0) {
    return {
      active: false,
      daysLeft: 0,
      expired: true,
    };
  }

  const daysLeft = Math.ceil(remainingMs / ONE_DAY_MS);

  return {
    active: true,
    daysLeft: Math.min(daysLeft, TRIAL_DURATION_DAYS),
    expired: false,
  };
}

/**
 * Reset trial state for manual developer testing.
 * Strictly gated behind dev-mode / non-production checks.
 */
export function resetTrialForTesting(): void {
  const isDev =
    (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV);

  if (!isDev) {
    console.warn('[Masar License] resetTrialForTesting is blocked in production');
    return;
  }

  clearTrialState();
  console.info('[Masar License] Trial state has been reset for local testing');
}
