import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Users, BookOpen, CreditCard, Wallet } from 'lucide-react';

export function Dashboard() {
  const studentsCount = useLiveQuery(() => db.students.count(), []);
  const coursesCount = useLiveQuery(() => db.courses.count(), []);
  
  const payments = useLiveQuery(() => db.payments.toArray(), []);
  
  const totalRevenue = payments?.reduce((acc, p) => acc + p.amountPaid, 0) || 0;
  const expectedRevenue = payments?.reduce((acc, p) => acc + p.amountTotal, 0) || 0;

  const stats = [
    { name: 'إجمالي الطلاب', value: studentsCount ?? '...', icon: Users, color: 'bg-blue-500' },
    { name: 'الكورسات النشطة', value: coursesCount ?? '...', icon: BookOpen, color: 'bg-emerald-500' },
    { name: 'الإيرادات المحصلة', value: `${totalRevenue} ج.م`, icon: Wallet, color: 'bg-indigo-500' },
    { name: 'الإيرادات المتوقعة', value: `${expectedRevenue} ج.م`, icon: CreditCard, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">لوحة التحكم</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-xl shadow-sm p-6 border border-slate-100 flex items-center space-x-4 space-x-reverse">
            <div className={`p-3 rounded-lg ${stat.color} bg-opacity-10`}>
              <stat.icon className={`w-6 h-6 ${stat.color.replace('bg-', 'text-')}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.name}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">نظرة عامة على المدفوعات (محلي)</h2>
        {payments?.length === 0 ? (
          <p className="text-slate-500 text-sm">لا توجد حركات مالية مسجلة بعد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium rounded-r-lg">الشهر/السنة</th>
                  <th className="px-4 py-3 font-medium">المطلوب</th>
                  <th className="px-4 py-3 font-medium">المدفوع</th>
                  <th className="px-4 py-3 font-medium rounded-l-lg">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments?.slice(0, 5).map(payment => (
                  <tr key={payment.id}>
                    <td className="px-4 py-3">{payment.month}/{payment.year}</td>
                    <td className="px-4 py-3">{payment.amountTotal} ج.م</td>
                    <td className="px-4 py-3">{payment.amountPaid} ج.م</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                        payment.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {payment.status === 'paid' ? 'مدفوع' : payment.status === 'partial' ? 'جزئي' : 'متأخر'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
