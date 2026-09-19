import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Phone, 
  MessageCircle, 
  CreditCard, 
  Calendar, 
  GraduationCap, 
  Hash, 
  School, 
  Clock, 
  DollarSign, 
  Check, 
  User,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import { Student, AttendanceSession, MonthlySubscription } from '../../types';
import { toMajorUnits, toMinorUnits } from '../../utils/currency';
import { formatTime12 } from '../../utils/time';
import { getWhatsAppUrl } from '../../utils/phone';
import { useAuth } from '@clerk/clerk-react';
import { useApiMutation } from '../../config/queryHooks';
import { recordLedgerRevenue } from '../../utils/pricing';
import { triggerPennyDrop } from '../PennyDropAnimation';
import { useToast } from '../../context/ToastContext';

export interface ScannedStudentData {
  student: Student;
  markedAt: number;
  session: AttendanceSession;
  courseName?: string;
  groupName?: string;
  subscription?: MonthlySubscription;
  coursePrice?: number;
  attendanceCountInGroup?: number;
  totalGroupSessions?: number;
  isGuest?: boolean;
}

interface ScannedStudentInfoProps {
  data: ScannedStudentData | null;
  onClose: () => void;
  // If desktopMode is 'docked', renders plain card for inline desktop containers
  // If desktopMode is 'floating', renders fixed docked desktop card (e.g. top-left)
  desktopMode?: 'docked' | 'floating';
}

