import { Save, Sun, Moon, Monitor, Keyboard, Trash2, AlertTriangle, Database, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { db } from '../../db/db';
import { Settings as SettingsType } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { useConfirm } from '../../context/ConfirmContext';
import { clearAllData } from '../../db/seed';

export function Settings() {
  const toast = useToast();
  const { theme, setTheme } = useTheme();
  const { confirm } = useConfirm();

  const [settings, setSettings] = useState<Partial<SettingsType>>({
    autoStartEndSessions: false,
    autoConfirmPaymentOnAttendance: true,
    autoCreateAssignmentPerSession: false,
    freeSessionLimitPerStudent: 1,
    assignmentGradingMethod: 'numeric',
    numericMaxGrade: 100
  });

  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    // Load from db.settings if available
    db.settings.toArray().then(items => {
      if (items.length > 0) {
        setSettings(prev => ({ ...prev, ...items[0] }));
      }
    }).catch(console.error);
  }, []);

  const handleSave = async () => {
    try {
      const existing = await db.settings.toArray();
      const now = Date.now();
      if (existing.length > 0) {
        await db.settings.update(existing[0].id, {
          ...settings,
          updated_at: now
        });
      } else {
        await db.settings.add({
          id: 'default-settings',
          ...settings,
          created_at: now,
          updated_at: now,
          sync_status: 'pending'
        } as SettingsType);
      }
      toast.success('تم حفظ إعدادات النظام بنجاح!');
    } catch (err) {
      toast.error('حدث خطأ أثناء حفظ الإعدادات');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">إعدادات النظام</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">تخصيص المظهر، أتمتة الجلسات، وقواعد التقييم</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 space-y-8">
        
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

        {/* Data Management Section */}
        <section className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-2 text-red-600 dark:text-red-400">
            <Database className="w-5 h-5" />
            <h2 className="text-base font-bold">إدارة قاعدة البيانات وتفريغ الحساب</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            تحكم كامل في سجلات حسابك. تم إيقاف توليد البيانات التجريبية نهائياً لضمان بقاء حسابك نظيفاً ومخصصاً لطلابك ومجموعاتك الحقيقية فقط.
          </p>

          <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-bold text-red-900 dark:text-red-200">مسح وتصفير كافة سجلات البيانات</h3>
              <p className="text-[11px] text-red-700/80 dark:text-red-300/80 mt-0.5">
                حذف جميع الطلاب، المجموعات، الكورسات، الحصص، المدفوعات، والمنتجات الحالية للبدء من الصفر تماماً. لن يتم إنشاء أي بيانات وهمية تلقائياً بعد الآن.
              </p>
            </div>
            <button
              type="button"
              disabled={isClearing}
              onClick={async () => {
                const ok = await confirm({
                  title: 'تأكيد تصفير البيانات بالكامل',
                  message: 'هل أنت متأكد من رغبتك في مسح كافة الطلاب والمجموعات والكورسات والبيانات؟ هذا الإجراء لا يمكن التراجع عنه وسيبدأ الحساب نظيفاً وفارغاً بنسبة 100%.',
                  confirmText: 'نعم، امسح كل شيء',
                  cancelText: 'إلغاء'
                });
                if (ok) {
                  try {
                    setIsClearing(true);
                    await clearAllData();
                    toast.success('تم مسح جميع البيانات بنجاح، الحساب الآن فارغ وجاهز لبياناتك الحقيقية.');
                  } catch (e) {
                    toast.error('حدث خطأ أثناء مسح البيانات');
                  } finally {
                    setIsClearing(false);
                  }
                }
              }}
              className="shrink-0 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isClearing ? 'جارِ المسح...' : 'مسح كافة البيانات'}</span>
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
