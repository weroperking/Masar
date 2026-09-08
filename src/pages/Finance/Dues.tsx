import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { AlertCircle, MessageCircle, DollarSign, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { toMajorUnits, toMinorUnits } from '../../utils/currency';

export function Dues() {
  const [settlingDue, setSettlingDue] = useState<any | null>(null);

  const students = useLiveQuery(() => db.students.filter(s => !s.deleted_at).toArray(), []);
  const courses = useLiveQuery(() => db.courses.filter(c => !c.deleted_at).toArray(), []);
  const monthlySubscriptions = useLiveQuery(() => db.monthlySubscriptions.filter(s => !s.deleted_at).toArray(), []);
  const sessionPayments = useLiveQuery(() => db.sessionPayments.filter(s => !s.deleted_at).toArray(), []);

  const studentMap = new Map(students?.map(s => [s.id, s]));
  const courseMap = new Map(courses?.map(c => [c.id, c.name]));

  // Find all monthly payments with dues
  const monthlyDues = (monthlySubscriptions || [])
    .filter(p => p.amountPaid < p.amountTotal)
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
    .filter(p => p.paidAmount < p.amount)
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

  const allDues = [...monthlyDues, ...sessionDues].sort((a, b) => b.remaining - a.remaining);

  const totalDues = allDues.reduce((acc, d) => acc + d.remaining, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">المتأخرات والمستحقات</h1>
          <p className="text-sm text-slate-500 mt-0.5">متابعة المبالغ المتبقية على الطلاب</p>
        </div>
      </div>

      <div className="bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-900/50 rounded-xl p-6 flex items-center gap-4">
        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center shrink-0">
          <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <p className="text-sm text-red-800 dark:text-red-300 font-medium">إجمالي المبالغ المتأخرة المستحقة</p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-400">{toMajorUnits(totalDues).toLocaleString()} ج.م</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-bold text-slate-800 dark:text-slate-200">سجل المستحقات ({allDues.length})</h2>
        </div>
        {allDues.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">ممتاز! لا توجد أي متأخرات مالية حالياً</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium rounded-r-lg">اسم الطالب</th>
                  <th className="px-4 py-3 font-medium">البيان</th>
                  <th className="px-4 py-3 font-medium">المطلوب</th>
                  <th className="px-4 py-3 font-medium">المدفوع / نسبة التحصيل</th>
                  <th className="px-4 py-3 font-medium">المتبقي</th>
                  <th className="px-4 py-3 font-medium rounded-l-lg">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {allDues.map(due => {
                  const cleanPhone = due.parentPhone.replace(/[^0-9]/g, '');
                  const waLink = `https://wa.me/2${cleanPhone}?text=${encodeURIComponent(`السلام عليكم أ/ ${due.parentName || due.studentName}، نود تذكيركم بسداد المبلغ المستحق بقيمة ${toMajorUnits(due.remaining)} ج.م للطالب ${due.studentName} عن (${due.title} - كورس ${due.courseName}). شكراً لتعاونكم - سنتر مسار.`)}`;
                  
                  const progressPct = due.amountTotal > 0 ? Math.round((due.amountPaid / due.amountTotal) * 100) : 0;
                  
                  return (
                    <tr key={`${due.source}-${due.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-900 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{due.studentName}</div>
                        <div className="text-xs text-slate-500" dir="ltr">{due.parentPhone}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{due.title}</div>
                        <div className="text-xs text-slate-500">{due.courseName}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">{toMajorUnits(due.amountTotal)} ج.م</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{toMajorUnits(due.amountPaid)} ج.م</span>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 flex-1 max-w-[120px]">
                            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${progressPct}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-red-600 dark:text-red-400 text-base">{toMajorUnits(due.remaining)} ج.م</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSettlingDue(due)}
                            className="inline-flex items-center px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-xs font-semibold shadow-sm transition-colors"
                          >
                            <DollarSign className="w-3.5 h-3.5 ml-1" />
                            سداد سريع
                          </button>
                          {cleanPhone && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg text-xs font-medium transition-colors border border-slate-200 dark:border-slate-700"
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

      {settlingDue && (
        <SettleDueModal 
          due={settlingDue} 
          onClose={() => setSettlingDue(null)} 
        />
      )}
    </div>
  );
}

function SettleDueModal({ due, onClose }: { due: any; onClose: () => void }) {
  const [payAmount, setPayAmount] = useState(toMajorUnits(due.remaining).toString());

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    const payNum = toMinorUnits(Number(payAmount));
    if (payNum <= 0) return;
    
    const now = Date.now();
    const newPaidTotal = due.amountPaid + payNum;
    const isFullyPaid = newPaidTotal >= due.amountTotal;
    
    if (due.source === 'monthly') {
      const isOverdue = new Date(due.rawRecord.dueDate) < new Date(new Date().toDateString());
      let newStatus: 'paid' | 'partial' | 'overdue' = 'paid';
      if (!isFullyPaid) {
        newStatus = isOverdue ? 'overdue' : 'partial';
      }
      
      await db.monthlySubscriptions.update(due.id, {
        amountPaid: newPaidTotal,
        status: newStatus,
        updated_at: now,
        sync_status: 'pending'
      });
    } else {
      let newStatus: 'paid' | 'partial' | 'unpaid' = 'paid';
      if (!isFullyPaid && newPaidTotal > 0) newStatus = 'partial';
      else if (!isFullyPaid) newStatus = 'unpaid';

      await db.sessionPayments.update(due.id, {
        paidAmount: newPaidTotal,
        status: newStatus,
        updated_at: now,
        sync_status: 'pending'
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
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">تسديد سريع: {due.studentName}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{due.title} - المتبقي: {toMajorUnits(due.remaining)} ج.م</p>
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
              max={toMajorUnits(due.remaining)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-lg font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={payAmount}
              onChange={e => setPayAmount(e.target.value)}
            />
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg text-xs space-y-1 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between">
              <span>المبلغ الإجمالي الأصلي:</span>
              <span className="font-semibold">{toMajorUnits(due.amountTotal)} ج.م</span>
            </div>
            <div className="flex justify-between">
              <span>المدفوع سابقاً:</span>
              <span className="font-semibold">{toMajorUnits(due.amountPaid)} ج.م</span>
            </div>
            <div className="flex justify-between font-bold text-slate-900 dark:text-slate-100 pt-1 mt-1 border-t border-slate-200 dark:border-slate-600">
              <span>المتبقي بعد هذا الدفع:</span>
              <span>{Math.max(0, toMajorUnits(due.remaining) - Number(payAmount))} ج.م</span>
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

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  );
}
