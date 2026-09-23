import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SignIn, OrganizationList, useAuth, useOrganization, useClerk } from '@clerk/clerk-react';
import { seedDatabaseIfEmpty, sanitizeNumericCodes } from './db/seed';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Students } from './pages/Students/Students';
import { StudentDetails } from './pages/Students/StudentDetails';
import { Courses } from './pages/Courses/Courses';
import { MonthlySubscriptions } from './pages/Payments/MonthlySubscriptions';

// Academic
import { Groups } from './pages/Academic/Groups';
import { GroupDetails } from './pages/Academic/GroupDetails';
import { Attendance } from './pages/Academic/Attendance';
import { Schedule } from './pages/Academic/Schedule';
import { Assessments } from './pages/Academic/Assessments';
import { CourseProducts } from './pages/Academic/CourseProducts';

// Finance
import { SessionPayments } from './pages/Finance/SessionPayments';
import { Ledgers } from './pages/Finance/Ledgers';
import { Dues } from './pages/Finance/Dues';

// Inventory & Reports
import { Inventory } from './pages/Inventory/Inventory';
import { Reports } from './pages/Reports/Reports';

import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { SubscriptionProvider } from './context/SubscriptionContext';

// Admin
import { Users } from './pages/Admin/Users';
import { Settings } from './pages/Admin/Settings';
import { QrCards } from './pages/Admin/QrCards';
import { Upgrade } from './pages/Upgrade/Upgrade';

import { PublicStudentLookup } from './pages/PublicStudentLookup';

import { CustomAuth } from './pages/Auth/CustomAuth';
import { CustomOrganizationList } from './pages/Auth/CustomOrganizationList';
import { HydrationGate } from './components/HydrationGate';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './config/queryClient';
import { ErrorBoundary } from './components/ErrorBoundary';
import { performHandshake } from './services/syncService';
import { syncAllStudentsToLookupServer } from './services/lookupSyncService';
import { TourProvider } from './context/TourContext';
import { TourOverlay } from './components/Tour/TourOverlay';

import { DotLottieReact } from '@lottiefiles/dotlottie-react';


function CheckUpdate() {
  const { getToken } = useAuth();
  
  useEffect(() => {
    // Only run update check in production mode and when online
    if (process.env.NODE_ENV !== 'production' && !import.meta.env.PROD) {
      return;
    }

    let isChecking = false;
    const checkForUpdates = async () => {
      if (isChecking || !navigator.onLine) return;
      isChecking = true;
      try {
        const response = await fetch('/index.html?nocache=' + Date.now(), { cache: 'no-store' });
        if (!response.ok) return;
        const htmlText = await response.text();
        
        const currentScript = Array.from(document.scripts).find(s => s.src.includes('/assets/index-'));
        if (currentScript) {
          const scriptPath = new URL(currentScript.src).pathname;
          
          // If the new HTML doesn't contain our current bundle's path, there's a new version
          if (!htmlText.includes(scriptPath)) {
            console.log('Update detected! Triggering auto-sync before hard refresh...');
            
            // Attempt to sync pending data to server
            // Migration: We don't have pending data offline anymore, so nothing to sync.
            
            // Clear browser caches
            if ('caches' in window) {
              const cacheNames = await caches.keys();
              for (const name of cacheNames) {
                await caches.delete(name);
              }
            }
            
            // Unregister Service Workers
            if ('serviceWorker' in navigator) {
              const registrations = await navigator.serviceWorker.getRegistrations();
              for (const registration of registrations) {
                await registration.unregister();
              }
            }
            
            // Force a hard reload
            window.location.reload();
          }
        }
      } catch (e) {
        // Soft warning for background network checks instead of loud errors
        console.warn('Background update check failed (likely transient network or offline state):', e);
      }
    };
    
    checkForUpdates();
  }, [getToken]);

  return null;
}

