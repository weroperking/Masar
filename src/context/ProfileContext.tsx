import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useOrganization, useUser, useAuth } from '@clerk/clerk-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { ProfileMode, ProfileAccount, AssistantSubSettings } from '../types';
import {
  verifyPin,
  setPin,
  isLockedOut,
  recordFailedAttempt,
  clearFailedAttempts,
  updatePinFlags,
  deletePin
} from '../services/pinService';
import { migrateLegacyPins } from '../services/pinMigration';
import { pullPinConfigs, flushPendingPinPushes, registerAuthTokenGetter, setActiveOrgId } from '../services/syncService';
import { isValidPinFormat } from '../utils/pinCrypto';
import { AdminPinChangeModal } from '../components/AdminPinChangeModal';

export const DEFAULT_FORMAL_AVATARS = {
  admin: '/avatar-admin.svg',
  assistant: '/avatar-assistant.svg',
  formalMale1: '/avatar-admin.svg',
  formalMale2: '/avatar-admin.svg',
  formalFemale1: '/avatar-assistant.svg',
  formalFemale2: '/avatar-assistant.svg'
};

export const DEFAULT_FLUFFY_AVATARS = DEFAULT_FORMAL_AVATARS;

export const DEFAULT_ASSISTANT_SUB_SETTINGS: AssistantSubSettings = {
  scannerSoundEnabled: true,
  scannerBeepVolume: 'medium',
  defaultLandingPage: '/attendance',
  whatsappDefaultNote: 'نحيطكم علماً بأنه تم تسجيل حضور الطالب بالحصة بنجاح.',
  cameraFacingMode: 'environment',
  autoOpenStudentInfoOnScan: true
};

interface ProfileContextType {
  currentProfile: ProfileMode;
  accounts: {
    admin: ProfileAccount;
    assistant?: ProfileAccount;
  };
  assistantSubSettings: AssistantSubSettings;
  isLocked: boolean;
  showProfileSelector: boolean;
  forcePinChange: boolean;
  setForcePinChange: (val: boolean) => void;
  lockProfile: () => void;
  unlockWithPin: (profile: ProfileMode, enteredPin?: string) => Promise<{ success: boolean; error?: string }>;
  switchProfileDirect: (profile: ProfileMode) => boolean;
  openProfileSelector: () => void;
  closeProfileSelector: () => void;
  updateAdminPin: (newPin: string, currentPin?: string) => Promise<{ success: boolean; error?: string }>;
  updateAdminPinWithOtp: (otpCode: string, newPin: string) => Promise<{ success: boolean; error?: string }>;
  requestAdminPinOtp: () => Promise<{ success: boolean; previewCode?: string; message?: string }>;
  updateAssistantPin: (newPin: string, currentPin?: string) => Promise<{ success: boolean; error?: string }>;
  saveAssistantProfile: (config: { enabled: boolean; name: string; avatarUrl?: string; pinRequired: boolean; pin?: string }, currentPinToVerify?: string) => Promise<{ success: boolean; error?: string }>;
  updateProfilesConfig: (patch: {
    adminName?: string;
    adminAvatarUrl?: string;
    autoLockMinutes?: number;
  }) => Promise<void>;
  updateAssistantSubSettings: (patch: Partial<AssistantSubSettings>) => Promise<{ success: boolean; error?: string }>;
  autoLockMinutes: number;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { organization } = useOrganization();
  const { user } = useUser();
  const { getToken } = useAuth();
  const orgId = organization?.id || 'default_org';

  // Register token getter and active org for sync
  useEffect(() => {
    registerAuthTokenGetter(getToken);
    setActiveOrgId(orgId);
  }, [getToken, orgId]);

  const [currentProfile, setCurrentProfile] = useState<ProfileMode>(() => {
    return (sessionStorage.getItem(`masar_active_profile_${orgId}`) as ProfileMode) || 'admin';
  });

