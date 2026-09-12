import React, { useState, useEffect, ComponentType } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth, useClerk } from '@clerk/clerk-react';
import { CustomUserButton } from './CustomUserButton';
import { 
  Users, BookOpen, CreditCard, LayoutDashboard, Settings, 
  UserCheck, Calendar, FileText, Library, Wallet, 
  FileSpreadsheet, Globe, Package, 
  BarChart3, UserCog, MessageSquare, QrCode, LogOut,
  Search, Sun, Moon, Plus, Keyboard, RefreshCw, CheckCircle2, WifiOff, Menu, X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { syncService, TABLES } from '../services/syncService';
import { useTheme } from '../context/ThemeContext';
import { CommandPalette } from './CommandPalette';
import { QuickNewModal } from './QuickNewModal';
import { ShortcutsHelpModal } from './ShortcutsHelpModal';
import { useToast } from '../context/ToastContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { MasarLogo } from './MasarLogo';

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

interface SidebarNavItemProps {
  item: {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  };
  isActive: boolean;
  onItemClick?: () => void;
}

const SidebarNavItem: React.FC<SidebarNavItemProps> = ({ item, isActive, onItemClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const Icon = item.icon;

  return (
    <Link
      to={item.href}
      onClick={onItemClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        isActive
          ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/70 dark:text-blue-400 font-bold shadow-xs'
          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80',
        'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150 relative active:scale-[0.98]'
      )}
    >
      <div className="ml-3 shrink-0 h-5 w-5 flex items-center justify-center relative overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          {isActive || isHovered ? (
            <motion.div
              key="drawing"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 flex items-center justify-center text-blue-600 dark:text-blue-400 animate-draw"
            >
              <Icon className="h-5 w-5" />
            </motion.div>
          ) : (
            <motion.div
              key="static"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex items-center justify-center text-slate-400 dark:text-slate-500"
            >
              <Icon className="h-5 w-5" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <span className="truncate">{item.name}</span>
      {isActive && (
        <div className="absolute right-0 top-2 bottom-2 w-1 bg-blue-600 dark:bg-blue-400 rounded-l-full" />
      )}
    </Link>
  );
};

export function Layout() {
  const location = useLocation();
  const { getToken } = useAuth();
  const clerk = useClerk();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isQuickNewOpen, setIsQuickNewOpen] = useState(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Auto-sync when going online
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('تم استعادة الاتصال بالإنترنت! جاري مزامنة البيانات...');
      syncService.syncPendingData(getToken).catch(err => {
        console.error('Auto sync failed:', err);
      });
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('أنت تعمل الآن في وضع عدم الاتصال بالإنترنت. سيتم حفظ التغييرات محلياً.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen to sync events
    const handleSyncStart = () => setIsSyncing(true);
    const handleSyncEnd = () => setIsSyncing(false);

    window.addEventListener('sync-start', handleSyncStart);
    window.addEventListener('sync-end', handleSyncEnd);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sync-start', handleSyncStart);
      window.removeEventListener('sync-end', handleSyncEnd);
    };
  }, [toast]);

  // Get total pending sync counts reactively
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

  const renderNavContent = (onItemClick?: () => void) => (
    <>
      <nav className="flex-1 px-4 py-4 overflow-y-auto space-y-6 scrollbar-thin">
        {navigationGroups.map((group) => (
          <div key={group.title}>
            <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-3">
              {group.title}
            </h2>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive =
                  location.pathname === item.href ||
                  (item.href !== '/' && location.pathname.startsWith(item.href));
                return (
                  <SidebarNavItem
                    key={item.name}
                    item={item}
                    isActive={isActive}
                    onItemClick={onItemClick}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
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
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 dark:bg-slate-950 flex transition-colors duration-150 animate-fade-in">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 flex flex-col hidden md:flex shrink-0">
        <div className="py-5 px-6 flex flex-col items-center justify-center border-b border-slate-200 dark:border-slate-700 shrink-0 gap-2">
          <Link to="/" className="flex flex-col items-center gap-1.5 group">
            <MasarLogo size="md" className="transition-transform duration-300 group-hover:scale-105" />
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 tracking-tight animate-slogan-glow text-center select-none">
              مسار — حصصك من غير دوشة
            </span>
          </Link>
        </div>

        {renderNavContent()}
      </aside>

      {/* Mobile Slide-over Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200"
          />

          {/* Drawer Content */}
          <aside className="relative mr-auto w-72 max-w-[80vw] h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 flex flex-col z-10 shadow-2xl transition-transform duration-200">
            <div className="py-4 px-6 border-b border-slate-200 dark:border-slate-700 flex flex-col items-center relative shrink-0">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="absolute left-4 top-4 p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="إغلاق القائمة"
              >
                <X className="w-5 h-5" />
              </button>
              <Link to="/" className="flex flex-col items-center gap-1 mt-2 group">
                <MasarLogo size="sm" className="transition-transform duration-300 group-hover:scale-105" />
                <span className="text-[10px] font-bold text-slate-900 dark:text-slate-100 tracking-tight animate-slogan-glow text-center select-none">
                  مسار — حصصك من غير دوشة
                </span>
              </Link>
            </div>

            {renderNavContent(() => setIsMobileMenuOpen(false))}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header Bar (Desktop & Mobile) */}
        <header className="bg-white dark:bg-slate-900 h-16 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 md:px-8 shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="فتح القائمة الرئيسية"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile logo */}
            <Link to="/" className="md:hidden flex items-center shrink-0">
              <MasarLogo size="sm" />
            </Link>

            {/* Desktop Quick Search */}
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
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile search button */}
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="md:hidden p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="بحث سريع"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* User Profile & Signout */}
            <div className="flex items-center gap-2 mr-1">
              <CustomUserButton />
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 md:p-6 bg-slate-50 dark:bg-slate-950 transition-colors duration-150">
          <div className="mx-auto w-full h-full min-h-full pb-12">
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
