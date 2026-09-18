import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, RotateCcw, Calendar, BookOpen, User, Phone, X } from 'lucide-react';

interface BookingSuccessBottomSheetProps {
  studentName: string;
  studentPhone: string;
  courseName: string;
  groupName?: string;
  gradeLevel?: string;
  onReset: () => void;
  onClose?: () => void;
}

export function BookingSuccessBottomSheet({
  studentName,
  studentPhone,
  courseName,
  groupName,
  gradeLevel,
  onReset,
  onClose,
}: BookingSuccessBottomSheetProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl">
      {/* Dark backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose || onReset}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md cursor-pointer"
      />

      {/* Modal / Sheet Card */}
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
        className="relative w-full max-w-lg sm:max-w-xl bg-white dark:bg-slate-900 rounded-t-[32px] sm:rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/80 dark:border-slate-800 z-10 text-center"
      >
        {/* Top Handle for mobile */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto -mt-2 mb-4" />

        {/* Close / Cancel Button top corner */}
        <button
          type="button"
          onClick={onClose || onReset}
          className="absolute top-4 left-4 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="إغلاق"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Animated Cool Green Success Badge */}
        <div className="relative mx-auto mb-5 w-20 h-20 flex items-center justify-center">
          {/* Outer gentle pulsing aura */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [1, 1.25, 1], opacity: [0.35, 0.15, 0.35] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full bg-emerald-500/20 dark:bg-emerald-500/30 blur-md pointer-events-none"
          />

          {/* Glowing emerald ring */}
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 260, delay: 0.1 }}
            className="relative w-18 h-18 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/80 dark:from-emerald-950/60 dark:to-emerald-900/40 border-2 border-emerald-500/40 dark:border-emerald-500/60 flex items-center justify-center shadow-lg shadow-emerald-500/15"
          >
            {/* Animated SVG Check Mark */}
            <svg
              className="w-10 h-10 text-emerald-500 dark:text-emerald-400"
              viewBox="0 0 48 48"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <motion.circle
                cx="24"
                cy="24"
                r="20"
                strokeOpacity="0.25"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
              />
              <motion.path
                d="M14 24.5L21 31.5L34 17.5"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.25, ease: 'easeOut' }}
              />
            </svg>
          </motion.div>
        </div>

        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          تم استلام طلب حجز المقعد بنجاح!
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm mx-auto">
          شكراً لك، تم حفظ طلبك وسيقوم فريق السنتر بالتواصل معك عبر واتساب لتأكيد الموعد النهائي.
        </p>

        {/* Booking Details Summary */}
        <div className="mt-5 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-right space-y-2.5 text-xs">
          <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              اسم الطالب:
            </span>
            <span className="font-bold text-slate-900 dark:text-slate-100">{studentName}</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              الكورس المطلوب:
            </span>
            <span className="font-bold text-slate-900 dark:text-slate-100">{courseName}</span>
          </div>

          {groupName && (
            <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                المجموعة:
              </span>
              <span className="font-medium text-slate-900 dark:text-slate-100">{groupName}</span>
            </div>
          )}

          <div className="flex items-center justify-between py-1">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              رقم التواصل:
            </span>
            <span className="font-mono text-slate-900 dark:text-slate-100" dir="ltr">
              {studentPhone}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onReset}
              className="py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl flex items-center justify-center gap-1.5 text-xs sm:text-sm transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              حجز طالب آخر
            </button>

            <button
              type="button"
              onClick={onClose || onReset}
              className="py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 text-xs sm:text-sm transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              إغلاق
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
