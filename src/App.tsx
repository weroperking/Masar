import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuth, useSession, useClerk } from '@clerk/clerk-react';
import { TaskChooseOrganization, TaskResetPassword, TaskSetupMFA } from '@clerk/clerk-react';
import { CustomAuth } from './pages/Auth/CustomAuth';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Students } from './pages/Students/Students';
import { Courses } from './pages/Courses/Courses';
import { Payments } from './pages/Payments/Payments';

// Academic
import { Groups } from './pages/Academic/Groups';
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

// Admin
import { Users } from './pages/Admin/Users';
import { Messaging } from './pages/Admin/Messaging';
import { Settings } from './pages/Admin/Settings';
import { QrCards } from './pages/Admin/QrCards';

function AuthGate() {
  // CRITICAL: Set treatPendingAsSignedOut: false so that users with active or pending sessions
  // are recognized as authenticated, rather than falsely displayed the login screen!
  const { isLoaded: isAuthLoaded, isSignedIn, userId } = useAuth({ treatPendingAsSignedOut: false });
  const { session, isLoaded: isSessionLoaded } = useSession();
  const clerk = useClerk();
  const [bypassPendingTask, setBypassPendingTask] = useState(false);

  // 1. Loading State
  if (!isAuthLoaded || !isSessionLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm font-medium">جاري التحقق من الجلسة...</p>
        </div>
      </div>
    );
  }

  // Check if any session exists (active or pending)
  const hasSession = !!session || !!userId || isSignedIn || (clerk.client?.sessions && clerk.client.sessions.length > 0);

  // 2. Not authenticated at all -> Show Custom Auth screen
  if (!hasSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" dir="rtl">
        <CustomAuth />
      </div>
    );
  }

  // 3. Authenticated, but session has pending tasks that haven't been bypassed yet
  const currentTask = session?.currentTask;
  if (currentTask && !bypassPendingTask) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" dir="rtl">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-slate-900">مرحباً بك! خطوة تأكيد الحساب</h2>
            <p className="text-slate-500 text-sm mt-1">يرجى استكمال الإجراء أو المتابعة للوحة التحكم مباشرة</p>
          </div>

          <div className="my-6">
            {currentTask.key === 'choose-organization' && <TaskChooseOrganization redirectUrlComplete="/" />}
            {currentTask.key === 'reset-password' && <TaskResetPassword redirectUrlComplete="/" />}
            {currentTask.key === 'setup-mfa' && <TaskSetupMFA redirectUrlComplete="/" />}
            {currentTask.key !== 'choose-organization' && 
             currentTask.key !== 'reset-password' && 
             currentTask.key !== 'setup-mfa' && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
                مهمة الجلسة المعلقة: {currentTask.key}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setBypassPendingTask(true)}
              className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              المتابعة إلى لوحة التحكم
            </button>
            <button
              type="button"
              onClick={() => clerk.signOut()}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 text-sm font-medium rounded-xl transition-colors"
            >
              تسجيل الخروج
            </button>
          </div>
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
        <Route path="courses" element={<Courses />} />
        <Route path="payments" element={<Payments />} />
        
        <Route path="groups" element={<Groups />} />
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
  return (
    <BrowserRouter>
      <AuthGate />
    </BrowserRouter>
  );
}
