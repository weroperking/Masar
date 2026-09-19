import { 
  Save, 
  Sun, 
  Moon, 
  Keyboard, 
  RefreshCw, 
  User as UserIcon, 
  HelpCircle,
  Zap,
  Clock,
  CreditCard,
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
  CheckCircle2
} from 'lucide-react';
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
    <div className="space-y-6 w-full max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 rounded-lg">
              <Sliders className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">إعدادات النظام</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            تخصيص قواعد الأتمتة، تقييم الواجبات، الحصص التجريبية، والمظهر العام للمنصة
          </p>
        </div>

        <button 
          onClick={handleSave} 
          type="button"
          className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-500/20 active:scale-[0.98] gap-2 shrink-0 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>حفظ التغييرات</span>
        </button>
      </div>

      <div className="space-y-6">
        
        {/* Profile Section */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
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

        {/* 1. Automation Section (أتمتة الجلسات والحضور) */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-lg">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">أتمتة الجلسات والحضور</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">تفعيل الإجراءات التلقائية لتسريع تسجيل الحضور وإدارة المجموعات</p>
              </div>
            </div>
            <span className="hidden sm:inline-flex px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-full text-[11px] font-semibold">
              توفير الوقت والجهد
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            {/* Toggle Card 1: autoStartEndSessions */}
            <ToggleCard
              icon={<Clock className="w-4 h-4" />}
              title="بدء وإنهاء الجلسات تلقائياً في موعدها"
              description="بدء وإغلاق الجلسة الدراسية تلقائياً بناءً على مواعيد الجدول الزمني للمجموعة."
              checked={!!settings.autoStartEndSessions}
              onChange={checked => setSettings({ ...settings, autoStartEndSessions: checked })}
            />

            {/* Toggle Card 2: autoConfirmPaymentOnAttendance */}
            <ToggleCard
              icon={<CreditCard className="w-4 h-4" />}
              title="تأكيد دفع الحصة تلقائياً عند تسجيل الحضور"
              description="تسجيل وتأكيد تحصيل رسوم الحصة فورياً بمجرد قراءة QR كارت الطالب (نظام الدفع بالحصة)."
              checked={!!settings.autoConfirmPaymentOnAttendance}
              onChange={checked => setSettings({ ...settings, autoConfirmPaymentOnAttendance: checked })}
            />
          </div>
        </section>

        {/* 2. Free & Trial Sessions Section (ضوابط الحصص التجريبية والمجانية) */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-lg">
              <Gift className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">ضوابط الحصص التجريبية والمجانية</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">تحديد عدد الحصص المجانية المسموح بها للطلاب الجدد قبل الدفع</p>
            </div>
          </div>

          <div className="p-4 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">الحد الأقصى لكل طالب:</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">(أدخل 0 للحد غير المحدود)</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                عند تجاوز هذا العدد، سيتطلب النظام سداد الرسوم قبل تسجيل الحضور.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {/* Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-700">
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
        <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
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
            <div className="p-4 bg-blue-50/30 dark:bg-blue-950/20 rounded-xl border border-blue-200/60 dark:border-blue-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  الدرجة العظمى الافتراضية للواجبات:
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  الدرجة القصوى المحسوبة تلقائياً عند إنشاء أي واجب جديد
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
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
        <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
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
        <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
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
        <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
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
        <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
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

/**
 * Custom Minimalist Toggle Card Component inspired by the uploaded asset spec
 */
interface ToggleCardProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function ToggleCard({ icon, title, description, checked, onChange, disabled }: ToggleCardProps) {
  return (
    <div 
      onClick={() => !disabled && onChange(!checked)}
      className={`group relative flex flex-col justify-between p-4 rounded-xl border transition-all cursor-pointer select-none ${
        checked 
          ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-400/80 dark:border-blue-600/80 ring-1 ring-blue-500/20 shadow-2xs' 
          : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          {icon && (
            <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${
              checked 
                ? 'bg-blue-600 text-white dark:bg-blue-500' 
                : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
            }`}>
              {icon}
            </div>
          )}

          {/* Toggle Switch */}
          <button
            type="button"
            role="switch"
            aria-checked={checked}
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) onChange(!checked);
            }}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
              checked ? 'bg-blue-600 dark:bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-xs transform ring-0 transition duration-200 ease-in-out ${
                checked ? 'translate-x-4 rtl:-translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">
            {title}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
            {description}
          </p>
        </div>
      </div>

      <div className="pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px]">
        <span className={`font-semibold ${checked ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>
          {checked ? 'مُفعّل تلقائياً' : 'مُعطّل'}
        </span>
        {checked && <CheckCircle2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />}
      </div>
    </div>
  );
}

