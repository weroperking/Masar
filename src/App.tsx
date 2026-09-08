import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SignIn, OrganizationList, useAuth, useOrganization } from '@clerk/clerk-react';
import { seedDatabaseIfEmpty } from './db/seed';
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

// Admin
import { Users } from './pages/Admin/Users';
import { Messaging } from './pages/Admin/Messaging';
import { Settings } from './pages/Admin/Settings';
import { QrCards } from './pages/Admin/QrCards';

import { PublicBooking } from './pages/PublicBooking';

function AuthGate() {
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { isLoaded: isOrgLoaded, organization } = useOrganization();

  // 1. Loading State
  if (!isAuthLoaded || (isSignedIn && !isOrgLoaded)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm font-medium">جاري التحقق من الجلسة...</p>
        </div>
      </div>
    );
  }

  // 2. Not authenticated at all -> Show Clerk SignIn
  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" dir="rtl">
        <SignIn routing="hash" />
      </div>
    );
  }

  // 3. Authenticated, but no active organization
  if (!organization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" dir="rtl">
        <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 p-8 flex flex-col items-center">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">مرحباً بك!</h2>
            <p className="text-slate-500 text-sm mt-1">يرجى اختيار أو إنشاء أكاديميتك للمتابعة</p>
          </div>
          <OrganizationList 
            hidePersonal={true}
            afterSelectOrganizationUrl="/"
            afterCreateOrganizationUrl="/"
          />
        </div>
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
    seedDatabaseIfEmpty();
  }, []);

  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/book" element={<PublicBooking />} />
            <Route path="*" element={<AuthGate />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
