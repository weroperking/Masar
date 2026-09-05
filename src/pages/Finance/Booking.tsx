import { Globe } from 'lucide-react';

export function Booking() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">الحجز الأونلاين (Leads)</h1>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-6">
        <p className="text-sm text-slate-500 mb-2">رابط الحجز المباشر (يمكن مشاركته):</p>
        <div className="flex items-center gap-2">
          <input type="text" readOnly value={`${window.location.origin}/book`} className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600" dir="ltr" />
          <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium text-sm">نسخ الرابط</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-center h-48 flex flex-col justify-center items-center">
        <Globe className="w-12 h-12 text-slate-300 mb-4" />
        <h2 className="text-lg font-semibold text-slate-700">طلبات الحجز</h2>
        <p className="text-slate-500 mt-2">لا توجد طلبات حجز جديدة حالياً.</p>
      </div>
    </div>
  );
}
