import { Calendar as CalendarIcon, Users, Clock } from 'lucide-react';
import { useState } from 'react';

export function Schedule() {
  const [view, setView] = useState<'week' | 'day'>('week');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900">الجدول الزمني</h1>
        <div className="flex bg-white border border-slate-200 rounded-lg p-1">
          <button 
            onClick={() => setView('week')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md ${view === 'week' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            أسبوعي
          </button>
          <button 
            onClick={() => setView('day')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md ${view === 'day' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            يومي
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Users className="w-6 h-6" /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">الطلاب المسجلين</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">--</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><Clock className="w-6 h-6" /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">حصص نشطة اليوم</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">--</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><CalendarIcon className="w-6 h-6" /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">إجمالي حصص اليوم</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">--</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 h-[600px] flex items-center justify-center">
        <div className="text-center">
          <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-700">الجدول قيد الإنشاء</h2>
          <p className="text-slate-500 mt-2">سيتم عرض الكتل الزمنية للمجموعات هنا قريباً.</p>
        </div>
      </div>
    </div>
  );
}
