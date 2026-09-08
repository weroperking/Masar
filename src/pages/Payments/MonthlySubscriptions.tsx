import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { MonthlySubscription, Course, Student, Enrollment, Group } from '../../types';
import { Search, Plus, Edit2, AlertTriangle, X, MessageCircle, Check } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { toMajorUnits, toMinorUnits } from '../../utils/currency';
import { useToast } from '../../context/ToastContext';

export function MonthlySubscriptions() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingSub, setEditingSub] = useState<any | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  
  const [reminderSub, setReminderSub] = useState<any | null>(null);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  
  const toast = useToast();

  const courses = useLiveQuery(() => db.courses.filter(c => !c.deleted_at && c.paymentType === 'monthly').toArray(), []);
  const students = useLiveQuery(() => db.students.filter(s => !s.deleted_at).toArray(), []);
  const groups = useLiveQuery(() => db.groups.filter(g => !g.deleted_at).toArray(), []);
  const enrollments = useLiveQuery(() => db.enrollments.filter(e => !e.deleted_at && e.status === 'active').toArray(), []);
  const subscriptions = useLiveQuery(() => db.monthlySubscriptions.filter(s => !s.deleted_at && s.month === selectedMonth && s.year === selectedYear).toArray(), [selectedMonth, selectedYear]);

  const courseMap = useMemo(() => new Map(courses?.map(c => [c.id, c])), [courses]);
  const studentMap = useMemo(() => new Map(students?.map(s => [s.id, s])), [students]);
  const groupMap = useMemo(() => new Map(groups?.map(g => [g.id, g])), [groups]);

  // Generate expected subscriptions from active enrollments
  const expectedSubscriptions = useMemo(() => {
    if (!enrollments || !courses || !students || !subscriptions) return [];
    
    return enrollments
      .filter(e => {
        const course = courseMap.get(e.courseId);
        return course && course.paymentType === 'monthly';
      })
      .map(enrollment => {
        const student = studentMap.get(enrollment.studentId || '');
        const course = courseMap.get(enrollment.courseId);
        const group = groupMap.get(enrollment.groupId);
        
        // Find if record exists
        const existingSub = subscriptions.find(s => 
          s.studentId === enrollment.studentId && 
          s.courseId === enrollment.courseId
        );

        const amountTotal = existingSub ? existingSub.amountTotal : (course?.price || 0);
        const amountPaid = existingSub ? existingSub.amountPaid : 0;
        const dueDate = existingSub?.dueDate || `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-05`;
        
        let status = 'no_record';
        if (existingSub) {
          if (existingSub.status === 'rejected') {
            status = 'rejected';
          } else if (amountPaid >= amountTotal && amountTotal > 0) {
            status = 'paid';
          } else if (amountPaid > 0 && amountPaid < amountTotal) {
            status = 'partial';
          } else {
            // Check overdue
            const isOverdue = new Date(dueDate) < new Date(new Date().toDateString());
            status = isOverdue ? 'overdue' : 'pending';
          }
        }

        return {
          id: existingSub?.id || null, // null if no record
          enrollmentId: enrollment.id,
          studentId: enrollment.studentId,
          courseId: enrollment.courseId,
          studentName: student?.name || 'غير معروف',
          studentPhone: student?.phone || '',
          courseName: course?.name || 'غير معروف',
          groupName: group?.name || 'مجموعة غير معروفة',
          amountTotal,
          amountPaid,
          dueDate,
          status,
          notes: existingSub?.notes || '',
          existingSub
        };
      });
  }, [enrollments, courseMap, studentMap, groupMap, subscriptions, selectedMonth, selectedYear]);

  const filteredSubs = expectedSubscriptions.filter(sub => {
    if (selectedCourse !== 'all' && sub.courseId !== selectedCourse) return false;
    if (searchTerm) {
      if (!sub.studentName.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !sub.courseName.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded text-xs font-bold">خالص</span>;
      case 'partial': return <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-bold">جزء</span>;
      case 'overdue': return <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-bold">متأخر</span>;
      case 'no_record': return <span className="px-2 py-1 bg-slate-100 text-slate-800 rounded text-xs font-bold">لم يسدد بعد</span>;
      case 'rejected': return <span className="px-2 py-1 bg-rose-100 text-rose-800 rounded text-xs font-bold">مرفوض</span>;
      case 'pending': return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-bold">مستحق</span>;
      default: return null;
    }
  };

  const handleOpenPayment = (sub: any) => {
    setEditingSub(sub);
    setIsPaymentModalOpen(true);
  };

  const handleOpenReminder = (sub: any) => {
    setReminderSub(sub);
    setIsReminderModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">الاشتراكات الشهرية</h1>
          <p className="text-sm text-slate-500 mt-1">متابعة وتسجيل سداد اشتراكات الكورسات الشهرية</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap gap-4">
        <div className="w-full sm:w-auto flex-1">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ابحث باسم الطالب..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-3 pr-9 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <select 
          value={selectedMonth} 
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          className="border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-transparent"
        >
          {Array.from({length: 12}).map((_, i) => (
            <option key={i+1} value={i+1}>شهر {i+1}</option>
          ))}
        </select>

        <select 
          value={selectedYear} 
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-transparent"
        >
          {[currentDate.getFullYear()-1, currentDate.getFullYear(), currentDate.getFullYear()+1].map(y => (
            <option key={y} value={y}>سنة {y}</option>
          ))}
        </select>

        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-transparent"
        >
          <option value="all">جميع الكورسات</option>
          {courses?.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="p-4 font-semibold">الطالب</th>
                <th className="p-4 font-semibold">الكورس والمجموعة</th>
                <th className="p-4 font-semibold text-center">المطلوب</th>
                <th className="p-4 font-semibold text-center">المدفوع</th>
                <th className="p-4 font-semibold text-center">تاريخ الاستحقاق</th>
                <th className="p-4 font-semibold text-center">الحالة</th>
                <th className="p-4 font-semibold text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredSubs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    لا توجد اشتراكات متوقعة لهذه الفترة
                  </td>
                </tr>
              ) : (
                filteredSubs.map((sub, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="p-4 font-bold text-slate-900 dark:text-slate-100">{sub.studentName}</td>
                    <td className="p-4">
                      <div className="text-slate-900 dark:text-slate-100 font-semibold">{sub.courseName}</div>
                      <div className="text-xs text-slate-500">{sub.groupName}</div>
                    </td>
                    <td className="p-4 text-center font-bold text-slate-700 dark:text-slate-300">{toMajorUnits(sub.amountTotal)}</td>
                    <td className="p-4 text-center font-bold text-emerald-600">{toMajorUnits(sub.amountPaid)}</td>
                    <td className="p-4 text-center text-slate-600 dark:text-slate-400">{sub.dueDate}</td>
                    <td className="p-4 text-center">{getStatusBadge(sub.status)}</td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => handleOpenPayment(sub)}
                          className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                          title="تسجيل دفعة / تعديل"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleOpenReminder(sub)}
                          className="p-1.5 bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors"
                          title="إرسال تذكير عبر واتساب"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isPaymentModalOpen && editingSub && (
        <PaymentModal 
          sub={editingSub} 
          month={selectedMonth} 
          year={selectedYear} 
          onClose={() => setIsPaymentModalOpen(false)} 
        />
      )}

      {isReminderModalOpen && reminderSub && (
        <ReminderModal 
          sub={reminderSub} 
          month={selectedMonth} 
          year={selectedYear}
          onClose={() => setIsReminderModalOpen(false)} 
        />
      )}
    </div>
  );
}

function PaymentModal({ sub, month, year, onClose }: { sub: any, month: number, year: number, onClose: () => void }) {
  const toast = useToast();
  const [paidAmount, setPaidAmount] = useState(toMajorUnits(sub.amountPaid).toString());
  const [amountTotal, setAmountTotal] = useState(toMajorUnits(sub.amountTotal).toString());
  const [dueDate, setDueDate] = useState(sub.dueDate);
  const [notes, setNotes] = useState(sub.notes);
  const [isRejected, setIsRejected] = useState(sub.status === 'rejected');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const pAmtMinor = toMinorUnits(Number(paidAmount));
      const tAmtMinor = toMinorUnits(Number(amountTotal));
      
      let derivedStatus = 'pending';
      if (isRejected) {
        derivedStatus = 'rejected';
      } else if (pAmtMinor >= tAmtMinor && tAmtMinor > 0) {
        derivedStatus = 'paid';
      } else if (pAmtMinor > 0 && pAmtMinor < tAmtMinor) {
        derivedStatus = 'partial';
      } else {
        const isOverdue = new Date(dueDate) < new Date(new Date().toDateString());
        derivedStatus = isOverdue ? 'overdue' : 'pending';
      }

      const now = Date.now();

      if (sub.id) {
        // Update existing record
        await db.monthlySubscriptions.update(sub.id, {
          amountPaid: pAmtMinor,
          amountTotal: tAmtMinor,
          dueDate,
          notes,
          status: derivedStatus as any,
          updated_at: now,
          sync_status: 'pending'
        });
        toast.success('تم التحديث بنجاح');
      } else {
        // Create new record
        const newSub: MonthlySubscription = {
          id: uuidv4(),
          studentId: sub.studentId,
          courseId: sub.courseId,
          month,
          year,
          amountPaid: pAmtMinor,
          amountTotal: tAmtMinor,
          dueDate,
          notes,
          status: derivedStatus as any,
          created_at: now,
          updated_at: now,
          sync_status: 'pending'
        };
        await db.monthlySubscriptions.add(newSub);
        toast.success('تم تسجيل الاشتراك بنجاح');
      }
      onClose();
    } catch (err) {
      toast.error('حدث خطأ أثناء الحفظ');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">تسجيل دفعة اشتراك</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="text-sm bg-slate-50 dark:bg-slate-800 p-3 rounded-lg text-slate-700 dark:text-slate-300 mb-4">
            <p><strong>الطالب:</strong> {sub.studentName}</p>
            <p><strong>الكورس:</strong> {sub.courseName} ({month}/{year})</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المبلغ المطلوب (ج.م)</label>
              <input 
                type="number"
                required min="0"
                value={amountTotal} onChange={e => setAmountTotal(e.target.value)}
                className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded bg-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المبلغ المدفوع (ج.م)</label>
              <input 
                type="number"
                required min="0"
                value={paidAmount} onChange={e => setPaidAmount(e.target.value)}
                className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded bg-transparent font-bold text-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">تاريخ الاستحقاق</label>
            <input 
              type="date"
              required
              value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded bg-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ملاحظات</label>
            <textarea 
              value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded bg-transparent"
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="rejected"
              checked={isRejected} onChange={e => setIsRejected(e.target.checked)}
              className="rounded border-slate-300"
            />
            <label htmlFor="rejected" className="text-sm text-slate-700 dark:text-slate-300">تعليم كـ "مرفوض / ملغى"</label>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded text-sm text-slate-700">إلغاء</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-bold">حفظ الدفعة</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReminderModal({ sub, month, year, onClose }: { sub: any, month: number, year: number, onClose: () => void }) {
  const [template, setTemplate] = useState(`مرحباً {{StudentName}}،\nنود تذكيركم بموعد سداد اشتراك كورس {{CourseName}} لشهر ${month}/${year}.\nالمبلغ المطلوب: {{AmountTotal}} ج.م.\nتاريخ الاستحقاق: {{DueDate}}.\n\nمركز مسار التعليمي`);

  const preview = template
    .replace('{{StudentName}}', sub.studentName)
    .replace('{{CourseName}}', sub.courseName)
    .replace('{{AmountTotal}}', toMajorUnits(sub.amountTotal).toString())
    .replace('{{DueDate}}', sub.dueDate);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">تذكير عبر واتساب</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">رقم هاتف الطالب</label>
            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-slate-700 dark:text-slate-300 font-mono text-left" dir="ltr">
              {sub.studentPhone || 'لا يوجد رقم مسجل'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">معاينة الرسالة</label>
            <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/50 rounded-lg text-sm whitespace-pre-wrap text-slate-800 dark:text-slate-200">
              {preview}
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button 
              onClick={() => {
                if (!sub.studentPhone) return alert('لا يوجد رقم هاتف');
                const text = encodeURIComponent(preview);
                window.open(`https://wa.me/${sub.studentPhone}?text=${text}`, '_blank');
                onClose();
              }}
              disabled={!sub.studentPhone}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50"
            >
              <MessageCircle className="w-4 h-4" />
              إرسال الرسالة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
