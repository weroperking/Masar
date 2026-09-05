import { Library, Plus } from 'lucide-react';

export function CourseProducts() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">الكتب التعليمية للكورسات</h1>
        <button className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4 ml-2" />
          ربط كتاب بكورس
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-center h-64 flex flex-col justify-center items-center">
        <Library className="w-12 h-12 text-slate-300 mb-4" />
        <h2 className="text-lg font-semibold text-slate-700">قائمة الكتب المربوطة بالكورسات</h2>
        <p className="text-slate-500 mt-2">لا توجد كتب مربوطة. استخدم صفحة المنتجات لإضافة الكتب أولاً.</p>
      </div>
    </div>
  );
}
