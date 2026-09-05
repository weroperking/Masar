import { QrCode, Plus } from 'lucide-react';

export function QrCards() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">بطاقات QR</h1>
        <button className="flex items-center px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors">
          <Plus className="w-4 h-4 ml-2" />
          طلب بطاقات جديدة
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-4">
          <p className="text-sm font-medium text-slate-500">متاحة</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">0</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-4">
          <p className="text-sm font-medium text-slate-500">مرتبطة بطالب</p>
          <p className="text-2xl font-bold text-blue-600">0</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-4">
          <p className="text-sm font-medium text-slate-500">جاهزة للطباعة</p>
          <p className="text-2xl font-bold text-amber-600">0</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-4">
          <p className="text-sm font-medium text-slate-500">مطبوعة</p>
          <p className="text-2xl font-bold text-emerald-600">0</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 text-center h-64 flex flex-col justify-center items-center">
        <QrCode className="w-12 h-12 text-slate-300 mb-4" />
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300">إدارة البطاقات</h2>
        <p className="text-slate-500 mt-2">يمكنك ربط البطاقات المطبوعة بحسابات الطلاب لتمكين المسح السريع.</p>
      </div>
    </div>
  );
}
