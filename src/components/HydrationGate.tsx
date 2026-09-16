import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, useOrganization } from '@clerk/clerk-react';
import { db } from '../db/db';
import { performHandshake, hydrateIfNeeded } from '../services/syncService';
import { migratePlaintextRecords } from '../services/cryptoService';
import { MasarLogo } from './MasarLogo';
import { Loader2, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';

interface HydrationGateProps {
  children: React.ReactNode;
}

export function HydrationGate({ children }: HydrationGateProps) {
  const { getToken } = useAuth();
  const { organization } = useOrganization();
  const [isHydrated, setIsHydrated] = useState<boolean | null>(null);
  const [isHydrating, setIsHydrating] = useState(false);
  const [hydrationError, setHydrationError] = useState<string | null>(null);

  const startHydration = useCallback(async () => {
    setIsHydrating(true);
    setHydrationError(null);

    try {
      // 1. Check if already hydrated
      const flag = await db.keystore.get('hydrated');
      if (flag) {
        setIsHydrated(true);
        setIsHydrating(false);
        return;
      }

      // 2. Perform crypto handshake & migration
      await performHandshake(getToken);
      await migratePlaintextRecords();

      // 3. Hydrate from server (since=0) if online
      if (navigator.onLine) {
        await hydrateIfNeeded(getToken);
      } else {
        // If device is completely offline on very first run, record hydration marker
        await db.keystore.put({ id: 'hydrated', at: Date.now() });
      }

      setIsHydrated(true);
    } catch (err: any) {
      console.warn('[HydrationGate] Hydration error:', err);
      // If error, check if local database already has data to allow graceful offline usage
      const count = await db.students.count().catch(() => 0);
      if (count > 0) {
        // We have local data, allow offline proceeding
        setIsHydrated(true);
      } else {
        setHydrationError(err?.message || 'تعذر إتمام المزامنة الأولية مع الخادم');
      }
    } finally {
      setIsHydrating(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (organization?.id) {
      startHydration();
    }
  }, [organization?.id, startHydration]);

  // Already hydrated -> Render app
  if (isHydrated) {
    return <>{children}</>;
  }

  // Hydration Error State (Overlay with retry)
  if (hydrationError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 font-cairo" dir="rtl">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xl text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              تعذر إعداد الوصول دون اتصال
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {hydrationError}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
            <button
              onClick={startHydration}
              disabled={isHydrating}
              className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>إعادة المحاولة</span>
            </button>

            <button
              onClick={async () => {
                await db.keystore.put({ id: 'hydrated', at: Date.now() });
                setIsHydrated(true);
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              <span>المتابعة محلياً</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Hydrating Blocking Overlay
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50 dark:bg-slate-950 font-cairo" dir="rtl">
      <div className="flex flex-col items-center max-w-sm px-6 text-center space-y-4">
        <MasarLogo size="lg" className="animate-pulse" />

        <div className="space-y-1.5 mt-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            جاري إعداد بياناتك والوصول بدون إنترنت...
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            يتم تهيئة التشفير المحلي وسحب البيانات الأولية لتتمكن من العمل دون اتصال بأعلى سرعة وأمان.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-medium pt-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>تهيئة آمنة...</span>
        </div>
      </div>
    </div>
  );
}
