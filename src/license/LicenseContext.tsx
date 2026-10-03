import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { initializeLicense, LicenseInitResult } from './index';
import { getDeviceFingerprint } from './fingerprint';
import { getTrialStatus } from './trial';

export interface LicenseContextValue {
  isLoading: boolean;
  unlocked: boolean;
  plan: string | null;
  features: string[];
  message: string | null;
  daysLeft: number;
  deviceId: string;
  refreshLicense: () => Promise<LicenseInitResult>;
  isActivationModalOpen: boolean;
  openActivationModal: () => void;
  closeActivationModal: () => void;
}

const LicenseContext = createContext<LicenseContextValue | null>(null);

export function LicenseProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(true);
  const [plan, setPlan] = useState<string | null>('trial');
  const [features, setFeatures] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [daysLeft, setDaysLeft] = useState<number>(14);
  const [deviceId, setDeviceId] = useState<string>('');
  const [isActivationModalOpen, setIsActivationModalOpen] = useState(false);

  const refreshLicense = useCallback(async (): Promise<LicenseInitResult> => {
    try {
      const id = await getDeviceFingerprint();
      setDeviceId(id);

      const res = await initializeLicense();
      setUnlocked(res.unlocked);
      setPlan(res.plan);
      setFeatures(res.features);
      setMessage(res.message);

      const trial = getTrialStatus();
      setDaysLeft(trial.daysLeft);

      return res;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshLicense();
  }, [refreshLicense]);

  const openActivationModal = useCallback(() => setIsActivationModalOpen(true), []);
  const closeActivationModal = useCallback(() => setIsActivationModalOpen(false), []);

  return (
    <LicenseContext.Provider
      value={{
        isLoading,
        unlocked,
        plan,
        features,
        message,
        daysLeft,
        deviceId,
        refreshLicense,
        isActivationModalOpen,
        openActivationModal,
        closeActivationModal,
      }}
    >
      {children}
    </LicenseContext.Provider>
  );
}

export function useLicense(): LicenseContextValue {
  const ctx = useContext(LicenseContext);
  if (!ctx) {
    throw new Error('useLicense must be used within a LicenseProvider');
  }
  return ctx;
}
