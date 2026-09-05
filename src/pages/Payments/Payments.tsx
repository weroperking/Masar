import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { v4 as uuidv4 } from 'uuid';
import { Plus, X, Search, Trash2, CheckCircle2 } from 'lucide-react';
import { Payment } from '../../types';
import { useToast } from '../../context/ToastContext';

export function Payments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const toast = useToast();
  
  // Fetch required data for joins
  const students = useLiveQuery(() => db.students.toArray(), []);
  const courses = useLiveQuery(() => db.courses.toArray(), []);
  const payments = useLiveQuery(() => db.payments.toArray(), []);

  // Simple join mapping
  const studentMap = new Map(students?.map(s => [s.id, s.name]));
  const courseMap = new Map(courses?.map(c => [c.id, c.name]));

  const enrichedPayments = payments?.map(p => ({
    ...p,
    studentName: studentMap.get(p.studentId) || 'غير معروف',
    courseName: courseMap.get(p.courseId) || 'غير معروف'
  })).filter(p => p.studentName.includes(searchTerm) || p.courseName.includes(searchTerm));

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف حركة الاشتراك للطالب (${name})؟`)) {
      try {
        await db.payments.delete(id);
        toast.success(`تم حذف سجل السداد بنجاح`);
      } catch (err) {
        toast.error('فشل حذف السجل');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">الاشتراكات الشهرية</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">متابعة تحصيل المصروفات الشهرية وحالات السداد</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-semibold"
        >
          <Plus className="w-4 h-4 ml-2" />
          تحصيل اشتراك جديد
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
        <div className="relative max-w-md mb-6">
          <input
            type="text"
            placeholder="بحث باسم الطالب أو الكورس..."
            className="w-full pl-4 pr-10 py-2 bg-slate-50 dark:bg-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm placeholder-slate-400 dark:placeholder-slate-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute right-3 top-2.5 text-slate-400 dark:text-slate-500 w-5 h-5" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50 dark:bg-slate-900 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 font-medium rounded-r-lg">الطالب</th>
                <th className="px-4 py-3 font-medium">الكورس</th>
                <th className="px-4 py-3 font-medium">الشهر/السنة</th>
                <th className="px-4 py-3 font-medium">المطلوب</th>
                <th className="px-4 py-3 font-medium">المدفوع</th>
                <th className="px-4 py-3 font-medium">ملاحظات</th>
                <th className="px-4 py-3 font-medium">الحالة</th>
                <th className="px-4 py-3 font-medium rounded-l-lg">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {enrichedPayments?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400 dark:text-slate-500">لا توجد حركات مالية مسجلة</td>
                </tr>
              ) : (
                enrichedPayments?.map(payment => (
                  <tr key={payment.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-900 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">{payment.studentName}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{payment.courseName}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{payment.month}/{payment.year}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono">{payment.amountTotal} ج.م</td>
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100 font-mono">{payment.amountPaid} ج.م</td>
                    <td className="px-4 py-3 text-slate-400 dark:text-slate-500 text-xs max-w-xs truncate">{payment.notes || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                        payment.status === 'paid' ? 'bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-300' : 
                        payment.status === 'partial' ? 'bg-yellow-100 dark:bg-yellow-950/60 text-yellow-800 dark:text-yellow-300' : 
                        'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300'
                      }`}>
                        {payment.status === 'paid' ? 'مدفوع' : payment.status === 'partial' ? 'جزئي' : 'متأخر'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(payment.id, payment.studentName)}
                        className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-800 transition-colors"
                        title="حذف السجل"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <PaymentFormModal 
          onClose={() => setIsModalOpen(false)} 
          students={students || []} 
          courses={courses || []} 
        />
      )}
    </div>
  );
}

function PaymentFormModal({ onClose, students, courses }: { onClose: () => void, students: any[], courses: any[] }) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const toast = useToast();

  const [formData, setFormData] = useState({
    studentId: '', courseId: '', month: currentMonth, year: currentYear, amountTotal: '', amountPaid: '', status: 'paid' as const, notes: ''
  });

  // Auto-fill course price when selected
  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const courseId = e.target.value;
    const course = courses.find(c => c.id === courseId);
    setFormData({
      ...formData,
      courseId,
      amountTotal: course ? course.price.toString() : '',
      amountPaid: course ? course.price.toString() : ''
    });
  };

  const handlePaidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const paid = Number(e.target.value);
    const total = Number(formData.amountTotal);
    let newStatus = formData.status;
    
    if (paid >= total) newStatus = 'paid';
    else if (paid > 0) newStatus = 'partial';
    else newStatus = 'overdue';

    setFormData({ ...formData, amountPaid: e.target.value, status: newStatus as any });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const now = Date.now();
      const newPayment: Payment = {
        id: uuidv4(),
        studentId: formData.studentId,
        courseId: formData.courseId,
        month: Number(formData.month),
        year: Number(formData.year),
        amountTotal: Number(formData.amountTotal),
        amountPaid: Number(formData.amountPaid),
        status: formData.status,
        notes: formData.notes,
        created_at: now,
        updated_at: now,
        sync_status: 'pending'
      };
      
      await db.payments.add(newPayment);
      toast.success('تم تسجيل سداد الاشتراك بنجاح!');
      onClose();
    } catch (err) {
      toast.error('حدث خطأ أثناء حفظ بيانات الدفع');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">تحصيل اشتراك شهري</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الطالب *</label>
              <select 
                required 
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={formData.studentId} 
                onChange={e => setFormData({...formData, studentId: e.target.value})}
              >
                <option value="">اختر الطالب...</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الكورس *</label>
              <select 
                required 
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={formData.courseId} 
                onChange={handleCourseChange}
              >
                <option value="">اختر الكورس...</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name} - {c.price} ج.م</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الشهر</label>
              <input 
                required 
                type="number" 
                min="1" 
                max="12" 
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={formData.month} 
                onChange={e => setFormData({...formData, month: Number(e.target.value)})} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">السنة</label>
              <input 
                required 
                type="number" 
                min="2020" 
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={formData.year} 
                onChange={e => setFormData({...formData, year: Number(e.target.value)})} 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المبلغ المطلوب (ج.م) *</label>
              <input 
                required 
                type="number" 
                min="0" 
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none text-sm font-mono"
                value={formData.amountTotal} 
                readOnly 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المدفوع الفعلي (ج.م) *</label>
              <input 
                required 
                type="number" 
                min="0" 
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                value={formData.amountPaid} 
                onChange={handlePaidChange} 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">حالة الدفع</label>
            <div className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 dark:bg-slate-800">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                formData.status === 'paid' ? 'bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-300' : 
                formData.status === 'partial' ? 'bg-yellow-100 dark:bg-yellow-950/60 text-yellow-800 dark:text-yellow-300' : 
                'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300'
              }`}>
                {formData.status === 'paid' ? 'مدفوع بالكامل' : formData.status === 'partial' ? 'دفع جزئي' : 'متأخر'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ملاحظات (اختياري)</label>
            <textarea 
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm" 
              rows={2}
              value={formData.notes} 
              onChange={e => setFormData({...formData, notes: e.target.value})} 
              placeholder="مثال: دفع جزء من المبلغ نقداً والباقي مع ولي الأمر..." 
            />
          </div>
          
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-sm"
            >
              إلغاء
            </button>
            <button 
              type="submit" 
              className="px-5 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 text-sm font-semibold shadow-sm"
            >
              تأكيد الدفع
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
