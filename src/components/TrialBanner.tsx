import React from 'react';
import { Clock, Sparkles, ChevronLeft } from 'lucide-react';
import { useLicense } from '../license/LicenseContext';
import { cn } from '../lib/utils';

export interface TrialBannerProps {
  daysLeft?: number;
  plan?: string | null;
  onActivateClick?: () => void;
  className?: string;
}

export function TrialBanner({
  daysLeft: propDaysLeft,
  plan: propPlan,
  onActivateClick,
  className,
}: TrialBannerProps) {
  let contextLicense: ReturnType<typeof useLicense> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    contextLicense = useLicense();
  } catch {
    // Graceful fallback if rendered outside of LicenseProvider
    contextLicense = null;
  }

  const activePlan = propPlan !== undefined ? propPlan : contextLicense?.plan;
  const daysRemaining = propDaysLeft !== undefined ? propDaysLeft : contextLicense?.daysLeft ?? 14;

  // Hidden when plan !== 'trial'
  if (activePlan !== 'trial') {
    return null;
  }

  const handleClick = () => {
    if (onActivateClick) {
      onActivateClick();
    } else if (contextLicense?.openActivationModal) {
      contextLicense.openActivationModal();
    }
  };

  const isUrgent = daysRemaining <= 3;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "group inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer shadow-xs active:scale-95 select-none border",
        isUrgent
          ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700/60"
          : "bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/60",
        className
      )}
      title="انقر لتفعيل ترخيص دائم أو إدخال مفتاح الترخيص"
    >
      <Clock className={cn("w-3.5 h-3.5 shrink-0", isUrgent ? "text-amber-600 dark:text-amber-400 animate-pulse" : "text-blue-600 dark:text-blue-400")} />
      
      <span className="font-readex tracking-tight">
        Trial: {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left
      </span>

      <span className="text-[10px] opacity-75 font-normal">
        (فترة تجريبية)
      </span>

      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-300 group-hover:underline mr-0.5">
        <Sparkles className="w-2.5 h-2.5" />
        <span>تفعيل</span>
        <ChevronLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
      </span>
    </button>
  );
}

export default TrialBanner;
