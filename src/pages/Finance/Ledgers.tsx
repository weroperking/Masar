import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { FileSpreadsheet, Plus, Trash2, ArrowUpRight, ArrowDownLeft, Search, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { LedgerEntry } from '../../types';

export function Ledgers() {
  const [modalType, setModalType] = useState<'revenue' | 'expense' | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'revenue' | 'expense'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const entries = useLiveQuery(() => {
    if (filterType === 'all') return db.ledgerEntries.reverse().sortBy('date');
    return db.ledgerEntries.where('type').equals(filterType).reverse().sortBy('date');
  }, [filterType]);

  const allEntries = useLiveQuery(() => db.ledgerEntries.toArray(), []);

  const totalRevenue = allEntries
    ?.filter(e => e.type === 'revenue')
    .reduce((acc, e) => acc + (e.amount || 0), 0) || 0;

  const totalExpense = allEntries
    ?.filter(e => e.type === 'expense')
    .reduce((acc, e) => acc + (e.amount || 0), 0) || 0;

  const netBalance = totalRevenue - totalExpense;

  const filteredEntries = entries?.filter(e => 
    e.description.includes(searchTerm) || (e.category && e.category.includes(searchTerm))
  );

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه الحركة المالية؟')) {
      await db.ledgerEntries.delete(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">السجلات المالية (الدفتر العام)</h1>
          <p className="text-sm text-slate-500 mt-0.5">تسجيل ومتابعة جميع الإيرادات والمصروفات اليومية للسنتر</p>
        </div>
        <div className="flex gap-2.5">
          <button 
            onClick={() => setModalType('revenue')}
            className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4 ml-1.5" />
            إيراد جديد
          </button>
          <button 
            onClick={() => setModalType('expense')}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4 ml-1.5" />
            مصروف جديد
          </button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">إجمالي الإيرادات</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-emerald-600">{totalRevenue.toLocaleString()}</span>
              <span className="text-slate-500 text-sm">ج.م</span>
            </div>
          </div>
          <div className="flex items-start justify-center">
            <ArrowUpRight className="w-8 h-8 text-emerald-500 opacity-80" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">إجمالي المصروفات</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-red-600">{totalExpense.toLocaleString()}</span>
              <span className="text-slate-500 text-sm">ج.م</span>
            </div>
          </div>
          <div className="flex items-start justify-center">
            <ArrowDownLeft className="w-8 h-8 text-red-500 opacity-80" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">صافي الرصيد الحالي</p>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${netBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {netBalance.toLocaleString()}
              </span>
              <span className="text-slate-500 text-sm">ج.م</span>
            </div>
          </div>
          <div className="flex items-start justify-center">
            <FileSpreadsheet className="w-8 h-8 text-blue-500 opacity-80" />
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                filterType === 'all' ? 'bg-white text-slate-900 dark:text-slate-100 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الكل ({allEntries?.length || 0})
            </button>
            <button
              onClick={() => setFilterType('revenue')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                filterType === 'revenue' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الإيرادات
            </button>
            <button
              onClick={() => setFilterType('expense')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                filterType === 'expense' ? 'bg-white text-red-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
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
              className="w-full pl-4 pr-9 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <tbody className="divide-y divide-slate-100">
                  {filteredEntries?.map(entry => (
                    <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-900 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                          entry.type === 'revenue' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {entry.type === 'revenue' ? '+ إيراد' : '- مصروف'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{entry.category || 'عام'}</td>
                      <td className="px-4 py-3 text-slate-900 dark:text-slate-100 font-bold">{entry.description}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{entry.date}</td>
                      <td className="px-4 py-3 font-bold text-base">
                        <span className={entry.type === 'revenue' ? 'text-emerald-600' : 'text-red-600'}>
                          {entry.type === 'revenue' ? '+' : '-'}{entry.amount.toLocaleString()} ج.م
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                          title="حذف القيد"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modalType && (
        <LedgerModal 
          type={modalType} 
          onClose={() => setModalType(null)} 
        />
      )}
    </div>
  );
}

function LedgerModal({ 
  type, 
  onClose 
}: { 
  type: 'revenue' | 'expense'; 
  onClose: () => void; 
}) {
  const revenueCategories = ['اشتراكات شهرية', 'رسوم حصص', 'مبيعات كتب وملازم', 'حجوزات', 'إيرادات أخرى'];
  const expenseCategories = ['إيجار السنتر', 'رواتب معلمين', 'رواتب موظفين', 'أدوات ومطبوعات', 'فواتير كهرباء ومياه', 'صيانة', 'ضيافة', 'مصروفات أخرى'];

  const categories = type === 'revenue' ? revenueCategories : expenseCategories;

  const [formData, setFormData] = useState({
    amount: '',
    category: categories[0],
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const now = Date.now();
    const entry: LedgerEntry = {
      id: uuidv4(),
      type,
      category: formData.category,
      amount: Number(formData.amount),
      description: formData.description,
      date: formData.date,
      relatedType: 'manual',
      created_at: now,
      updated_at: now,
      sync_status: 'pending'
    };

    await db.ledgerEntries.add(entry);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {type === 'revenue' ? 'تسجيل إيراد جديد' : 'تسجيل مصروف جديد'}
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
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              value={formData.amount}
              onChange={e => setFormData({ ...formData, amount: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">التصنيف *</label>
            <select
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value })}
            >
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
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">التاريخ</label>
            <input 
              type="date"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              {type === 'revenue' ? 'حفظ الإيراد' : 'حفظ المصروف'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
