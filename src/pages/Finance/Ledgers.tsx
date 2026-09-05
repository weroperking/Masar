import { FileSpreadsheet, Plus } from 'lucide-react';

export function Ledgers() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">السجلات المالية</h1>
        <div className="flex gap-2">
          <button className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
            <Plus className="w-4 h-4 ml-2" />
            إيراد
          </button>
          <button className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
            <Plus className="w-4 h-4 ml-2" />
            مصروف
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-center h-64 flex flex-col justify-center items-center">
        <FileSpreadsheet className="w-12 h-12 text-slate-300 mb-4" />
        <h2 className="text-lg font-semibold text-slate-700">سجل الحركات</h2>
        <p className="text-slate-500 mt-2">لا توجد حركات مالية مسجلة. قم بإضافة إيرادات أو مصروفات للبدء.</p>
      </div>
    </div>
  );
}
