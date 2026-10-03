/**
 * Masar (مسار) - License & Trial Storage
 * 
 * Offline-first persistent storage for license keys and trial status.
 * Current implementation uses browser localStorage.
 * 
 * ELECTRON MIGRATION NOTE:
 * When porting to Electron, replace localStorage calls in this file with
 * Electron's safeStorage API via IPC (e.g., window.electron.safeStorage.encryptString
 * and window.electron.safeStorage.decryptString) or electron-store with encryption.
 */

const LICENSE_STORAGE_KEY = 'masar_license_key';
const TRIAL_START_KEY = 'trial_start';
const TRIAL_LAST_SEEN_KEY = 'trial_last_seen';
const TRIAL_TAMPERED_KEY = 'trial_tampered';

// License Key Storage
export function saveLicense(key: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LICENSE_STORAGE_KEY, key.trim());
    }
  } catch (err) {
    console.error('Failed to save license key:', err);
  }
}

export function loadLicense(): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const val = localStorage.getItem(LICENSE_STORAGE_KEY);
      return val ? val.trim() : null;
    }
    return null;
  } catch (err) {
    console.error('Failed to load license key:', err);
    return null;
  }
}

export function clearLicense(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(LICENSE_STORAGE_KEY);
    }
  } catch (err) {
    console.error('Failed to clear license key:', err);
  }
}

// Trial State Storage
export function loadTrialState(): {
  trialStart: number | null;
  trialLastSeen: number | null;
  isTampered: boolean;
} {
  try {
    if (typeof localStorage === 'undefined') {
      return { trialStart: null, trialLastSeen: null, isTampered: false };
    }
    const startStr = localStorage.getItem(TRIAL_START_KEY);
    const lastSeenStr = localStorage.getItem(TRIAL_LAST_SEEN_KEY);
    const tamperedStr = localStorage.getItem(TRIAL_TAMPERED_KEY);

    const trialStart = startStr ? parseInt(startStr, 10) : null;
    const trialLastSeen = lastSeenStr ? parseInt(lastSeenStr, 10) : null;
    const isTampered = tamperedStr === 'true';

    return {
      trialStart: isNaN(trialStart as number) ? null : trialStart,
      trialLastSeen: isNaN(trialLastSeen as number) ? null : trialLastSeen,
      isTampered,
    };
  } catch (err) {
    console.error('Failed to load trial state:', err);
    return { trialStart: null, trialLastSeen: null, isTampered: false };
  }
}

export function saveTrialStart(timestampMs: number): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TRIAL_START_KEY, timestampMs.toString());
      localStorage.setItem(TRIAL_LAST_SEEN_KEY, timestampMs.toString());
    }
  } catch (err) {
    console.error('Failed to save trial start:', err);
  }
}

export function updateTrialLastSeen(timestampMs: number): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TRIAL_LAST_SEEN_KEY, timestampMs.toString());
    }
  } catch (err) {
    console.error('Failed to update trial last seen:', err);
  }
}

export function markTrialTampered(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TRIAL_TAMPERED_KEY, 'true');
    }
  } catch (err) {
    console.error('Failed to mark trial tampered:', err);
  }
}

export function clearTrialState(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TRIAL_START_KEY);
      localStorage.removeItem(TRIAL_LAST_SEEN_KEY);
      localStorage.removeItem(TRIAL_TAMPERED_KEY);
    }
  } catch (err) {
    console.error('Failed to clear trial state:', err);
  }
}
