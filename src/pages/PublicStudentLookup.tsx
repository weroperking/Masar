import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  CheckCircle2, AlertCircle, Clock, GraduationCap, 
  Wallet, Sparkles, BookOpen, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { PublicLookupData } from '../types';

export function PublicStudentLookup() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PublicLookupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchLookupData() {
      if (!token) {
        setError(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(false);

      try {
        // Direct fetch to backend API, completely bypassing Dexie / IndexedDB
        let res = await fetch(`/api/public/lookup/${token}`);
        if (!res.ok) {
          res = await fetch(`/public/lookup/${token}`);
        }

        if (!res.ok) {
          if (isMounted) {
            setError(true);
            setLoading(false);
          }
          return;
        }

        const result = await res.json();
        if (isMounted) {
          setData(result);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    }

    fetchLookupData();

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 text-center space-y-4">
          <div className="w-12 h-12 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            جاري تحميل بيانات الطالب...
          </p>
        </div>
      </div>
    );
  }

  // Error / Invalid Token State (Plain, secure, no technical internals)
  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            هذا الرابط غير صالح أو قد انتهت صلاحيته
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
            يرجى التأكد من مسح أحدث كود QR تم إصداره للطالب من إدارة المركز.
          </p>
        </div>
      </div>
    );
  }

  const { student, attendance, exams, subscription } = data;
  const totalSessions = (attendance?.attended || 0) + (attendance?.missed || 0);
  const attendanceRate = totalSessions > 0 ? Math.round(((attendance?.attended || 0) / totalSessions) * 100) : 100;

  // Subscription status badge mapping
  const subscriptionConfig = {
    paid: {
      label: 'خالص ومسدد بالكامل',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800/60',
      icon: CheckCircle2
    },
    partial: {
      label: 'مدفوع جزئياً',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800/60',
      icon: AlertTriangle
    },
    overdue: {
      label: 'متأخر وغير مسدد',
      bg: 'bg-rose-50 dark:bg-rose-950/40',
      text: 'text-rose-700 dark:text-rose-300',
      border: 'border-rose-200 dark:border-rose-800/60',
      icon: AlertCircle
    },
    no_record: {
      label: 'لا يوجد اشتراك مسجل',
      bg: 'bg-slate-100 dark:bg-slate-800',
      text: 'text-slate-600 dark:text-slate-400',
      border: 'border-slate-200 dark:border-slate-700',
      icon: Clock
    }
  };

  const currentSubStatus = subscription?.status || 'no_record';
  const subConfig = subscriptionConfig[currentSubStatus] || subscriptionConfig.no_record;
  const SubIcon = subConfig.icon;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 flex flex-col items-center justify-start" dir="rtl">
      <div className="w-full max-w-md space-y-4">
        
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm">
              م
            </div>
            <span className="font-bold text-sm tracking-wide text-slate-800 dark:text-slate-200">
              منصة مسار التعليمية
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>بيان متابعة الطالب المباشر</span>
          </span>
        </div>

        {/* Main Receipt Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          
          {/* Header Strip with Student Name */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 leading-tight">
                  {student?.name || 'الطالب'}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {student?.gradeLevel && (
                    <span>{student.gradeLevel}</span>
                  )}
                  {student?.school && (
                    <>
                      <span>•</span>
                      <span>{student.school}</span>
                    </>
                  )}
                </div>
              </div>

              {student?.studentCode && (
                <div className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center shrink-0">
                  <span className="block text-[9px] text-slate-400 font-medium">كود الطالب</span>
                  <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                    #{student.studentCode}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="p-5 space-y-6">
            
            {/* 1. Subscription Status (Current Month) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  حالة اشتراك الشهر الحالي
                </span>
                {subscription?.month && subscription?.year && (
                  <span className="text-[11px] font-mono text-slate-400">
                    {subscription.month} / {subscription.year}
                  </span>
                )}
              </div>

              <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${subConfig.bg} ${subConfig.border}`}>
                <div className="flex items-center gap-2.5">
                  <SubIcon className={`w-5 h-5 shrink-0 ${subConfig.text}`} />
                  <div>
                    <span className={`text-xs font-bold block ${subConfig.text}`}>
                      {subConfig.label}
                    </span>
                    {subscription?.amountPaid !== undefined && subscription?.amountTotal !== undefined && subscription.amountTotal > 0 && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block font-mono">
                        المسدد: {(subscription.amountPaid / 100).toLocaleString('ar-EG')} ج.م من أصل {(subscription.amountTotal / 100).toLocaleString('ar-EG')} ج.م
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Attendance Stats */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  سجل الحضور والغياب
                </span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 font-mono">
                  نسبة الالتزام: {attendanceRate}%
                </span>
              </div>

              {/* Ratio Bar */}
              <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex mb-3">
                <div 
                  className="bg-emerald-500 transition-all duration-500 rounded-r-full"
                  style={{ width: `${totalSessions > 0 ? ((attendance?.attended || 0) / totalSessions) * 100 : 100}%` }}
                />
                <div 
                  className="bg-rose-500 transition-all duration-500 rounded-l-full"
                  style={{ width: `${totalSessions > 0 ? ((attendance?.missed || 0) / totalSessions) * 100 : 0}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                  <span className="block text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                    أيام الحضور
                  </span>
                  <span className="text-base font-black font-mono text-emerald-800 dark:text-emerald-200">
                    {attendance?.attended || 0}
                  </span>
                </div>
                
                <div className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40">
                  <span className="block text-[11px] font-medium text-rose-700 dark:text-rose-400">
                    أيام الغياب
                  </span>
                  <span className="text-base font-black font-mono text-rose-800 dark:text-rose-200">
                    {attendance?.missed || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Exams and Grades */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  درجات الامتحانات والتقييمات
                </span>
                {exams && exams.length > 0 && (
                  <span className="text-[11px] text-slate-400 font-mono">
                    ({exams.length} اختبار)
                  </span>
                )}
              </div>

              {(!exams || exams.length === 0) ? (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    لا توجد نتائج اختبارات مرصودة حتى الآن.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {exams.map((exam, idx) => {
                    const numGrade = Number(exam.grade);
                    const maxGrade = exam.maxGrade || 100;
                    const isPassed = !isNaN(numGrade) && (numGrade / maxGrade >= 0.5);

                    return (
                      <div 
                        key={exam.id || idx}
                        className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                            {exam.name}
                          </h4>
                          {exam.date && (
                            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                              {exam.date}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-black ${
                            isPassed 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' 
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}>
                            {exam.grade} {exam.maxGrade ? `/ ${exam.maxGrade}` : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Verification Footer */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-center">
            <p className="text-[11px] text-slate-400">
              تقرير إلكتروني مباشر ومحدث صادر عن إدارة المركز عبر منصة مسار
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