export function ScannedStudentInfo({ data, onClose, desktopMode = 'floating' }: ScannedStudentInfoProps) {
  const toast = useToast();
  const { getToken } = useAuth();
  const { create: createSub, update: updateSub } = useApiMutation<MonthlySubscription>('monthlySubscriptions');

  const [isQuickPayOpen, setIsQuickPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<'نقدي' | 'فودافون كاش' | 'فيزا / بطاقة'>('نقدي');
  const [isPaying, setIsPaying] = useState(false);

  // Auto-dismiss countdown timer (8 seconds)
  const [countdown, setCountdown] = useState(8);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!data) return;
    setCountdown(8);
    setIsQuickPayOpen(false);

    // Default pay amount to remaining subscription due
    const sub = data.subscription;
    const priceMinor = data.coursePrice || 0;
    const dueMinor = sub ? Math.max(0, sub.amountTotal - sub.amountPaid) : priceMinor;
    setPayAmount(toMajorUnits(dueMinor).toString());
  }, [data]);

  useEffect(() => {
    if (!data || isPaused || isQuickPayOpen) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [data, isPaused, isQuickPayOpen, onClose]);

  if (!data) return null;

  const { student, markedAt, session, courseName, groupName, subscription, coursePrice = 0, attendanceCountInGroup = 1, isGuest } = data;

  // Subscription calculation
  const isPaid = subscription && (subscription.status === 'paid' || subscription.amountPaid >= subscription.amountTotal && subscription.amountTotal > 0);
  const isPartial = subscription && subscription.status === 'partial';
  const totalSubMinor = subscription ? subscription.amountTotal : coursePrice;
  const paidSubMinor = subscription ? subscription.amountPaid : 0;
  const dueMinor = Math.max(0, totalSubMinor - paidSubMinor);

  // Direct Quick Payment Execution
  const handleQuickPaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsPaying(true);
      const token = await getToken();
      const amountToPayMinor = toMinorUnits(Number(payAmount));

      if (isNaN(amountToPayMinor) || amountToPayMinor <= 0) {
        toast.error('يرجى كتابة مبلغ سداد صحيح');
        return;
      }

      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      let effectiveSubId = subscription?.id;

      if (!subscription || !subscription.id) {
        // Create new monthly subscription record
        const newSub = await createSub.mutateAsync({
          studentId: student.id,
          courseId: session.courseId,
          month: currentMonth,
          year: currentYear,
          amountTotal: totalSubMinor > 0 ? totalSubMinor : amountToPayMinor,
          amountPaid: amountToPayMinor,
          dueDate: new Date().toISOString().split('T')[0],
          status: amountToPayMinor >= totalSubMinor ? 'paid' : 'partial',
          notes: 'سداد فوري من شاشة الحضور'
        });
        effectiveSubId = (newSub as any)?.id;
      } else {
        const newPaidTotal = subscription.amountPaid + amountToPayMinor;
        const newStatus = newPaidTotal >= subscription.amountTotal ? 'paid' : 'partial';
        await updateSub.mutateAsync({
          id: subscription.id,
          data: {
            amountPaid: newPaidTotal,
            status: newStatus as any
          }
        });
      }

      if (effectiveSubId) {
        await recordLedgerRevenue({
          relatedType: 'subscription',
          relatedId: effectiveSubId,
          amountMinor: amountToPayMinor,
          description: `سداد فوري عند التحضير - ${student.name} - ${courseName || 'اشتراك شهري'}`,
          paymentMethod: payMethod,
          token
        });

        triggerPennyDrop({
          amountMinor: amountToPayMinor,
          studentName: student.name,
          courseName: courseName,
          type: 'subscription'
        });
      }

      toast.success(`تم تسجيل سداد ${toMajorUnits(amountToPayMinor)} ج.م للطالب ${student.name} بنجاح!`);
      setIsQuickPayOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error('حدث خطأ أثناء تسجيل السداد: ' + (err.message || 'Error'));
    } finally {
      setIsPaying(false);
    }
  };

  // WhatsApp reminder message
  const whatsappMsg = `مرحباً بك، نفيدكم بأنه تم تسجيل حضور الطالب (${student.name}) لحصة ${groupName || courseName || ''} اليوم بنجاح في تمام ${formatTime12(new Date(markedAt).toTimeString().substring(0, 5))}.${!isPaid ? ` نود تذكيركم بأن اشتراك الشهر الحالي (${toMajorUnits(dueMinor)} ج.م) مستحق السداد.` : ''}`;
  const whatsappUrl = getWhatsAppUrl(student.parentPhone || student.phone, whatsappMsg);

  // Auto-dismiss progress bar
  const countdownBar = (
    <div className="pt-1">
      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
        <div 
          className="bg-blue-500 h-full transition-all duration-1000 ease-linear"
          style={{ width: `${(countdown / 8) * 100}%` }}
        />
      </div>
      <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
        <span>{isPaused ? 'تم إيقاف العداد مؤقتاً للتفاعل' : `إغلاق تلقائي بعد ${countdown} ثوانٍ`}</span>
        <span className="hover:text-blue-500 cursor-pointer font-bold" onClick={onClose}>إغلاق ومسح التالي</span>
      </div>
    </div>
  );

  // Inner Card Content
  const cardContent = (
    <div 
      className="space-y-3.5 select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Header: Status and Verification Chime Banner */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
            <Check className="w-5 h-5 stroke-[3]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                تم تسجيل الحضور بنجاح
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {formatTime12(new Date(markedAt).toTimeString().substring(0, 5))}
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {student.name}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Student ID Badge */}
          {student.studentCode && (
            <span className="font-mono text-xs font-black px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              #{student.studentCode}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Guest / Course Information */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 block mb-0.5">المجموعة والكورس</span>
          <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
            {groupName || courseName || 'المجموعة الأساسية'}
          </span>
          {isGuest && (
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block mt-0.5">
              (حضور ضيف من خارج المجموعة)
            </span>
          )}
        </div>

        <div className="p-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 block mb-0.5">المرحلة والمدرسة</span>
          <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
            {student.gradeLevel || student.school || 'غير محدد'}
          </span>
        </div>
      </div>

      {/* Payment Status Card (MOST IMPORTANT REQUIREMENT) */}
      <div className={`p-3 rounded-xl border transition-all ${
        isPaid 
          ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
          : isPartial
          ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60'
          : 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60'
      }`}>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5">
            <CreditCard className={`w-4 h-4 ${isPaid ? 'text-emerald-600 dark:text-emerald-400' : isPartial ? 'text-amber-600' : 'text-rose-600'}`} />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              حالة اشتراك الشهر الحالي
            </span>
          </div>

          <span className={`text-[11px] font-black px-2 py-0.5 rounded-full border ${
            isPaid 
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
              : isPartial
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border-amber-300 dark:border-amber-700'
              : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300 border-rose-300 dark:border-rose-700'
          }`}>
            {isPaid ? 'سدد الاشتراك ✓' : isPartial ? 'سداد جزئي' : 'لم يسدد الشهر ⚠️'}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          <div className="space-y-0.5">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
              {isPaid 
                ? `المدفوع: ${toMajorUnits(paidSubMinor)} ج.م` 
                : isPartial
                ? `مدفوع ${toMajorUnits(paidSubMinor)} من ${toMajorUnits(totalSubMinor)} ج.م`
                : `المبلغ المطلوب: ${toMajorUnits(dueMinor)} ج.م`}
            </span>
          </div>

          {!isPaid && !isQuickPayOpen && (
            <button
              type="button"
              onClick={() => setIsQuickPayOpen(true)}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>تسجيل سداد الآن</span>
            </button>
          )}
        </div>

        {/* Inline Quick Payment Form */}
        {isQuickPayOpen && (
          <form onSubmit={handleQuickPaySubmit} className="mt-2.5 pt-2.5 border-t border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="المبلغ"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                  autoFocus
                />
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">ج.م</span>
              </div>

              <select
                value={payMethod}
                onChange={e => setPayMethod(e.target.value as any)}
                className="px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="نقدي">نقدي</option>
                <option value="فودافون كاش">فودافون كاش</option>
                <option value="فيزا / بطاقة">فيزا / بطاقة</option>
              </select>

              <button
                type="submit"
                disabled={isPaying}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
              >
                {isPaying ? '...' : 'تأكيد'}
              </button>

              <button
                type="button"
                onClick={() => setIsQuickPayOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg text-xs cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Attendance Stats & Contacts Bar */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-blue-500" />
          <span>إجمالي حضور الطالب: <strong>{attendanceCountInGroup}</strong> حصص</span>
        </div>

        {/* Contact actions */}
        <div className="flex items-center gap-1.5">
          {student.phone && (
            <a
              href={`tel:${student.phone}`}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              title="اتصال بالطالب"
            >
              <Phone className="w-3.5 h-3.5" />
            </a>
          )}
          {(student.parentPhone || student.phone) && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold flex items-center gap-1 transition-colors"
              title="إرسال إشعار حضور واتساب لولي الأمر"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>إشعار واتساب</span>
            </a>
          )}
        </div>
      </div>

      {/* Countdown progress bar */}
      {countdownBar}
    </div>
  );

  return (
    <>
      {/* 1. MOBILE BOTTOMSHEET (sm:hidden) */}
      <div 
        className="fixed inset-0 z-50 flex items-end sm:hidden bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        dir="rtl"
        onClick={onClose}
      >
        <div 
          className="w-full bg-white dark:bg-slate-900 rounded-t-[28px] border-t border-slate-200 dark:border-slate-800 shadow-2xl p-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
          onClick={e => e.stopPropagation()}
        >
          {/* Drag Handle Bar */}
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3.5 cursor-grab" />
          {cardContent}
        </div>
      </div>

      {/* 2. DESKTOP VIEW (hidden sm:block) */}
      {desktopMode === 'floating' ? (
        <div 
          className="hidden sm:block fixed top-5 left-5 z-50 w-96 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-4 animate-in slide-in-from-top-4 fade-in duration-200"
          dir="rtl"
        >
          {cardContent}
        </div>
      ) : (
        <div 
          className="hidden sm:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg p-4 animate-in zoom-in-95 duration-150"
          dir="rtl"
        >
          {cardContent}
        </div>
      )}
    </>
  );
}

// Standalone Mobile Bottom Sheet
export function ScannedStudentBottomSheet({ data, onClose }: { data: ScannedStudentData | null; onClose: () => void }) {
  if (!data) return null;
  return <ScannedStudentInfo data={data} onClose={onClose} desktopMode="floating" />;
}

// Standalone Desktop Card
export function ScannedStudentDesktopCard({ data, onClose, mode = 'docked' }: { data: ScannedStudentData | null; onClose: () => void; mode?: 'docked' | 'floating' }) {
  if (!data) return null;
  return <ScannedStudentInfo data={data} onClose={onClose} desktopMode={mode} />;
}
