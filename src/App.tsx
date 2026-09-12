import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SignIn, OrganizationList, useAuth, useOrganization } from '@clerk/clerk-react';
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
import { Booking } from './pages/Finance/Booking';

// Inventory & Reports
import { Inventory } from './pages/Inventory/Inventory';
import { Reports } from './pages/Reports/Reports';

import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';

// Admin
import { Users } from './pages/Admin/Users';
import { Messaging } from './pages/Admin/Messaging';
import { Settings } from './pages/Admin/Settings';
import { QrCards } from './pages/Admin/QrCards';

import { PublicBooking } from './pages/PublicBooking';
import { PublicStudentLookup } from './pages/PublicStudentLookup';

import { CustomAuth } from './pages/Auth/CustomAuth';
import { CustomOrganizationList } from './pages/Auth/CustomOrganizationList';

import { DotLottieReact } from '@lottiefiles/dotlottie-react';

function AuthGate() {
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { isLoaded: isOrgLoaded, organization } = useOrganization();
  const [isAnimationDone, setIsAnimationDone] = useState(false);
  const [dotLottie, setDotLottie] = useState<any>(null);
  const [lottieError, setLottieError] = useState<string | null>(null);

  useEffect(() => {
    // Fallback in case onComplete doesn't fire for some reason
    const timer = setTimeout(() => setIsAnimationDone(true), 3500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (dotLottie) {
      const handleComplete = () => setIsAnimationDone(true);
      const handleError = (e: any) => setLottieError(e?.error?.message || 'Unknown Lottie load error');
      
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
  if (!isAuthLoaded || (isSignedIn && !isOrgLoaded) || !isAnimationDone) {
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
  if (!isSignedIn) {
    return <CustomAuth />;
  }

  // 3. Authenticated, but no active organization
  if (!organization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4" dir="rtl">
        <CustomOrganizationList />
      </div>
    );
  }

  // 4. Authenticated -> Render Full Application Routes!
  return (
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
        <Route path="course-products" element={<CourseProducts />} />
        
        <Route path="session-payments" element={<SessionPayments />} />
        <Route path="ledgers" element={<Ledgers />} />
        <Route path="dues" element={<Dues />} />
        <Route path="booking" element={<Booking />} />
        
        <Route path="inventory" element={<Inventory />} />
        <Route path="reports" element={<Reports />} />
        
        <Route path="users" element={<Users />} />
        <Route path="messaging" element={<Messaging />} />
        <Route path="settings" element={<Settings />} />
        <Route path="qrcards" element={<QrCards />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  useEffect(() => {
    // Standalone public routes must NOT trigger any Dexie/IndexedDB operations
    if (!window.location.pathname.startsWith('/s/')) {
      seedDatabaseIfEmpty().then(() => {
        sanitizeNumericCodes();
      });
    }
  }, []);

  return (
    <ThemeProvider>
      <ToastProvider>
        <ConfirmProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/s/:token" element={<PublicStudentLookup />} />
              <Route path="/book" element={<PublicBooking />} />
              <Route path="*" element={<AuthGate />} />
            </Routes>
          </BrowserRouter>
        </ConfirmProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
