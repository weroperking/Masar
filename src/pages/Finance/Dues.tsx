import React, { useState } from 'react';
import { useApiQuery, useApiMutation } from '../../config/queryHooks';
import { AlertCircle, MessageCircle, DollarSign, X, CheckCircle2 } from 'lucide-react';
import { toMajorUnits, toMinorUnits } from '../../utils/currency';
import { getWhatsAppUrl } from '../../utils/phone';
import { Student, Course, MonthlySubscription, SessionPayment, LedgerEntry } from '../../types';
import { triggerPennyDrop } from '../../components/PennyDropAnimation';

export function Dues() {
  const [settlingDue, setSettlingDue] = useState<any | null>(null);

  const { data: allStudents = [] } = useApiQuery<Student>('students', 60 * 1000);
  const students = allStudents.filter(s => !s.deleted_at);
  const { data: allCourses = [] } = useApiQuery<Course>('courses', 60 * 1000);
  const courses = allCourses.filter(c => !c.deleted_at);
  const { data: allMonthlySubscriptions = [] } = useApiQuery<MonthlySubscription>('monthlySubscriptions', 60 * 1000);
  const monthlySubscriptions = allMonthlySubscriptions.filter(s => !s.deleted_at);
  const { data: allSessionPayments = [] } = useApiQuery<SessionPayment>('sessionPayments', 60 * 1000);
  const sessionPayments = allSessionPayments.filter(s => !s.deleted_at);

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
        studentPhone: student?.phone || '',
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
        studentPhone: student?.phone || '',
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
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">المتأخرات والمستحقات</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">متابعة المبالغ المتبقية على الطلاب وإرسال التذكيرات</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/40 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-red-500/10 text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">إجمالي المبالغ المتأخرة المستحقة</p>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">{toMajorUnits(totalDues).toLocaleString()} ج.م</p>
          </div>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-md border border-slate-100 dark:border-slate-800">
          عدد الطلاب المطالبين: <span className="font-bold text-slate-900 dark:text-slate-100">{allDues.length}</span>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100">سجل المستحقات ({allDues.length})</h2>
        </div>
        {allDues.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/60 mx-auto mb-2" />
            <p className="text-slate-500 text-xs font-medium">ممتاز! لا توجد أي متأخرات مالية حالياً</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">اسم الطالب</th>
                  <th className="px-4 py-2.5 font-semibold">البيان</th>
                  <th className="px-4 py-2.5 font-semibold">المطلوب</th>
                  <th className="px-4 py-2.5 font-semibold">المدفوع / نسبة التحصيل</th>
                  <th className="px-4 py-2.5 font-semibold">المتبقي</th>
                  <th className="px-4 py-2.5 font-semibold">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {allDues.map(due => {
                  const targetPhone = due.parentPhone || due.studentPhone;
                  const msg = `السلام عليكم أ/ ${due.parentName || due.studentName}، نود تذكيركم بسداد المبلغ المستحق بقيمة ${toMajorUnits(due.remaining)} ج.م للطالب ${due.studentName} عن (${due.title} - كورس ${due.courseName}). شكراً لتعاونكم - سنتر مسار.`;
                  const waLink = getWhatsAppUrl(targetPhone, msg);
                  
                  const progressPct = due.amountTotal > 0 ? Math.round((due.amountPaid / due.amountTotal) * 100) : 0;
                  
                  return (
                    <tr key={`${due.source}-${due.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{due.studentName}</div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono" dir="ltr">{targetPhone || '-'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{due.title}</div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500">{due.courseName}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono">{toMajorUnits(due.amountTotal)} ج.م</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">{toMajorUnits(due.amountPaid)} ج.م</span>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1 max-w-[100px]">
                            <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${progressPct}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-red-600 dark:text-red-400 font-mono">{toMajorUnits(due.remaining)} ج.م</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setSettlingDue(due)}
                            className="inline-flex items-center px-2 py-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-[11px] font-bold shadow-xs transition-colors"
                          >
                            <DollarSign className="w-3 h-3 ml-1" />
                            سداد سريع
                          </button>
                          {waLink && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md text-[11px] font-medium transition-colors border border-slate-200 dark:border-slate-700"
                              title="إرسال تذكير عبر واتساب"
                            >
                              <MessageCircle className="w-3 h-3 ml-1 text-emerald-600 dark:text-emerald-400" />
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
  const { update: updateSubscription } = useApiMutation<MonthlySubscription>('monthlySubscriptions');
  const { update: updateSessionPayment } = useApiMutation<SessionPayment>('sessionPayments');
  const { create: createLedgerEntry } = useApiMutation<LedgerEntry>('ledgerEntries');
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
      
      updateSubscription.mutate({
        id: due.id,
        data: {
          amountPaid: newPaidTotal,
          status: newStatus
        }
      });
    } else {
      let newStatus: 'paid' | 'partial' | 'unpaid' = 'paid';
      if (!isFullyPaid && newPaidTotal > 0) newStatus = 'partial';
      else if (!isFullyPaid) newStatus = 'unpaid';

      updateSessionPayment.mutate({
        id: due.id,
        data: {
          paidAmount: newPaidTotal,
          status: newStatus
        }
      });
    }

    // Add to ledger revenue using centralized helper
    createLedgerEntry.mutate({
      type: 'revenue',
      category: 'تحصيل متأخرات',
      amount: payNum,
      date: new Date().toISOString().split('T')[0],
      description: `تحصيل متأخرات الطالب ${due.studentName} (${due.title})`,
      relatedType: due.source === 'monthly' ? 'subscription' : 'session',
      relatedId: due.id
    } as LedgerEntry);

    triggerPennyDrop({
      amountMinor: payNum,
      studentName: due.studentName,
      courseName: due.title,
      type: due.source === 'monthly' ? 'subscription' : 'session'
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs transition-opacity" dir="rtl" onClick={onClose}>
      <div 
        className="w-full max-w-4xl lg:max-w-5xl bg-white dark:bg-slate-900 rounded-t-[24px] sm:rounded-xl shadow-2xl border-t sm:border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-[85vh] sm:h-[60vh] max-h-[85vh] sm:max-h-[60vh] animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Grab Handle for mobile */}
        <div className="pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing sm:hidden shrink-0 bg-white dark:bg-slate-900">
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
        </div>

        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">تسديد سريع: {due.studentName}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{due.title} - المتبقي: {toMajorUnits(due.remaining)} ج.م</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSettle} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">المبلغ المراد دفعه الآن (ج.م) *</label>
              <input 
                required
                type="number"
                min="1"
                max={toMajorUnits(due.remaining)}
                className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md text-sm font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
              />
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl text-xs space-y-2 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between">
                <span>المبلغ الإجمالي الأصلي:</span>
                <span className="font-semibold font-mono">{toMajorUnits(due.amountTotal)} ج.م</span>
              </div>
              <div className="flex justify-between">
                <span>المدفوع سابقاً:</span>
                <span className="font-semibold font-mono">{toMajorUnits(due.amountPaid)} ج.م</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 dark:text-slate-100 pt-2 border-t border-slate-200 dark:border-slate-700">
                <span>المتبقي بعد هذا الدفع:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 text-sm font-bold">{Math.max(0, toMajorUnits(due.remaining) - Number(payAmount))} ج.م</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5 shrink-0">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button 
              type="submit" 
              className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-xs font-bold transition-colors shadow-xs cursor-pointer"
            >
              تأكيد الدفع
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
