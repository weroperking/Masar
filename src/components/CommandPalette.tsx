import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { 
  Search, Users, BookOpen, CreditCard, LayoutDashboard, Settings, 
  UserCheck, Calendar, FileText, Library, Wallet, 
  FileSpreadsheet, Globe, Package, BarChart3, UserCog, 
  MessageSquare, QrCode, Moon, Sun, Plus, ArrowRight, CornerDownLeft, Sparkles
} from 'lucide-react';

interface PaletteItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'صفحات' | 'طلاب' | 'كورسات' | 'منتجات' | 'إجراءات سريعة';
  icon: any;
  action: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onOpenNewModal
}: {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewModal: () => void;
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();

  const students = useLiveQuery(() => db.students.limit(100).toArray(), []);
  const courses = useLiveQuery(() => db.courses.toArray(), []);
  const products = useLiveQuery(() => db.products.toArray(), []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Static navigation routes
  const navigationItems: PaletteItem[] = [
    { id: 'nav-dash', title: 'لوحة التحكم', subtitle: 'الإحصائيات ونشاط السنتر', category: 'صفحات', icon: LayoutDashboard, action: () => navigate('/') },
    { id: 'nav-students', title: 'إدارة الطلاب', subtitle: 'بيانات الطلاب والتسجيل', category: 'صفحات', icon: Users, action: () => navigate('/students') },
    { id: 'nav-courses', title: 'الكورسات التعليمية', subtitle: 'إدارة المواد والمناهج', category: 'صفحات', icon: BookOpen, action: () => navigate('/courses') },
    { id: 'nav-groups', title: 'المجموعات الدراسية', subtitle: 'توزيع المجموعات والمواعيد', category: 'صفحات', icon: Users, action: () => navigate('/groups') },
    { id: 'nav-attendance', title: 'الحضور والغياب', subtitle: 'تسجيل الحضور بالباركود', category: 'صفحات', icon: UserCheck, action: () => navigate('/attendance') },
    { id: 'nav-schedule', title: 'الجدول الزمني', subtitle: 'المواعيد الأسبوعية واليومية', category: 'صفحات', icon: Calendar, action: () => navigate('/schedule') },
    { id: 'nav-assessments', title: 'الاختبارات والواجبات', subtitle: 'الامتحانات ورصد الدرجات', category: 'صفحات', icon: FileText, action: () => navigate('/assessments') },
    { id: 'nav-course-products', title: 'الكتب التعليمية للكورسات', subtitle: 'ربط المذكرات بالمواد', category: 'صفحات', icon: Library, action: () => navigate('/course-products') },
    { id: 'nav-payments', title: 'الاشتراكات الشهرية', subtitle: 'متابعة الدفع الشهري', category: 'صفحات', icon: CreditCard, action: () => navigate('/payments') },
    { id: 'nav-session-payments', title: 'مدفوعات الحصص', subtitle: 'تحصيل الحصص الفردية', category: 'صفحات', icon: Wallet, action: () => navigate('/session-payments') },
    { id: 'nav-ledgers', title: 'السجلات المالية', subtitle: 'الدفتر العام والإيرادات والمصروفات', category: 'صفحات', icon: FileSpreadsheet, action: () => navigate('/ledgers') },
    { id: 'nav-dues', title: 'المستحقات والمتأخرات', subtitle: 'المطالبات المالية وتنبيهات واتساب', category: 'صفحات', icon: FileSpreadsheet, action: () => navigate('/dues') },
    { id: 'nav-booking', title: 'الحجز الأونلاين (Leads)', subtitle: 'طلبات الانضمام عبر الرابط', category: 'صفحات', icon: Globe, action: () => navigate('/booking') },
    { id: 'nav-inventory', title: 'المخزون والمبيعات', subtitle: 'بيع المذكرات وجرد الأصناف', category: 'صفحات', icon: Package, action: () => navigate('/inventory') },
    { id: 'nav-reports', title: 'التقارير والتحليلات', subtitle: 'تصدير التقارير ومؤشرات الأداء', category: 'صفحات', icon: BarChart3, action: () => navigate('/reports') },
    { id: 'nav-users', title: 'المستخدمين والصلاحيات', subtitle: 'إدارة طاقم العمل', category: 'صفحات', icon: UserCog, action: () => navigate('/users') },
    { id: 'nav-messaging', title: 'المراسلات الجماعية', subtitle: 'إرسال رسائل وتنبيهات', category: 'صفحات', icon: MessageSquare, action: () => navigate('/messaging') },
    { id: 'nav-settings', title: 'الإعدادات العامة', subtitle: 'تخصيص السنتر والعملة', category: 'صفحات', icon: Settings, action: () => navigate('/settings') },
    { id: 'nav-qrcards', title: 'بطاقات QR للطلاب', subtitle: 'طباعة كروت الباركود', category: 'صفحات', icon: QrCode, action: () => navigate('/qrcards') },
  ];

  // Quick actions
  const actionItems: PaletteItem[] = [
    {
      id: 'act-new-entry',
      title: 'إدخال جديد (Ctrl+N)',
      subtitle: 'فتح قائمة الإضافة السريعة',
      category: 'إجراءات سريعة',
      icon: Plus,
      action: () => {
        onClose();
        onOpenNewModal();
      }
    },
    {
      id: 'act-toggle-theme',
      title: theme === 'dark' ? 'التحويل للمظهر الفاتح' : 'التحويل للمظهر الداكن',
      subtitle: `الوضع الحالي: ${theme === 'dark' ? 'داكن' : 'فاتح'}`,
      category: 'إجراءات سريعة',
      icon: theme === 'dark' ? Sun : Moon,
      action: () => {
        toggleTheme();
        toast.info(theme === 'dark' ? 'تم التبديل إلى الوضع الفاتح' : 'تم التبديل إلى الوضع الداكن');
      }
    },
    {
      id: 'act-new-student',
      title: 'إضافة طالب جديد',
      subtitle: 'الانتقال لصفحة الطلاب وفتح نموذج التسجيل',
      category: 'إجراءات سريعة',
      icon: Users,
      action: () => {
        navigate('/students');
      }
    },
    {
      id: 'act-new-ledger',
      title: 'تسجيل حركة مالية (إيراد / مصروف)',
      subtitle: 'إضافة قيد للدفتر العام',
      category: 'إجراءات سريعة',
      icon: FileSpreadsheet,
      action: () => {
        navigate('/ledgers');
      }
    }
  ];

  // Map students to items
  const studentItems: PaletteItem[] = (students || []).map(s => ({
    id: `student-${s.id}`,
    title: s.name,
    subtitle: `هاتف: ${s.phone} | ولي الأمر: ${s.parentName || '-'}`,
    category: 'طلاب',
    icon: Users,
    action: () => {
      navigate('/students');
      toast.info(`تم العثور على الطالب: ${s.name}`);
    }
  }));

  // Map courses to items
  const courseItems: PaletteItem[] = (courses || []).map(c => ({
    id: `course-${c.id}`,
    title: c.name,
    subtitle: `السعر: ${c.price} ج.م | النظام: ${c.paymentType === 'monthly' ? 'شهري' : 'باقة'}`,
    category: 'كورسات',
    icon: BookOpen,
    action: () => {
      navigate('/courses');
    }
  }));

  // Map products to items
  const productItems: PaletteItem[] = (products || []).map(p => ({
    id: `product-${p.id}`,
    title: p.name,
    subtitle: `سعر البيع: ${p.salePrice} ج.م | الرصيد: ${p.stockQty} نسخة`,
    category: 'منتجات',
    icon: Package,
    action: () => {
      navigate('/inventory');
    }
  }));

  const allItems: PaletteItem[] = [
    ...actionItems,
    ...navigationItems,
    ...studentItems,
    ...courseItems,
    ...productItems
  ];

  const filteredItems = query.trim() === ''
    ? [...actionItems, ...navigationItems]
    : allItems.filter(item => 
        item.title.toLowerCase().includes(query.toLowerCase()) || 
        (item.subtitle && item.subtitle.toLowerCase().includes(query.toLowerCase()))
      );

  // Keyboard navigation inside palette
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev < filteredItems.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredItems.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  // Keep active item scrolled into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/60 backdrop-blur-xs transition-opacity" dir="rtl">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Search header */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 gap-3">
          <Search className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="ابحث عن صفحة، طالب، كورس، مذكرة، أو أمر سريع في مسار..."
            className="flex-1 bg-transparent border-none text-slate-900 dark:text-slate-100 text-sm font-medium focus:outline-none placeholder-slate-400 dark:placeholder-slate-500"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 rounded border border-slate-200 dark:border-slate-700 dark:border-slate-700">
            Esc للإغلاق
          </kbd>
        </div>

        {/* Results list */}
        <div ref={listRef} className="overflow-y-auto p-2 space-y-1 flex-1 scrollbar-thin">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
              لم يتم العثور على نتائج تطابق "{query}"
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              const Icon = item.icon;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200' 
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-900 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${
                      isSelected 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="font-bold text-sm truncate">{item.title}</div>
                      {item.subtitle && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      {item.category}
                    </span>
                    {isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded text-[10px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded text-[10px]">↓</kbd>
              للتنقل
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded text-[10px]">↵</kbd>
              للاختيار
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            منظومة مسار السريعة
          </div>
        </div>
      </div>
    </div>
  );
}
