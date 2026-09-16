import React, { useState, useEffect, ComponentType } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth, useClerk } from '@clerk/clerk-react';
import { CustomUserButton } from './CustomUserButton';
import { 
  Users, BookOpen, CreditCard, LayoutDashboard, Settings, 
  UserCheck, Calendar, FileText, Library, Wallet, 
  FileSpreadsheet, Globe, Package, 
  BarChart3, UserCog, MessageSquare, QrCode, LogOut,
  Search, Sun, Moon, Plus, Keyboard, RefreshCw, CheckCircle2, WifiOff, Menu, X, ArrowUpCircle, AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../context/ThemeContext';
import { useSubscription } from '../context/SubscriptionContext';
import { CommandPalette } from './CommandPalette';
import { QuickNewModal } from './QuickNewModal';
import { ShortcutsHelpModal } from './ShortcutsHelpModal';
import { useToast } from '../context/ToastContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { MasarLogo } from './MasarLogo';
import { getSyncState, triggerManualSync } from '../services/syncService';

// Base navigation groups (we will filter them inside the component)
const getNavigationGroups = (limits: any) => {
  return [
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
        { name: 'بطاقات وكروت QR', href: '/qrcards', icon: QrCode },
        { name: 'الكورسات', href: '/courses', icon: BookOpen },
        { name: 'المجموعات', href: '/groups', icon: Users },
        { name: 'الحضور والغياب', href: '/attendance', icon: UserCheck },
        { name: 'الجدول الزمني', href: '/schedule', icon: Calendar },
        { name: 'الاختبارات والواجبات', href: '/assessments', icon: FileText },
        { name: 'الكتب التعليمية', href: '/courseProducts', icon: Library },
      ]
    },
    {
      title: 'المالية',
      items: [
        { name: 'الاشتراكات الشهرية', href: '/payments', icon: CreditCard },
        { name: 'مدفوعات الحصص', href: '/sessionPayments', icon: Wallet },
        { name: 'السجلات المالية', href: '/ledgers', icon: FileSpreadsheet },
        { name: 'المستحقات', href: '/dues', icon: FileSpreadsheet },
        { name: 'الحجز الأونلاين', href: '/booking', icon: Globe },
      ]
    },
    ...(limits?.inventory_sales !== false ? [{
      title: 'المخزون',
      items: [
        { name: 'المنتجات والمبيعات', href: '/inventory', icon: Package },
      ]
    }] : []),
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
        { name: 'الإعدادات', href: '/settings', icon: Settings },
        { name: 'ترقية الباقة', href: '/upgrade', icon: ArrowUpCircle },
      ]
    }
  ];
};

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
  const [hideTrialBanner, setHideTrialBanner] = useState(false);
  const { subscription, isBlocked } = useSubscription();
  const navigationGroups = getNavigationGroups(subscription?.limits);

  const showNav = true;

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('تم استعادة الاتصال بالإنترنت!');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('أنت تعمل الآن في وضع عدم الاتصال بالإنترنت.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  // Sync state & outbox listener
  const pendingQueueCount = useLiveQuery(async () => {
    try {
      return await db.syncQueue.count();
    } catch {
      return 0;
    }
  }, []);

  const [syncState, setSyncState] = useState(getSyncState());
  useEffect(() => {
    const handleSyncChange = () => setSyncState(getSyncState());
    window.addEventListener('masar_sync_status_change', handleSyncChange);
    return () => window.removeEventListener('masar_sync_status_change', handleSyncChange);
  }, []);

  const handleManualSyncClick = async () => {
    if (!navigator.onLine) {
      toast.warning('الجهاز غير متصل بالإنترنت حالياً.');
      return;
    }
    toast.info('جاري مزامنة البيانات مع الخادم...');
    try {
      await triggerManualSync(getToken);
      toast.success('تمت المزامنة بنجاح!');
    } catch (e: any) {
      toast.error('فشلت المزامنة: ' + (e.message || 'خطأ غير معروف'));
    }
  };

  // Periodic automatic attendance session starter
  useEffect(() => {
    // Event listener for auto-started session notifications
    const handleAutoStart = (e: any) => {
      const detail = e.detail || {};
      toast.success(
        `بدأت الحصة تلقائياً: ${detail.groupName || ''} (${detail.courseName || ''}) لحلول موعد البدء (${detail.startTime || ''})`
      );
    };

    window.addEventListener('masar-session-auto-started', handleAutoStart);

    return () => {
      window.removeEventListener('masar-session-auto-started', handleAutoStart);
    };
  }, [toast]);



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
        {navigationGroups.map((group) => {
          // If blocked, only show groups that have 'upgrade' or 'settings' related items
          // or just filter the items inside
          const filteredItems = isBlocked 
            ? group.items.filter(item => item.href === '/upgrade' || item.href === '/settings')
            : group.items;

          if (filteredItems.length === 0) return null;

          return (
            <div key={group.title}>
              <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-3">
                {group.title}
              </h2>
              <div className="space-y-1">
                {filteredItems.map((item) => {
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
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
        <div className="flex flex-col text-xs flex-1 truncate">
          {!isOnline && (
            <div className="flex items-center space-x-2 space-x-reverse text-rose-500">
              <WifiOff className="w-3.5 h-3.5" />
              <span className="truncate">غير متصل</span>
            </div>
          )}
          {isOnline && (
            <div className="flex items-center space-x-2 space-x-reverse text-emerald-500">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="truncate">متصل</span>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex overflow-hidden font-cairo" dir="rtl">
      {/* Desktop Sidebar */}
      {showNav && (
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
      )}

      {/* Mobile Slide-over Drawer */}
      {showNav && isMobileMenuOpen && (
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
            {showNav && (
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="فتح القائمة الرئيسية"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            {/* Mobile logo or Blocked Logo */}
            <Link to="/" className={cn("flex items-center shrink-0", showNav && "md:hidden")}>
              <MasarLogo size="sm" showText={!showNav} />
            </Link>

            {/* Desktop Quick Search */}
            {showNav && (
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
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Sync Status Pill */}
            <button
              onClick={handleManualSyncClick}
              disabled={syncState.isSyncing}
              className={cn(
                "hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                syncState.breakerOpen || syncState.syncPillStatus === 'paused'
                  ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 hover:bg-rose-100 cursor-pointer"
                  : !isOnline
                  ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
                  : syncState.isSyncing || (pendingQueueCount || 0) > 0 || syncState.syncPillStatus === 'pending'
                  ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
              )}
              title={
                syncState.breakerOpen || syncState.syncPillStatus === 'paused'
                  ? 'المزامنة متوقفة مؤقتاً بعد عدة محاولات — انقر للمحاولة الآن'
                  : !isOnline
                  ? 'أنت تعمل محلياً دون اتصال'
                  : syncState.isSyncing
                  ? 'جاري مزامنة البيانات...'
                  : (pendingQueueCount || 0) > 0
                  ? `يوجد ${pendingQueueCount} تعديل محلي بانتظار المزامنة`
                  : 'جميع البيانات متزامنة ومحفوظة محلياً'
              }
            >
              {syncState.breakerOpen || syncState.syncPillStatus === 'paused' ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span>المزامنة متوقفة (انقر للإعادة)</span>
                </>
              ) : !isOnline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>غير متصل (محلي)</span>
                </>
              ) : syncState.isSyncing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600 dark:text-amber-400" />
                  <span>جاري المزامنة...</span>
                </>
              ) : (pendingQueueCount || 0) > 0 ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>بانتظار المزامنة ({pendingQueueCount})</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>متزامن</span>
                </>
              )}
            </button>

            {/* Mobile search button */}
            {showNav && (
              <button
                onClick={() => setIsCommandPaletteOpen(true)}
                className="md:hidden p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="بحث سريع"
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            {/* User Profile & Signout */}
            <div className="flex items-center gap-2 mr-1">
              <CustomUserButton />
            </div>
          </div>
        </header>
        
        {/* Trial Countdown Banner */}
        {!hideTrialBanner && subscription?.status === 'trialing' && (
          <div className={cn(
            "shrink-0 flex items-center justify-between px-4 py-2 border-b",
            subscription.days_remaining <= 3 
              ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"
              : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400"
          )}>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {subscription.days_remaining === 1
                  ? 'باقي يوم واحد فقط على انتهاء فترتك التجريبية'
                  : subscription.days_remaining === 2
                  ? 'باقي يومان فقط على انتهاء فترتك التجريبية'
                  : subscription.days_remaining <= 10
                  ? `باقي ${subscription.days_remaining} أيام فقط على انتهاء فترتك التجريبية`
                  : `باقي ${subscription.days_remaining} يوماً في فترتك التجريبية`}
              </span>
              <Link
                to="/upgrade"
                className={cn(
                  "text-xs font-bold px-3 py-1 rounded-full transition-colors",
                  subscription.days_remaining <= 3 
                    ? "bg-red-600 hover:bg-red-700 text-white" 
                    : "bg-amber-600 hover:bg-amber-700 text-white"
                )}
              >
                الترقية الآن
              </Link>
            </div>
            <button 
              onClick={() => setHideTrialBanner(true)}
              className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        
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
