import { FileSpreadsheet, AlertCircle } from 'lucide-react';

export function Dues() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">المستحقات</h1>

      <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6 border-l-4 border-l-red-500">
        <p className="text-sm font-medium text-slate-500 mb-1">إجمالي المستحقات المتأخرة</p>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-red-600">0</span>
          <span className="text-slate-500">ج.م</span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-center h-64 flex flex-col justify-center items-center">
        <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
        <h2 className="text-lg font-semibold text-slate-700">لا توجد مستحقات</h2>
        <p className="text-slate-500 mt-2">جميع الطلاب مسددين لمستحقاتهم بالكامل.</p>
      </div>
    </div>
  );
}
