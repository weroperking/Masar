import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { FileSpreadsheet, Plus, Trash2, ArrowUpRight, ArrowDownLeft, Search, X, Edit2, Wallet } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { LedgerEntry } from '../../types';
import { toMajorUnits, toMinorUnits } from '../../utils/currency';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

export function Ledgers() {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [filterType, setFilterType] = useState<'all' | 'revenue' | 'expense'>('all');
  const [modalType, setModalType] = useState<'revenue' | 'expense' | null>(null);
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const entries = useLiveQuery(() => {
    return db.ledgerEntries.filter(e => {
      if (e.deleted_at) return false;
      if (filterType !== 'all' && e.type !== filterType) return false;
      return true;
    }).reverse().sortBy('date');
  }, [filterType]);

  const allEntries = useLiveQuery(() => db.ledgerEntries.filter(e => !e.deleted_at).toArray(), []);

  const totalRevenue = allEntries
    ?.filter(e => e.type === 'revenue' || e.type === 'income')
    .reduce((acc, e) => acc + (e.amount || 0), 0) || 0;

  const totalExpense = allEntries
    ?.filter(e => e.type === 'expense')
    .reduce((acc, e) => acc + (e.amount || 0), 0) || 0;

  const netBalance = totalRevenue - totalExpense;

  const filteredEntries = entries?.filter(e => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (e.description && e.description.toLowerCase().includes(term)) ||
      (e.category && e.category.toLowerCase().includes(term))
    );
  });

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: 'حذف القيد المالي',
      message: 'هل أنت متأكد من حذف هذا القيد المالي من دفتر الأستاذ العام؟',
      description: 'سيتم نقل القيد لسلة المهملات وإعادة احتساب الأرصدة تلقائياً.',
      confirmText: 'نعم، احذف القيد',
      cancelText: 'إلغاء',
      variant: 'danger',
    });

    if (isConfirmed) {
      await db.ledgerEntries.update(id, {
        deleted_at: Date.now(),
        updated_at: Date.now(),
        sync_status: 'pending'
      });
      toast.success('تم حذف القيد المالي بنجاح');
    }
  };

  const handleEdit = (entry: LedgerEntry) => {
    setEditingEntry(entry);
    setModalType(entry.type === 'revenue' || entry.type === 'income' ? 'revenue' : 'expense');
  };

  const handleCloseModal = () => {
    setModalType(null);
    setEditingEntry(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">دفتر اليومية (الخزينة)</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">تسجيل الإيرادات والمصروفات وحركة النقدية</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setModalType('expense')}
            className="flex items-center px-3 py-1.5 bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-xs font-bold border border-red-200 dark:border-red-900/40"
          >
            <ArrowDownLeft className="w-3.5 h-3.5 ml-1" />
            صرف نقدية
          </button>
          <button 
            onClick={() => setModalType('revenue')}
            className="flex items-center px-3 py-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-xs font-bold shadow-xs"
          >
            <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
            توريد نقدية
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">إجمالي الإيرادات</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">{toMajorUnits(totalRevenue).toLocaleString()} ج.م</p>
          </div>
          <div className="p-2.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">إجمالي المصروفات</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1 font-mono">{toMajorUnits(totalExpense).toLocaleString()} ج.م</p>
          </div>
          <div className="p-2.5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">صافي الخزينة</p>
            <p className={`text-xl font-bold mt-1 font-mono ${netBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {toMajorUnits(netBalance).toLocaleString()} ج.م
            </p>
          </div>
          <div className="p-2.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md w-full sm:w-auto">
            <button 
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors flex-1 sm:flex-none ${
                filterType === 'all' 
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              الكل
            </button>
            <button 
              onClick={() => setFilterType('revenue')}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors flex-1 sm:flex-none ${
                filterType === 'revenue' 
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              الإيرادات
            </button>
            <button 
              onClick={() => setFilterType('expense')}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors flex-1 sm:flex-none ${
                filterType === 'expense' 
                  ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              المصروفات
            </button>
          </div>
          <div className="relative w-full sm:w-64">
            <input 
              type="text"
              placeholder="بحث في البيان أو التصنيف..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-3 pr-8 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-400 dark:placeholder-slate-500"
            />
            <Search className="absolute right-2.5 top-2 text-slate-400 w-3.5 h-3.5" />
          </div>
        </div>

        <div className="p-5">
          {filteredEntries?.length === 0 ? (
            <div className="text-center py-12">
              <FileSpreadsheet className="w-8 h-8 text-slate-400 opacity-40 mx-auto mb-2" />
              <p className="text-slate-500 text-xs">لا توجد حركات مالية مسجلة في هذا القسم</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">النوع</th>
                    <th className="px-4 py-2.5 font-semibold">التصنيف</th>
                    <th className="px-4 py-2.5 font-semibold">البيان / الوصف</th>
                    <th className="px-4 py-2.5 font-semibold">التاريخ</th>
                    <th className="px-4 py-2.5 font-semibold">المبلغ</th>
                    <th className="px-4 py-2.5 font-semibold">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredEntries?.map(entry => {
                    const isRev = entry.type === 'revenue' || entry.type === 'income';
                    return (
                      <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            isRev 
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                              : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                          }`}>
                            {isRev ? '+ إيراد' : '- مصروف'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{entry.category || 'عام'}</td>
                        <td className="px-4 py-3 text-slate-900 dark:text-slate-100 font-semibold">{entry.description}</td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">{entry.date}</td>
                        <td className="px-4 py-3 font-bold font-mono">
                          <span className={isRev ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                            {isRev ? '+' : '-'}{toMajorUnits(entry.amount).toLocaleString()} ج.م
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEdit(entry)}
                              className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors"
                              title="تعديل القيد"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
                              title="حذف القيد"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modalType && (
        <LedgerModal 
          type={modalType} 
          initialData={editingEntry}
          onClose={handleCloseModal} 
        />
      )}
    </div>
  );
}

