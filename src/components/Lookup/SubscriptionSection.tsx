import { Wallet, CheckCircle2, AlertTriangle, AlertCircle, Clock } from 'lucide-react';

interface SubscriptionSectionProps {
  subscription?: {
    status: 'paid' | 'partial' | 'overdue' | 'no_record';
    month?: number;
    year?: number;
    amountTotal?: number;
    amountPaid?: number;
  };
}

export function SubscriptionSection({ subscription }: SubscriptionSectionProps) {
  const currentStatus = subscription?.status || 'no_record';

  const configMap = {
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
      label: 'مستحق وغير مسدد',
      bg: 'bg-rose-50 dark:bg-rose-950/40',
      text: 'text-rose-700 dark:text-rose-300',
      border: 'border-rose-200 dark:border-rose-800/60',
      icon: AlertCircle
    },
    no_record: {
      label: 'لا توجد مستحقات مسجلة لهذا الشهر',
      bg: 'bg-slate-50 dark:bg-slate-800/50',
      text: 'text-slate-600 dark:text-slate-400',
      border: 'border-slate-200 dark:border-slate-700',
      icon: Clock
    }
  };

  const currentConfig = configMap[currentStatus] || configMap.no_record;
  const StatusIcon = currentConfig.icon;

  const amountTotal = subscription?.amountTotal || 0;
  const amountPaid = subscription?.amountPaid || 0;
  const remaining = Math.max(0, amountTotal - amountPaid);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 space-y-3.5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100">
              حالة الاشتراك الشهري
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              متابعة الرسوم والاشتراكات
            </p>
          </div>
        </div>

        {subscription?.month && subscription?.year && (
          <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800">
            {subscription.month} / {subscription.year}
          </span>
        )}
      </div>

      {/* Status Pill Card */}
      <div className={`p-3 rounded-2xl border flex items-center justify-between gap-2.5 ${currentConfig.bg} ${currentConfig.border}`}>
        <div className="flex items-center gap-2.5">
          <StatusIcon className={`w-4 h-4 shrink-0 ${currentConfig.text}`} />
          <span className={`text-xs font-bold ${currentConfig.text}`}>
            {currentConfig.label}
          </span>
        </div>

        {amountTotal > 0 && (
          <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
            {(amountPaid / 100).toLocaleString('ar-EG')} / {(amountTotal / 100).toLocaleString('ar-EG')} ج.م
          </span>
        )}
      </div>

      {/* Breakdown if partial or overdue */}
      {amountTotal > 0 && remaining > 0 && (
        <div className="p-3 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800/80 grid grid-cols-2 divide-x divide-x-reverse divide-slate-200/60 dark:divide-slate-700/60 text-center">
          <div className="px-1">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">المسدد</span>
            <span className="font-mono font-black text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
              {(amountPaid / 100).toLocaleString('ar-EG')} ج.م
            </span>
          </div>
          <div className="px-1">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">المتبقي</span>
            <span className="font-mono font-black text-xs sm:text-sm text-rose-600 dark:text-rose-400">
              {(remaining / 100).toLocaleString('ar-EG')} ج.م
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
