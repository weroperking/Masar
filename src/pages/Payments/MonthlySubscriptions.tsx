import React, { useState, useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { MonthlySubscription, Course, Student, Enrollment, Group } from '../../types';
import { Search, Plus, Edit2, AlertTriangle, X, MessageCircle, Check, DollarSign, CheckCircle2, Wallet, Coins, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toMajorUnits, toMinorUnits } from '../../utils/currency';
import { getWhatsAppUrl, formatPhoneDisplay } from '../../utils/phone';
import { useToast } from '../../context/ToastContext';
import { calculateEnrollmentFee, recordLedgerRevenue } from '../../utils/pricing';
import { useApiQuery, useApiMutation } from '../../config/queryHooks';
import { triggerPennyDrop } from '../../components/PennyDropAnimation';

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

  const [recentlyPaidId, setRecentlyPaidId] = useState<string | null>(null);
  const [walletPulse, setWalletPulse] = useState(false);
  const [recentIncrement, setRecentIncrement] = useState<number | null>(null);
  
  const toast = useToast();
  const { getToken } = useAuth();

  const { data: allCourses = [] } = useApiQuery<Course>('courses', 60 * 1000);
  const courses = allCourses.filter(c => c.paymentType === 'monthly');
  
  const { data: allStudents = [] } = useApiQuery<Student>('students', 60 * 1000);
  const students = allStudents.filter(s => !s.deleted_at);
  
  const { data: allGroups = [] } = useApiQuery<Group>('groups', 60 * 1000);
  const groups = allGroups.filter(g => !g.deleted_at);
  
  const { data: allEnrollments = [] } = useApiQuery<Enrollment>('enrollments', 60 * 1000);
  const enrollments = allEnrollments.filter(e => e.status === 'active');
  
  const { data: allSubscriptions = [] } = useApiQuery<MonthlySubscription>('monthlySubscriptions', 60 * 1000);
  const subscriptions = allSubscriptions.filter(s => s.month === selectedMonth && s.year === selectedYear);

  const { create: createSubscription, update: updateSubscription } = useApiMutation<MonthlySubscription>('monthlySubscriptions');

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
        
        // Accurate fee calculation taking into account discount / custom / free scholarships
        const calculatedFee = calculateEnrollmentFee(course?.price || 0, enrollment);

        // Find if record exists in monthlySubscriptions
        const existingSub = subscriptions.find(s => 
          s.studentId === enrollment.studentId && 
          s.courseId === enrollment.courseId
        );

        // If existing record has no payment and doesn't match the new pricing, prioritize calculatedFee
        let amountTotal = calculatedFee;
        if (existingSub) {
          if (existingSub.amountPaid > 0) {
            amountTotal = existingSub.amountTotal;
          } else {
            amountTotal = calculatedFee;
          }
        }

        const amountPaid = existingSub ? existingSub.amountPaid : 0;
        const dueDate = existingSub?.dueDate || `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-05`;
        
        let status = 'no_record';
        if (calculatedFee === 0 && enrollment.pricingMode === 'free') {
          status = 'paid';
        } else if (existingSub) {
          if (existingSub.status === 'rejected') {
            status = 'rejected';
          } else if (amountPaid >= amountTotal && amountTotal > 0) {
            status = 'paid';
          } else if (amountPaid > 0 && amountPaid < amountTotal) {
            status = 'partial';
          } else {
            const isOverdue = new Date(dueDate) < new Date(new Date().toDateString());
            status = isOverdue ? 'overdue' : 'pending';
          }
        }

        return {
          id: existingSub?.id || null,
          enrollmentId: enrollment.id,
          studentId: enrollment.studentId,
          courseId: enrollment.courseId,
          studentName: student?.name || 'غير معروف',
          studentCode: student?.studentCode || '',
          studentPhone: student?.phone || '',
          parentName: student?.parentName || '',
          parentPhone: student?.parentPhone || '',
          courseName: course?.name || 'غير معروف',
          groupName: group?.name || 'مجموعة غير معروفة',
          basePrice: course?.price || 0,
          pricingMode: enrollment.pricingMode || 'default',
          discountPercentage: enrollment.discountPercentage,
          customPrice: enrollment.customPrice,
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
      const term = searchTerm.toLowerCase();
      const matchesName = sub.studentName.toLowerCase().includes(term);
      const matchesCourse = sub.courseName.toLowerCase().includes(term);
      const matchesCode = sub.studentCode && sub.studentCode.toLowerCase().includes(term);
      if (!matchesName && !matchesCourse && !matchesCode) {
        return false;
      }
    }
    return true;
  });

  // KPI Metrics Calculation
  const totalExpected = filteredSubs.reduce((acc, s) => acc + s.amountTotal, 0);
  const totalCollected = filteredSubs.reduce((acc, s) => acc + s.amountPaid, 0);
  const totalRemaining = Math.max(0, totalExpected - totalCollected);
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 100;

  const getStatusBadge = (status: string, isRecentlyPaid: boolean = false) => {
    if (isRecentlyPaid) {
      return (
        <motion.span
          initial={{ scale: 0.8, y: -4 }}
          animate={{ scale: [0.8, 1.25, 1], y: 0 }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 400, damping: 15 }}
          className="px-2 py-0.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40 rounded text-[10px] font-bold shadow-xs inline-flex items-center gap-1"
        >
          <Coins className="w-3 h-3 text-amber-500 animate-spin" />
          خالص
        </motion.span>
      );
    }

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

  const handleQuickFullSettle = async (sub: any) => {
    try {
      const token = await getToken();
      if (!token) throw new Error("No token");
      const remainingMinor = Math.max(0, sub.amountTotal - sub.amountPaid);
      if (remainingMinor <= 0) {
        toast.info('الاشتراك مسدد بالكامل بالفعل');
        return;
      }

      let subId = sub.id;
      if (subId) {
        await updateSubscription.mutateAsync({
          id: subId,
          data: {
            amountPaid: sub.amountTotal,
            status: 'paid'
          }
        });
      } else {
        const newSub = await createSubscription.mutateAsync({
          studentId: sub.studentId,
          courseId: sub.courseId,
          month: selectedMonth,
          year: selectedYear,
          amountPaid: sub.amountTotal,
          amountTotal: sub.amountTotal,
          dueDate: sub.dueDate,
          notes: 'سداد سريع كامل',
          status: 'paid'
        });
        subId = newSub.id;
      }

      // Record to Ledger
      await recordLedgerRevenue({
        relatedType: 'subscription',
        relatedId: subId,
        amountMinor: remainingMinor,
        description: `سداد كامل اشتراك شهر ${selectedMonth}/${selectedYear} للطالب ${sub.studentName} (${sub.courseName})`,
        token
      });

      // Trigger the Penny Drop Animation!
      triggerPennyDrop({
        amountMinor: remainingMinor,
        studentName: sub.studentName,
        courseName: sub.courseName,
        type: 'quick_settle'
      });

      // Visual feedback on row and KPI
      const rowKey = `${sub.studentId}-${sub.courseId}`;
      setRecentlyPaidId(rowKey);
      setWalletPulse(true);
      setRecentIncrement(remainingMinor);

      setTimeout(() => {
        setRecentlyPaidId(null);
        setWalletPulse(false);
        setRecentIncrement(null);
      }, 1500);

      toast.success(`تم سداد كامل اشتراك ${sub.studentName} بقيمة ${toMajorUnits(remainingMinor)} ج.م وتسجيله بالإيرادات`);
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء السداد السريع');
    }
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
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">متابعة وتسجيل سداد اشتراكات الكورسات الشهرية وحساب الخصومات والإعفاءات</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">إجمالي المطلوب للشهر</span>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
            {toMajorUnits(totalExpected).toLocaleString()} ج.م
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">بعد احتساب الخصومات والمنح</span>
        </div>

        <div className={`bg-white dark:bg-slate-900 p-4 rounded-xl border transition-all duration-300 shadow-2xs relative overflow-hidden ${
          walletPulse 
            ? 'border-emerald-500/60 ring-2 ring-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/20' 
            : 'border-slate-200 dark:border-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">المحصل الفعلي</span>
            <motion.div 
              animate={walletPulse ? { scale: [1, 1.25, 0.95, 1.1, 1], rotate: [0, -10, 10, -5, 0] } : {}}
              transition={{ duration: 0.6 }}
              className={`p-1.5 rounded-lg ${walletPulse ? 'bg-emerald-500 text-white shadow-sm' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}
            >
              <Wallet className="w-4 h-4" />
            </motion.div>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <motion.p 
              key={totalCollected}
              initial={walletPulse ? { scale: 1.15, color: '#10b981' } : false}
              animate={{ scale: 1 }}
              className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono"
            >
              {toMajorUnits(totalCollected).toLocaleString()} ج.م
            </motion.p>
          </div>
          <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5 block font-medium">
            نسبة التحصيل: {collectionRate}%
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">المتبقي / المتأخرات</span>
          <p className="text-lg font-bold text-red-600 dark:text-red-400 mt-1 font-mono">
            {toMajorUnits(totalRemaining).toLocaleString()} ج.م
          </p>
          <span className="text-[11px] text-red-500/80 mt-0.5 block">مبالغ قيد الانتظار</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">عدد الاشتراكات المقيدة</span>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1 font-mono">
            {filteredSubs.length} طالب
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            المسددين: {filteredSubs.filter(s => s.status === 'paid').length}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap gap-3 items-center">
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
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-4 py-2.5 font-semibold">الطالب ونظام التسعير</th>
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
                filteredSubs.map((sub, idx) => {
                  const isRecentlyPaid = `${sub.studentId}-${sub.courseId}` === recentlyPaidId;
                  return (
                    <tr 
                      key={idx} 
                      className={`transition-colors duration-500 ${
                        isRecentlyPaid 
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/30' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span>{sub.studentName}</span>
                          {sub.pricingMode === 'discount' && (
                            <span className="text-[10px] bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                              خصم {sub.discountPercentage || 50}%
                            </span>
                          )}
                          {sub.pricingMode === 'free' && (
                            <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                              منحة 100%
                            </span>
                          )}
                          {sub.pricingMode === 'custom' && (
                            <span className="text-[10px] bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                              سعر خاص
                            </span>
                          )}
                        </div>
                        {sub.studentPhone && (
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">{sub.studentPhone}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-900 dark:text-slate-100 font-medium">{sub.courseName}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{sub.groupName}</div>
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                        {toMajorUnits(sub.amountTotal)} ج.م
                        {sub.pricingMode !== 'default' && sub.amountTotal !== sub.basePrice && (
                          <span className="block text-[10px] text-slate-400 line-through font-normal">
                            {toMajorUnits(sub.basePrice)} ج.م
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {toMajorUnits(sub.amountPaid)} ج.م
                      </td>
                      <td className="px-4 py-3 text-center text-slate-500 font-mono text-[11px]">{sub.dueDate}</td>
                      <td className="px-4 py-3 text-center">{getStatusBadge(sub.status, isRecentlyPaid)}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center items-center gap-1.5">
                          {sub.status !== 'paid' && sub.amountTotal > 0 && (
                            <button
                              type="button"
                              onClick={() => handleQuickFullSettle(sub)}
                              className="inline-flex items-center px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-bold shadow-xs transition-colors"
                              title="سداد كامل المبلغ المتبقي وتسجيله بالإيرادات"
                            >
                              <DollarSign className="w-3 h-3 ml-0.5" />
                              سداد كامل
                            </button>
                          )}
                          <button 
                            onClick={() => handleOpenPayment(sub)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="تسجيل دفعة / تعديل"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleOpenReminder(sub)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="إرسال تذكير عبر واتساب"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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
  const { getToken } = useAuth();
  const { create: createSubscription, update: updateSubscription } = useApiMutation<MonthlySubscription>('monthlySubscriptions');
  const [paidAmount, setPaidAmount] = useState<string>(toMajorUnits(sub.amountPaid).toString());
  const [amountTotal, setAmountTotal] = useState<string>(toMajorUnits(sub.amountTotal).toString());
  const [dueDate, setDueDate] = useState<string>(sub.dueDate);
  const [notes, setNotes] = useState<string>(sub.notes || '');
  const [isRejected, setIsRejected] = useState<boolean>(sub.status === 'rejected');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = await getToken();
      if (!token) throw new Error("No token");
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

      const previousPaidMinor = sub.amountPaid || 0;
      const paymentDiffMinor = pAmtMinor - previousPaidMinor;

      let subId = sub.id;

      if (subId) {
        // Update existing record
        await updateSubscription.mutateAsync({
          id: subId,
          data: {
            amountPaid: pAmtMinor,
            amountTotal: tAmtMinor,
            dueDate,
            notes,
            status: derivedStatus as any
          }
        });
        toast.success('تم تحديث الاشتراك بنجاح');
      } else {
        // Create new record
        const newSub = await createSubscription.mutateAsync({
          studentId: sub.studentId,
          courseId: sub.courseId,
          month,
          year,
          amountPaid: pAmtMinor,
          amountTotal: tAmtMinor,
          dueDate,
          notes,
          status: derivedStatus as any
        });
        subId = newSub.id;
        toast.success('تم تسجيل الاشتراك بنجاح');
      }

      // Record any incremental payment to Ledger entries
      if (paymentDiffMinor > 0) {
        await recordLedgerRevenue({
          relatedType: 'subscription',
          relatedId: subId,
          amountMinor: paymentDiffMinor,
          description: `سداد اشتراك شهر ${month}/${year} للطالب ${sub.studentName} (${sub.courseName})`,
          token
        });

        // Trigger the Penny Drop Animation!
        triggerPennyDrop({
          amountMinor: paymentDiffMinor,
          studentName: sub.studentName,
          courseName: sub.courseName,
          type: 'subscription'
        });
      } else if (pAmtMinor > 0 && derivedStatus === 'paid' && previousPaidMinor === 0) {
        triggerPennyDrop({
          amountMinor: pAmtMinor,
          studentName: sub.studentName,
          courseName: sub.courseName,
          type: 'subscription'
        });
      }

      onClose();
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء الحفظ');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs transition-opacity" dir="rtl" onClick={onClose}>
      <div 
        className="w-full max-w-4xl lg:max-w-5xl bg-white dark:bg-slate-900 rounded-t-[24px] sm:rounded-xl shadow-2xl border-t sm:border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-auto max-h-[85vh] sm:max-h-[90vh] animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Grab Handle for mobile */}
        <div className="pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing sm:hidden shrink-0 bg-white dark:bg-slate-900">
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
        </div>

        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">تسجيل دفعة اشتراك</h2>
            <p className="text-xs text-slate-500 mt-0.5">تسجيل وتحديث بيانات سداد اشتراك الطالب الشهري</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            <div className="text-xs bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 space-y-1.5">
              <p><span className="font-semibold text-slate-500 dark:text-slate-400">الطالب:</span> <strong className="text-slate-900 dark:text-slate-100">{sub.studentName}</strong></p>
              <p><span className="font-semibold text-slate-500 dark:text-slate-400">الكورس:</span> {sub.courseName} ({month}/{year})</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">المبلغ المطلوب (ج.م) *</label>
                <input 
                  type="number"
                  required min="0"
                  value={amountTotal} onChange={e => setAmountTotal(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">المبلغ المدفوع (ج.م) *</label>
                <input 
                  type="number"
                  required min="0"
                  value={paidAmount} onChange={e => setPaidAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">تاريخ الاستحقاق *</label>
              <input 
                type="date"
                required
                value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">ملاحظات</label>
              <textarea 
                value={notes} onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input 
                type="checkbox" 
                id="rejected"
                checked={isRejected} onChange={e => setIsRejected(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="rejected" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">تعليم كـ "مرفوض / ملغى"</label>
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
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs transition-opacity" dir="rtl" onClick={onClose}>
      <div 
        className="w-full max-w-4xl lg:max-w-5xl bg-white dark:bg-slate-900 rounded-t-[24px] sm:rounded-xl shadow-2xl border-t sm:border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-auto max-h-[85vh] sm:max-h-[90vh] animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Grab Handle for mobile */}
        <div className="pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing sm:hidden shrink-0 bg-white dark:bg-slate-900">
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
        </div>

        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">تذكير عبر واتساب</h2>
              <p className="text-xs text-slate-500 mt-0.5">إرسال رسالة تذكير مخصصة بسداد الاشتراك الشهري</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            {/* Recipient Selector if parent phone is available */}
            {sub.parentPhone && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">إرسال التذكير إلى:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRecipient('student')}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
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
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
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
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-between">
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">معاينة نص الرسالة</label>
              <textarea 
                rows={5}
                className="w-full p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-lg text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans focus:outline-none focus:ring-1 focus:ring-emerald-500"
                value={preview}
                onChange={e => setTemplate(e.target.value)}
              />
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
              onClick={handleSend}
              disabled={!activePhone}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
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
