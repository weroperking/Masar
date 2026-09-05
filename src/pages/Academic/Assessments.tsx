import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { FileText, Plus } from 'lucide-react';

export function Assessments() {
  const assessments = useLiveQuery(() => db.assessments.toArray(), []);
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">الاختبارات والواجبات</h1>
        <button className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4 ml-2" />
          إضافة اختبار/واجب
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-center h-64 flex flex-col justify-center items-center">
        <FileText className="w-12 h-12 text-slate-300 mb-4" />
        <h2 className="text-lg font-semibold text-slate-700">قائمة الاختبارات والواجبات</h2>
        <p className="text-slate-500 mt-2">لا توجد سجلات حالياً. اضغط على زر الإضافة للبدء.</p>
      </div>
    </div>
  );
}
