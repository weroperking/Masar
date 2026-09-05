import { UserCog, Plus } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';

export function Users() {
  const users = useLiveQuery(() => db.users.toArray(), []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">المستخدمين والصلاحيات</h1>
        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4 ml-2" />
          إضافة مستخدم
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
          <p className="text-sm font-medium text-slate-500 mb-1">إجمالي المستخدمين</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">{users?.length || 0}</span>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
          <p className="text-sm font-medium text-slate-500 mb-1">المدراء</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">{users?.filter(u => u.role === 'admin').length || 0}</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 text-center h-48 flex flex-col justify-center items-center">
        <UserCog className="w-12 h-12 text-slate-300 mb-4" />
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300">قائمة المستخدمين</h2>
        <p className="text-slate-500 mt-2">لا يوجد مستخدمين مسجلين (باستثناء حسابك الحالي).</p>
      </div>
    </div>
  );
}
