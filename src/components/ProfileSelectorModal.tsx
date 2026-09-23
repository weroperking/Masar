import React, { useState, useEffect } from 'react';
import { Shield, Lock, Unlock, Check, X, UserCheck, AlertCircle, ArrowLeft, UserPlus, KeyRound } from 'lucide-react';
import { useProfile, DEFAULT_FORMAL_AVATARS } from '../context/ProfileContext';
import { ProfileMode } from '../types';
import { MasarLogo } from './MasarLogo';

export function ProfileSelectorModal() {
  const {
    currentProfile,
    accounts,
    isLocked,
    showProfileSelector,
    unlockWithPin,
    switchProfileDirect,
    closeProfileSelector,
    saveAssistantProfile
  } = useProfile();

  // Active target profile for PIN entry
  const [selectedTarget, setSelectedTarget] = useState<ProfileMode | null>(null);
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '']);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Assistant management / creation state
  const [isAddingAssistant, setIsAddingAssistant] = useState<boolean>(false);
  const [authAdminForAssistant, setAuthAdminForAssistant] = useState<boolean>(false);
  const [adminAuthPin, setAdminAuthPin] = useState<string>('');
  const [assistantName, setAssistantName] = useState<string>('فريق المساعدين');
  const [assistantPinRequired, setAssistantPinRequired] = useState<boolean>(false);
  const [currentAssistantPin, setCurrentAssistantPin] = useState<string>('');
  const [assistantNewPin, setAssistantNewPin] = useState<string>('');
  const [assistantConfirmPin, setAssistantConfirmPin] = useState<string>('');

  const isOpen = isLocked || showProfileSelector;

  // Reset PIN when selectedTarget changes
  useEffect(() => {
    setPinDigits(['', '', '', '']);
    setErrorMsg('');
  }, [selectedTarget]);

  // Load current assistant name when opening edit
  useEffect(() => {
    if (accounts.assistant) {
      setAssistantName(accounts.assistant.name);
      setAssistantPinRequired(accounts.assistant.pinRequired);
    } else {
      setAssistantName('فريق المساعدين');
      setAssistantPinRequired(false);
    }
    setCurrentAssistantPin('');
    setAssistantNewPin('');
    setAssistantConfirmPin('');
    setErrorMsg('');
  }, [isAddingAssistant, accounts.assistant]);

  // Handle keyboard inputs when PIN dialog is open
  useEffect(() => {
    if (!isOpen || !selectedTarget) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigitPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape' && !isLocked) {
        setSelectedTarget(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedTarget, pinDigits, isLocked]);

  if (!isOpen) return null;

  const handleDigitPress = (num: string) => {
    setErrorMsg('');
    const emptyIndex = pinDigits.findIndex(d => d === '');
    if (emptyIndex !== -1) {
      const nextDigits = [...pinDigits];
      nextDigits[emptyIndex] = num;
      setPinDigits(nextDigits);

      // If this was the 4th digit, submit automatically
      if (emptyIndex === 3) {
        const fullPin = nextDigits.join('');
        submitPin(fullPin);
      }
    }
  };

  const handleBackspace = () => {
    setErrorMsg('');
    for (let i = 3; i >= 0; i--) {
      if (pinDigits[i] !== '') {
        const nextDigits = [...pinDigits];
        nextDigits[i] = '';
        setPinDigits(nextDigits);
        return;
      }
    }
  };

  const submitPin = async (code: string) => {
    if (!selectedTarget) return;
    setIsVerifying(true);
    setErrorMsg('');

    try {
      const res = await unlockWithPin(selectedTarget, code);
      if (res.success) {
        setSelectedTarget(null);
        setPinDigits(['', '', '', '']);
      } else {
        setErrorMsg(res.error || 'رمز PIN غير صحيح');
        setPinDigits(['', '', '', '']);
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'حدث خطأ أثناء التحقق');
      setPinDigits(['', '', '', '']);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSelectAccount = (target: ProfileMode) => {
    if (target === 'assistant') {
      if (!accounts.assistant) {
        // Trigger secure admin auth before creating assistant profile
        setAuthAdminForAssistant(true);
        setErrorMsg('');
        return;
      }
      if (!accounts.assistant.pinRequired) {
        switchProfileDirect('assistant');
        return;
      }
    }

    // Requires PIN
    setSelectedTarget(target);
  };

  // Verify Admin PIN before granting access to create/configure new assistant
  const handleVerifyAdminToManageAssistant = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = adminAuthPin.trim();
    if (cleanPin !== (accounts.admin.pin || '1234')) {
      setErrorMsg('رمز PIN الخاص بالمعلم (المدير) غير صحيح');
      return;
    }
    setAuthAdminForAssistant(false);
    setAdminAuthPin('');
    setIsAddingAssistant(true);
    setErrorMsg('');
  };

  // Save/Update Assistant Profile with strict Current PIN verification
  const handleSaveAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!assistantName.trim()) {
      setErrorMsg('يرجى كتابة اسم الملف التعريفي');
      return;
    }

    // 1. If assistant currently has a PIN required, check the current PIN
    if (accounts.assistant?.pinRequired && accounts.assistant.pin) {
      const cleanCurrent = currentAssistantPin.trim();
      if (!cleanCurrent) {
        setErrorMsg('يجب إدخال رمز PIN الحالي للمساعد للمتابعة');
        return;
      }
      if (cleanCurrent !== accounts.assistant.pin && cleanCurrent !== accounts.admin.pin) {
        setErrorMsg('رمز PIN الحالي للمساعد غير صحيح - لا يمكن تعديل الرمز إلا بعد إدخال الرمز الحالي الصحيح');
        return;
      }
    }

    // 2. If new PIN protection is enabled, validate new PIN
    let targetPin = accounts.assistant?.pin || '';
    if (assistantPinRequired) {
      // If user typed a new PIN or creating for first time
      if (assistantNewPin || !accounts.assistant?.pin) {
        if (assistantNewPin.length !== 4 || !/^\d{4}$/.test(assistantNewPin)) {
          setErrorMsg('رمز PIN الجديد للمساعد يجب أن يتكون من 4 أرقام بالضبط');
          return;
        }
        if (assistantNewPin !== assistantConfirmPin) {
          setErrorMsg('رمز PIN الجديد وتأكيده غير متطابقين');
          return;
        }
        targetPin = assistantNewPin;
      }
    } else {
      targetPin = '';
    }

    const res = await saveAssistantProfile({
      enabled: true,
      name: assistantName.trim(),
      avatarUrl: DEFAULT_FORMAL_AVATARS.assistant,
      pinRequired: assistantPinRequired,
      pin: targetPin
    }, currentAssistantPin);

    if (res.success) {
      setIsAddingAssistant(false);
      setCurrentAssistantPin('');
      setAssistantNewPin('');
      setAssistantConfirmPin('');
      setErrorMsg('');
    } else {
      setErrorMsg(res.error || 'فشل حفظ إعدادات المساعد');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] w-full h-full min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-6 sm:p-12 overflow-y-auto animate-in fade-in duration-200 select-none"
      dir="rtl"
    >
      {/* Background subtle light ambient accents */}
      <div className="fixed top-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* TOP BAR: Full width header */}
      <header className="w-full flex items-center justify-between z-10 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <MasarLogo size="md" />
        </div>

        {!isLocked && (
          <button
            type="button"
            onClick={closeProfileSelector}
            className="p-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 transition-colors cursor-pointer border border-slate-200/80 shadow-2xs"
            title="إغلاق والعودة"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </header>

      {/* CENTER VIEW: Full Screen Profile Selector or PIN Dialog */}
      <main className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center my-auto py-8 z-10">
        
        {/* --- 1. MAIN PROFILE SELECTION VIEW (SECURE LOCK SCREEN) --- */}
        {!selectedTarget && !isAddingAssistant && !authAdminForAssistant && (
          <div className="w-full flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight font-['Readex_Pro']">
              من يستخدم مسار الآن؟
            </h1>
            <p className="text-slate-600 text-sm sm:text-base mt-3 max-w-lg font-['Cairo']">
              اختر ملف العمل المناسب للمتابعة. ملف المعلم الرئيسي محمي برمز PIN لمنع التعديل والاطلاع على الخزينة والتقارير.
            </p>

            {/* Profiles Container */}
            <div className="flex flex-wrap items-center justify-center gap-10 sm:gap-16 my-12">
              
              {/* Profile 1: Admin */}
              <button
                type="button"
                onClick={() => handleSelectAccount('admin')}
                className="group flex flex-col items-center focus:outline-none cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-2xl overflow-hidden border-4 border-slate-200 group-hover:border-blue-600 transition-all duration-300 shadow-xl group-hover:shadow-blue-500/20 bg-white">
                  <img
                    src={accounts.admin.avatarUrl || DEFAULT_FORMAL_AVATARS.admin}
                    alt={accounts.admin.name}
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                  />
                  {/* Subtle Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent opacity-40 group-hover:opacity-10 transition-opacity" />

                  {/* Lock Indicator */}
                  <div className="absolute bottom-2 right-2 bg-white/95 text-slate-800 p-1.5 rounded-lg backdrop-blur-xs border border-slate-200 shadow-sm">
                    <Lock className="w-4 h-4 text-blue-600" />
                  </div>
                  {currentProfile === 'admin' && !isLocked && (
                    <div className="absolute top-2 left-2 bg-blue-600 text-white p-1.5 rounded-lg ring-2 ring-white shadow-md">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>
                
                <span className="mt-4 text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors font-['Readex_Pro'] max-w-[170px] truncate">
                  {accounts.admin.name}
                </span>
              </button>

              {/* Profile 2: Assistant (Or Add Assistant Button) */}
              {accounts.assistant ? (
                <button
                  type="button"
                  onClick={() => handleSelectAccount('assistant')}
                  className="group flex flex-col items-center focus:outline-none cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-2xl overflow-hidden border-4 border-slate-200 group-hover:border-emerald-600 transition-all duration-300 shadow-xl group-hover:shadow-emerald-500/20 bg-white">
                    <img
                      src={accounts.assistant.avatarUrl || DEFAULT_FORMAL_AVATARS.assistant}
                      alt={accounts.assistant.name}
                      className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent opacity-40 group-hover:opacity-10 transition-opacity" />

                    {/* Status Badge */}
                    <div className="absolute bottom-2 right-2 bg-white/95 text-slate-800 p-1.5 rounded-lg backdrop-blur-xs border border-slate-200 shadow-sm">
                      {accounts.assistant.pinRequired ? (
                        <Lock className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Unlock className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                    {currentProfile === 'assistant' && !isLocked && (
                      <div className="absolute top-2 left-2 bg-emerald-600 text-white p-1.5 rounded-lg ring-2 ring-white shadow-md">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  <span className="mt-4 text-base sm:text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition-colors font-['Readex_Pro'] max-w-[170px] truncate">
                    {accounts.assistant.name}
                  </span>
                </button>
              ) : (
                /* Add Profile Button (Protected by Admin PIN) */
                <button
                  type="button"
                  onClick={() => setAuthAdminForAssistant(true)}
                  className="group flex flex-col items-center focus:outline-none cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl border-4 border-dashed border-slate-300 group-hover:border-blue-500 group-hover:bg-blue-50/50 flex flex-col items-center justify-center text-slate-400 group-hover:text-blue-600 transition-all duration-200 bg-white/60">
                    <UserPlus className="w-8 h-8 mb-2 stroke-[1.5]" />
                    <span className="text-xs font-bold font-['Readex_Pro']">إضافة ملف مساعد</span>
                  </div>
                  <span className="mt-4 text-sm font-semibold text-slate-600 group-hover:text-blue-600 transition-colors font-['Cairo']">
                    ملف إضافي للمساعدين
                  </span>
                  <span className="text-xs text-slate-400 mt-0.5 font-['Cairo']">
                    حجب تلقائي للماليات
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* --- 2. ADMIN AUTH STEP BEFORE CREATING/CONFIGURING ASSISTANT --- */}
        {authAdminForAssistant && (
          <div className="w-full max-w-sm bg-white border border-slate-200 p-6 rounded-2xl shadow-xl flex flex-col items-center text-center animate-in zoom-in-95 duration-150 font-['Cairo']">
            <button
              type="button"
              onClick={() => {
                setAuthAdminForAssistant(false);
                setAdminAuthPin('');
                setErrorMsg('');
              }}
              className="self-start mb-4 text-xs font-semibold text-slate-500 hover:text-blue-600 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 rotate-180" />
              <span>إلغاء والعودة</span>
            </button>

            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <Lock className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 font-['Readex_Pro']">
              التحقق من إذن المعلم (المدير)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              أدخل رمز PIN الخاص بالمعلم للترخيص بإعداد وإضافة ملف المساعدين.
            </p>

            {errorMsg && (
              <div className="mt-3 w-full p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleVerifyAdminToManageAssistant} className="w-full space-y-3 mt-4">
              <input
                type="password"
                maxLength={4}
                required
                value={adminAuthPin}
                onChange={(e) => setAdminAuthPin(e.target.value.replace(/\D/g, ''))}
                placeholder="****"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm font-mono tracking-widest text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                autoFocus
              />
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all shadow-md cursor-pointer"
              >
                تأكيد الإذن
              </button>
            </form>
          </div>
        )}

        {/* --- 3. PIN ENTRY VIEW (FULL SCREEN LIGHT THEME) --- */}
        {selectedTarget && (
          <div className="w-full max-w-md flex flex-col items-center text-center animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setSelectedTarget(null)}
              className="self-start mb-6 text-xs font-semibold text-slate-600 hover:text-blue-600 flex items-center gap-1.5 transition-colors cursor-pointer bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4 rotate-180" />
              <span>العودة لاختيار الملف</span>
            </button>

            {/* Avatar Header */}
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-3 border-blue-600 shadow-lg mb-4 bg-white">
              <img
                src={
                  selectedTarget === 'admin'
                    ? accounts.admin.avatarUrl || DEFAULT_FORMAL_AVATARS.admin
                    : accounts.assistant?.avatarUrl || DEFAULT_FORMAL_AVATARS.assistant
                }
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>

            <h2 className="text-2xl font-bold text-slate-900 font-['Readex_Pro']">
              أدخل رمز PIN للدخول
            </h2>
            <p className="text-xs text-slate-500 mt-1.5 font-['Cairo']">
              {selectedTarget === 'admin'
                ? `تسجيل الدخول لملف المدير: ${accounts.admin.name}`
                : `تسجيل الدخول لملف المساعد: ${accounts.assistant?.name}`}
            </p>

            {errorMsg && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 font-['Cairo']">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 4 Digit Indicators */}
            <div className="flex items-center gap-4 my-8" dir="ltr">
              {pinDigits.map((digit, index) => (
                <div
                  key={index}
                  className={`w-14 h-16 rounded-2xl border-2 flex items-center justify-center text-3xl font-bold transition-all ${
                    digit !== ''
                      ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-md shadow-blue-500/10'
                      : 'border-slate-200 bg-white text-slate-300'
                  }`}
                >
                  {digit !== '' ? '●' : ''}
                </div>
              ))}
            </div>

            {/* Formal Keypad */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-xs font-['Readex_Pro']" dir="ltr">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button
                  key={num}
                  type="button"
                  disabled={isVerifying}
                  onClick={() => handleDigitPress(num)}
                  className="h-14 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-300 shadow-2xs text-slate-800 font-bold text-xl transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {num}
                </button>
              ))}
              <div />
              <button
                type="button"
                disabled={isVerifying}
                onClick={() => handleDigitPress('0')}
                className="h-14 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-300 shadow-2xs text-slate-800 font-bold text-xl transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                0
              </button>
              <button
                type="button"
                disabled={isVerifying}
                onClick={handleBackspace}
                className="h-14 rounded-xl bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 shadow-2xs text-slate-600 hover:text-red-600 font-bold text-sm transition-all active:scale-95 flex items-center justify-center cursor-pointer disabled:opacity-50"
                title="مسح الرقم"
              >
                مسح
              </button>
            </div>
          </div>
        )}

        {/* --- 4. ADD / EDIT ASSISTANT VIEW (REQUIRES CURRENT PIN TO CHANGE) --- */}
        {isAddingAssistant && (
          <div className="w-full max-w-lg bg-white border border-slate-200 p-8 rounded-2xl shadow-xl flex flex-col items-center text-center animate-in zoom-in-95 duration-150 font-['Cairo']">
            <button
              type="button"
              onClick={() => {
                setIsAddingAssistant(false);
                setErrorMsg('');
              }}
              className="self-start mb-4 text-xs font-semibold text-slate-500 hover:text-blue-600 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 rotate-180" />
              <span>إلغاء والعودة</span>
            </button>

            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-md mb-4 bg-slate-50">
              <img
                src={DEFAULT_FORMAL_AVATARS.assistant}
                alt="Assistant Profile"
                className="w-full h-full object-cover"
              />
            </div>

            <h3 className="text-xl font-bold text-slate-900 font-['Readex_Pro']">
              إعداد وتعديل ملف المساعدين
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              يتيح للمساعدين تسجيل الحضور ومسح الباركود، مع حجب كامل للتقارير والخزينة والمعاملات المالية.
            </p>

            {errorMsg && (
              <div className="mt-3 w-full p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl text-right flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveAssistant} className="w-full space-y-4 mt-6 text-right">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  اسم الملف التعريفي
                </label>
                <input
                  type="text"
                  required
                  value={assistantName}
                  onChange={(e) => setAssistantName(e.target.value)}
                  placeholder="مثال: فريق المساعدين أو الاستقبال"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              {/* Pin Protection Option */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-xs font-bold text-slate-800">
                      حماية ملف المساعد برمز PIN؟
                    </span>
                    <span className="text-[11px] text-slate-500">
                      إذا تم التعطيل، سيكون الدخول فورياً ومباشراً بدون طلب رمز.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={assistantPinRequired}
                    onChange={(e) => setAssistantPinRequired(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                </div>

                {/* If Assistant already has a PIN, require current correct PIN before modifying/saving */}
                {accounts.assistant?.pinRequired && accounts.assistant.pin && (
                  <div className="pt-3 border-t border-slate-200 space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 flex items-center justify-between">
                      <span>رمز PIN الحالي للمساعد (مطلوب للتأكيد)</span>
                      <span className="text-[11px] text-red-500 font-normal">* إلزامي</span>
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      required
                      value={currentAssistantPin}
                      onChange={(e) => setCurrentAssistantPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="أدخل رمز PIN الحالي"
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono tracking-widest text-center text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                )}

                {/* New PIN Fields */}
                {assistantPinRequired && (
                  <div className="pt-3 border-t border-slate-200 space-y-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        {accounts.assistant?.pin ? 'رمز PIN الجديد (4 أرقام - اتركه فارغاً للإبقاء على الرمز الحالي)' : 'رمز PIN الخاص بالمساعد (4 أرقام)'}
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        required={!accounts.assistant?.pin}
                        value={assistantNewPin}
                        onChange={(e) => setAssistantNewPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="****"
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono tracking-widest text-center text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    {assistantNewPin && (
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-700">
                          تأكيد رمز PIN الجديد
                        </label>
                        <input
                          type="password"
                          maxLength={4}
                          required
                          value={assistantConfirmPin}
                          onChange={(e) => setAssistantConfirmPin(e.target.value.replace(/\D/g, ''))}
                          placeholder="****"
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono tracking-widest text-center text-slate-900 focus:outline-none focus:border-blue-600"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-md cursor-pointer"
                >
                  حفظ إعدادات الملف
                </button>
                {accounts.assistant && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (accounts.assistant?.pinRequired && accounts.assistant.pin) {
                        const clean = currentAssistantPin.trim();
                        if (clean !== accounts.assistant.pin && clean !== accounts.admin.pin) {
                          setErrorMsg('يجب إدخال رمز PIN الحالي للمساعد لحذف أو تعطيل الملف');
                          return;
                        }
                      }
                      await saveAssistantProfile({
                        enabled: false,
                        name: '',
                        pinRequired: false
                      }, currentAssistantPin);
                      setIsAddingAssistant(false);
                    }}
                    className="py-3 px-4 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium cursor-pointer"
                  >
                    حذف الملف
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </main>

      {/* FOOTER: Full width security notice */}
      <footer className="w-full border-t border-slate-200 pt-4 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-['Cairo'] gap-2 z-10">
        <div className="flex items-center gap-2">
          <span>منظومة حماية مسار — قفل أمان تلقائي بعد 15 دقيقة من عدم النشاط</span>
        </div>
        <span>Masar Identity & Access Control System</span>
      </footer>
    </div>
  );
}
