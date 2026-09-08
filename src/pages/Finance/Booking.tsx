import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Globe, Copy, Check, Plus, X, UserCheck, UserX, Trash2, Filter } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { BookingRequest, Student } from '../../types';

export function Booking() {
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'accepted' | 'rejected' | 'all'>('pending');
  const [acceptingBooking, setAcceptingBooking] = useState<BookingRequest | null>(null);

  const allBookings = useLiveQuery(() => db.bookingRequests.filter(b => !b.deleted_at).reverse().sortBy('requestDate'), []);
  const courses = useLiveQuery(() => db.courses.filter(c => !c.deleted_at).toArray(), []);
  
  const courseMap = new Map(courses?.map(c => [c.id, c.name]));
  
  // Public booking route
  const bookingLink = `${window.location.origin}/book`;

  const handleCopy = () => {
    navigator.clipboard.writeText(bookingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAcceptClick = (booking: BookingRequest) => {
    setAcceptingBooking(booking);
  };

  const handleReject = async (bookingId: string) => {
    await db.bookingRequests.update(bookingId, {
      status: 'rejected',
      updated_at: Date.now(),
      sync_status: 'pending'
    });
  };

  const handleDelete = async (bookingId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الطلب؟')) {
      await db.bookingRequests.update(bookingId, {
        deleted_at: Date.now(),
        updated_at: Date.now(),
        sync_status: 'pending'
      });
    }
  };

  const filteredBookings = allBookings?.filter(b => {
    if (activeTab === 'all') return true;
    return b.status === activeTab;
  }) || [];

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
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">رابط صفحة الحجز المباشرة (يمكنك نشره على فيسبوك وواتساب):</p>
        <div className="flex items-center gap-2 max-w-2xl">
          <input 
            type="text" 
            readOnly 
            value={bookingLink} 
            className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 font-mono focus:outline-none" 
            dir="ltr" 
          />
          <button 
            onClick={handleCopy}
            className="px-5 py-2.5 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg font-semibold text-sm flex items-center transition-colors shrink-0 border border-blue-100 dark:border-blue-800"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 ml-1.5 text-emerald-600 dark:text-emerald-400" />
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

      {/* Bookings Table with Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex gap-2 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'pending' 
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50' 
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            قيد الانتظار ({allBookings?.filter(b => b.status === 'pending').length || 0})
          </button>
          <button 
            onClick={() => setActiveTab('accepted')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'accepted' 
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50' 
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            تم القبول
          </button>
          <button 
            onClick={() => setActiveTab('rejected')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'rejected' 
                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/50' 
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            مرفوض
          </button>
          <button 
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'all' 
                ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900' 
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            الكل
          </button>
        </div>

        <div className="p-6">
          {filteredBookings?.length === 0 ? (
            <div className="text-center py-16 flex flex-col items-center">
              <Globe className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
              <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300">لا توجد طلبات في هذا القسم</h2>
              <p className="text-slate-500 text-sm mt-1 max-w-sm">
                لم يتم العثور على أي طلبات حجز تطابق الفلتر المحدد.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3 font-medium rounded-r-lg">اسم الطالب</th>
                    <th className="px-4 py-3 font-medium">رقم الهاتف</th>
                    <th className="px-4 py-3 font-medium">الكورس المطلوب</th>
                    <th className="px-4 py-3 font-medium">تاريخ الطلب</th>
                    <th className="px-4 py-3 font-medium">الحالة</th>
                    <th className="px-4 py-3 font-medium rounded-l-lg">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredBookings?.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">{b.name}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400" dir="ltr">{b.phone}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">{courseMap.get(b.courseId) || 'عام'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{b.requestDate}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2.5 py-0.5 rounded text-xs font-semibold ${
                          b.status === 'accepted' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          b.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>
                          {b.status === 'accepted' ? 'تم القبول (طالب جديد)' : 
                           b.status === 'rejected' ? 'مرفوض' : 'قيد الانتظار'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {b.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleAcceptClick(b)}
                                className="inline-flex items-center px-2.5 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 rounded text-xs font-bold transition-colors"
                                title="قبول وإضافة لقائمة الطلاب"
                              >
                                <UserCheck className="w-3.5 h-3.5 ml-1" />
                                قبول كطالب
                              </button>
                              <button
                                onClick={() => handleReject(b.id)}
                                className="inline-flex items-center px-2.5 py-1 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800 rounded text-xs font-bold transition-colors"
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
      </div>

      {isModalOpen && (
        <CreateBookingModal 
          onClose={() => setIsModalOpen(false)}
          courses={courses || []}
        />
      )}

      {acceptingBooking && (
        <AcceptBookingModal
          booking={acceptingBooking}
          onClose={() => setAcceptingBooking(null)}
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
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">إضافة طلب حجز يدوي</h2>
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
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الكورس المطلوب *</label>
            <select
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.courseId}
              onChange={e => setFormData({ ...formData, courseId: e.target.value })}
            >
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">تاريخ الحجز</label>
            <input 
              type="date"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.requestDate}
              onChange={e => setFormData({ ...formData, requestDate: e.target.value })}
            />
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

function AcceptBookingModal({ booking, onClose }: { booking: BookingRequest; onClose: () => void }) {
  const groups = useLiveQuery(() => db.groups.filter(g => !g.deleted_at && g.courseId === booking.courseId).toArray(), [booking.courseId]);
  const [selectedGroupId, setSelectedGroupId] = useState('');

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

    // 2. Enroll the student in the course/group
    await db.enrollments.add({
      id: uuidv4(),
      studentId: newStudent.id,
      courseId: booking.courseId,
      groupId: selectedGroupId,
      enrolledAt: new Date().toISOString(),
      status: 'active',
      created_at: now,
      updated_at: now,
      sync_status: 'pending'
    });

    // 3. Mark booking as accepted
    await db.bookingRequests.update(booking.id, {
      status: 'accepted',
      studentId: newStudent.id,
      updated_at: now,
      sync_status: 'pending'
    });
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">قبول الطالب وتسكينه في مجموعة</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleConfirm} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">اختر المجموعة *</label>
            <select
              required
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedGroupId}
              onChange={e => setSelectedGroupId(e.target.value)}
            >
              <option value="" disabled>-- اختر المجموعة المناسبة --</option>
              {groups?.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 text-sm">
              إلغاء
            </button>
            <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-semibold" disabled={!selectedGroupId}>
              تأكيد القبول والتسجيل
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
