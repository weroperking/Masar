import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth, useOrganization } from '@clerk/clerk-react';
import { db } from '../db/db';
import { SubscriptionStatus, SubscriptionCache } from '../types';
import { TrialExpiredScreen } from '../components/TrialExpiredScreen';

interface SubscriptionContextType {
  subscription: SubscriptionStatus | null;
  isBlocked: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  subscription: null,
  isBlocked: false,
});

export const useSubscription = () => useContext(SubscriptionContext);

/**
 * Accurately calculates trial countdown and status.
 * Reconciles the backend status with the immutable organization creation date from Clerk.
 */
function reconcileTrialStatus(
  input: SubscriptionStatus,
  orgCreatedAt?: Date | string | number | null
): SubscriptionStatus {
  if (input.status !== 'trialing') {
    return input;
  }

  const now = Date.now();
  const ONE_DAY_MS = 1000 * 60 * 60 * 24;

  // 1. Immutable organization creation timestamp from Clerk
  let orgCreatedMs = 0;
  if (orgCreatedAt) {
    const parsed = new Date(orgCreatedAt).getTime();
    if (!isNaN(parsed) && parsed > 0) {
      orgCreatedMs = parsed;
    }
  }

  // 2. Parse backend trial_ends_at if present
  let backendEndMs = 0;
  if (input.trial_ends_at) {
    const parsed = typeof input.trial_ends_at === 'number'
      ? (input.trial_ends_at < 1e11 ? input.trial_ends_at * 1000 : input.trial_ends_at)
      : new Date(input.trial_ends_at).getTime();
    if (!isNaN(parsed) && parsed > 0) {
      backendEndMs = parsed;
    }
  }

  let effectiveEndMs = 0;

  if (orgCreatedMs > 0) {
    const trialEndFromOrg = orgCreatedMs + (14 * ONE_DAY_MS);

    // Detect if backend is generating a rolling "now + 14 days" on every request:
    // If org was created over a day ago, but backendEndMs is still ~14 days from NOW
    const isRollingReset = backendEndMs > 0 &&
      (backendEndMs - now > 13 * ONE_DAY_MS) &&
      (now - orgCreatedMs > ONE_DAY_MS);

    if (backendEndMs === 0 || isRollingReset) {
      effectiveEndMs = trialEndFromOrg;
    } else {
      effectiveEndMs = backendEndMs;
    }
  } else if (backendEndMs > 0) {
    effectiveEndMs = backendEndMs;
  }

  if (effectiveEndMs > 0) {
    const diff = effectiveEndMs - now;
    const days = Math.max(0, Math.ceil(diff / ONE_DAY_MS));
    return {
      ...input,
      days_remaining: days,
      status: days <= 0 ? 'expired' : 'trialing',
      trial_ends_at: new Date(effectiveEndMs).toISOString(),
    };
  }

  return input;
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { getToken, isSignedIn } = useAuth();
  const { organization } = useOrganization();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    if (!isSignedIn || !organization) {
      setIsInitializing(false);
      return;
    }

    let isMounted = true;
    let intervalId: NodeJS.Timeout;

    const checkSubscription = async () => {
      let cachedRecord: SubscriptionStatus | null = null;

      // 1. Check local cache first for immediate UI response
      try {
        const cached = await db.subscriptionCache.get('singleton');
        if (cached && isMounted) {
          cachedRecord = cached;
          const ageMs = Date.now() - cached.checked_at;
          const hoursOld = ageMs / (1000 * 60 * 60);
          
          // Reconcile days remaining based on Clerk organization creation date and cached end date
          const reconciled = reconcileTrialStatus(cached, organization.createdAt);
          
          setSubscription(reconciled);
          const activeStatus = ['trialing', 'active'].includes(reconciled.status);
          setIsBlocked(!activeStatus);
          
          // If cache is reasonably fresh, stop initializing spinner
          if (hoursOld < 24) {
            setIsInitializing(false);
          }
        }
      } catch (cacheErr) {
        console.error('Cache read error:', cacheErr);
      }

      // 2. Background Fetch from Backend (Sole Authority)
      try {
        const token = await getToken();
        if (!token) throw new Error('No token');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(`/api/me/subscription-status?orgId=${organization.id}`, {
          signal: controller.signal,
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        clearTimeout(timeoutId);

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data: SubscriptionStatus = await response.json();
            const reconciled = reconcileTrialStatus(data, organization.createdAt);

            if (isMounted) {
              setSubscription(reconciled);
              const activeStatus = ['trialing', 'active'].includes(reconciled.status);
              setIsBlocked(!activeStatus);
              
              await db.subscriptionCache.put({
                id: 'singleton',
                ...reconciled,
                checked_at: Date.now()
              });
            }
          }
        } else if (response.status === 402) {
          const data = await response.json().catch(() => ({}));
          if (isMounted) {
            setIsBlocked(true);
            const newStatus = data.error === 'TRIAL_EXPIRED' ? 'expired' : (data.error === 'NO_SUBSCRIPTION' || data.status === 'none') ? 'none' : 'past_due';
            const blockedState: SubscriptionStatus = {
              plan: 'none',
              status: newStatus,
              trial_ends_at: null,
              days_remaining: 0,
              limits: { max_branches: 0, max_students: 0, inventory_sales: false, combined_packages: false, advanced_analytics: false, api_access: false }
            };
            setSubscription(blockedState);
            
            await db.subscriptionCache.put({
              id: 'singleton',
              ...blockedState,
              checked_at: Date.now()
            });
          }
        } else {
          // If upstream returns 404 or error and we have no local cache yet, provide initial reconciled trial
          if (!cachedRecord && isMounted) {
            const initialTrial = reconcileTrialStatus({
              plan: 'trial',
              status: 'trialing',
              trial_ends_at: null,
              days_remaining: 14,
              limits: { max_branches: 1, max_students: 50, inventory_sales: true, combined_packages: true, advanced_analytics: true, api_access: false }
            }, organization.createdAt);

            setSubscription(initialTrial);
            const activeStatus = ['trialing', 'active'].includes(initialTrial.status);
            setIsBlocked(!activeStatus);
            await db.subscriptionCache.put({
              id: 'singleton',
              ...initialTrial,
              checked_at: Date.now()
            });
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.warn('Subscription fetch timed out');
        } else {
          console.error('Subscription API error:', err);
        }

        // Fallback for offline/timeout when no cache exists
        if (!cachedRecord && isMounted) {
          const initialTrial = reconcileTrialStatus({
            plan: 'trial',
            status: 'trialing',
            trial_ends_at: null,
            days_remaining: 14,
            limits: { max_branches: 1, max_students: 50, inventory_sales: true, combined_packages: true, advanced_analytics: true, api_access: false }
          }, organization.createdAt);

          setSubscription(initialTrial);
          const activeStatus = ['trialing', 'active'].includes(initialTrial.status);
          setIsBlocked(!activeStatus);
          await db.subscriptionCache.put({
            id: 'singleton',
            ...initialTrial,
            checked_at: Date.now()
          });
        }
      } finally {
        if (isMounted) setIsInitializing(false);
      }
    };

    checkSubscription();
    
    // Poll every 10 minutes
    intervalId = setInterval(checkSubscription, 10 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [getToken, isSignedIn, organization]);

  if (isInitializing) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isBlocked) {
    return <TrialExpiredScreen status={subscription?.status} />;
  }

  return (
    <SubscriptionContext.Provider value={{ subscription, isBlocked }}>
      {children}
    </SubscriptionContext.Provider>
  );
}
