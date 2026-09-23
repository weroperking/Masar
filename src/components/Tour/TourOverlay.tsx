import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTour } from '../../context/TourContext';
import { 
  ChevronLeft, ChevronRight, X, HelpCircle, 
  Lightbulb, CheckCircle2, ArrowRight
} from 'lucide-react';
import { cn } from '../../lib/utils';

export function TourOverlay() {
  const { 
    isActive, 
    currentStepIndex, 
    currentStep, 
    totalSteps, 
    nextStep, 
    prevStep, 
    skipTour, 
    finishTour, 
    targetRect, 
    isReady 
  } = useTour();

  const isLastStep = currentStepIndex === totalSteps - 1;
  // Pre-fill Onboarding Progress: Don't start at 0%. Center owner receives 25% automatic credit for creating the center account
  const progressPercentage = Math.min(100, Math.round(25 + (currentStepIndex / Math.max(1, totalSteps - 1)) * 75));

  // Compute card position based on target element bounding box
  const cardStyle = useMemo(() => {
    const viewportWidth = window.innerWidth;
    const isMobile = viewportWidth < 640;

    if (isMobile) {
      return {
        bottom: '16px',
        left: '3vw',
        right: '3vw',
        width: '94vw',
        position: 'fixed' as const,
        zIndex: 10000,
      };
    }

    if (!targetRect || currentStep.preferredPosition === 'center') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        position: 'fixed' as const,
      };
    }

    const padding = 16;
    const cardWidth = 680;
    const cardEstimatedHeight = 280;
    const viewportHeight = window.innerHeight;

    let top = 0;
    let left = 0;

    // Default preference based on step
    const pref = currentStep.preferredPosition || 'bottom';

    if (pref === 'left' && targetRect.left > cardWidth + padding) {
      // Position to the left of the element (in RTL, this is towards screen center from right sidebar)
      top = Math.max(padding, Math.min(targetRect.top, viewportHeight - cardEstimatedHeight - padding));
      left = targetRect.left - cardWidth - padding;
    } else if (pref === 'right' && viewportWidth - targetRect.right > cardWidth + padding) {
      top = Math.max(padding, Math.min(targetRect.top, viewportHeight - cardEstimatedHeight - padding));
      left = targetRect.right + padding;
    } else if (pref === 'top' && targetRect.top > cardEstimatedHeight + padding) {
      top = targetRect.top - cardEstimatedHeight - padding;
      left = Math.max(padding, Math.min(targetRect.left + (targetRect.width / 2) - (cardWidth / 2), viewportWidth - cardWidth - padding));
    } else {
      // Default: Bottom or best fit
      if (viewportHeight - targetRect.bottom > cardEstimatedHeight + padding) {
        top = targetRect.bottom + padding;
      } else if (targetRect.top > cardEstimatedHeight + padding) {
        top = targetRect.top - cardEstimatedHeight - padding;
      } else {
        top = Math.max(padding, (viewportHeight - cardEstimatedHeight) / 2);
      }
      left = Math.max(padding, Math.min(targetRect.left + (targetRect.width / 2) - (cardWidth / 2), viewportWidth - cardWidth - padding));
    }

    return {
      top: `${top}px`,
      left: `${left}px`,
      position: 'fixed' as const,
    };
  }, [targetRect, currentStep]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-auto font-cairo overflow-hidden select-none" dir="rtl">
      {/* Semi-dark background overlay using CSS Spotlight Box Shadow */}
      {targetRect && currentStep.preferredPosition !== 'center' ? (
        <motion.div
          key="spotlight-cutout"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          style={{
            top: `${Math.max(0, targetRect.top - 6)}px`,
            left: `${Math.max(0, targetRect.left - 6)}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
          }}
          className="fixed rounded-xl pointer-events-none shadow-[0_0_0_9999px_rgba(2,6,23,0.78)] ring-4 ring-blue-500/80 ring-offset-2 ring-offset-slate-950 transition-all duration-300"
        />
      ) : (
        <motion.div
          key="full-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs"
        />
      )}

      {/* Interactive Tooltip / Explanation Card */}
      <div style={cardStyle} className="z-[10000] w-[94vw] sm:w-[94vw] max-w-[680px] pointer-events-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Minimalist Top Progress Line */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 relative overflow-hidden">
              <motion.div
                className="bg-blue-600 dark:bg-blue-500 h-full"
                initial={{ width: '25%' }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 0.25 }}
              />
            </div>

            {/* Card Header */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                  <span className="font-bold">{progressPercentage}%</span>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span>{currentStepIndex + 1} / {totalSteps}</span>
                </span>
                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 px-2 py-0.5 rounded-md">
                  {currentStep.badge || (currentStep.id.startsWith('assistant') ? 'جولة المساعدين 🛡️' : 'جولة المنصة 🎓')}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-['Readex_Pro']">
                  {currentStep.title}
                </h3>
              </div>

              <button
                onClick={skipTour}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="إغلاق الجولة"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Card Body - Minimalist & Spacious */}
            <div className="p-4 sm:p-6 space-y-4 text-xs leading-relaxed max-h-[45vh] sm:max-h-[60vh] overflow-y-auto">
              {/* Account Setup 25% Credit Notice on Step 0 */}
              {currentStepIndex === 0 && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-2.5 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div className="text-xs font-medium leading-snug">
                    <span className="font-bold">رصيد التهيئة الأولية (25% مكتمل): </span>
                    تم احتساب إنشاء حساب السنتر وتفعيله تلقائياً كأول إنجاز في رحلة الإعداد!
                  </div>
                </div>
              )}

              {/* Primary explanation */}
              <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                {currentStep.whatIsIt}
              </p>

              {/* 2-Column Minimalist Detail Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50">
                  <div className="text-[11px] font-bold text-slate-900 dark:text-slate-200 mb-1">
                    طريقة الاستخدام
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-normal">
                    {currentStep.howToUse}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50">
                  <div className="text-[11px] font-bold text-slate-900 dark:text-slate-200 mb-1">
                    المميزات والقيمة
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-normal">
                    {currentStep.whyItMatters}
                  </p>
                </div>
              </div>
            </div>

            {/* Card Footer Navigation Controls */}
            <div className="px-4 sm:px-6 py-3 sm:py-3.5 bg-slate-50/80 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={skipTour}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                تخطي الجولة
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={currentStepIndex === 0}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer",
                    currentStepIndex === 0
                      ? "opacity-30 cursor-not-allowed border-slate-200 dark:border-slate-800 text-slate-400"
                      : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span>السابق</span>
                </button>

                {isLastStep ? (
                  <button
                    type="button"
                    onClick={finishTour}
                    className="flex items-center gap-1.5 px-5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
                  >
                    <span>إنهاء وبدء الاستخدام</span>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="flex items-center gap-1.5 px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
                  >
                    <span>التالي</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
