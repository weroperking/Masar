import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { ArrowRight, User, Phone, BookOpen, Clock, Calendar, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toMajorUnits } from '../../utils/currency';

export function StudentDetails() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'overview' | 'enrollments' | 'attendance' | 'payments'>('overview');

  const student = useLiveQuery(() => db.students.get(id as string), [id]);
  
  // Roster / Enrollments
  const enrollments = useLiveQuery(
    () => db.enrollments.where('studentId').equals(id as string).toArray(),
    [id]
  );
  
  // Map group and course names
  const groups = useLiveQuery(() => db.groups.toArray(), []);
  const courses = useLiveQuery(() => db.courses.toArray(), []);

  // Payments
  const monthlySubscriptions = useLiveQuery(
    () => db.monthlySubscriptions.where('studentId').equals(id as string).toArray(),
    [id]
  );
  const sessionPayments = useLiveQuery(
    () => db.sessionPayments.where('studentId').equals(id as string).toArray(),
    [id]
  );

  // Attendance
  const attendanceRecords = useLiveQuery(
    () => db.attendanceRecords.where('studentId').equals(id as string).toArray(),
    [id]
  );

  if (!student) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">جاري تحميل بيانات الطالب...</p>
      </div>
    );
  }

  const activeEnrollments = enrollments?.filter(e => e.status === 'active') || [];
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/students" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{student.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
              student.isActive ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'
            }`}>
              {student.isActive ? 'نشط' : 'غير نشط'}
            </span>
            <span>•</span>
            <span dir="ltr">{student.phone}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 overflow-x-auto pb-px">
        {[
          { id: 'overview', label: 'نظرة عامة', icon: User },
          { id: 'enrollments', label: 'المجموعات المسجل بها', icon: BookOpen },
          { id: 'attendance', label: 'سجل الحضور', icon: Clock },
          { id: 'payments', label: 'المدفوعات', icon: Wallet },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">البيانات الشخصية</h3>
            <div className="space-y-4">
              <div>
                <span className="block text-xs text-slate-500 mb-1">المدرسة</span>
                <p className="font-medium text-slate-900 dark:text-slate-100">{student.school || '-'}</p>
              </div>
              <div>
                <span className="block text-xs text-slate-500 mb-1">مصدر التعارف</span>
                <p className="font-medium text-slate-900 dark:text-slate-100">{student.leadSource || '-'}</p>
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <span className="block text-xs text-slate-500 mb-1">ولي الأمر</span>
                <p className="font-medium text-slate-900 dark:text-slate-100">{student.parentName || '-'}</p>
              </div>
              <div>
                <span className="block text-xs text-slate-500 mb-1">هاتف ولي الأمر</span>
                <p className="font-medium text-slate-900 dark:text-slate-100" dir="ltr">{student.parentPhone || '-'}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">ملخص الأداء</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">المجموعات النشطة</span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{activeEnrollments.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">أيام الحضور (الكل)</span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">{attendanceRecords?.filter(a => a.status === 'present').length || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">أيام الغياب (الكل)</span>
                <span className="text-lg font-bold text-red-600 dark:text-red-400">{attendanceRecords?.filter(a => a.status === 'absent').length || 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'enrollments' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          {enrollments?.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>الطالب غير مسجل في أي مجموعات حالياً.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {enrollments?.map(enrollment => {
                const group = groups?.find(g => g.id === enrollment.groupId);
                const course = courses?.find(c => c.id === enrollment.courseId);
                return (
                  <div key={enrollment.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-slate-100 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors gap-4">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        {group?.name || 'مجموعة غير معروفة'}
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          enrollment.status === 'active' ? 'bg-green-100 text-green-800' :
                          enrollment.status === 'withdrawn' ? 'bg-red-100 text-red-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {enrollment.status === 'active' ? 'نشط' : enrollment.status === 'withdrawn' ? 'منسحب' : 'مكتمل'}
                        </span>
                      </h4>
                      <p className="text-sm text-slate-500 mt-1">{course?.name}</p>
                      <div className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        تاريخ التسجيل: {format(new Date(enrollment.enrolledAt), 'dd MMM yyyy', { locale: ar })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'attendance' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          {attendanceRecords?.length === 0 ? (
             <div className="text-center py-8 text-slate-500">
               <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
               <p>لا يوجد سجل حضور للطالب حتى الآن.</p>
             </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3 font-medium rounded-r-lg">التاريخ</th>
                    <th className="px-4 py-3 font-medium">الوقت</th>
                    <th className="px-4 py-3 font-medium rounded-l-lg">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {attendanceRecords?.sort((a, b) => b.markedAt - a.markedAt).map(record => (
                    <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3">{format(record.markedAt, 'dd MMM yyyy', { locale: ar })}</td>
                      <td className="px-4 py-3 text-slate-500" dir="ltr">{format(record.markedAt, 'hh:mm a')}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          record.status === 'present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {record.status === 'present' ? 'حاضر' : 'غائب'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">الاشتراكات الشهرية</h3>
            {monthlySubscriptions?.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">لا يوجد سجل اشتراكات شهرية</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="px-4 py-3 font-medium rounded-r-lg">الكورس</th>
                      <th className="px-4 py-3 font-medium">الشهر/السنة</th>
                      <th className="px-4 py-3 font-medium">المبلغ الإجمالي</th>
                      <th className="px-4 py-3 font-medium">المدفوع</th>
                      <th className="px-4 py-3 font-medium rounded-l-lg">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {monthlySubscriptions?.sort((a, b) => b.created_at - a.created_at).map(sub => {
                      const course = courses?.find(c => c.id === sub.courseId);
                      return (
                        <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="px-4 py-3">{course?.name || '-'}</td>
                          <td className="px-4 py-3 text-slate-500">{sub.month}/{sub.year}</td>
                          <td className="px-4 py-3 font-mono">{toMajorUnits(sub.amountTotal)} ج.م</td>
                          <td className="px-4 py-3 font-mono text-blue-600">{toMajorUnits(sub.amountPaid)} ج.م</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                              sub.status === 'paid' ? 'bg-green-100 text-green-800' :
                              sub.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {sub.status === 'paid' ? 'خالص' : sub.status === 'partial' ? 'جزئي' : 'متأخر'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">مدفوعات الحصص (الملازم والحصص الفردية)</h3>
            {sessionPayments?.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">لا يوجد سجل مدفوعات حصص</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="px-4 py-3 font-medium rounded-r-lg">الكورس</th>
                      <th className="px-4 py-3 font-medium">النوع</th>
                      <th className="px-4 py-3 font-medium">التاريخ</th>
                      <th className="px-4 py-3 font-medium">المبلغ الإجمالي</th>
                      <th className="px-4 py-3 font-medium">المدفوع</th>
                      <th className="px-4 py-3 font-medium rounded-l-lg">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sessionPayments?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(pay => {
                      const course = courses?.find(c => c.id === pay.courseId);
                      return (
                        <tr key={pay.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="px-4 py-3">{course?.name || '-'}</td>
                          <td className="px-4 py-3">{pay.type === 'fee' ? 'حصة فردية' : 'باقة'}</td>
                          <td className="px-4 py-3 text-slate-500">{format(new Date(pay.date), 'dd MMM yyyy', { locale: ar })}</td>
                          <td className="px-4 py-3 font-mono">{toMajorUnits(pay.amount)} ج.م</td>
                          <td className="px-4 py-3 font-mono text-blue-600">{toMajorUnits(pay.paidAmount)} ج.م</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                              pay.status === 'paid' ? 'bg-green-100 text-green-800' :
                              pay.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                              pay.status === 'refunded' ? 'bg-slate-100 text-slate-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {pay.status === 'paid' ? 'خالص' : pay.status === 'partial' ? 'جزئي' : pay.status === 'refunded' ? 'مسترد' : 'غير مدفوع'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
-e     </div>
  );
}
