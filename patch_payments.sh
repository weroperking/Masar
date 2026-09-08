#!/bin/bash
cat << 'INNER_EOF' > tmp_payments.txt
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
INNER_EOF
awk '
  /\{activeTab === '\''payments'\'' && \(/ {
    print
    system("cat tmp_payments.txt | tail -n +2")
    skip=1
    next
  }
  skip && /^\s*\}\)/ {
    skip=0
    next
  }
  !skip { print }
' src/pages/Students/StudentDetails.tsx > src/pages/Students/StudentDetails.tmp
mv src/pages/Students/StudentDetails.tmp src/pages/Students/StudentDetails.tsx
rm tmp_payments.txt
