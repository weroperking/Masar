import { Save, Sun, Moon, Keyboard, RefreshCw, User as UserIcon, Building2, HelpCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useUser, useOrganization } from '@clerk/clerk-react';
import { useApiQuery, useApiMutation } from '../../config/queryHooks';
import { Settings as SettingsType } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useTour } from '../../context/TourContext';

export function Settings() {
  const toast = useToast();
  const { theme, setTheme } = useTheme();
  const { confirm } = useConfirm();
  const { user } = useUser();
  const { organization } = useOrganization();
  const { startTour } = useTour();

  const { data: settingsData = [] } = useApiQuery<SettingsType>('settings', 60 * 1000);
  const { create: createSettings, update: updateSettings } = useApiMutation<SettingsType>('settings');

  const [settings, setSettings] = useState<Partial<SettingsType>>({
    autoStartEndSessions: true,
    autoConfirmPaymentOnAttendance: true,
    autoCreateAssignmentPerSession: false,
    freeSessionLimitPerStudent: 1,
    assignmentGradingMethod: 'numeric',
    numericMaxGrade: 100,
    teacherName: '',
    academyName: ''
  });

  useEffect(() => {
    if (settingsData && settingsData.length > 0) {
      setSettings(prev => ({
        ...prev,
        ...settingsData[0],
        teacherName: settingsData[0].teacherName || prev.teacherName || localStorage.getItem('masar_teacher_name') || '',
        academyName: settingsData[0].academyName || prev.academyName || organization?.name || localStorage.getItem('masar_academy_name') || ''
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        teacherName: prev.teacherName || localStorage.getItem('masar_teacher_name') || '',
        academyName: prev.academyName || organization?.name || localStorage.getItem('masar_academy_name') || ''
      }));
    }
  }, [settingsData, organization?.name]);

  const handleSave = async () => {
    try {
      if (settingsData.length > 0) {
        updateSettings.mutate({
          id: settingsData[0].id,
          data: settings
        });
      } else {
        createSettings.mutate({
          ...settings
        } as SettingsType);
      }

      // Sync teacher & academy names to local storage & Clerk metadata
      if (settings.teacherName) {
        localStorage.setItem('masar_teacher_name', settings.teacherName);
        if (organization?.id) {
          localStorage.setItem(`masar_teacher_name_${organization.id}`, settings.teacherName);
        }
        if (user) {
          try {
            await user.update({
              unsafeMetadata: {
                ...(user.unsafeMetadata || {}),
                teacherName: settings.teacherName
              }
            });
          } catch (e) {
            console.warn('Could not update clerk metadata:', e);
          }
        }
      }
      if (settings.academyName) {
        localStorage.setItem('masar_academy_name', settings.academyName);
        if (organization?.id) {
          localStorage.setItem(`masar_academy_name_${organization.id}`, settings.academyName);
        }
      }

      toast.success('تم حفظ إعدادات النظام بنجاح!');
    } catch (err) {
      toast.error('حدث خطأ أثناء حفظ الإعدادات');
    }
  };

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">إعدادات النظام</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">تخصيص المظهر، أتمتة الجلسات، وقواعد التقييم</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 space-y-8">
        
        {/* Academy & Teacher Profile Section */}
        <section>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>بيانات المعلم والسنتر التعليمي</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            الاسم الظاهر في أعلى المنصة وعلى كروت الطلاب وتقارير الحضور والغياب.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                اسم المعلم / المحاضر الرئيسي
              </label>
              <input
                type="text"
                value={settings.teacherName || ''}
                onChange={e => setSettings({ ...settings, teacherName: e.target.value })}
                placeholder="أ/ محمد خالد"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
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
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
              />
            </div>
          </div>
        </section>

        {/* Theme Settings Section */}
        <section>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
            <span>مظهر التطبيق (Theme)</span>
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">اختصار التبديل السريع: Ctrl+J</span>
          </h2>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <button
              type="button"
              onClick={() => {
                setTheme('light');
                toast.info('تم تفعيل المظهر الفاتح');
              }}
              className={`flex items-center justify-center gap-2.5 p-3 rounded-xl border text-sm font-semibold transition-all ${
                theme === 'light'
                  ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-700 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-900 dark:hover:bg-slate-800'
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
              className={`flex items-center justify-center gap-2.5 p-3 rounded-xl border text-sm font-semibold transition-all ${
                theme === 'dark'
                  ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-700 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-900 dark:hover:bg-slate-800'
              }`}
            >
              <Moon className="w-4 h-4 text-blue-400" />
              <span>المظهر الداكن (Dark)</span>
            </button>
          </div>
        </section>

        {/* Keyboard Shortcuts Guide Section */}
        <section>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>اختصارات لوحة المفاتيح السريعة</span>
          </h2>
          <div className="bg-slate-50 dark:bg-slate-900 dark:bg-slate-800/60 rounded-xl p-4 space-y-2 text-xs">
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-600 dark:text-slate-300">البحث الشامل والأوامر السريعة</span>
              <kbd className="px-2 py-1 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 dark:text-slate-200 border border-slate-200 dark:border-slate-700 dark:border-slate-600 rounded font-mono font-bold">Ctrl + K</kbd>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-600 dark:text-slate-300">نافذة إدخال جديد فوري</span>
              <kbd className="px-2 py-1 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 dark:text-slate-200 border border-slate-200 dark:border-slate-700 dark:border-slate-600 rounded font-mono font-bold">Ctrl + N</kbd>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-600 dark:text-slate-300">التبديل الفوري بين الوضع الفاتح والداكن</span>
              <kbd className="px-2 py-1 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 dark:text-slate-200 border border-slate-200 dark:border-slate-700 dark:border-slate-600 rounded font-mono font-bold">Ctrl + J</kbd>
            </div>
          </div>
        </section>

        {/* Automation Section */}
        <section>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
            أتمتة الجلسات والحضور
          </h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" 
                checked={settings.autoStartEndSessions} 
                onChange={e => setSettings({...settings, autoStartEndSessions: e.target.checked})} 
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">بدء وإنهاء الجلسات تلقائياً في موعدها</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" 
                checked={settings.autoConfirmPaymentOnAttendance} 
                onChange={e => setSettings({...settings, autoConfirmPaymentOnAttendance: e.target.checked})} 
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">تأكيد دفع الحصة تلقائياً عند تسجيل الحضور (للدفع بالحصة)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" 
                checked={settings.autoCreateAssignmentPerSession} 
                onChange={e => setSettings({...settings, autoCreateAssignmentPerSession: e.target.checked})} 
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">إنشاء واجب تلقائياً مع كل حصة جديدة</span>
            </label>
          </div>
        </section>

        {/* Free Sessions */}
        <section>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
            ضوابط الحصص التجريبية والمجانية
          </h2>
          <div className="flex items-center gap-4 max-w-sm">
            <label className="text-sm text-slate-700 dark:text-slate-300">الحد الأقصى لكل طالب:</label>
            <input 
              type="number" 
              className="w-24 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
              value={settings.freeSessionLimitPerStudent} 
              onChange={e => setSettings({...settings, freeSessionLimitPerStudent: Number(e.target.value)})} 
            />
            <span className="text-xs text-slate-500 dark:text-slate-400">(0 = غير محدود)</span>
          </div>
        </section>

        {/* Grading Method */}
        <section>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
            طريقة تقييم الواجبات
          </h2>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="grading" 
                className="text-blue-600 focus:ring-blue-500" 
                checked={settings.assignmentGradingMethod === 'rating'} 
                onChange={() => setSettings({...settings, assignmentGradingMethod: 'rating'})} 
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">بالتقدير النصي (1-5)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="grading" 
                className="text-blue-600 focus:ring-blue-500" 
                checked={settings.assignmentGradingMethod === 'numeric'} 
                onChange={() => setSettings({...settings, assignmentGradingMethod: 'numeric'})} 
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">بالأرقام (درجة مئوية)</span>
            </label>
          </div>
          {settings.assignmentGradingMethod === 'numeric' && (
            <div className="mt-4 flex items-center gap-4">
              <label className="text-sm text-slate-700 dark:text-slate-300">الدرجة العظمى الافتراضية:</label>
              <input 
                type="number" 
                className="w-24 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
                value={settings.numericMaxGrade} 
                onChange={e => setSettings({...settings, numericMaxGrade: Number(e.target.value)})} 
              />
            </div>
          )}
        </section>

        {/* Interactive Onboarding Tour Section */}
        <section className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400">
            <HelpCircle className="w-5 h-5" />
            <h2 className="text-base font-bold">الجولة التعريفية التفاعلية للمنصة</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            استكشف وتعرف على جميع أقسام وإمكانيات منصة مسار (Masar) خطوة بخطوة من خلال الجولة التفاعلية الشاملة لكافة وظائف النظام والأدوات المتاحة.
          </p>
          <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-bold text-blue-900 dark:text-blue-200 mb-0.5">بدء الجولة التعريفية من جديد</h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                إعادة تشغيل الدليل التفاعلي لشرح الكورسات، المجموعات، الطلاب، التحضير بالباركود، والماليات.
              </p>
            </div>
            <button
              id="tour-retake-btn"
              type="button"
              onClick={() => startTour(0)}
              className="shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <HelpCircle className="w-4 h-4" />
              <span>إعادة الجولة التعريفية</span>
            </button>
          </div>
        </section>

        {/* System Updates Section */}
        <section className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400">
            <RefreshCw className="w-5 h-5" />
            <h2 className="text-base font-bold">تحديث ملفات النظام المؤقتة</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            في حالة عدم ظهور التحديثات الأخيرة للمنصة أو وجود مشاكل في العرض، استخدم هذا الخيار لمسح الملفات المؤقتة وملفات تعريف الارتباط الخاصة بالمنصة وإجبار المتصفح على جلب أحدث إصدار (لن يتم مسح بيانات الطلاب أو المجموعات).
          </p>
          <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-bold text-blue-900 dark:text-blue-200">مسح الكاش وفرض التحديث</h3>
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
                  // 1. Clear Caches
                  if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    for (const name of cacheNames) {
                      await caches.delete(name);
                    }
                  }
                  
                  // 2. Unregister Service Workers
                  if ('serviceWorker' in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (const registration of registrations) {
                      await registration.unregister();
                    }
                  }
                  
                  // 3. Clear Cookies for masar.top domains
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
                  
                  // 4. Force Reload
                  window.location.reload();
                }
              }}
              className="shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>تحديث النظام</span>
            </button>
          </div>
        </section>

        <div className="pt-4 flex justify-end">
          <button 
            onClick={handleSave} 
            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold shadow-sm"
          >
            <Save className="w-4 h-4 ml-2" />
            حفظ الإعدادات
          </button>
        </div>
      </div>
    </div>
  );
}
