import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { AlertCircle, CheckCircle, MessageCircle, DollarSign, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Payment } from '../../types';

export function Dues() {
  const [settlingPayment, setSettlingPayment] = useState<any | null>(null);

  const students = useLiveQuery(() => db.students.toArray(), []);
  const courses = useLiveQuery(() => db.courses.toArray(), []);
  const monthlyPayments = useLiveQuery(() => db.payments.toArray(), []);
  const sessionPayments = useLiveQuery(() => db.sessionPayments.toArray(), []);

  const studentMap = new Map(students?.map(s => [s.id, s]));
  const courseMap = new Map(courses?.map(c => [c.id, c.name]));

  // Find all monthly payments with dues
  const monthlyDues = (monthlyPayments || [])
    .filter(p => p.amountPaid < p.amountTotal || p.status === 'overdue' || p.status === 'partial')
    .map(p => {
      const student = studentMap.get(p.studentId);
      return {
        id: p.id,
        rawRecord: p,
        source: 'monthly' as const,
        studentId: p.studentId,
        studentName: student?.name || 'غير معروف',
        parentName: student?.parentName || '',
        parentPhone: student?.parentPhone || '',
        courseName: courseMap.get(p.courseId) || 'غير معروف',
        title: `اشتراك شهر ${p.month}/${p.year}`,
        amountTotal: p.amountTotal,
        amountPaid: p.amountPaid,
        remaining: p.amountTotal - p.amountPaid,
        status: p.status
      };
    });

  // Find all session payments with dues
  const sessionDues = (sessionPayments || [])
    .filter(p => p.paidAmount < p.amount || p.status === 'unpaid' || p.status === 'partial')
    .map(p => {
      const student = studentMap.get(p.studentId);
      return {
        id: p.id,
        rawRecord: p,
        source: 'session' as const,
        studentId: p.studentId,
        studentName: student?.name || 'غير معروف',
        parentName: student?.parentName || '',
        parentPhone: student?.parentPhone || '',
        courseName: courseMap.get(p.courseId) || 'غير معروف',
        title: p.type === 'fee' ? 'رسوم حصة' : 'باقة حصص',
        amountTotal: p.amount,
        amountPaid: p.paidAmount,
        remaining: p.amount - p.paidAmount,
        status: p.status
      };
    });

  const allDues = [...monthlyDues, ...sessionDues];
  const totalDuesAmount = allDues.reduce((acc, d) => acc + d.remaining, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">المستحقات والمتأخرات</h1>
        <p className="text-sm text-slate-500 mt-0.5">متابعة المبالغ المتأخرة على الطلاب وتحصيلها وإرسال التنبيهات</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-red-200 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">إجمالي المستحقات المتأخرة على الطلاب</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-red-600">{totalDuesAmount.toLocaleString()}</span>
            <span className="text-slate-500 text-sm font-medium">ج.م</span>
          </div>
        </div>
        <div className="text-xs text-slate-500 bg-red-50 px-4 py-2 rounded-lg border border-red-100">
          عدد المطالبات المعلقة: <strong className="text-red-700">{allDues.length}</strong> مطالبة
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
        {allDues.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center">
            <CheckCircle className="w-12 h-12 text-emerald-500 mb-4" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">لا توجد مستحقات متأخرة</h2>
            <p className="text-slate-500 text-sm mt-1">جميع الطلاب مسددين لكافة الاشتراكات والحصص بنجاح.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium rounded-r-lg">اسم الطالب</th>
                  <th className="px-4 py-3 font-medium">الكورس</th>
                  <th className="px-4 py-3 font-medium">البيان</th>
                  <th className="px-4 py-3 font-medium">المطلوب</th>
                  <th className="px-4 py-3 font-medium">المدفوع</th>
                  <th className="px-4 py-3 font-medium">المتبقي</th>
                  <th className="px-4 py-3 font-medium rounded-l-lg">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allDues.map(due => {
                  const cleanPhone = due.parentPhone.replace(/[^0-9]/g, '');
                  const waLink = `https://wa.me/2${cleanPhone}?text=${encodeURIComponent(`السلام عليكم أ/ ${due.parentName || due.studentName}، نود تذكيركم بسداد المبلغ المستحق بقيمة ${due.remaining} ج.م للطالب ${due.studentName} عن (${due.title} - كورس ${due.courseName}). شكراً لتعاونكم - سنتر مسار.`)}`;

                  return (
                    <tr key={`${due.source}-${due.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-900 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{due.studentName}</div>
                        <div className="text-xs text-slate-500" dir="ltr">{due.parentPhone}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{due.courseName}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">{due.title}</td>
                      <td className="px-4 py-3 text-slate-600">{due.amountTotal} ج.م</td>
                      <td className="px-4 py-3 text-slate-600">{due.amountPaid} ج.م</td>
                      <td className="px-4 py-3 font-bold text-red-600 text-base">{due.remaining} ج.م</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSettlingPayment(due)}
                            className="inline-flex items-center px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-xs font-semibold shadow-xs transition-colors"
                          >
                            <DollarSign className="w-3.5 h-3.5 ml-1" />
                            تسديد الآن
                          </button>
                          {cleanPhone && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg text-xs font-medium transition-colors"
                              title="إرسال تذكير عبر واتساب"
                            >
                              <MessageCircle className="w-3.5 h-3.5 ml-1 text-emerald-600" />
                              واتساب
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {settlingPayment && (
        <SettleDueModal 
          due={settlingPayment} 
          onClose={() => setSettlingPayment(null)} 
        />
      )}
    </div>
  );
}

function SettleDueModal({ due, onClose }: { due: any; onClose: () => void }) {
  const [payAmount, setPayAmount] = useState(due.remaining.toString());

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    const payNum = Number(payAmount);
    if (payNum <= 0) return;

    const now = Date.now();
    const newPaidTotal = due.amountPaid + payNum;
    const isFullyPaid = newPaidTotal >= due.amountTotal;

    if (due.source === 'monthly') {
      await db.payments.update(due.id, {
        amountPaid: newPaidTotal,
        status: isFullyPaid ? 'paid' : 'partial',
        updated_at: now
      });
    } else {
      await db.sessionPayments.update(due.id, {
        paidAmount: newPaidTotal,
        status: isFullyPaid ? 'paid' : 'partial',
        updated_at: now
      });
    }

    // Add to ledger revenue
    await db.ledgerEntries.add({
      id: uuidv4(),
      type: 'revenue',
      category: 'تحصيل متأخرات',
      amount: payNum,
      date: new Date().toISOString().split('T')[0],
      description: `تحصيل متأخرات الطالب ${due.studentName} (${due.title})`,
      relatedType: due.source === 'monthly' ? 'subscription' : 'session',
      relatedId: due.id,
      created_at: now,
      updated_at: now,
      sync_status: 'pending'
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">تسديد مستحق: {due.studentName}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{due.title} - المتبقي: {due.remaining} ج.م</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSettle} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المبلغ المراد دفعه الآن (ج.م) *</label>
            <input 
              required
              type="number"
              min="1"
              max={due.remaining}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-lg font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={payAmount}
              onChange={e => setPayAmount(e.target.value)}
            />
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg text-xs space-y-1 text-slate-600">
            <div className="flex justify-between">
              <span>المبلغ الإجمالي الأصلي:</span>
              <span>{due.amountTotal} ج.م</span>
            </div>
            <div className="flex justify-between">
              <span>المدفوع سابقاً:</span>
              <span>{due.amountPaid} ج.م</span>
            </div>
            <div className="flex justify-between font-bold text-slate-900 dark:text-slate-100">
              <span>المتبقي بعد هذا الدفع:</span>
              <span>{Math.max(0, due.remaining - Number(payAmount))} ج.م</span>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 text-sm">
              إلغاء
            </button>
            <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-semibold">
              تأكيد الدفع
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
