import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Wallet, Search, Plus, X, Trash2, CheckCircle2, Edit2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { SessionPayment } from '../../types';
import { toMajorUnits, toMinorUnits } from '../../utils/currency';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

export function SessionPayments() {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState<'all' | 'fee' | 'package'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<SessionPayment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const payments = useLiveQuery(() => {
    return db.sessionPayments.filter(p => {
      if (p.deleted_at) return false;
      if (activeTab !== 'all' && p.type !== activeTab) return false;
      return true;
    }).toArray();
  }, [activeTab]);

  const sessions = useLiveQuery(() => db.attendanceSessions.toArray(), []);
  const students = useLiveQuery(() => db.students.toArray(), []);
  const courses = useLiveQuery(() => db.courses.toArray(), []);

  const studentMap = new Map(students?.map(s => [s.id, s.name]));
  const courseMap = new Map(courses?.map(c => [c.id, c.name]));
  const sessionMap = new Map(sessions?.map(s => [s.id, s]));

  // Financial calculations
  const totalEarned = payments?.reduce((acc, p) => {
    // Earned Revenue: sum of amount where the linked session is completed.
    // If it's a package (no sessionId), we can count it as earned or prorate it, 
    // but based on instructions we check if linked session is completed.
    // For packages without a sessionId, we'll count the amount paid as earned or just the amount.
    // Let's count packages as earned if they are paid, and fees as earned if session is completed.
    let isEarned = false;
    if (p.type === 'package') {
       isEarned = true; // Package revenue is recognized upon purchase in this simple model
    } else if (p.sessionId) {
       const session = sessionMap.get(p.sessionId);
       if (session?.status === 'completed') {
         isEarned = true;
       }
    }
    
    return isEarned ? acc + (p.amount || 0) : acc;
  }, 0) || 0;

  const totalCollected = payments?.reduce((acc, p) => acc + (p.paidAmount || 0), 0) || 0;

  const filteredPayments = payments?.map(p => ({
    ...p,
    studentName: studentMap.get(p.studentId) || 'غير معروف',
    courseName: courseMap.get(p.courseId) || 'غير معروف'
  })).filter(p => 
    p.studentName.includes(searchTerm) || p.courseName.includes(searchTerm)
  );

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: 'حذف دفعة الحصة',
      message: 'هل أنت متأكد من حذف سجل هذه الدفعة؟',
      description: 'سيتم أرشفة سجل الدفعة المالية وإعادة حساب إجمالي التحصيلات.',
      confirmText: 'نعم، احذف الدفعة',
      cancelText: 'إلغاء',
      variant: 'danger',
    });

    if (isConfirmed) {
      await db.sessionPayments.update(id, {
        deleted_at: Date.now(),
        updated_at: Date.now(),
        sync_status: 'pending'
      });
      toast.success('تم حذف الدفعة بنجاح');
    }
  };

  const handleSettle = async (payment: SessionPayment) => {
    const remaining = payment.amount - payment.paidAmount;
    if (remaining <= 0) return;

    await db.sessionPayments.update(payment.id, {
      paidAmount: payment.amount,
      status: 'paid',
      updated_at: Date.now()
    });

    // Record ledger revenue
    await db.ledgerEntries.add({
      id: uuidv4(),
      type: 'revenue',
      category: 'تسديد متأخرات حصص',
      amount: remaining,
      date: new Date().toISOString().split('T')[0],
      description: `تسديد باقي رسوم الحصة للطالب ${studentMap.get(payment.studentId)}`,
      relatedType: 'session',
      relatedId: payment.id,
      created_at: Date.now(),
      updated_at: Date.now(),
      sync_status: 'pending'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">مدفوعات الحصص والباقات</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">متابعة رسوم الحصص الفردية، الباقات، وسداد الطلاب</p>
        </div>
        <button 
          onClick={() => {
            setEditingPayment(null);
            setIsModalOpen(true);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-bold shadow-xs"
        >
          <Plus className="w-3.5 h-3.5 ml-1.5" />
          تحصيل جديد
        </button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">الإيراد المكتسب (الحصص والباقات المقررة)</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{toMajorUnits(totalEarned).toLocaleString()}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">ج.م</span>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">النقد المحصّل فعلياً في الخزينة</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{toMajorUnits(totalCollected).toLocaleString()}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">ج.م</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-4">
          <button onClick={() => setActiveTab('all')} className={`px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${activeTab === 'all' ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            الكل ({payments?.length || 0})
          </button>
          <button onClick={() => setActiveTab('fee')} className={`px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${activeTab === 'fee' ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            رسوم حصة
          </button>
          <button onClick={() => setActiveTab('package')} className={`px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${activeTab === 'package' ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            باقات شهرية
          </button>
        </div>

        <div className="p-5">
          <div className="relative max-w-sm mb-4">
            <input
              type="text"
              placeholder="بحث باسم الطالب أو الكورس..."
              className="w-full pl-3 pr-9 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs placeholder-slate-400 dark:placeholder-slate-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute right-2.5 top-2 text-slate-400 dark:text-slate-500 w-4 h-4" />
          </div>

          {filteredPayments?.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="w-8 h-8 text-slate-400 opacity-40 mx-auto mb-2" />
              <p className="text-slate-500 text-xs">لا توجد حركات مالية للحصص في هذا القسم</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">الطالب</th>
                    <th className="px-4 py-2.5 font-semibold">الكورس</th>
                    <th className="px-4 py-2.5 font-semibold">النوع</th>
                    <th className="px-4 py-2.5 font-semibold">التاريخ</th>
                    <th className="px-4 py-2.5 font-semibold">المطلوب</th>
                    <th className="px-4 py-2.5 font-semibold">المدفوع</th>
                    <th className="px-4 py-2.5 font-semibold">الحالة</th>
                    <th className="px-4 py-2.5 font-semibold">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPayments?.map(p => {
                    const remaining = p.amount - p.paidAmount;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{p.studentName}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.courseName}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            {p.type === 'fee' ? 'رسوم حصة' : 'باقة'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">{p.date}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100 font-mono">{toMajorUnits(p.amount)} ج.م</td>
                        <td className="px-4 py-3 font-semibold text-blue-600 dark:text-blue-400 font-mono">{toMajorUnits(p.paidAmount)} ج.م</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            p.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 
                            p.status === 'partial' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' : 
                            'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                          }`}>
                            {p.status === 'paid' ? 'مدفوع بالكامل' : p.status === 'partial' ? `متبقي ${toMajorUnits(remaining)} ج.م` : 'غير مدفوع'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {remaining > 0 && (
                              <button
                                onClick={() => handleSettle(p)}
                                className="inline-flex items-center px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 rounded text-[10px] font-semibold transition-colors"
                                title="تسديد المتبقي"
                              >
                                <CheckCircle2 className="w-3 h-3 ml-1" />
                                تسديد
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEditingPayment(p);
                                setIsModalOpen(true);
                              }}
                              className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors"
                              title="تعديل"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
                              title="حذف"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
      </div>

      {isModalOpen && (
        <CreateSessionPaymentModal 
          onClose={() => {
            setIsModalOpen(false);
            setEditingPayment(null);
          }}
          students={students || []}
          courses={courses || []}
          initialData={editingPayment}
        />
      )}
    </div>
  );
}

function CreateSessionPaymentModal({ 
  onClose, 
  students, 
  courses,
  initialData
}: { 
  onClose: () => void; 
  students: any[]; 
  courses: any[];
  initialData?: SessionPayment | null;
}) {
  const [formData, setFormData] = useState({
    studentId: initialData?.studentId || students[0]?.id || '',
    courseId: initialData?.courseId || courses[0]?.id || '',
    type: initialData?.type || ('fee' as 'fee' | 'package'),
    amount: initialData ? toMajorUnits(initialData.amount).toString() : '60',
    paidAmount: initialData ? toMajorUnits(initialData.paidAmount).toString() : '60',
    date: initialData?.date || new Date().toISOString().split('T')[0]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(formData.amount);
    const paidNum = Number(formData.paidAmount);
    let status: 'paid' | 'partial' | 'unpaid' = 'paid';
    if (paidNum >= amountNum) status = 'paid';
    else if (paidNum > 0) status = 'partial';
    else status = 'unpaid';

    const now = Date.now();
    
    if (initialData) {
      await db.sessionPayments.update(initialData.id, {
        studentId: formData.studentId,
        courseId: formData.courseId,
        type: formData.type,
        amount: toMinorUnits(amountNum),
        paidAmount: toMinorUnits(paidNum),
        date: formData.date,
        status,
        updated_at: now,
        sync_status: 'pending'
      });
    } else {
      const newPaymentId = uuidv4();
      const newPayment: SessionPayment = {
        id: newPaymentId,
        studentId: formData.studentId,
        courseId: formData.courseId,
        sessionId: null,
        type: formData.type,
        amount: toMinorUnits(amountNum),
        paidAmount: toMinorUnits(paidNum),
        date: formData.date,
        status,
        created_at: now,
        updated_at: now,
        sync_status: 'pending'
      };

      await db.sessionPayments.add(newPayment);

      // If paid > 0, record in ledgerEntries as revenue
      if (paidNum > 0) {
        await db.ledgerEntries.add({
          id: uuidv4(),
          type: 'revenue',
          category: formData.type === 'fee' ? 'رسوم حصص' : 'اشتراكات باقات',
          amount: toMinorUnits(paidNum),
          date: formData.date,
          description: `تحصيل رسوم للطالب`,
          relatedType: 'session',
          relatedId: newPaymentId,
          created_at: now,
          updated_at: now,
          sync_status: 'pending'
        });
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {initialData ? 'تعديل بيانات الدفعة' : 'تحصيل رسوم حصة أو باقة'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">الطالب *</label>
            <select
              required
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={formData.studentId}
              onChange={e => setFormData({ ...formData, studentId: e.target.value })}
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">الكورس *</label>
            <select
              required
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={formData.courseId}
              onChange={e => setFormData({ ...formData, courseId: e.target.value })}
            >
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">نوع التحصيل</label>
              <select
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value as any })}
              >
                <option value="fee">رسوم حصة</option>
                <option value="package">باقة حصص</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">التاريخ</label>
              <input
                type="date"
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">المبلغ المطلوب (ج.م)</label>
              <input
                type="number"
                min="0"
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">المبلغ المدفوع (ج.م)</label>
              <input
                type="number"
                min="0"
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                value={formData.paidAmount}
                onChange={e => setFormData({ ...formData, paidAmount: e.target.value })}
              />
            </div>
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
              className="px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs font-bold transition-colors shadow-xs"
            >
              حفظ التحصيل
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
