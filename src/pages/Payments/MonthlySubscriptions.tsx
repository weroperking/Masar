import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { MonthlySubscription, Course, Student, Enrollment, Group } from '../../types';
import { Search, Plus, Edit2, AlertTriangle, X, MessageCircle, Check } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { toMajorUnits, toMinorUnits } from '../../utils/currency';
import { getWhatsAppUrl, formatPhoneDisplay } from '../../utils/phone';
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
          parentName: student?.parentName || '',
          parentPhone: student?.parentPhone || '',
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
      case 'paid': return <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-semibold">خالص</span>;
      case 'partial': return <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded text-[10px] font-semibold">جزء</span>;
      case 'overdue': return <span className="px-2 py-0.5 bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 rounded text-[10px] font-semibold">متأخر</span>;
      case 'no_record': return <span className="px-2 py-0.5 bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 rounded text-[10px] font-semibold">لم يسدد بعد</span>;
      case 'rejected': return <span className="px-2 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded text-[10px] font-semibold">مرفوض</span>;
      case 'pending': return <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded text-[10px] font-semibold">مستحق</span>;
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
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">الاشتراكات الشهرية</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">متابعة وتسجيل سداد اشتراكات الكورسات الشهرية</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-wrap gap-3 items-center">
        <div className="w-full sm:w-auto flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ابحث باسم الطالب أو الكورس..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-3 pr-8 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <select 
          value={selectedMonth} 
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          className="border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {Array.from({length: 12}).map((_, i) => (
            <option key={i+1} value={i+1}>شهر {i+1}</option>
          ))}
        </select>

        <select 
          value={selectedYear} 
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {[currentDate.getFullYear()-1, currentDate.getFullYear(), currentDate.getFullYear()+1].map(y => (
            <option key={y} value={y}>سنة {y}</option>
          ))}
        </select>

        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">جميع الكورسات</option>
          {courses?.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-4 py-2.5 font-semibold">الطالب</th>
                <th className="px-4 py-2.5 font-semibold">الكورس والمجموعة</th>
                <th className="px-4 py-2.5 font-semibold text-center">المطلوب</th>
                <th className="px-4 py-2.5 font-semibold text-center">المدفوع</th>
                <th className="px-4 py-2.5 font-semibold text-center">تاريخ الاستحقاق</th>
                <th className="px-4 py-2.5 font-semibold text-center">الحالة</th>
                <th className="px-4 py-2.5 font-semibold text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSubs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">
                    لا توجد اشتراكات متوقعة لهذه الفترة
                  </td>
                </tr>
              ) : (
                filteredSubs.map((sub, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{sub.studentName}</td>
                    <td className="px-4 py-3">
                      <div className="text-slate-900 dark:text-slate-100 font-medium">{sub.courseName}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{sub.groupName}</div>
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">{toMajorUnits(sub.amountTotal)} ج.م</td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">{toMajorUnits(sub.amountPaid)} ج.م</td>
                    <td className="px-4 py-3 text-center text-slate-500 font-mono text-[11px]">{sub.dueDate}</td>
                    <td className="px-4 py-3 text-center">{getStatusBadge(sub.status)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-1.5">
                        <button 
                          onClick={() => handleOpenPayment(sub)}
                          className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors"
                          title="تسجيل دفعة / تعديل"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleOpenReminder(sub)}
                          className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded transition-colors"
                          title="إرسال تذكير عبر واتساب"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">تسجيل دفعة اشتراك</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div className="text-xs bg-slate-50 dark:bg-slate-800/60 p-3 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 space-y-1">
            <p><span className="font-semibold text-slate-500 dark:text-slate-400">الطالب:</span> {sub.studentName}</p>
            <p><span className="font-semibold text-slate-500 dark:text-slate-400">الكورس:</span> {sub.courseName} ({month}/{year})</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">المبلغ المطلوب (ج.م)</label>
              <input 
                type="number"
                required min="0"
                value={amountTotal} onChange={e => setAmountTotal(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">المبلغ المدفوع (ج.م)</label>
              <input 
                type="number"
                required min="0"
                value={paidAmount} onChange={e => setPaidAmount(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">تاريخ الاستحقاق</label>
            <input 
              type="date"
              required
              value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">ملاحظات</label>
            <textarea 
              value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input 
              type="checkbox" 
              id="rejected"
              checked={isRejected} onChange={e => setIsRejected(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="rejected" className="text-xs text-slate-700 dark:text-slate-300">تعليم كـ "مرفوض / ملغى"</label>
          </div>

          <div className="mt-4 flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-3 py-1.5 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium transition-colors"
            >
              إلغاء
            </button>
            <button 
              type="submit" 
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold transition-colors shadow-xs"
            >
              حفظ الدفعة
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReminderModal({ sub, month, year, onClose }: { sub: any, month: number, year: number, onClose: () => void }) {
  const toast = useToast();
  const [recipient, setRecipient] = useState<'student' | 'parent'>('student');
  const [template, setTemplate] = useState(`مرحباً {{RecipientName}}،\nنود تذكيركم بموعد سداد اشتراك كورس {{CourseName}} لشهر ${month}/${year}.\nالمبلغ المطلوب: {{AmountTotal}} ج.م.\nتاريخ الاستحقاق: {{DueDate}}.\n\nمركز مسار التعليمي`);

  const activePhone = recipient === 'student' ? sub.studentPhone : (sub.parentPhone || sub.studentPhone);
  const activeName = recipient === 'student' ? sub.studentName : (sub.parentName || `ولي أمر الطالب ${sub.studentName}`);

  const preview = template
    .replace('{{RecipientName}}', activeName)
    .replace('{{StudentName}}', sub.studentName)
    .replace('{{CourseName}}', sub.courseName)
    .replace('{{AmountTotal}}', toMajorUnits(sub.amountTotal).toString())
    .replace('{{DueDate}}', sub.dueDate);

  const formattedDisplay = formatPhoneDisplay(activePhone);

  const handleSend = () => {
    if (!activePhone) {
      toast.error('لا يوجد رقم هاتف مسجل لهذا المستلم');
      return;
    }
    const waUrl = getWhatsAppUrl(activePhone, preview);
    if (!waUrl) {
      toast.error('صيغة رقم الهاتف غير صالحة للواتساب، يرجى مراجعة الرقم');
      return;
    }
    window.open(waUrl, '_blank');
    toast.success('جارٍ فتح محادثة الواتساب...');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">تذكير عبر واتساب</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {/* Recipient Selector if parent phone is available */}
          {sub.parentPhone && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">إرسال التذكير إلى:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRecipient('student')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    recipient === 'student'
                      ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  الطالب ({sub.studentName})
                </button>
                <button
                  type="button"
                  onClick={() => setRecipient('parent')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    recipient === 'parent'
                      ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  ولي الأمر ({sub.parentName || 'مسجل'})
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              رقم الهاتف المستهدف (بتنسيق الواتساب التلقائي)
            </label>
            <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-between">
              <span className="text-slate-900 dark:text-slate-100 font-mono text-xs font-bold" dir="ltr">
                {activePhone || 'لا يوجد رقم مسجل'}
              </span>
              {activePhone && (
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800" dir="ltr">
                  واتساب: {formattedDisplay}
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">معاينة الرسالة</label>
            <textarea
              rows={5}
              className="w-full p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-lg text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans focus:outline-none focus:ring-1 focus:ring-emerald-500"
              value={preview}
              onChange={e => setTemplate(e.target.value)}
            />
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-3 py-1.5 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium transition-colors"
            >
              إلغاء
            </button>
            <button 
              onClick={handleSend}
              disabled={!activePhone}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 transition-colors shadow-2xs"
            >
              <MessageCircle className="w-4 h-4" />
              <span>إرسال عبر واتساب</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
