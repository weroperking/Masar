import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Users, BookOpen, CreditCard, Wallet, ArrowUpRight, TrendingUp, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Dashboard() {
  const studentsCount = useLiveQuery(() => db.students.count(), []);
  const coursesCount = useLiveQuery(() => db.courses.count(), []);
  
  const payments = useLiveQuery(() => db.payments.toArray(), []);
  
  const totalRevenue = payments?.reduce((acc, p) => acc + p.amountPaid, 0) || 0;
  const expectedRevenue = payments?.reduce((acc, p) => acc + p.amountTotal, 0) || 0;

  const stats = [
    { name: 'إجمالي الطلاب', value: studentsCount ?? '...', icon: Users, href: '/students', color: 'text-blue-600 dark:text-blue-400' },
    { name: 'الكورسات النشطة', value: coursesCount ?? '...', icon: BookOpen, href: '/courses', color: 'text-blue-600 dark:text-blue-400' },
    { name: 'الإيرادات المحصلة', value: `${totalRevenue.toLocaleString()} ج.م`, icon: Wallet, href: '/ledgers', color: 'text-emerald-600 dark:text-emerald-400' },
    { name: 'الإيرادات المتوقعة', value: `${expectedRevenue.toLocaleString()} ج.م`, icon: CreditCard, href: '/payments', color: 'text-amber-600 dark:text-amber-400' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">لوحة التحكم</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">مؤشرات الأداء السريع، التدفقات النقدية، ونشاط سنتر مسار</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
          <Sparkles className="w-4 h-4 text-blue-500" />
          <span>البيانات متزامنة محلياً</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            to={stat.href}
            className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700 flex flex-col justify-between hover:border-blue-300 dark:hover:border-blue-700 transition-all group gap-4 relative overflow-hidden"
          >
            <div className="flex justify-between items-start w-full">
              <div className="flex items-center gap-2.5">
                <stat.icon className={`w-5 h-5 ${stat.color}`} aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">{stat.name}</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
            </div>
            
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{stat.value}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-100 dark:border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">أحدث حركات الاشتراكات</h2>
          </div>
          <Link to="/payments" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
            عرض الكل
          </Link>
        </div>

        {payments?.length === 0 ? (
          <p className="text-slate-400 dark:text-slate-500 text-sm py-8 text-center">لا توجد حركات مالية مسجلة بعد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-50 dark:bg-slate-900 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-medium rounded-r-lg">الشهر/السنة</th>
                  <th className="px-4 py-3 font-medium">المطلوب</th>
                  <th className="px-4 py-3 font-medium">المدفوع</th>
                  <th className="px-4 py-3 font-medium rounded-l-lg">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {payments?.slice(0, 5).map(payment => (
                  <tr key={payment.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-900 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{payment.month}/{payment.year}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono">{payment.amountTotal} ج.م</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono">{payment.amountPaid} ج.م</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                        payment.status === 'paid' ? 'bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-300' :
                        payment.status === 'partial' ? 'bg-yellow-100 dark:bg-yellow-950/60 text-yellow-800 dark:text-yellow-300' :
                        'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300'
                      }`}>
                        {payment.status === 'paid' ? 'مدفوع بالكامل' : payment.status === 'partial' ? 'سداد جزئي' : 'متأخر'}
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