  const [isLocked, setIsLocked] = useState<boolean>(() => {
    const sessionActive = sessionStorage.getItem(`masar_profile_unlocked_${orgId}`);
    return sessionActive !== 'true';
  });

  const [showProfileSelector, setShowProfileSelector] = useState<boolean>(false);
  const [forcePinChange, setForcePinChange] = useState<boolean>(false);

  // Sync state when org changes
  useEffect(() => {
    const active = sessionStorage.getItem(`masar_active_profile_${orgId}`) as ProfileMode;
    setCurrentProfile(active || 'admin');
    const unlocked = sessionStorage.getItem(`masar_profile_unlocked_${orgId}`);
    setIsLocked(unlocked !== 'true');
  }, [orgId]);

  // Profile data state
  const [adminAccount, setAdminAccount] = useState<ProfileAccount>(() => {
    const initialTeacherName =
      localStorage.getItem(`masar_teacher_name_${orgId}`) ||
      localStorage.getItem('masar_teacher_name') ||
      (user?.unsafeMetadata as any)?.teacherName ||
      user?.fullName ||
      'المعلم (المدير)';
    return {
      id: 'admin',
      name: initialTeacherName,
      role: 'admin',
      avatarUrl: DEFAULT_FORMAL_AVATARS.admin,
      pinRequired: true
    };
  });

  const [assistantAccount, setAssistantAccount] = useState<ProfileAccount | undefined>(undefined);
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(15);
  const [assistantSubSettings, setAssistantSubSettings] = useState<AssistantSubSettings>(DEFAULT_ASSISTANT_SUB_SETTINGS);

  // Live queries on Dexie settings & pinConfigs tables
  const liveSettings = useLiveQuery(() => db.settings.toArray(), []);
  const livePinConfigs = useLiveQuery(
    () => db.pinConfigs.where('orgId').equals(orgId).toArray(),
    [orgId]
  );

