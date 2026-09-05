import { Package, Plus } from 'lucide-react';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';

export function Inventory() {
  const [activeTab, setActiveTab] = useState<'products' | 'sales'>('products');
  const products = useLiveQuery(() => db.products.toArray(), []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">المخزون</h1>
        <button className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4 ml-2" />
          {activeTab === 'products' ? 'إضافة منتج' : 'بيع منتج'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="flex border-b border-slate-200">
          <button onClick={() => setActiveTab('products')} className={`px-6 py-3 text-sm font-medium border-b-2 ${activeTab === 'products' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            المنتجات
          </button>
          <button onClick={() => setActiveTab('sales')} className={`px-6 py-3 text-sm font-medium border-b-2 ${activeTab === 'sales' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            سجل المبيعات
          </button>
        </div>

        <div className="p-6">
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">لا توجد بيانات متاحة حالياً.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
