import React, { useState, useEffect } from 'react';
import { 
  Key, ShieldCheck, Copy, Check, ExternalLink, MessageCircle, AlertCircle, X, ShieldAlert 
} from 'lucide-react';
import { verifyLicense, VerifyResultReason } from '../license/license';
import { getDeviceFingerprint } from '../license/fingerprint';
import { saveLicense } from '../license/storage';
import { MasarLogo } from '../components/MasarLogo';

// ============================================================================
// CONFIGURATION: Set your WhatsApp business/personal number here
// Format: international phone number without '+' or spaces (e.g., 201012345678)
// ============================================================================
export const MY_NUMBER = '201000000000';

const ERROR_MESSAGES: Record<VerifyResultReason, string> = {
  malformed: "That doesn't look like a license key. Please check and try again.",
  bad_signature: "This license key is not valid.",
  unsupported_version: "This license was issued by a newer version. Please update the app.",
  expired: "Your license has expired. Please renew to continue.",
  wrong_device: "This license is locked to a different device.",
  ok: "",
};

// Arabic equivalents for friendly localized UI
const ERROR_MESSAGES_AR: Record<VerifyResultReason, string> = {
  malformed: "صيغة مفتاح الترخيص غير صحيحة، يرجى التأكد وإعادة المحاولة.",
  bad_signature: "مفتاح الترخيص غير صالح أو غير معتمد.",
  unsupported_version: "تم إصدار هذا الترخيص بواسطة إصدار أحدث، يرجى تحديث التطبيق.",
  expired: "انتهت صلاحية مفتاح الترخيص الخاص بك، يرجى التجديد للمتابعة.",
  wrong_device: "مفتاح الترخيص هذا مقفل على جهاز آخر مختلف.",
  ok: "",
};

export interface ActivationProps {
  onUnlock?: () => void;
  onClose?: () => void;
  isModal?: boolean;
  initialMessage?: string | null;
}

export function Activation({ onUnlock, onClose, isModal = false, initialMessage }: ActivationProps) {
  const [licenseKey, setLicenseKey] = useState('');
  const [fingerprint, setFingerprint] = useState<string>('جاري التحميل...');
  const [isLoadingFingerprint, setIsLoadingFingerprint] = useState(true);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorMessageAr, setErrorMessageAr] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    getDeviceFingerprint()
      .then((fp) => {
        if (isMounted) {
          setFingerprint(fp);
          setIsLoadingFingerprint(false);
        }
      })
      .catch((err) => {
        console.error('Failed to get device fingerprint:', err);
        if (isMounted) {
          setFingerprint('UNKNOWN-DEVICE');
          setIsLoadingFingerprint(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCopyFingerprint = async () => {
    try {
      await navigator.clipboard.writeText(fingerprint);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy fingerprint to clipboard:', err);
    }
  };

  const handleActivate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!licenseKey.trim()) {
      setErrorMessage(ERROR_MESSAGES.malformed);
      setErrorMessageAr(ERROR_MESSAGES_AR.malformed);
      return;
    }

    setIsActivating(true);
    setErrorMessage(null);
    setErrorMessageAr(null);

    try {
      const activeFp = fingerprint || (await getDeviceFingerprint());
      const result = verifyLicense(licenseKey, activeFp);

      if (result.ok && result.payload) {
        saveLicense(licenseKey);
        setSuccessMessage(`تم تفعيل الترخيص بنجاح (${result.payload.p.toUpperCase()})`);
        setTimeout(() => {
          if (onUnlock) {
            onUnlock();
          }
          if (onClose) {
            onClose();
          }
        }, 800);
      } else {
        const reason = result.reason;
        setErrorMessage(ERROR_MESSAGES[reason] || "An error occurred during verification.");
        setErrorMessageAr(ERROR_MESSAGES_AR[reason] || "حدث خطأ أثناء التحقق من المفتاح.");
      }
    } catch (err) {
      console.error('Activation unexpected error:', err);
      setErrorMessage("This license key is not valid.");
      setErrorMessageAr("حدث خطأ غير متوقع أثناء فحص الترخيص.");
    } finally {
      setIsActivating(false);
    }
  };

  // WhatsApp click handler
  const prefilledText = `Hi, I want to buy a license. My Device ID is ${fingerprint}.`;
  const whatsappUrl = `https://wa.me/${MY_NUMBER}?text=${encodeURIComponent(prefilledText)}`;

  const content = (
    <div className="w-full max-w-lg mx-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden text-right" dir="rtl">
      {/* Header */}
      <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-readex">
              تفعيل ترخيص المنصة
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              License Activation & Device Binding
            </p>
          </div>
        </div>

        {isModal && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Notice/Initial message if trial expired */}
        {initialMessage && (
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <p className="font-semibold">{initialMessage}</p>
              <p className="text-amber-700 dark:text-amber-400">
                يرجى إدخال مفتاح الترخيص لتفعيل كافة الميزات بدون انقطاع وبشكل أوفلاين بالكامل.
              </p>
            </div>
          </div>
        )}

        {/* Device Fingerprint Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              معرّف هذا الجهاز (Device Fingerprint)
            </label>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              مطلوب للتراخيص المقفلة
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex-1 font-mono text-xs font-bold text-center tracking-wider py-2.5 px-3 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 select-all" dir="ltr">
              {isLoadingFingerprint ? 'CALCULATING...' : fingerprint}
            </div>
            <button
              type="button"
              onClick={handleCopyFingerprint}
              disabled={isLoadingFingerprint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 transition-colors shadow-xs active:scale-95 disabled:opacity-50"
              title="نسخ المعرف"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">تم النسخ</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span>نسخ</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Key Input Form */}
        <form onSubmit={handleActivate} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="license-key-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              مفتاح الترخيص (License Key)
            </label>
            <textarea
              id="license-key-input"
              rows={3}
              value={licenseKey}
              onChange={(e) => {
                setLicenseKey(e.target.value);
                setErrorMessage(null);
                setErrorMessageAr(null);
              }}
              placeholder="ألصق مفتاح الترخيص المشفر هنا (xxxx.yyyy)"
              className="w-full text-xs font-mono p-3 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all resize-none"
              dir="ltr"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold">{errorMessageAr}</p>
                <p className="text-[11px] opacity-90 font-sans" dir="ltr">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-2.5 text-xs text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-semibold">{successMessage}</span>
            </div>
          )}

          {/* Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={isActivating || !licenseKey.trim()}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 transition-all duration-150 shadow-xs active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              <Key className="w-4 h-4" />
              <span>{isActivating ? 'جاري التحقق...' : 'تفعيل الترخيص (Activate)'}</span>
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 transition-all duration-150 shadow-xs active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>طلب ترخيص (WhatsApp)</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </a>
          </div>
        </form>

        {/* Offline Assurance Guarantee */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>التحقق يتم محلياً بالكامل عبر تقنية Ed25519 بدون إنترنت أو خوادم وسيطة</span>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="w-full max-w-lg">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="mb-6 flex flex-col items-center">
        <MasarLogo size="lg" showText={true} />
        <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          منظومة إدارة المراكز والأكاديميات التعليمية
        </p>
      </div>
      {content}
    </div>
  );
}

export default Activation;