  // Run migration and pull on startup / org switch
  useEffect(() => {
    let mounted = true;
    (async () => {
      await migrateLegacyPins(orgId);
      await pullPinConfigs(orgId);
      await flushPendingPinPushes().catch(() => {});
      if (mounted) {
        const isDefault = await verifyPin(orgId, 'admin', '1234');
        setForcePinChange(isDefault);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [orgId]);

  // Sync profile data reactively whenever settings, user metadata, or localStorage changes
  useEffect(() => {
    const cur = liveSettings?.[0];
    const resolvedTeacherName = 
      cur?.teacherName || 
      localStorage.getItem(`masar_teacher_name_${orgId}`) || 
      localStorage.getItem('masar_teacher_name') || 
      (user?.unsafeMetadata as any)?.teacherName ||
      cur?.profilesConfig?.adminName ||
      user?.fullName || 
      'المعلم (المدير)';

    const storedProfiles = cur?.profilesConfig;
    const storedAssistantSub = cur?.assistantSubSettings || cur?.profilesConfig?.assistantSubSettings;

    if (storedAssistantSub) {
      setAssistantSubSettings({
        ...DEFAULT_ASSISTANT_SUB_SETTINGS,
        ...storedAssistantSub
      });
    }

    const assistantPinRow = livePinConfigs?.find(p => p.profileType === 'assistant' && !p.deletedAt);
    const adminPinRow = livePinConfigs?.find(p => p.profileType === 'admin' && !p.deletedAt);

    const isAssistantPinReq = assistantPinRow 
      ? assistantPinRow.assistantPinRequired 
      : Boolean(storedProfiles?.assistantPinRequired);

    const effectiveAutoLock = adminPinRow?.autoLockMinutes ?? storedProfiles?.autoLockMinutes ?? 15;
    setAutoLockMinutes(effectiveAutoLock);

    if (storedProfiles) {
      setAdminAccount({
        id: 'admin',
        name: cur?.teacherName || storedProfiles.adminName || resolvedTeacherName,
        role: 'admin',
        avatarUrl: DEFAULT_FORMAL_AVATARS.admin,
        pinRequired: true
      });

      if (storedProfiles.assistantEnabled) {
        setAssistantAccount({
          id: 'assistant',
          name: storedProfiles.assistantName || 'فريق المساعدين',
          role: 'assistant',
          avatarUrl: DEFAULT_FORMAL_AVATARS.assistant,
          pinRequired: isAssistantPinReq
        });
      } else {
        setAssistantAccount(undefined);
      }
    } else {
      setAdminAccount(prev => ({
        ...prev,
        name: cur?.teacherName || resolvedTeacherName,
        avatarUrl: DEFAULT_FORMAL_AVATARS.admin,
        pinRequired: true
      }));
    }
  }, [liveSettings, livePinConfigs, orgId, user?.fullName, (user?.unsafeMetadata as any)?.teacherName]);

  // Check if forcePinChange should be updated
  useEffect(() => {
    let mounted = true;
    verifyPin(orgId, 'admin', '1234').then(isDefault => {
      if (mounted) {
        setForcePinChange(isDefault);
      }
    });
    return () => {
      mounted = false;
    };
  }, [livePinConfigs, orgId]);

  // Listen to custom cross-component update events
  useEffect(() => {
    const handleSettingsUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.teacherName) {
        setAdminAccount(prev => ({
          ...prev,
          name: detail.teacherName
        }));
      }
    };

    window.addEventListener('masar:settings_updated', handleSettingsUpdated);
    return () => {
      window.removeEventListener('masar:settings_updated', handleSettingsUpdated);
    };
  }, []);

  // Handle idle lock timer
  useEffect(() => {
    if (autoLockMinutes <= 0) return;

    let timeoutId: NodeJS.Timeout;
    const idleTimeMs = autoLockMinutes * 60 * 1000;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsLocked(true);
        sessionStorage.removeItem(`masar_profile_unlocked_${orgId}`);
      }, idleTimeMs);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [autoLockMinutes, orgId]);

  const lockProfile = useCallback(() => {
    setIsLocked(true);
    sessionStorage.removeItem(`masar_profile_unlocked_${orgId}`);
  }, [orgId]);

  const openProfileSelector = useCallback(() => {
    setShowProfileSelector(true);
  }, []);

  const closeProfileSelector = useCallback(() => {
    setShowProfileSelector(false);
  }, []);

  const switchProfileDirect = useCallback((profile: ProfileMode): boolean => {
    if (profile === 'assistant' && assistantAccount && !assistantAccount.pinRequired) {
      setCurrentProfile('assistant');
      setIsLocked(false);
      setShowProfileSelector(false);
      sessionStorage.setItem(`masar_active_profile_${orgId}`, 'assistant');
      sessionStorage.setItem(`masar_profile_unlocked_${orgId}`, 'true');
      return true;
    }
    return false;
  }, [assistantAccount, orgId]);

  const unlockWithPin = useCallback(async (
    profile: ProfileMode,
    enteredPin?: string
  ): Promise<{ success: boolean; error?: string }> => {
    // 1. Check brute-force lockout
    const remaining = isLockedOut(orgId, profile);
    if (remaining > 0) {
      return { success: false, error: 'تم قفل الإدخال مؤقتاً' };
    }

    if (profile === 'assistant' && !assistantAccount) {
      return { success: false, error: 'ملف المساعدين غير مفعل بعد' };
    }

    if (profile === 'assistant' && !assistantAccount?.pinRequired) {
      setCurrentProfile('assistant');
      setIsLocked(false);
      setShowProfileSelector(false);
      sessionStorage.setItem(`masar_active_profile_${orgId}`, 'assistant');
      sessionStorage.setItem(`masar_profile_unlocked_${orgId}`, 'true');
      return { success: true };
    }

    // 2. Verify hashed PIN
    const ok = await verifyPin(orgId, profile, (enteredPin || '').trim());
    if (ok) {
      clearFailedAttempts(orgId, profile);
      setCurrentProfile(profile);
      setIsLocked(false);
      setShowProfileSelector(false);
      sessionStorage.setItem(`masar_active_profile_${orgId}`, profile);
      sessionStorage.setItem(`masar_profile_unlocked_${orgId}`, 'true');
      return { success: true };
    } else {
      await recordFailedAttempt(orgId, profile);
      const isNowLocked = isLockedOut(orgId, profile);
      if (isNowLocked > 0) {
        return { success: false, error: 'تم قفل الإدخال مؤقتاً' };
      }
      return { success: false, error: 'رمز الدخول غير صحيح' };
    }
  }, [assistantAccount, orgId]);

  // Admin PIN update with verification
  const updateAdminPin = useCallback(async (
    newPin: string,
    currentPin?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanNewPin = newPin.trim();
      if (!isValidPinFormat(cleanNewPin)) {
        return { success: false, error: 'يجب أن يتكون رمز الدخول الجديد من 4 أرقام' };
      }

      if (currentPin !== undefined && currentPin.trim() !== '') {
        const ok = await verifyPin(orgId, 'admin', currentPin.trim());
        if (!ok) {
          return { success: false, error: 'رمز الدخول الحالي غير صحيح' };
        }
      }

      await setPin(orgId, 'admin', cleanNewPin);

      // Scrub plaintext from settings if any remained
      const settings = await db.settings.toArray();
      if (settings.length > 0) {
        const cur = settings[0];
        if (cur.profilesConfig && ('adminPin' in cur.profilesConfig || 'assistantPin' in cur.profilesConfig)) {
          const cfg = { ...cur.profilesConfig };
          delete (cfg as any).adminPin;
          delete (cfg as any).assistantPin;
          await db.settings.update(cur.id, {
            profilesConfig: cfg,
            updated_at: Date.now()
          });
        }
      }

      if (cleanNewPin !== '1234') {
        setForcePinChange(false);
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'تعذر تحديث رمز الدخول' };
    }
  }, [orgId]);

