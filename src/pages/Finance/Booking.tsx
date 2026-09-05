import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Globe, Copy, Check, Plus, X, UserCheck, UserX, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { BookingRequest, Student } from '../../types';

export function Booking() {
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const bookings = useLiveQuery(() => db.bookingRequests.reverse().sortBy('requestDate'), []);
  const courses = useLiveQuery(() => db.courses.toArray(), []);

  const courseMap = new Map(courses?.map(c => [c.id, c.name]));

  const bookingLink = `${window.location.origin}/book`;

  const handleCopy = () => {
    navigator.clipboard.writeText(bookingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAccept = async (booking: BookingRequest) => {
    const now = Date.now();

    // 1. Create a student from the lead
    const newStudent: Student = {
      id: uuidv4(),
      name: booking.name,
      phone: booking.phone,
      parentName: 'ولي أمر ' + booking.name,
      parentPhone: booking.phone,
      school: '',
      leadSource: 'حجز أونلاين (الموقع)',
      isActive: true,
      created_at: now,
      updated_at: now,
      sync_status: 'pending'
    };

    await db.students.add(newStudent);

    // 2. Mark booking as accepted
    await db.bookingRequests.update(booking.id, {
      status: 'accepted',
      updated_at: now
    });
  };

  const handleReject = async (bookingId: string) => {
    await db.bookingRequests.update(bookingId, {
      status: 'rejected',
      updated_at: Date.now()
    });
  };

  const handleDelete = async (bookingId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الطلب؟')) {
      await db.bookingRequests.delete(bookingId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">الحجز الأونلاين وطلبات الانضمام (Leads)</h1>
          <p className="text-sm text-slate-500 mt-0.5">إدارة طلبات الطلاب الجدد المسجلة عبر الرابط المباشر</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold shadow-sm"
        >
          <Plus className="w-4 h-4 ml-1.5" />
          إضافة حجز يدوي
        </button>
      </div>

      {/* Shareable Link Box */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">رابط صفحة الحجز المباشرة (يمكنك نشره على فيسبوك وواتساب):</p>
        <div className="flex items-center gap-2 max-w-2xl">
          <input 
            type="text" 
            readOnly 
            value={bookingLink} 
            className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 font-mono focus:outline-none" 
            dir="ltr" 
          />
          <button 
            onClick={handleCopy}
            className="px-5 py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-semibold text-sm flex items-center transition-colors shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 ml-1.5 text-emerald-600" />
                تم النسخ!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 ml-1.5" />
                نسخ الرابط
              </>
            )}
          </button>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
        {bookings?.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center">
            <Globe className="w-12 h-12 text-slate-300 mb-4" />
            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300">لا توجد طلبات حجز حالياً</h2>
            <p className="text-slate-500 text-sm mt-1 max-w-sm">
              شارك رابط الحجز مع أولياء الأمور والطلاب لتلقي طلبات الانضمام هنا مباشرة.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium rounded-r-lg">اسم الطالب</th>
                  <th className="px-4 py-3 font-medium">رقم الهاتف</th>
                  <th className="px-4 py-3 font-medium">الكورس المطلوب</th>
                  <th className="px-4 py-3 font-medium">تاريخ الطلب</th>
                  <th className="px-4 py-3 font-medium">المبلغ المعلن</th>
                  <th className="px-4 py-3 font-medium">الحالة</th>
                  <th className="px-4 py-3 font-medium rounded-l-lg">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings?.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-900 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">{b.name}</td>
                    <td className="px-4 py-3 text-slate-600" dir="ltr">{b.phone}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">{courseMap.get(b.courseId) || 'عام'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{b.requestDate}</td>
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">{b.declaredAmount} ج.م</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded text-xs font-semibold ${
                        b.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        b.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {b.status === 'accepted' ? 'تم القبول والتحويل لطالب' :
                         b.status === 'rejected' ? 'مرفوض' : 'قيد الانتظار'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {b.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleAccept(b)}
                              className="inline-flex items-center px-2.5 py-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 rounded text-xs font-bold transition-colors"
                              title="قبول وإضافة لقائمة الطلاب"
                            >
                              <UserCheck className="w-3.5 h-3.5 ml-1" />
                              قبول كطالب
                            </button>
                            <button
                              onClick={() => handleReject(b.id)}
                              className="inline-flex items-center px-2.5 py-1 bg-red-100 text-red-800 hover:bg-red-200 rounded text-xs font-bold transition-colors"
                              title="رفض الطلب"
                            >
                              <UserX className="w-3.5 h-3.5 ml-1" />
                              رفض
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(b.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                          title="حذف الطلب"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <CreateBookingModal 
          onClose={() => setIsModalOpen(false)}
          courses={courses || []}
        />
      )}
    </div>
  );
}

function CreateBookingModal({ onClose, courses }: { onClose: () => void; courses: any[] }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    courseId: courses[0]?.id || '',
    declaredAmount: '450',
    requestDate: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const now = Date.now();
    const newBooking: BookingRequest = {
      id: uuidv4(),
      name: formData.name,
      phone: formData.phone,
      courseId: formData.courseId,
      declaredAmount: Number(formData.declaredAmount),
      requestDate: formData.requestDate,
      status: 'pending',
      created_at: now,
      updated_at: now,
      sync_status: 'pending'
    };

    await db.bookingRequests.add(newBooking);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">إضافة طلب حجز جديد</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">اسم الطالب *</label>
            <input 
              required
              type="text"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">رقم الهاتف *</label>
            <input 
              required
              type="tel"
              dir="ltr"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الكورس المطلوب *</label>
            <select
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.courseId}
              onChange={e => setFormData({ ...formData, courseId: e.target.value })}
            >
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المبلغ المعلن (ج.م)</label>
              <input 
                type="number"
                min="0"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.declaredAmount}
                onChange={e => setFormData({ ...formData, declaredAmount: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">تاريخ الحجز</label>
              <input 
                type="date"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.requestDate}
                onChange={e => setFormData({ ...formData, requestDate: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 text-sm">
              إلغاء
            </button>
            <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold">
              حفظ الحجز
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
