import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { MasarLogo } from './MasarLogo';

interface TrialExpiredScreenProps {
  status?: string;
}

export function TrialExpiredScreen({ status }: TrialExpiredScreenProps) {
  const isPastDue = status === 'past_due';
  const isNone = status === 'none';

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 text-center"
      >
        <div className="flex justify-center mb-6">
          <MasarLogo className="w-16 h-16 text-blue-600 dark:text-blue-500" />
        </div>
        
        <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4 font-['Readex_Pro']">
          {isPastDue ? 'فشلت عملية الدفع' : isNone ? 'لا توجد خطة نشطة' : 'انتهت فترتك التجريبية'}
        </h1>
        
        <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
          {isPastDue 
            ? 'يرجى تحديث معلومات الدفع الخاصة بك لمواصلة استخدام منصة مسار وإدارة مركزك.'
            : isNone
            ? 'يرجى اختيار باقة وتفعيل اشتراكك لمواصلة استخدام منصة مسار وإدارة مركزك التعليمي.'
            : 'لقد انتهت الفترة التجريبية المجانية. يرجى ترقية باقتك لمواصلة استخدام منصة مسار وإدارة مركزك التعليمي بكل سهولة.'}
        </p>

        <a
          href="https://masar.top/pricing"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-colors"
        >
          <span>ترقية الباقة الآن</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </motion.div>
    </div>
  );
}
