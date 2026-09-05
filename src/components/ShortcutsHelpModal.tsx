import { X, Keyboard } from 'lucide-react';

export function ShortcutsHelpModal({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Ctrl + K  أو  ⌘K', desc: 'فتح شريط البحث والأوامر السريعة (Command Palette)' },
    { key: 'Ctrl + N  أو  ⌘N', desc: 'إدخال جديد سريع (طالب، اشتراك، حركة مالية، بيع...)' },
    { key: 'Ctrl + J  أو  ⌘J', desc: 'التبديل الفوري بين المظهر الداكن والفاتح (Dark / Light)' },
    { key: '؟  أو  Ctrl + /', desc: 'فتح هذه النافذة الإرشادية لاختصارات لوحة المفاتيح' },
    { key: 'Esc', desc: 'إغلاق أي نافذة منبثقة أو إلغاء البحث' },
    { key: '↑  /  ↓  ثم  Enter', desc: 'التنقل بين نتائج البحث واختيار العنصر مباشرة' },
    { key: '1 - 6', desc: 'اختيار بند سريع عند فتح نافذة الإدخال الجديد (Ctrl+N)' },
  ];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" dir="rtl">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">اختصارات لوحة المفاتيح</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">سرعة وإنتاجية مضاعفة لإدارة سنتر مسار</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {shortcuts.map((sc, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/60 last:border-0">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{sc.desc}</span>
              <kbd className="px-2.5 py-1 text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-700 dark:border-slate-700 shadow-2xs whitespace-nowrap">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-900 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 text-center">
          <button
            onClick={onClose}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors"
          >
            حسناً، فهمت
          </button>
        </div>
      </div>
    </div>
  );
}
