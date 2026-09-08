import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { FileSpreadsheet, Plus, Trash2, ArrowUpRight, ArrowDownLeft, Search, X, Edit2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { LedgerEntry } from '../../types';
import { toMajorUnits, toMinorUnits } from '../../utils/currency';

export function Ledgers() {
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
    if (confirm('هل أنت متأكد من حذف هذا القيد؟')) {
      await db.ledgerEntries.update(id, {
        deleted_at: Date.now(),
        updated_at: Date.now(),
        sync_status: 'pending'
      });
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">دفتر اليومية (الخزينة)</h1>
          <p className="text-sm text-slate-500 mt-0.5">تسجيل الإيرادات والمصروفات وحركة النقدية</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setModalType('expense')}
            className="flex items-center px-4 py-2 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors text-sm font-semibold shadow-sm border border-red-200 dark:border-red-800"
          >
            <ArrowDownLeft className="w-4 h-4 ml-1.5" />
            صرف نقدية
          </button>
          <button 
            onClick={() => setModalType('revenue')}
            className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-semibold shadow-sm"
          >
            <ArrowUpRight className="w-4 h-4 ml-1.5" />
            توريد نقدية
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">إجمالي الإيرادات</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{toMajorUnits(totalRevenue).toLocaleString()} ج.م</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
            <ArrowUpRight className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">إجمالي المصروفات</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{toMajorUnits(totalExpense).toLocaleString()} ج.م</p>
          </div>
          <div className="w-12 h-12 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <ArrowDownLeft className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
        </div>
        <div className="bg-slate-900 dark:bg-slate-50 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">صافي الخزينة</p>
            <p className="text-2xl font-bold text-white dark:text-slate-900 mt-1">{toMajorUnits(netBalance).toLocaleString()} ج.م</p>
          </div>
          <div className="w-12 h-12 bg-slate-800 dark:bg-slate-200 rounded-full flex items-center justify-center">
            <Wallet className="w-6 h-6 text-slate-300 dark:text-slate-600" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-1 sm:flex-none ${
                filterType === 'all' 
                  ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              الكل
            </button>
            <button 
              onClick={() => setFilterType('revenue')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-1 sm:flex-none ${
                filterType === 'revenue' 
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              الإيرادات
            </button>
            <button 
              onClick={() => setFilterType('expense')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-1 sm:flex-none ${
                filterType === 'expense' 
                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
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
              className="w-full pl-3 pr-9 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute right-3 top-2 text-slate-400 w-3.5 h-3.5" />
          </div>
        </div>

        <div className="p-6">
          {filteredEntries?.length === 0 ? (
            <div className="text-center py-16">
              <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-sm">لا توجد حركات مالية مسجلة في هذا القسم</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium rounded-r-lg">النوع</th>
                    <th className="px-4 py-3 font-medium">التصنيف</th>
                    <th className="px-4 py-3 font-medium">البيان / الوصف</th>
                    <th className="px-4 py-3 font-medium">التاريخ</th>
                    <th className="px-4 py-3 font-medium">المبلغ</th>
                    <th className="px-4 py-3 font-medium rounded-l-lg">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredEntries?.map(entry => {
                    const isRev = entry.type === 'revenue' || entry.type === 'income';
                    return (
                      <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-900 transition-colors">
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                            isRev ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {isRev ? '+ إيراد' : '- مصروف'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{entry.category || 'عام'}</td>
                        <td className="px-4 py-3 text-slate-900 dark:text-slate-100 font-bold">{entry.description}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{entry.date}</td>
                        <td className="px-4 py-3 font-bold text-base">
                          <span className={isRev ? 'text-emerald-600' : 'text-red-600'}>
                            {isRev ? '+' : '-'}{toMajorUnits(entry.amount).toLocaleString()} ج.م
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEdit(entry)}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                              title="تعديل القيد"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                              title="حذف القيد"
                            >
                              <Trash2 className="w-4 h-4" />
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {initialData ? 'تعديل القيد' : (type === 'revenue' ? 'تسجيل إيراد جديد' : 'تسجيل مصروف جديد')}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المبلغ (ج.م) *</label>
            <input 
              required
              type="number"
              min="1"
              placeholder="0.00"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              value={formData.amount}
              onChange={e => setFormData({ ...formData, amount: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">التصنيف *</label>
            <select
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">البيان / الوصف *</label>
            <input 
              required
              type="text"
              placeholder="تفاصيل الحركة..."
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">التاريخ</label>
            <input 
              type="date"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
            />
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 text-sm">
              إلغاء
            </button>
            <button 
              type="submit" 
              className={`px-5 py-2 text-white rounded-lg text-sm font-semibold ${
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

function Wallet({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a8 8 0 0 1-5-2.7 5.94 5.94 0 0 1-1-.1"></path>
      <path d="M10 20.73A8 8 0 0 1 3 13V9a2 2 0 0 1 2-2h10"></path>
    </svg>
  );
}
