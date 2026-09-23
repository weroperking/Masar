import { 
  Save, 
  Sun, 
  Moon, 
  Keyboard, 
  RefreshCw, 
  User as UserIcon, 
  HelpCircle,
  BookOpen,
  Gift,
  Award,
  Sliders,
  Check,
  Plus,
  Minus,
  Sparkles,
  Compass,
  ShieldCheck,
  Hash,
  CheckCircle2,
  Lock,
  KeyRound,
  Users2
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useUser, useOrganization } from '@clerk/clerk-react';
import { db } from '../../db/db';
import { useApiQuery, useApiMutation } from '../../config/queryHooks';
import { Settings as SettingsType } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useTour } from '../../context/TourContext';
import { useProfile } from '../../context/ProfileContext';
import { AdminPinChangeModal } from '../../components/AdminPinChangeModal';

export function Settings() {
  const toast = useToast();
  const { theme, setTheme } = useTheme();
  const { confirm } = useConfirm();
  const { user } = useUser();
  const { organization } = useOrganization();
  const { startTour } = useTour();
  const { accounts, autoLockMinutes, updateProfilesConfig, saveAssistantProfile } = useProfile();
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [assistantModalOpen, setAssistantModalOpen] = useState(false);
  const [tempAssistantName, setTempAssistantName] = useState(accounts.assistant?.name || 'فريق المساعدين');
  const [tempAssistantPinReq, setTempAssistantPinReq] = useState(accounts.assistant?.pinRequired || false);
  const [tempAssistantPin, setTempAssistantPin] = useState(accounts.assistant?.pin || '');
  const [tempAssistantCurrentPin, setTempAssistantCurrentPin] = useState('');

  const { data: settingsData = [] } = useApiQuery<SettingsType>('settings', 60 * 1000);
  const { create: createSettings, update: updateSettings } = useApiMutation<SettingsType>('settings');

  const [settings, setSettings] = useState<Partial<SettingsType>>({
    autoCreateAssignmentPerSession: false,
    freeSessionLimitPerStudent: 1,
    assignmentGradingMethod: 'numeric',
    numericMaxGrade: 100,
    teacherName: '',
    academyName: ''
  });

  useEffect(() => {
    const savedLocalAcademy = (organization?.id ? localStorage.getItem(`masar_academy_name_${organization.id}`) : null) || localStorage.getItem('masar_academy_name');
    const savedLocalTeacher = (organization?.id ? localStorage.getItem(`masar_teacher_name_${organization.id}`) : null) || localStorage.getItem('masar_teacher_name');

    if (settingsData && settingsData.length > 0) {
      setSettings(prev => ({
        ...prev,
        ...settingsData[0],
        teacherName: settingsData[0].teacherName || prev.teacherName || savedLocalTeacher || '',
        academyName: settingsData[0].academyName || prev.academyName || savedLocalAcademy || organization?.name || ''
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        teacherName: prev.teacherName || savedLocalTeacher || '',
        academyName: prev.academyName || savedLocalAcademy || organization?.name || ''
      }));
    }
  }, [settingsData, organization?.id, organization?.name]);

  const handleSave = async () => {
    try {
      const now = Date.now();
      const updatedSettings = {
        ...settings,
        teacherName: settings.teacherName?.trim() || '',
        academyName: settings.academyName?.trim() || ''
      };

      // 1. Update Profile context if teacherName is provided
      if (updatedSettings.teacherName) {
        await updateProfilesConfig({ adminName: updatedSettings.teacherName });
      }

      // 2. Direct Dexie save for immediate local-first reactivity
      if (settingsData.length > 0) {
        await db.settings.update(settingsData[0].id, {
          ...updatedSettings,
          updated_at: now
        });
        updateSettings.mutate({
          id: settingsData[0].id,
          data: updatedSettings
        });
      } else {
        const newId = crypto.randomUUID();
        await db.settings.add({
          id: newId,
          ...updatedSettings,
          created_at: now,
          updated_at: now
        } as SettingsType);
        createSettings.mutate({
          id: newId,
          ...updatedSettings
        } as SettingsType);
      }

      // 3. Sync teacher & academy names to Clerk Organization level, Clerk User Metadata, and local storage
      if (updatedSettings.teacherName) {
        localStorage.setItem('masar_teacher_name', updatedSettings.teacherName);
        if (organization?.id) {
          localStorage.setItem(`masar_teacher_name_${organization.id}`, updatedSettings.teacherName);
        }
      }

      if (updatedSettings.academyName) {
        localStorage.setItem('masar_academy_name', updatedSettings.academyName);
        if (organization?.id) {
          localStorage.setItem(`masar_academy_name_${organization.id}`, updatedSettings.academyName);
        }
      }

      // 3a. Update Clerk Organization level name directly
      if (organization && updatedSettings.academyName && typeof organization.update === 'function') {
        try {
          await organization.update({ name: updatedSettings.academyName });
          if (typeof organization.reload === 'function') {
            await organization.reload();
          }
        } catch (e) {
          console.warn('Could not update Clerk organization name directly:', e);
        }
      }

      // 3b. Update Clerk User level unsafeMetadata
      if (user) {
        try {
          await user.update({
            unsafeMetadata: {
              ...(user.unsafeMetadata || {}),
              teacherName: updatedSettings.teacherName,
              academyName: updatedSettings.academyName
            }
          });
          if (typeof user.reload === 'function') {
            await user.reload();
          }
        } catch (e) {
          console.warn('Could not update Clerk user metadata:', e);
        }
      }

      // 4. Dispatch custom event for real-time reactive sync across opened views
      window.dispatchEvent(new CustomEvent('masar:settings_updated', {
        detail: {
          teacherName: updatedSettings.teacherName,
          academyName: updatedSettings.academyName
        }
      }));

      toast.success('تم حفظ إعدادات النظام بنجاح!');
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('حدث خطأ أثناء حفظ الإعدادات');
    }
  };

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto pb-12">
      <div className="space-y-6">
        
        {/* Profile Section */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-lg">
              <UserIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">بيانات المعلم والسنتر التعليمي</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">تظهر هذه البيانات على تقارير الطلاب وكروت QR ومراسلات الواتساب</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                اسم المعلم / المحاضر الرئيسي
              </label>
              <input
                type="text"
                value={settings.teacherName || ''}
                onChange={e => setSettings({ ...settings, teacherName: e.target.value })}
                placeholder="أ/ محمد خالد"
                className="w-full px-3.5 py-2.5 bg-slate-50/50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                اسم الأكاديمية أو السنتر
              </label>
              <input
                type="text"
                value={settings.academyName || ''}
                onChange={e => setSettings({ ...settings, academyName: e.target.value })}
                placeholder="سنتر الأوائل التعليمي"
                className="w-full px-3.5 py-2.5 bg-slate-50/50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 transition-all"
              />
            </div>
          </div>
        </section>

        {/* Profiles & PIN Security Section (حماية الملفات والرموز السرية) */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-lg">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 font-['Readex_Pro']">
                  الملفات الشخصية والأمان (PIN)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  إدارة رمز PIN للمدير، وتخصيص حساب المساعدين وحجب البيانات المالية
                </p>
              </div>
            </div>
            <span className="inline-flex px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full text-[11px] font-semibold">
              حماية مشددة
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Admin PIN Card */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/70 bg-slate-50/40 dark:bg-slate-800/30 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-['Readex_Pro']">
                      رمز PIN الخاص بالمعلم (المدير)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono bg-blue-50 dark:bg-blue-950/60 text-blue-700 px-2 py-0.5 rounded font-bold">
                    4 أرقام
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  تغيير رمز الدخول السري الخاص بالمعلم لحماية التقارير والخزينة والمعاملات المالية الحساسة.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsPinModalOpen(true)}
                className="w-full py-2.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>تغيير رمز PIN</span>
              </button>
            </div>

            {/* Assistant Profile Card */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/70 bg-slate-50/40 dark:bg-slate-800/30 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-['Readex_Pro']">
                      ملف المساعدين (مستقل)
                    </span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    accounts.assistant ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {accounts.assistant ? 'مفعل' : 'غير مفعل'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  {accounts.assistant
                    ? `متاح باسم "${accounts.assistant.name}" (${accounts.assistant.pinRequired ? 'محمي برمز PIN' : 'دخول مباشر حر'}).`
                    : 'يمكنك تفعيل ملف إضافي للمساعدين لحجب كل الشاشات والتقارير المالية عنهم.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setAssistantModalOpen(true)}
                className="w-full py-2.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Users2 className="w-3.5 h-3.5 text-slate-500" />
                <span>{accounts.assistant ? 'تعديل إعدادات ملف المساعد' : 'إضافة ملف المساعدين الآن'}</span>
              </button>
            </div>
          </div>

          {/* Auto Lock Setting */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400">
              القفل التلقائي للشاشة عند خمول النظام:
            </span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-blue-600 dark:text-blue-400">{autoLockMinutes} دقيقة</span>
              <span className="text-slate-400 text-[11px]">(يقفل تلقائياً ويعود لاختيار الملف)</span>
            </div>
          </div>
        </section>

        {/* Modal for OTP-verified Admin PIN Change */}
        <AdminPinChangeModal
          isOpen={isPinModalOpen}
          onClose={() => setIsPinModalOpen(false)}
        />

        {/* Assistant Edit Modal in Settings */}
        {assistantModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-['Cairo']">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-['Readex_Pro']">
                إعداد ملف المساعدين
              </h3>
              <p className="text-xs text-slate-500">
                يتيح هذا الملف للمساعدين تسجيل الحضور والغياب مع حجب تام لكافة البيانات المالية والخزينة.
              </p>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    اسم الملف
                  </label>
                  <input
                    type="text"
                    value={tempAssistantName}
                    onChange={(e) => setTempAssistantName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    placeholder="فريق المساعدين"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    حماية ملف المساعد برمز PIN؟
                  </span>
                  <input
                    type="checkbox"
                    checked={tempAssistantPinReq}
                    onChange={(e) => setTempAssistantPinReq(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                </div>

                {/* If Assistant already has a PIN, require current PIN */}
                {accounts.assistant?.pinRequired && accounts.assistant.pin && (
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      رمز PIN الحالي للمساعد (مطلوب للتأكيد)
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={tempAssistantCurrentPin}
                      onChange={(e) => setTempAssistantCurrentPin(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono tracking-widest text-center"
                      placeholder="****"
                    />
                  </div>
                )}

                {tempAssistantPinReq && (
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {accounts.assistant?.pin ? 'رمز PIN الجديد (اتركه فارغاً للإبقاء على الرمز الحالي)' : 'رمز PIN للمساعد (4 أرقام)'}
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={tempAssistantPin}
                      onChange={(e) => setTempAssistantPin(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono tracking-widest text-center"
                      placeholder="****"
                    />
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={async () => {
                    if (accounts.assistant?.pinRequired && accounts.assistant.pin) {
                      if (!tempAssistantCurrentPin) {
                        toast.error('يجب إدخال رمز PIN الحالي للمساعد للمتابعة');
                        return;
                      }
                      if (tempAssistantCurrentPin !== accounts.assistant.pin && tempAssistantCurrentPin !== accounts.admin.pin) {
                        toast.error('رمز PIN الحالي غير صحيح');
                        return;
                      }
                    }

                    const newPinToSave = tempAssistantPin ? tempAssistantPin : (accounts.assistant?.pin || '');
                    if (tempAssistantPinReq && (!newPinToSave || newPinToSave.length !== 4)) {
                      toast.error('يجب أن يتكون رمز PIN من 4 أرقام');
                      return;
                    }

                    const res = await saveAssistantProfile({
                      enabled: true,
                      name: tempAssistantName.trim() || 'فريق المساعدين',
                      pinRequired: tempAssistantPinReq,
                      pin: tempAssistantPinReq ? newPinToSave : ''
                    }, tempAssistantCurrentPin);

                    if (res.success) {
                      setAssistantModalOpen(false);
                      setTempAssistantCurrentPin('');
                      setTempAssistantPin('');
                      toast.success('تم تحديث ملف المساعد بنجاح!');
                    } else {
                      toast.error(res.error || 'فشل تحديث ملف المساعد');
                    }
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                >
                  حفظ التعديلات
                </button>
                {accounts.assistant && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (accounts.assistant?.pinRequired && accounts.assistant.pin) {
                        if (!tempAssistantCurrentPin || (tempAssistantCurrentPin !== accounts.assistant.pin && tempAssistantCurrentPin !== accounts.admin.pin)) {
                          toast.error('يجب إدخال رمز PIN الحالي الصحيح لتعطيل الملف');
                          return;
                        }
                      }
                      await saveAssistantProfile({
                        enabled: false,
                        name: '',
                        pinRequired: false
                      }, tempAssistantCurrentPin);
                      setAssistantModalOpen(false);
                      setTempAssistantCurrentPin('');
                      toast.info('تم تعطيل ملف المساعد');
                    }}
                    className="py-2.5 px-3 rounded-xl border border-red-200 text-red-600 text-xs"
                  >
                    تعطيل الملف
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setAssistantModalOpen(false)}
                  className="py-2.5 px-3 rounded-xl border border-slate-200 text-slate-600 text-xs"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Free & Trial Sessions Section (ضوابط الحصص التجريبية والمجانية) */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-lg">
              <Gift className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">ضوابط الحصص التجريبية والمجانية</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">تحديد عدد الحصص المجانية المسموح بها للطلاب الجدد قبل الدفع</p>
            </div>
          </div>

          <div className="p-4 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">الحد الأقصى لكل طالب:</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">(أدخل 0 للحد غير المحدود)</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                عند تجاوز هذا العدد، سيتطلب النظام سداد الرسوم قبل تسجيل الحضور.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0 w-full lg:w-auto">
              {/* Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pb-2.5 sm:pb-0 border-b sm:border-b-0 sm:border-l border-slate-200 dark:border-slate-700 pl-0 sm:pl-2.5 w-full sm:w-auto justify-start sm:justify-end">
                {[0, 1, 2, 3].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setSettings({ ...settings, freeSessionLimitPerStudent: preset })}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      settings.freeSessionLimitPerStudent === preset
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    {preset === 0 ? 'غير محدود' : `${preset} ${preset === 1 ? 'حصة' : 'حصص'}`}
                  </button>
                ))}
              </div>

              {/* Number stepper input */}
              <div className="inline-flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setSettings({
                    ...settings,
                    freeSessionLimitPerStudent: Math.max(0, (settings.freeSessionLimitPerStudent || 0) - 1)
                  })}
                  className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="إنقاص العدد"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.freeSessionLimitPerStudent ?? 1}
                  onChange={e => setSettings({ ...settings, freeSessionLimitPerStudent: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-12 text-center text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => setSettings({
                    ...settings,
                    freeSessionLimitPerStudent: (settings.freeSessionLimitPerStudent || 0) + 1
                  })}
                  className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="زيادة العدد"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Grading Method Section (طريقة تقييم الواجبات) */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-lg">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">طريقة تقييم الواجبات</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">اختيار أسلوب الدرجات والتقييم للأنشطة والواجبات المنزلية</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Rating Option (1-5) */}
            <div
              onClick={() => setSettings({ ...settings, assignmentGradingMethod: 'rating' })}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                settings.assignmentGradingMethod === 'rating'
                  ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-500/80 dark:border-blue-600/80 ring-2 ring-blue-500/20 shadow-2xs'
                  : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                settings.assignmentGradingMethod === 'rating'
                  ? 'bg-blue-600 text-white dark:bg-blue-500'
                  : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}>
                <Sparkles className="w-4 h-4" />
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    بالتقدير النصي (1 - 5)
                  </span>
                  {settings.assignmentGradingMethod === 'rating' && (
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-[10px]">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  تقييم سريع وسهل (ممتاز، جيد جداً، مقبول...) بنظام 5 نجوم أو مستويات.
                </p>
              </div>
            </div>

            {/* Numeric Option (Percentage / Marks) */}
            <div
              onClick={() => setSettings({ ...settings, assignmentGradingMethod: 'numeric' })}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                settings.assignmentGradingMethod === 'numeric'
                  ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-500/80 dark:border-blue-600/80 ring-2 ring-blue-500/20 shadow-2xs'
                  : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                settings.assignmentGradingMethod === 'numeric'
                  ? 'bg-blue-600 text-white dark:bg-blue-500'
                  : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}>
                <Hash className="w-4 h-4" />
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    بالأرقام (درجة مئوية / مخصصة)
                  </span>
                  {settings.assignmentGradingMethod === 'numeric' && (
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-[10px]">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  تقييم رقمي دقيق برصد الدرجة الفعلية من أصل الحد الأقصى الافتراضي.
                </p>
              </div>
            </div>
          </div>

          {/* Conditional Max Grade Input for Numeric Grading */}
          {settings.assignmentGradingMethod === 'numeric' && (
            <div className="p-4 bg-blue-50/30 dark:bg-blue-950/20 rounded-xl border border-blue-200/60 dark:border-blue-900/40 flex flex-col lg:flex-row lg:items-center justify-between gap-3 animate-in fade-in duration-200">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  الدرجة العظمى الافتراضية للواجبات:
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  الدرجة القصوى المحسوبة تلقائياً عند إنشاء أي واجب جديد
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap items-center gap-1">
                  {[10, 20, 50, 100].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setSettings({ ...settings, numericMaxGrade: val })}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all ${
                        settings.numericMaxGrade === val
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1">
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={settings.numericMaxGrade ?? 100}
                    onChange={e => setSettings({ ...settings, numericMaxGrade: Math.max(1, parseInt(e.target.value) || 100) })}
                    className="w-12 text-center text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none bg-transparent"
                  />
                  <span className="text-[11px] text-slate-400 font-semibold">درجة</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 4. Interactive Platform Tour Section (الجولة التعريفية التفاعلية للمنصة) */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-lg">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">الجولة التعريفية التفاعلية للمنصة</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">إرشادات تفاعلية لشرح وظائف المجموعات، الحضور بالباركود، والماليات</p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-blue-200/70 dark:border-blue-900/40 bg-gradient-to-r from-blue-50/50 via-white to-blue-50/30 dark:from-blue-950/30 dark:via-slate-900 dark:to-blue-950/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-xs font-bold text-blue-950 dark:text-blue-200">إعادة تشغيل الدليل التفاعلي الشامل</h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
                استكشف كافة أقسام منصة مسار (Masar) خطوة بخطوة من خلال الجولة التعريفية التفاعلية التي توضح كيفية إضافة الكورسات، تسجيل الحضور بالبار كود، وإدارة الاشتراكات والماليات.
              </p>
            </div>

            <button
              id="tour-retake-btn"
              type="button"
              onClick={() => startTour(0)}
              className="shrink-0 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs shadow-blue-500/20 active:scale-[0.98]"
            >
              <Compass className="w-4 h-4" />
              <span>بدء الجولة الآن</span>
            </button>
          </div>
        </section>

        {/* Theme Settings Section */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-lg">
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">مظهر المنصة (Theme)</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">التبديل بين المظهر الفاتح والداكن المريح للعين</p>
              </div>
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono font-medium">Ctrl + J</span>
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-md">
            <button
              type="button"
              onClick={() => {
                setTheme('light');
                toast.info('تم تفعيل المظهر الفاتح');
              }}
              className={`flex items-center justify-center gap-2.5 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                theme === 'light'
                  ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 ring-2 ring-blue-500/20'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Sun className="w-4 h-4 text-amber-500" />
              <span>المظهر الفاتح (Light)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTheme('dark');
                toast.info('تم تفعيل المظهر الداكن');
              }}
              className={`flex items-center justify-center gap-2.5 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 ring-2 ring-blue-500/20'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Moon className="w-4 h-4 text-blue-400" />
              <span>المظهر الداكن (Dark)</span>
            </button>
          </div>
        </section>

        {/* Keyboard Shortcuts Guide */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-lg">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">اختصارات لوحة المفاتيح السريعة</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">اختصارات للتنقل ومباشرة المهام بدون الماوس</p>
            </div>
          </div>

          <div className="bg-slate-50/60 dark:bg-slate-800/40 rounded-xl p-4 divide-y divide-slate-200/50 dark:divide-slate-700/50 text-xs">
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-700 dark:text-slate-300 font-medium">البحث الشامل وموجه الأوامر</span>
              <kbd className="px-2.5 py-1 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-lg font-mono font-bold shadow-2xs">Ctrl + K</kbd>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-700 dark:text-slate-300 font-medium">نافذة الإدخال السريع الفوري</span>
              <kbd className="px-2.5 py-1 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-lg font-mono font-bold shadow-2xs">Ctrl + N</kbd>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-700 dark:text-slate-300 font-medium">التبديل السريع بين المظهر الفاتح والداكن</span>
              <kbd className="px-2.5 py-1 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-lg font-mono font-bold shadow-2xs">Ctrl + J</kbd>
            </div>
          </div>
        </section>

        {/* System Updates Section */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-lg">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">تحديث ملفات النظام المؤقتة</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">إصلاح المشاكل الفنية ومسح الكاش لجلب التحديثات الجديدة</p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">مسح الكاش وفرض التحديث</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                إفراغ ذاكرة التخزين المؤقت للمتصفح دون المساس ببيانات الطلاب أو المجموعات
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                const ok = await confirm({
                  title: 'تأكيد فرض التحديث',
                  message: 'هل ترغب في مسح الكاش وملفات تعريف الارتباط الخاصة بالمنصة وإعادة تحميل الصفحة؟ (لن تتأثر بياناتك).',
                  confirmText: 'نعم، قم بالتحديث',
                  cancelText: 'إلغاء'
                });
                
                if (ok) {
                  if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    for (const name of cacheNames) {
                      await caches.delete(name);
                    }
                  }
                  if ('serviceWorker' in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (const registration of registrations) {
                      await registration.unregister();
                    }
                  }
                  const cookies = document.cookie.split(";");
                  for (let i = 0; i < cookies.length; i++) {
                      const cookie = cookies[i];
                      const eqPos = cookie.indexOf("=");
                      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
                      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
                      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;domain=app.masar.top;path=/";
                      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;domain=.masar.top;path=/";
                      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;domain=masar.top;path=/";
                  }
                  window.location.reload();
                }
              }}
              className="shrink-0 px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>تحديث ملفات الكاش</span>
            </button>
          </div>
        </section>

        {/* Bottom Floating Save Bar */}
        <div className="pt-2 flex justify-end">
          <button 
            type="button"
            onClick={handleSave} 
            className="flex items-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 active:scale-[0.98] gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>حفظ الإعدادات</span>
          </button>
        </div>
      </div>
    </div>
  );
}

