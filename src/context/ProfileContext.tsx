import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useOrganization, useUser } from '@clerk/clerk-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { ProfileMode, ProfileAccount, AssistantSubSettings } from '../types';

export const DEFAULT_FORMAL_AVATARS = {
  admin: '/avatar-admin.svg',
  assistant: '/avatar-assistant.svg',
  formalMale1: '/avatar-admin.svg',
  formalMale2: '/avatar-admin.svg',
  formalFemale1: '/avatar-assistant.svg',
  formalFemale2: '/avatar-assistant.svg'
};

// Alias for backwards compatibility
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
  const orgId = organization?.id || 'default_org';

  const [currentProfile, setCurrentProfile] = useState<ProfileMode>(() => {
    return (sessionStorage.getItem(`masar_active_profile_${orgId}`) as ProfileMode) || 'admin';
  });

  const [isLocked, setIsLocked] = useState<boolean>(() => {
    const sessionActive = sessionStorage.getItem(`masar_profile_unlocked_${orgId}`);
    return sessionActive !== 'true';
  });

  const [showProfileSelector, setShowProfileSelector] = useState<boolean>(false);

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
      pinRequired: true,
      pin: '1234'
    };
  });

  const [assistantAccount, setAssistantAccount] = useState<ProfileAccount | undefined>(undefined);
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(15);
  const [assistantSubSettings, setAssistantSubSettings] = useState<AssistantSubSettings>(DEFAULT_ASSISTANT_SUB_SETTINGS);

  // Live query on Dexie settings table for instant reactive updates across all components
  const liveSettings = useLiveQuery(() => db.settings.toArray(), []);

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

    if (storedProfiles) {
      const rawAdminAvatar = storedProfiles.adminAvatarUrl;
      const isOldFluffyAdmin = !rawAdminAvatar || rawAdminAvatar.includes('534528741775') || rawAdminAvatar.includes('fluffy') || rawAdminAvatar.includes('1560250097-0b93528c311a') || rawAdminAvatar.includes('dicebear.com');
      const finalAdminAvatar = isOldFluffyAdmin ? DEFAULT_FORMAL_AVATARS.admin : rawAdminAvatar;

      const rawAssistantAvatar = storedProfiles.assistantAvatarUrl;
      const isOldFluffyAssistant = !rawAssistantAvatar || rawAssistantAvatar.includes('517841905240') || rawAssistantAvatar.includes('fluffy') || rawAssistantAvatar.includes('1573496359142') || rawAssistantAvatar.includes('dicebear.com');
      const finalAssistantAvatar = isOldFluffyAssistant ? DEFAULT_FORMAL_AVATARS.assistant : rawAssistantAvatar;

      setAdminAccount({
        id: 'admin',
        name: cur?.teacherName || storedProfiles.adminName || resolvedTeacherName,
        role: 'admin',
        avatarUrl: finalAdminAvatar,
        pinRequired: true,
        pin: storedProfiles.adminPin || '1234'
      });

      if (storedProfiles.assistantEnabled) {
        setAssistantAccount({
          id: 'assistant',
          name: storedProfiles.assistantName || 'فريق المساعدين',
          role: 'assistant',
          avatarUrl: finalAssistantAvatar,
          pinRequired: Boolean(storedProfiles.assistantPinRequired),
          pin: storedProfiles.assistantPin || ''
        });
      } else {
        setAssistantAccount(undefined);
      }

      if (typeof storedProfiles.autoLockMinutes === 'number') {
        setAutoLockMinutes(storedProfiles.autoLockMinutes);
      }
    } else {
      setAdminAccount(prev => ({
        ...prev,
        name: cur?.teacherName || resolvedTeacherName,
        avatarUrl: user?.imageUrl || DEFAULT_FORMAL_AVATARS.admin
      }));
    }
  }, [liveSettings, orgId, user?.fullName, user?.imageUrl, (user?.unsafeMetadata as any)?.teacherName]);

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

  // Handle 15-minute idle lock
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
    if (profile === 'admin') {
      const cleanEntered = (enteredPin || '').trim();
      const expectedPin = adminAccount.pin || '1234';
      if (cleanEntered === expectedPin) {
        setCurrentProfile('admin');
        setIsLocked(false);
        setShowProfileSelector(false);
        sessionStorage.setItem(`masar_active_profile_${orgId}`, 'admin');
        sessionStorage.setItem(`masar_profile_unlocked_${orgId}`, 'true');
        return { success: true };
      }
      return { success: false, error: 'رمز PIN الخاص بالمعلم غير صحيح' };
    }

    if (profile === 'assistant') {
      if (!assistantAccount) {
        return { success: false, error: 'ملف المساعدين غير مفعل بعد' };
      }
      if (!assistantAccount.pinRequired) {
        setCurrentProfile('assistant');
        setIsLocked(false);
        setShowProfileSelector(false);
        sessionStorage.setItem(`masar_active_profile_${orgId}`, 'assistant');
        sessionStorage.setItem(`masar_profile_unlocked_${orgId}`, 'true');
        return { success: true };
      }
      const cleanEntered = (enteredPin || '').trim();
      if (cleanEntered === (assistantAccount.pin || '')) {
        setCurrentProfile('assistant');
        setIsLocked(false);
        setShowProfileSelector(false);
        sessionStorage.setItem(`masar_active_profile_${orgId}`, 'assistant');
        sessionStorage.setItem(`masar_profile_unlocked_${orgId}`, 'true');
        return { success: true };
      }
      return { success: false, error: 'رمز PIN الخاص بالمساعدين غير صحيح' };
    }

    return { success: false, error: 'ملف غير معروف' };
  }, [adminAccount.pin, assistantAccount, orgId]);

  // Direct Admin PIN update with current PIN verification if supplied
  const updateAdminPin = useCallback(async (
    newPin: string,
    currentPin?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanNewPin = newPin.trim();
      if (cleanNewPin.length !== 4 || !/^\d{4}$/.test(cleanNewPin)) {
        return { success: false, error: 'يجب أن يتكون رمز PIN الجديد من 4 أرقام' };
      }

      if (currentPin !== undefined && currentPin.trim() !== '') {
        const expectedPin = adminAccount.pin || '1234';
        if (currentPin.trim() !== expectedPin) {
          return { success: false, error: 'رمز PIN الحالي غير صحيح' };
        }
      }

      const settings = await db.settings.toArray();
      if (settings.length > 0) {
        const cur = settings[0];
        const updatedConfig = {
          ...(cur.profilesConfig || {}),
          adminPin: cleanNewPin
        };
        await db.settings.update(cur.id, {
          profilesConfig: updatedConfig,
          updated_at: Date.now()
        });
      }

      setAdminAccount(prev => ({
        ...prev,
        pin: cleanNewPin
      }));

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'فشل تحديث رمز PIN' };
    }
  }, [adminAccount.pin]);

  // Assistant PIN update requiring current correct PIN verification
  const updateAssistantPin = useCallback(async (
    newPin: string,
    currentPin?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (assistantAccount?.pinRequired && assistantAccount.pin) {
        if (!currentPin || (currentPin.trim() !== assistantAccount.pin && currentPin.trim() !== adminAccount.pin)) {
          return { success: false, error: 'رمز PIN الحالي للمساعد غير صحيح' };
        }
      }

      const cleanNewPin = newPin.trim();
      if (cleanNewPin.length !== 4 || !/^\d{4}$/.test(cleanNewPin)) {
        return { success: false, error: 'يجب أن يتكون رمز PIN الجديد من 4 أرقام' };
      }

      const settings = await db.settings.toArray();
      const updatedProfilesConfig = {
        ...(settings[0]?.profilesConfig || {}),
        assistantPin: cleanNewPin,
        assistantPinRequired: true
      };

      if (settings.length > 0) {
        await db.settings.update(settings[0].id, {
          profilesConfig: updatedProfilesConfig,
          updated_at: Date.now()
        });
      }

      setAssistantAccount(prev => prev ? {
        ...prev,
        pin: cleanNewPin,
        pinRequired: true
      } : undefined);

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'فشل تحديث رمز PIN للمساعد' };
    }
  }, [assistantAccount, adminAccount.pin]);

  const requestAdminPinOtp = useCallback(async (): Promise<{ success: boolean; previewCode?: string; message?: string }> => {
    return {
      success: true,
      previewCode: '123456',
      message: 'يمكنك الآن تغيير رمز PIN مباشرة'
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
    if (assistantAccount?.pinRequired && assistantAccount.pin) {
      if (!currentPinToVerify || (currentPinToVerify.trim() !== assistantAccount.pin && currentPinToVerify.trim() !== adminAccount.pin)) {
        return { success: false, error: 'رمز PIN الحالي غير صحيح، يرجى إدخال الرمز الصحيح للمتابعة' };
      }
    }

    const settings = await db.settings.toArray();
    const updatedProfilesConfig = {
      ...(settings[0]?.profilesConfig || {}),
      assistantEnabled: config.enabled,
      assistantName: config.name,
      assistantAvatarUrl: config.avatarUrl || DEFAULT_FORMAL_AVATARS.assistant,
      assistantPinRequired: config.pinRequired,
      assistantPin: config.pinRequired ? (config.pin || '') : ''
    };

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
        pinRequired: config.pinRequired,
        pin: config.pinRequired ? (config.pin || '') : ''
      });
    } else {
      setAssistantAccount(undefined);
      if (currentProfile === 'assistant') {
        setCurrentProfile('admin');
      }
    }

    return { success: true };
  }, [assistantAccount, adminAccount.pin, currentProfile]);

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

    if (settings.length > 0) {
      await db.settings.update(settings[0].id, {
        ...(patch.adminName ? { teacherName: patch.adminName } : {}),
        profilesConfig: updated,
        updated_at: Date.now()
      });
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
    if (typeof patch.autoLockMinutes === 'number') {
      setAutoLockMinutes(patch.autoLockMinutes);
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
      pinRequired: true,
      pin: '1234'
    }
  },
  assistantSubSettings: DEFAULT_ASSISTANT_SUB_SETTINGS,
  isLocked: false,
  showProfileSelector: false,
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
