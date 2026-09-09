import React, { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { Trash2, AlertTriangle, Info, X } from 'lucide-react';

export interface ConfirmOptions {
  title?: string;
  message: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      if (typeof options === 'string') {
        setDialog({
          title: 'تأكيد الحذف',
          message: options,
          confirmText: 'حذف',
          cancelText: 'إلغاء',
          variant: 'danger',
        });
      } else {
        setDialog({
          title: options.title || (options.variant === 'warning' ? 'تأكيد الإجراء' : 'تأكيد الحذف'),
          message: options.message,
          description: options.description,
          confirmText: options.confirmText || (options.variant === 'warning' ? 'تأكيد' : 'حذف'),
          cancelText: options.cancelText || 'إلغاء',
          variant: options.variant || 'danger',
        });
      }
    });
  }, []);

  const handleClose = useCallback((result: boolean) => {
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
    setDialog(null);
  }, []);

  // Handle keyboard shortcuts (Escape to cancel)
  useEffect(() => {
    if (!dialog) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialog, handleClose]);

  // Focus confirmation button when dialog opens
  useEffect(() => {
    if (dialog && confirmButtonRef.current) {
      confirmButtonRef.current.focus();
    }
  }, [dialog]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {dialog && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          dir="rtl"
          onClick={() => handleClose(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Header with Icon and Close Button */}
            <div className="p-6 pb-4 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {dialog.variant === 'danger' && (
                  <div className="w-11 h-11 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900/40">
                    <Trash2 className="w-5 h-5" />
                  </div>
                )}
                {dialog.variant === 'warning' && (
                  <div className="w-11 h-11 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-900/40">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                )}
                {dialog.variant === 'info' && (
                  <div className="w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-900/40">
                    <Info className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                    {dialog.title}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleClose(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="إلغاء"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Message Body */}
            <div className="px-6 py-2">
              <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed whitespace-pre-line">
                {dialog.message}
              </p>

              {dialog.description && (
                <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {dialog.description}
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="p-6 pt-4 mt-2 flex items-center justify-end gap-3 bg-slate-50/60 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer"
              >
                {dialog.cancelText}
              </button>

              <button
                ref={confirmButtonRef}
                type="button"
                onClick={() => handleClose(true)}
                className={`px-5 py-2 text-sm font-semibold text-white rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5 ${
                  dialog.variant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800'
                    : dialog.variant === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800'
                    : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                }`}
              >
                {dialog.variant === 'danger' && <Trash2 className="w-3.5 h-3.5" />}
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}
