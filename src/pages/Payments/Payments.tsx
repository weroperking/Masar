import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { v4 as uuidv4 } from 'uuid';
import { Plus, X, Search } from 'lucide-react';
import { Payment } from '../../types';

export function Payments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900">المالية والاشتراكات</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4 ml-2" />
          تحصيل اشتراك
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
        <div className="relative max-w-md mb-6">
          <input
            type="text"
            placeholder="بحث باسم الطالب أو الكورس..."
            className="w-full pl-4 pr-10 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute right-3 top-2.5 text-slate-400 w-5 h-5" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium rounded-r-lg">الطالب</th>
                <th className="px-4 py-3 font-medium">الكورس</th>
                <th className="px-4 py-3 font-medium">الشهر/السنة</th>
                <th className="px-4 py-3 font-medium">المطلوب</th>
                <th className="px-4 py-3 font-medium">المدفوع</th>
                <th className="px-4 py-3 font-medium">ملاحظات</th>
                <th className="px-4 py-3 font-medium rounded-l-lg">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {enrichedPayments?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">لا توجد حركات مالية</td>
                </tr>
              ) : (
                enrichedPayments?.map(payment => (
                  <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900">{payment.studentName}</td>
                    <td className="px-4 py-3 text-slate-600">{payment.courseName}</td>
                    <td className="px-4 py-3 text-slate-600">{payment.month}/{payment.year}</td>
                    <td className="px-4 py-3 text-slate-600">{payment.amountTotal} ج.م</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{payment.amountPaid} ج.م</td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">{payment.notes || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        payment.status === 'paid' ? 'bg-green-100 text-green-800' : 
                        payment.status === 'partial' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-red-100 text-red-800'
                      }`}>
                        {payment.status === 'paid' ? 'مدفوع' : payment.status === 'partial' ? 'جزئي' : 'متأخر'}
                      </span>
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
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">تحصيل اشتراك</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
          <div className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">الطالب *</label>
                <select required className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={formData.studentId} onChange={e => setFormData({...formData, studentId: e.target.value})}>
                  <option value="">اختر الطالب...</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">الكورس *</label>
                <select required className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={formData.courseId} onChange={handleCourseChange}>
                  <option value="">اختر الكورس...</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name} - {c.price} ج.م</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">الشهر</label>
                <input required type="number" min="1" max="12" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={formData.month} onChange={e => setFormData({...formData, month: Number(e.target.value)})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">السنة</label>
                <input required type="number" min="2020" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={formData.year} onChange={e => setFormData({...formData, year: Number(e.target.value)})} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">المبلغ المطلوب (ج.م) *</label>
                <input required type="number" min="0" className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md focus:outline-none"
                  value={formData.amountTotal} readOnly />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">المدفوع الفعلي (ج.م) *</label>
                <input required type="number" min="0" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={formData.amountPaid} onChange={handlePaidChange} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">حالة الدفع</label>
              <div className="px-3 py-2 border border-slate-200 rounded-md bg-slate-50">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  formData.status === 'paid' ? 'bg-green-100 text-green-800' : 
                  formData.status === 'partial' ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-red-100 text-red-800'
                }`}>
                  {formData.status === 'paid' ? 'مدفوع بالكامل' : formData.status === 'partial' ? 'دفع جزئي' : 'متأخر'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ملاحظات (اختياري)</label>
              <textarea className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" rows={2}
                value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="مثال: دفع جزء من المبلغ نقداً..." />
            </div>

          </div>
          
          <div className="mt-8 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">إلغاء</button>
            <button type="submit" className="px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700">تأكيد الدفع</button>
          </div>
        </form>
      </div>
    </div>
  );
}