function LedgerModal({ 
  type, 
  initialData,
  onClose 
}: { 
  type: 'revenue' | 'expense'; 
  initialData?: LedgerEntry | null;
  onClose: () => void; 
}) {
  const revenueCategories = ['اشتراكات شهرية', 'رسوم حصص', 'مبيعات كتب وملازم', 'حجوزات', 'إيرادات أخرى'];
  const expenseCategories = ['إيجار السنتر', 'رواتب معلمين', 'رواتب موظفين', 'أدوات ومطبوعات', 'فواتير كهرباء ومياه', 'صيانة', 'ضيافة', 'مصروفات أخرى'];
  const categories = type === 'revenue' ? revenueCategories : expenseCategories;

  const [formData, setFormData] = useState({
    amount: initialData ? toMajorUnits(initialData.amount).toString() : '',
    category: initialData?.category || categories[0],
    description: initialData?.description || '',
    date: initialData?.date || new Date().toISOString().split('T')[0]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const now = Date.now();
    
    if (initialData) {
      await db.ledgerEntries.update(initialData.id, {
        category: formData.category,
        amount: toMinorUnits(Number(formData.amount)),
        description: formData.description,
        date: formData.date,
        updated_at: now,
        sync_status: 'pending'
      });
    } else {
      const entry: LedgerEntry = {
        id: uuidv4(),
        type,
        category: formData.category,
        amount: toMinorUnits(Number(formData.amount)),
        description: formData.description,
        date: formData.date,
        relatedType: 'manual',
        created_at: now,
        updated_at: now,
        sync_status: 'pending'
      };
      await db.ledgerEntries.add(entry);
    }
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {initialData ? 'تعديل القيد' : (type === 'revenue' ? 'تسجيل إيراد جديد' : 'تسجيل مصروف جديد')}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">المبلغ (ج.م) *</label>
            <input 
              required
              type="number"
              min="1"
              placeholder="0.00"
              className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={formData.amount}
              onChange={e => setFormData({ ...formData, amount: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">التصنيف *</label>
            <select
              className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value })}
            >
              {!categories.includes(formData.category) && formData.category && (
                <option value={formData.category}>{formData.category}</option>
              )}
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">البيان / الوصف *</label>
            <input 
              required
              type="text"
              placeholder="تفاصيل الحركة..."
              className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">التاريخ</label>
            <input 
              type="date"
              className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
            />
          </div>

          <div className="mt-4 flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-3 py-1.5 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium transition-colors"
            >
              إلغاء
            </button>
            <button 
              type="submit" 
              className={`px-4 py-1.5 text-white rounded-md text-xs font-bold transition-colors shadow-xs ${
                type === 'revenue' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {initialData ? 'حفظ التعديلات' : (type === 'revenue' ? 'حفظ الإيراد' : 'حفظ المصروف')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
