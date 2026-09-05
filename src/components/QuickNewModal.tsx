import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, CreditCard, Wallet, FileSpreadsheet, 
  ShoppingCart, FileText, X, PlusCircle 
} from 'lucide-react';

interface QuickOption {
  num: string;
  title: string;
  desc: string;
  icon: any;
  action: () => void;
  color: string;
}

export function QuickNewModal({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();

  const options: QuickOption[] = [
    {
      num: '1',
      title: 'إضافة طالب جديد',
      desc: 'تسجيل طالب وبيانات ولي الأمر في قاعدة البيانات',
      icon: Users,
      color: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400',
      action: () => {
        navigate('/students');
        onClose();
      }
    },
    {
      num: '2',
      title: 'تحصيل اشتراك شهري',
      desc: 'تسجيل سداد اشتراك كورس شهري لطالب',
      icon: CreditCard,
      color: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
      action: () => {
        navigate('/payments');
        onClose();
      }
    },
    {
      num: '3',
      title: 'تحصيل رسوم حصة أو باقة',
      desc: 'تسديد رسوم حصص اليوم مباشرة في الخزينة',
      icon: Wallet,
      color: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400',
      action: () => {
        navigate('/session-payments');
        onClose();
      }
    },
    {
      num: '4',
      title: 'تسجيل إيراد أو مصروف',
      desc: 'إضافة حركة جديدة في الدفتر العام وسجلات السنتر',
      icon: FileSpreadsheet,
      color: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
      action: () => {
        navigate('/ledgers');
        onClose();
      }
    },
    {
      num: '5',
      title: 'بيع مذكرة أو كتاب',
      desc: 'تسجيل بيع من المخزن مع خصم الكمية وإثبات الإيراد',
      icon: ShoppingCart,
      color: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400',
      action: () => {
        navigate('/inventory');
        onClose();
      }
    },
    {
      num: '6',
      title: 'إنشاء اختبار أو واجب',
      desc: 'إعداد امتحان جديد ورصد درجات الطلاب',
      icon: FileText,
      color: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400',
      action: () => {
        navigate('/assessments');
        onClose();
      }
    },
  ];

  // Number key shortcuts 1-6 when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      const match = options.find(opt => opt.num === e.key);
      if (match) {
        e.preventDefault();
        match.action();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" dir="rtl">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">إدخال جديد (اختصار سريع Ctrl+N)</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">اضغط على رقم الخيار من لوحة المفاتيح (1 - 6) أو انقر عليه</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {options.map(opt => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.num}
                onClick={opt.action}
                className="flex items-start p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-900 dark:hover:bg-slate-800/50 transition-all text-right group"
              >
                <div className={`p-2.5 rounded-lg shrink-0 ${opt.color} ml-3`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {opt.title}
                    </span>
                    <kbd className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 dark:border-slate-700">
                      {opt.num}
                    </kbd>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                    {opt.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-900 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 px-5">
          <span>يمكنك الضغط على <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border rounded text-[10px]">Esc</kbd> للإلغاء</span>
          <button 
            onClick={onClose}
            className="text-blue-600 dark:text-blue-400 hover:underline font-semibold text-xs"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
