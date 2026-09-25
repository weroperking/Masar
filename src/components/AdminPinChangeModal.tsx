import React, { useState } from 'react';
import { KeyRound, Check, X, AlertCircle, ShieldAlert } from 'lucide-react';
import { useOrganization } from '@clerk/clerk-react';
import { useProfile } from '../context/ProfileContext';
import { verifyPin } from '../services/pinService';

export function AdminPinChangeModal({
  isOpen,
  onClose,
  isForced = false,
  isReset = false
}: {
  isOpen: boolean;
  onClose: () => void;
  isForced?: boolean;
  isReset?: boolean;
}) {
  const { updateAdminPin, setForcePinChange } = useProfile();
  const { organization } = useOrganization();
  const orgId = organization?.id || 'default_org';

  const isForcedMode = isForced || isReset;

  const [currentPin, setCurrentPin] = useState<string>('');
  const [newPin, setNewPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setErrorMsg('رمز الدخول الجديد يجب أن يتكون من 4 أرقام بالضبط');
      return;
    }

    if (newPin !== confirmPin) {
      setErrorMsg('رمز الدخول الجديد وتأكيده غير متطابقين');
      return;
    }

    if (isForcedMode && newPin === '1234') {
      setErrorMsg('يجب اختيار رمز دخول جديد مختلف عن الرمز الافتراضي 1234');
      return;
    }

    setIsLoading(true);
    try {
      if (!isForcedMode && currentPin && currentPin.trim() !== '') {
        const isCurrentValid = await verifyPin(orgId, 'admin', currentPin.trim());
        if (!isCurrentValid) {
          setErrorMsg('رمز الدخول الحالي غير صحيح');
          setIsLoading(false);
          return;
        }
      }

      const res = await updateAdminPin(newPin, isForcedMode ? undefined : currentPin);
      if (res.success) {
        if (newPin !== '1234') {
          setForcePinChange(false);
        }
        setSuccessMsg('تم تعيين رمز الدخول الجديد بنجاح!');
        setTimeout(() => {
          onClose();
          setCurrentPin('');
          setNewPin('');
          setConfirmPin('');
          setSuccessMsg('');
        }, 1200);
      } else {
        setErrorMsg(res.error || 'تعذر تحديث رمز الدخول');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'حدث خطأ غير متوقع');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150"
      dir="rtl"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative font-['Cairo']">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isForcedMode ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600' : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600'
            }`}>
              {isForcedMode ? <ShieldAlert className="w-5 h-5" /> : <KeyRound className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-['Readex_Pro']">
                {isForcedMode ? 'تعيين رمز دخول جديد' : 'تغيير رمز الدخول السري'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isForcedMode
                  ? 'لتأمين بيانات الطلاب والماليات، يرجى تعيين رمز دخول سري خاص بك'
                  : 'تعديل رمز الدخول السري المكون من 4 أرقام'}
              </p>
            </div>
          </div>
          {!isForcedMode && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {isForcedMode && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-300 text-xs rounded-xl flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>يرجى تعيين رمز دخول جديد لحماية حسابك والوصول لكافة المعاملات المالية.</span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-emerald-600 text-xs rounded-xl flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {!successMsg && (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {!isForcedMode && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  رمز الدخول الحالي
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="****"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-sm font-mono tracking-widest focus:outline-none focus:border-blue-600 dark:text-white"
                  autoFocus
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  رمز الدخول الجديد (4 أرقام)
                </label>
                <input
                  type="password"
                  required
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="****"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-sm font-mono tracking-widest focus:outline-none focus:border-blue-600 dark:text-white"
                  autoFocus={isForcedMode}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  تأكيد الرمز الجديد
                </label>
                <input
                  type="password"
                  required
                  maxLength={4}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="****"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-sm font-mono tracking-widest focus:outline-none focus:border-blue-600 dark:text-white"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2.5">
              <button
                type="submit"
                disabled={isLoading || newPin.length !== 4 || confirmPin.length !== 4}
                className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isLoading ? 'جاري الحفظ...' : 'حفظ رمز الدخول الجديد'}
              </button>
              {!isForcedMode && (
                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  إلغاء
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
