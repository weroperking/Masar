import { Link, Outlet, useLocation } from 'react-router-dom';
import { UserButton, useAuth, useClerk } from '@clerk/clerk-react';
import { 
  Users, BookOpen, CreditCard, LayoutDashboard, Settings, 
  UserCheck, Calendar, FileText, Library, Wallet, 
  FileSpreadsheet, Globe, Package, ShoppingCart, 
  BarChart3, UserCog, MessageSquare, QrCode, LogOut
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useState, useEffect } from 'react';
import { syncService } from '../services/syncService';

const navigationGroups = [
  {
    title: 'رئيسي',
    items: [
      { name: 'لوحة التحكم', href: '/', icon: LayoutDashboard },
    ]
  },
  {
    title: 'أكاديمي',
    items: [
      { name: 'الطلاب', href: '/students', icon: Users },
      { name: 'الكورسات', href: '/courses', icon: BookOpen },
      { name: 'المجموعات', href: '/groups', icon: Users },
      { name: 'الحضور والغياب', href: '/attendance', icon: UserCheck },
      { name: 'الجدول الزمني', href: '/schedule', icon: Calendar },
      { name: 'الاختبارات والواجبات', href: '/assessments', icon: FileText },
      { name: 'الكتب التعليمية', href: '/course-products', icon: Library },
    ]
  },
  {
    title: 'المالية',
    items: [
      { name: 'الاشتراكات الشهرية', href: '/payments', icon: CreditCard },
      { name: 'مدفوعات الحصص', href: '/session-payments', icon: Wallet },
      { name: 'السجلات المالية', href: '/ledgers', icon: FileSpreadsheet },
      { name: 'المستحقات', href: '/dues', icon: FileSpreadsheet },
      { name: 'الحجز الأونلاين', href: '/booking', icon: Globe },
    ]
  },
  {
    title: 'المخزون',
    items: [
      { name: 'المنتجات والمبيعات', href: '/inventory', icon: Package },
    ]
  },
  {
    title: 'التقارير',
    items: [
      { name: 'التقارير', href: '/reports', icon: BarChart3 },
    ]
  },
  {
    title: 'الإدارة',
    items: [
      { name: 'المستخدمين', href: '/users', icon: UserCog },
      { name: 'المراسلات', href: '/messaging', icon: MessageSquare },
      { name: 'الإعدادات', href: '/settings', icon: Settings },
      { name: 'بطاقات QR', href: '/qrcards', icon: QrCode },
    ]
  }
];

export function Layout() {
  const location = useLocation();
  const { getToken } = useAuth();
  const clerk = useClerk();

  useEffect(() => {
    // Attempt sync on load
    syncService.syncPendingData(getToken).catch(console.error);
    
    // Optional: periodic sync every 5 minutes
    const interval = setInterval(() => {
      syncService.syncPendingData(getToken).catch(console.error);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [getToken]);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-l border-slate-200 flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-slate-200 shrink-0">
          <h1 className="text-2xl font-black text-indigo-600 font-brand tracking-tight">
            مسار
          </h1>
        </div>
        <nav className="flex-1 px-4 py-6 overflow-y-auto space-y-6 scrollbar-thin">
          {navigationGroups.map((group) => (
            <div key={group.title}>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-3">
                {group.title}
              </h2>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        isActive
                          ? 'bg-indigo-50 text-indigo-600'
                          : 'text-slate-700 hover:bg-slate-100',
                        'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors'
                      )}
                    >
                      <item.icon
                        className={cn(
                          isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-500',
                          'ml-3 shrink-0 h-5 w-5'
                        )}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 space-x-reverse text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>متصل</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => clerk.signOut()}
              title="تسجيل الخروج"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1 text-xs"
            >
              <LogOut className="w-4 h-4" />
              <span>خروج</span>
            </button>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-white h-16 border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
          <h1 className="text-xl font-black text-indigo-600 font-brand">مسار</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => clerk.signOut()}
              title="تسجيل الخروج"
              className="p-1.5 text-slate-500 hover:text-red-600 rounded-lg transition-colors flex items-center gap-1 text-xs"
            >
              <LogOut className="w-4 h-4" />
              <span>خروج</span>
            </button>
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>
        
        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="mx-auto max-w-7xl pb-12">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
