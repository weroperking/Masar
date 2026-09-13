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

    const createDefaultTrial = (): SubscriptionStatus => ({
      plan: 'trial',
      status: 'trialing',
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      days_remaining: 14,
      limits: {
        max_branches: 5,
        max_students: 1000,
        inventory_sales: true,
        combined_packages: true,
        advanced_analytics: true,
        api_access: true,
      },
    });

    const checkSubscription = async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error('No token');

        const response = await fetch('/me/subscription-status', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data: SubscriptionStatus = await response.json();
            
            if (isMounted) {
              setSubscription(data);
              const activeStatus = ['trialing', 'active'].includes(data.status);
              setIsBlocked(!activeStatus);
              
              // Cache in Dexie
              await db.subscriptionCache.put({
                id: 'singleton',
                ...data,
                checked_at: Date.now()
              });
              setIsInitializing(false);
            }
            return;
          }
        } else if (response.status === 402) {
          const data = await response.json().catch(() => ({}));
          if (data.error === 'TRIAL_EXPIRED' || data.error === 'SUBSCRIPTION_INACTIVE' || data.error === 'NO_SUBSCRIPTION') {
            if (isMounted) {
              setIsBlocked(true);
              const newStatus = data.error === 'TRIAL_EXPIRED' ? 'expired' : data.error === 'NO_SUBSCRIPTION' ? 'none' : 'past_due';
              setSubscription(prev => prev ? { ...prev, status: newStatus } : {
                plan: 'none',
                status: newStatus,
                trial_ends_at: null,
                days_remaining: 0,
                limits: { max_branches: 0, max_students: 0, inventory_sales: false, combined_packages: false, advanced_analytics: false, api_access: false }
              });
              
              await db.subscriptionCache.put({
                id: 'singleton',
                plan: 'none',
                status: newStatus,
                trial_ends_at: null,
                days_remaining: 0,
                limits: { max_branches: 0, max_students: 0, inventory_sales: false, combined_packages: false, advanced_analytics: false, api_access: false },
                checked_at: Date.now()
              });
              setIsInitializing(false);
            }
            return;
          }
        }
      } catch (err) {
        // Network error / offline / local development
        console.warn('Could not reach subscription API, checking local cache...');
      }

      // Check local cache or initialize default 14-day trial
      try {
        const cached = await db.subscriptionCache.get('singleton');
        if (cached) {
          const ageMs = Date.now() - cached.checked_at;
          const hoursOld = ageMs / (1000 * 60 * 60);
          
          if (isMounted) {
            setSubscription(cached);
            const activeStatus = ['trialing', 'active'].includes(cached.status);
            
            if (activeStatus && hoursOld < 48) {
              setIsBlocked(false);
            } else if (!activeStatus) {
              setIsBlocked(true);
            } else {
              setIsBlocked(false);
            }
          }
        } else {
          // No cache exists yet -> Newly created organization!
          // Provide 14-day free trial immediately so the center starts working smoothly.
          const defaultTrial = createDefaultTrial();
          if (isMounted) {
            setSubscription(defaultTrial);
            setIsBlocked(false);
          }
          await db.subscriptionCache.put({
            id: 'singleton',
            ...defaultTrial,
            checked_at: Date.now(),
          });
        }
      } catch (dexieErr) {
        console.error('Failed to read subscription cache:', dexieErr);
        if (isMounted) {
          const fallbackTrial = createDefaultTrial();
          setSubscription(fallbackTrial);
          setIsBlocked(false);
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