function AuthGate() {
  const { isLoaded: isAuthLoaded, isSignedIn, userId } = useAuth({ treatPendingAsSignedOut: false });
  const { isLoaded: isOrgLoaded, organization } = useOrganization();
  const clerk = useClerk();
  const [isAnimationDone, setIsAnimationDone] = useState(false);
  const [dotLottie, setDotLottie] = useState<any>(null);
  const [lottieError, setLottieError] = useState<string | null>(null);

  // Consider authenticated if isSignedIn is true, or userId exists, or clerk client has existing sessions
  const hasSession = Boolean(
    isSignedIn || 
    userId || 
    (clerk.loaded && clerk.client?.sessions && clerk.client.sessions.length > 0)
  );

  // Auto-activate session if clerk client has a session that isn't set as active yet
  useEffect(() => {
    if (clerk.loaded && !clerk.session && clerk.client?.sessions && clerk.client.sessions.length > 0) {
      const firstSession = clerk.client.sessions[0];
      clerk.setActive({ session: firstSession.id }).catch(console.error);
    }
  }, [clerk.loaded, clerk.session, clerk.client?.sessions]);

  // Perform local-first encryption handshake and public lookup sync once authenticated
  const { getToken } = useAuth();
  useEffect(() => {
    if (hasSession) {
      if (organization) {
        performHandshake(getToken).catch((err) => {
          console.warn('Crypto handshake deferred or running offline:', err);
        });
      }
      syncAllStudentsToLookupServer().catch(() => {});
    }
  }, [hasSession, organization?.id, organization?.slug, getToken]);

  useEffect(() => {
    // Fallback in case onComplete doesn't fire for some reason
    const timer = setTimeout(() => setIsAnimationDone(true), 3500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (dotLottie) {
      const handleComplete = () => setIsAnimationDone(true);
      const handleError = (e: any) => {
        console.warn('Lottie splash animation failed to render, bypassing splash screen:', e);
        setIsAnimationDone(true);
      };
      
      dotLottie.addEventListener('complete', handleComplete);
      dotLottie.addEventListener('loadError', handleError);
      dotLottie.addEventListener('renderError', handleError);
      
      return () => {
        dotLottie.removeEventListener('complete', handleComplete);
        dotLottie.removeEventListener('loadError', handleError);
        dotLottie.removeEventListener('renderError', handleError);
      };
    }
  }, [dotLottie]);

  // 1. Loading State
  if (!isAuthLoaded || !clerk.loaded || (hasSession && !isOrgLoaded) || !isAnimationDone) {
    return (
      <div className="fixed inset-0 w-full h-full z-50 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 overflow-hidden">
        {lottieError && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50 text-red-600 text-xs text-center p-4 border border-red-200 rounded-lg">
            Lottie Error: {lottieError}
          </div>
        )}
        <DotLottieReact 
          src="/masar-loader.json"
          autoplay
          loop={false}
          layout={{ fit: 'cover' }}
          className="w-full h-full"
          style={{ width: '100%', height: '100%', opacity: lottieError ? 0 : 1 }}
          dotLottieRefCallback={setDotLottie}
        />
      </div>
    );
  }

  // 2. Not authenticated at all -> Show Custom Auth
  if (!hasSession) {
    return <CustomAuth />;
  }

  // 3. Authenticated, but no active organization
  if (!organization) {
    return (
      <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex flex-col" dir="rtl">
        <CustomOrganizationList />
      </div>
    );
  }

  // 4. Authenticated -> Render Full Application Routes guarded by HydrationGate!
  return (
    <ErrorBoundary>
      <SubscriptionProvider>
        <TourProvider>
          <HydrationGate>
            <CheckUpdate />
            <TourOverlay />
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="students" element={<Students />} />
                <Route path="students/:id" element={<StudentDetails />} />
                <Route path="courses" element={<Courses />} />
                <Route path="payments" element={<MonthlySubscriptions />} />
                
                <Route path="groups" element={<Groups />} />
                <Route path="groups/:id" element={<GroupDetails />} />
                <Route path="attendance" element={<Attendance />} />
                <Route path="schedule" element={<Schedule />} />
                <Route path="assessments" element={<Assessments />} />
                <Route path="courseProducts" element={<CourseProducts />} />
                
                <Route path="sessionPayments" element={<SessionPayments />} />
                <Route path="ledgers" element={<Ledgers />} />
                <Route path="dues" element={<Dues />} />
                <Route path="booking" element={<Navigate to="/" replace />} />
                
                <Route path="inventory" element={<Inventory />} />
                <Route path="reports" element={<Reports />} />
                
                <Route path="users" element={<Users />} />
                <Route path="messaging" element={<Navigate to="/students" replace />} />
                <Route path="settings" element={<Settings />} />
                <Route path="qrcards" element={<QrCards />} />
                <Route path="upgrade" element={<Upgrade />} />
              </Route>
            </Routes>
          </HydrationGate>
        </TourProvider>
      </SubscriptionProvider>
    </ErrorBoundary>
  );
}

export default function App() {
  useEffect(() => {
    // Standalone public routes must NOT trigger any Dexie/IndexedDB operations
    if (!window.location.pathname.startsWith('/p/s/')) {
      seedDatabaseIfEmpty().then(() => {
        sanitizeNumericCodes();
      });
    }
  }, []);

  return (
    <ThemeProvider>
      <ToastProvider>
        <ConfirmProvider>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
               <Routes>
                 <Route path="/p/s/:code" element={<PublicStudentLookup />} />
                 <Route path="/book" element={<Navigate to="/" replace />} />
                 <Route path="*" element={<AuthGate />} />
               </Routes>
            </BrowserRouter>
          </QueryClientProvider>
        </ConfirmProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
