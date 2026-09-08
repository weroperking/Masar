import { Link, Outlet, useLocation } from 'react-router-dom';
import { UserButton, useAuth, useClerk } from '@clerk/clerk-react';
import { 
  Users, BookOpen, CreditCard, LayoutDashboard, Settings, 
  UserCheck, Calendar, FileText, Library, Wallet, 
  FileSpreadsheet, Globe, Package, 
  BarChart3, UserCog, MessageSquare, QrCode, LogOut,
  Search, Sun, Moon, Plus, Keyboard, RefreshCw, CheckCircle2, WifiOff
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useState, useEffect } from 'react';
import { syncService, TABLES } from '../services/syncService';
import { useTheme } from '../context/ThemeContext';
import { CommandPalette } from './CommandPalette';
import { QuickNewModal } from './QuickNewModal';
import { ShortcutsHelpModal } from './ShortcutsHelpModal';
import { useToast } from '../context/ToastContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';

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
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isQuickNewOpen, setIsQuickNewOpen] = useState(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  // Auto-sync when going online
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      performSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const performSync = async () => {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    try {
      await syncService.syncPendingData(getToken);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    // Attempt sync on load
    performSync();
    
    // Periodic sync every 30 seconds
    const interval = setInterval(() => {
      performSync();
    }, 30 * 1000);
    return () => clearInterval(interval);
  }, [getToken]);

  const pendingCount = useLiveQuery(async () => {
    let total = 0;
    for (const table of TABLES) {
      const tableInstance = (db as any)[table];
      if (tableInstance) {
        total += await tableInstance.where('sync_status').equals('pending').count();
      }
    }
    return total;
  }, []) ?? 0;

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInput = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' || 
        activeElement.tagName === 'SELECT'
      );

      // Ctrl+K or Cmd+K -> Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
      // Ctrl+N or Cmd+N -> Quick New Entry Modal
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsQuickNewOpen(prev => !prev);
      }
      // Ctrl+J or Cmd+J -> Toggle Theme
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        toggleTheme();
        toast.info(theme === 'dark' ? 'تم التبديل إلى الوضع الفاتح' : 'تم التبديل إلى الوضع الداكن');
      }
      // '?' key when not in an input -> Shortcuts Help
      else if (e.key === '?' && !isInput) {
        e.preventDefault();
        setIsShortcutsHelpOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [theme, toggleTheme, toast]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 dark:bg-slate-950 flex transition-colors duration-150">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 flex flex-col hidden md:flex shrink-0">
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <h1 className="text-2xl font-black text-blue-600 dark:text-blue-400 font-brand tracking-tight">
            مسار
          </h1>

          {/* Theme toggle in sidebar */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-800 transition-colors"
            title={theme === 'dark' ? 'التبديل إلى الوضع الفاتح (Ctrl+J)' : 'التبديل إلى الوضع الداكن (Ctrl+J)'}
            aria-label="تبديل المظهر"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Quick search shortcut box */}
        <div className="px-4 pt-4 pb-1">
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:border-slate-700/60 rounded-xl transition-colors text-right group"
          >
            <span className="flex items-center gap-2 group-hover:text-slate-600 dark:group-hover:text-slate-300">
              <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500" />
              بحث سريع...
            </span>
            <kbd className="font-mono text-[10px] px-1.5 py-0.5 bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded border border-slate-200 dark:border-slate-700 dark:border-slate-600">
              Ctrl K
            </kbd>
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 overflow-y-auto space-y-6 scrollbar-thin">
          {navigationGroups.map((group) => (
            <div key={group.title}>
              <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-3">
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
                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/70 dark:text-blue-400 font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-800/60',
                        'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors'
                      )}
                    >
                      <item.icon
                        className={cn(
                          isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-300',
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

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
          <div className="flex flex-col text-xs">
            {isSyncing ? (
              <div className="flex items-center space-x-2 space-x-reverse text-blue-500">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>جاري المزامنة...</span>
              </div>
            ) : !isOnline ? (
              <div className="flex items-center space-x-2 space-x-reverse text-rose-500">
                <WifiOff className="w-3.5 h-3.5" />
                <span>غير متصل ({pendingCount} معلق)</span>
              </div>
            ) : pendingCount > 0 ? (
               <div className="flex items-center space-x-2 space-x-reverse text-amber-500">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{pendingCount} بانتظار المزامنة</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 space-x-reverse text-emerald-500">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>متزامن</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsShortcutsHelpOpen(true)}
              title="اختصارات لوحة المفاتيح (?)"
              className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Keyboard className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => clerk.signOut()}
              title="تسجيل الخروج"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors flex items-center gap-1 text-xs"
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
        {/* Top Header Bar (Desktop & Mobile) */}
        <header className="bg-white dark:bg-slate-900 h-16 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 md:px-8 shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile logo */}
            <h1 className="md:hidden text-xl font-black text-blue-600 dark:text-blue-400 font-brand">
              مسار
            </h1>

            {/* Desktop Quick Search and New Action */}
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => setIsCommandPaletteOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg text-xs font-medium transition-colors"
                title="البحث والأوامر السريعة (Ctrl+K)"
              >
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <span>بحث في مسار...</span>
                <kbd className="font-mono text-[10px] px-1 py-0.5 bg-white dark:bg-slate-700 text-slate-400 dark:text-slate-400 rounded border border-slate-200 dark:border-slate-700 dark:border-slate-600 mr-1">
                  Ctrl+K
                </kbd>
              </button>

              <button
                onClick={() => setIsQuickNewOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg text-xs font-bold transition-colors"
                title="إدخال جديد سريع (Ctrl+N)"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إدخال جديد</span>
                <kbd className="font-mono text-[10px] px-1 py-0.5 bg-white dark:bg-slate-700 text-blue-500 dark:text-blue-400 rounded border border-blue-200 dark:border-blue-800 mr-1">
                  Ctrl+N
                </kbd>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile search button */}
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="md:hidden p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="بحث سريع"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Mobile new action button */}
            <button
              onClick={() => setIsQuickNewOpen(true)}
              className="md:hidden p-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 rounded-lg"
              title="إدخال جديد"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title={theme === 'dark' ? 'التبديل للمظهر الفاتح (Ctrl+J)' : 'التبديل للمظهر الداكن (Ctrl+J)'}
              aria-label="تبديل المظهر"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Shortcuts Help Button */}
            <button
              type="button"
              onClick={() => setIsShortcutsHelpOpen(true)}
              className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors hidden sm:block"
              title="اختصارات لوحة المفاتيح (?)"
            >
              <Keyboard className="w-4 h-4" />
            </button>

            {/* User Profile & Signout */}
            <div className="flex items-center gap-2 mr-1">
              <button
                type="button"
                onClick={() => clerk.signOut()}
                title="تسجيل الخروج"
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors flex items-center gap-1 text-xs"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">خروج</span>
              </button>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 md:p-8 bg-slate-50 dark:bg-slate-900 dark:bg-slate-950 transition-colors duration-150">
          <div className="mx-auto max-w-7xl pb-12">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenNewModal={() => setIsQuickNewOpen(true)}
      />

      {/* Quick New Entry Modal (Ctrl+N) */}
      <QuickNewModal 
        isOpen={isQuickNewOpen}
        onClose={() => setIsQuickNewOpen(false)}
      />

      {/* Shortcuts Help Modal (?) */}
      <ShortcutsHelpModal 
        isOpen={isShortcutsHelpOpen}
        onClose={() => setIsShortcutsHelpOpen(false)}
      />
    </div>
  );
}