  // Assistant PIN update
  const updateAssistantPin = useCallback(async (
    newPin: string,
    currentPin?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (assistantAccount?.pinRequired) {
        if (!currentPin) {
          return { success: false, error: 'رمز الدخول الحالي للمساعد غير صحيح' };
        }
        const isAssistantOk = await verifyPin(orgId, 'assistant', currentPin.trim());
        const isAdminOk = await verifyPin(orgId, 'admin', currentPin.trim());
        if (!isAssistantOk && !isAdminOk) {
          return { success: false, error: 'رمز الدخول الحالي للمساعد غير صحيح' };
        }
      }

      const cleanNewPin = newPin.trim();
      if (!isValidPinFormat(cleanNewPin)) {
        return { success: false, error: 'يجب أن يتكون رمز الدخول الجديد من 4 أرقام' };
      }

      await setPin(orgId, 'assistant', cleanNewPin, { assistantPinRequired: true });

      // Scrub plaintext from settings
      const settings = await db.settings.toArray();
      if (settings.length > 0) {
        const cur = settings[0];
        const updatedProfilesConfig = {
          ...(cur.profilesConfig || {}),
          assistantPinRequired: true
        };
        delete (updatedProfilesConfig as any).adminPin;
        delete (updatedProfilesConfig as any).assistantPin;
        await db.settings.update(cur.id, {
          profilesConfig: updatedProfilesConfig,
          updated_at: Date.now()
        });
      }

      setAssistantAccount(prev => prev ? {
        ...prev,
        pinRequired: true
      } : undefined);

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'تعذر تحديث رمز الدخول للمساعد' };
    }
  }, [assistantAccount, orgId]);

  const requestAdminPinOtp = useCallback(async (): Promise<{ success: boolean; previewCode?: string; message?: string }> => {
    return {
      success: true,
      previewCode: '123456',
      message: 'يمكنك الآن تغيير رمز الدخول مباشرة'
    };
  }, []);

  const updateAdminPinWithOtp = useCallback(async (
    _otpCode: string,
    newPin: string
  ): Promise<{ success: boolean; error?: string }> => {
    return updateAdminPin(newPin);
  }, [updateAdminPin]);

  const saveAssistantProfile = useCallback(async (
    config: {
      enabled: boolean;
      name: string;
      avatarUrl?: string;
      pinRequired: boolean;
      pin?: string;
    },
    currentPinToVerify?: string
  ): Promise<{ success: boolean; error?: string }> => {
    // If assistant currently exists and has a PIN required, enforce current PIN verification
    if (assistantAccount?.pinRequired) {
      if (!currentPinToVerify) {
        return { success: false, error: 'رمز الدخول الحالي غير صحيح، يرجى إدخال الرمز الصحيح للمتابعة' };
      }
      const isAssistantOk = await verifyPin(orgId, 'assistant', currentPinToVerify.trim());
      const isAdminOk = await verifyPin(orgId, 'admin', currentPinToVerify.trim());
      if (!isAssistantOk && !isAdminOk) {
        return { success: false, error: 'رمز الدخول الحالي غير صحيح، يرجى إدخال الرمز الصحيح للمتابعة' };
      }
    }

    if (config.enabled) {
      if (config.pinRequired && config.pin) {
        await setPin(orgId, 'assistant', config.pin, { assistantPinRequired: true });
      } else {
        await updatePinFlags(orgId, 'assistant', { assistantPinRequired: false });
      }
    } else {
      await deletePin(orgId, 'assistant');
    }

    const settings = await db.settings.toArray();
    const updatedProfilesConfig = {
      ...(settings[0]?.profilesConfig || {}),
      assistantEnabled: config.enabled,
      assistantName: config.name,
      assistantAvatarUrl: config.avatarUrl || DEFAULT_FORMAL_AVATARS.assistant,
      assistantPinRequired: config.pinRequired
    };
    delete (updatedProfilesConfig as any).adminPin;
    delete (updatedProfilesConfig as any).assistantPin;

    if (settings.length > 0) {
      await db.settings.update(settings[0].id, {
        profilesConfig: updatedProfilesConfig,
        updated_at: Date.now()
      });
    }

    if (config.enabled) {
      setAssistantAccount({
        id: 'assistant',
        name: config.name,
        role: 'assistant',
        avatarUrl: config.avatarUrl || DEFAULT_FORMAL_AVATARS.assistant,
        pinRequired: config.pinRequired
      });
    } else {
      setAssistantAccount(undefined);
      if (currentProfile === 'assistant') {
        setCurrentProfile('admin');
      }
    }

    return { success: true };
  }, [assistantAccount, currentProfile, orgId]);

  const updateProfilesConfig = useCallback(async (patch: {
    adminName?: string;
    adminAvatarUrl?: string;
    autoLockMinutes?: number;
  }) => {
    const settings = await db.settings.toArray();
    const updated = {
      ...(settings[0]?.profilesConfig || {}),
      ...(patch.adminName ? { adminName: patch.adminName } : {}),
      ...(patch.adminAvatarUrl ? { adminAvatarUrl: patch.adminAvatarUrl } : {}),
      ...(typeof patch.autoLockMinutes === 'number' ? { autoLockMinutes: patch.autoLockMinutes } : {})
    };
    delete (updated as any).adminPin;
    delete (updated as any).assistantPin;

    if (settings.length > 0) {
      await db.settings.update(settings[0].id, {
        ...(patch.adminName ? { teacherName: patch.adminName } : {}),
        profilesConfig: updated,
        updated_at: Date.now()
      });
    }

    if (typeof patch.autoLockMinutes === 'number') {
      await updatePinFlags(orgId, 'admin', { autoLockMinutes: patch.autoLockMinutes });
      setAutoLockMinutes(patch.autoLockMinutes);
    }

    if (patch.adminName) {
      localStorage.setItem('masar_teacher_name', patch.adminName);
      if (orgId) {
        localStorage.setItem(`masar_teacher_name_${orgId}`, patch.adminName);
      }
      setAdminAccount(prev => ({ ...prev, name: patch.adminName! }));
    }
    if (patch.adminAvatarUrl) {
      setAdminAccount(prev => ({ ...prev, avatarUrl: patch.adminAvatarUrl! }));
    }
  }, [orgId]);

  const updateAssistantSubSettings = useCallback(async (patch: Partial<AssistantSubSettings>): Promise<{ success: boolean; error?: string }> => {
    try {
      const settings = await db.settings.toArray();
      const currentSub = settings[0]?.assistantSubSettings || settings[0]?.profilesConfig?.assistantSubSettings || DEFAULT_ASSISTANT_SUB_SETTINGS;
      const updatedSub: AssistantSubSettings = {
        ...currentSub,
        ...patch
      };

      if (settings.length > 0) {
        const cur = settings[0];
        const updatedProfilesConfig = {
          ...(cur.profilesConfig || {}),
          assistantSubSettings: updatedSub
        };
        delete (updatedProfilesConfig as any).adminPin;
        delete (updatedProfilesConfig as any).assistantPin;
        await db.settings.update(cur.id, {
          assistantSubSettings: updatedSub,
          profilesConfig: updatedProfilesConfig,
          updated_at: Date.now()
        });
      }

      setAssistantSubSettings(updatedSub);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'فشل حفظ إعدادات المساعد' };
    }
  }, []);

  return (
    <ProfileContext.Provider
      value={{
        currentProfile,
        accounts: {
          admin: adminAccount,
          assistant: assistantAccount
        },
        assistantSubSettings,
        isLocked,
        showProfileSelector,
        forcePinChange,
        setForcePinChange,
        lockProfile,
        unlockWithPin,
        switchProfileDirect,
        openProfileSelector,
        closeProfileSelector,
        updateAdminPin,
        updateAdminPinWithOtp,
        requestAdminPinOtp,
        updateAssistantPin,
        saveAssistantProfile,
        updateProfilesConfig,
        updateAssistantSubSettings,
        autoLockMinutes
      }}
    >
      {forcePinChange && (
        <AdminPinChangeModal
          isOpen={true}
          isForced={true}
          onClose={() => {}}
        />
      )}
      {children}
    </ProfileContext.Provider>
  );
}

const defaultProfileContextValue: ProfileContextType = {
  currentProfile: 'admin',
  accounts: {
    admin: {
      id: 'admin',
      name: 'المعلم (المدير)',
      role: 'admin',
      avatarUrl: DEFAULT_FORMAL_AVATARS.admin,
      pinRequired: true
    }
  },
  assistantSubSettings: DEFAULT_ASSISTANT_SUB_SETTINGS,
  isLocked: false,
  showProfileSelector: false,
  forcePinChange: false,
  setForcePinChange: () => {},
  lockProfile: () => {},
  unlockWithPin: async () => ({ success: true }),
  switchProfileDirect: () => true,
  openProfileSelector: () => {},
  closeProfileSelector: () => {},
  updateAdminPin: async () => ({ success: true }),
  updateAdminPinWithOtp: async () => ({ success: true }),
  requestAdminPinOtp: async () => ({ success: true }),
  updateAssistantPin: async () => ({ success: true }),
  saveAssistantProfile: async () => ({ success: true }),
  updateProfilesConfig: async () => {},
  updateAssistantSubSettings: async () => ({ success: true }),
  autoLockMinutes: 15
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    return defaultProfileContextValue;
  }
  return context;
};
