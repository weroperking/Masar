import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Wallet, Search, Plus } from 'lucide-react';

export function SessionPayments() {
  const [activeTab, setActiveTab] = useState<'all' | 'fee' | 'package'>('all');
  
  const payments = useLiveQuery(() => {
    if (activeTab === 'all') return db.sessionPayments.toArray();
    return db.sessionPayments.where('type').equals(activeTab).toArray();
  }, [activeTab]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900">مدفوعات الحصص</h1>
        <button className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
          <Plus className="w-4 h-4 ml-2" />
          تحصيل جديد
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <p className="text-sm font-medium text-slate-500 mb-1">الإيراد المكتسب (الحصص الفعلية)</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">0</span>
            <span className="text-slate-500">ج.م</span>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <p className="text-sm font-medium text-slate-500 mb-1">النقد المحصّل (حتى للباقات)</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-purple-600">0</span>
            <span className="text-slate-500">ج.م</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="flex border-b border-slate-200">
          <button onClick={() => setActiveTab('all')} className={`px-6 py-3 text-sm font-medium border-b-2 ${activeTab === 'all' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            الكل
          </button>
          <button onClick={() => setActiveTab('fee')} className={`px-6 py-3 text-sm font-medium border-b-2 ${activeTab === 'fee' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            رسوم حصة
          </button>
          <button onClick={() => setActiveTab('package')} className={`px-6 py-3 text-sm font-medium border-b-2 ${activeTab === 'package' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            باقات
          </button>
        </div>

        <div className="p-6">
          <div className="text-center py-12">
            <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">لا توجد حركات مالية للحصص</p>
          </div>
        </div>
      </div>
    </div>
  );
}
