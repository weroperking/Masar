import { Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { db } from '../../db/db';
import { Settings as SettingsType } from '../../types';

export function Settings() {
  const [settings, setSettings] = useState<Partial<SettingsType>>({
    autoStartEndSessions: false,
    autoConfirmPaymentOnAttendance: true,
    autoCreateAssignmentPerSession: false,
    freeSessionLimitPerStudent: 1,
    assignmentGradingMethod: 'numeric',
    numericMaxGrade: 100
  });

  const handleSave = async () => {
    // In a real app we'd load and save to Dexie
    alert('تم حفظ الإعدادات بنجاح (محلياً).');
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900">إعدادات النظام</h1>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-8">
        
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">أتمتة الجلسات والحضور</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded" checked={settings.autoStartEndSessions} onChange={e => setSettings({...settings, autoStartEndSessions: e.target.checked})} />
              <span className="text-slate-700">بدء وإنهاء الجلسات تلقائياً في موعدها</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded" checked={settings.autoConfirmPaymentOnAttendance} onChange={e => setSettings({...settings, autoConfirmPaymentOnAttendance: e.target.checked})} />
              <span className="text-slate-700">تأكيد دفع الحصة تلقائياً عند تسجيل الحضور (للدفع بالحصة)</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded" checked={settings.autoCreateAssignmentPerSession} onChange={e => setSettings({...settings, autoCreateAssignmentPerSession: e.target.checked})} />
              <span className="text-slate-700">إنشاء واجب تلقائياً مع كل حصة جديدة</span>
            </label>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">ضوابط الحصص المجانية</h2>
          <div className="flex items-center gap-4 max-w-sm">
            <label className="text-slate-700">الحد الأقصى لكل طالب:</label>
            <input type="number" className="w-24 px-3 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" value={settings.freeSessionLimitPerStudent} onChange={e => setSettings({...settings, freeSessionLimitPerStudent: Number(e.target.value)})} />
            <span className="text-sm text-slate-500">(0 = غير محدود)</span>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">طريقة تقييم الواجبات</h2>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2">
              <input type="radio" name="grading" className="text-indigo-600 focus:ring-indigo-500" checked={settings.assignmentGradingMethod === 'rating'} onChange={() => setSettings({...settings, assignmentGradingMethod: 'rating'})} />
              <span className="text-slate-700">بالتقدير النصي (1-5)</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="grading" className="text-indigo-600 focus:ring-indigo-500" checked={settings.assignmentGradingMethod === 'numeric'} onChange={() => setSettings({...settings, assignmentGradingMethod: 'numeric'})} />
              <span className="text-slate-700">بالأرقام (درجة مئوية)</span>
            </label>
          </div>
          {settings.assignmentGradingMethod === 'numeric' && (
            <div className="mt-4 flex items-center gap-4">
              <label className="text-slate-700">الدرجة العظمى الافتراضية:</label>
              <input type="number" className="w-24 px-3 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" value={settings.numericMaxGrade} onChange={e => setSettings({...settings, numericMaxGrade: Number(e.target.value)})} />
            </div>
          )}
        </section>

        <div className="pt-4 flex justify-end">
          <button onClick={handleSave} className="flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            <Save className="w-4 h-4 ml-2" />
            حفظ الإعدادات
          </button>
        </div>
      </div>
    </div>
  );
}
