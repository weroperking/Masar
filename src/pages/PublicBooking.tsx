import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { v4 as uuidv4 } from 'uuid';
import { CheckCircle2, GraduationCap } from 'lucide-react';
import { BookingRequest } from '../types';

export function PublicBooking() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    courseId: '',
  });

  const courses = useLiveQuery(() => db.courses.filter(c => !c.deleted_at && c.isActive).toArray(), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.courseId) return;

    const course = courses?.find(c => c.id === formData.courseId);
    if (!course) return;

    const now = Date.now();
    const newBooking: BookingRequest = {
      id: uuidv4(),
      name: formData.name,
      phone: formData.phone,
      courseId: formData.courseId,
      declaredAmount: course.price,
      requestDate: new Date().toISOString().split('T')[0],
      status: 'pending',
      created_at: now,
      updated_at: now,
      sync_status: 'pending'
    };

    await db.bookingRequests.add(newBooking);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center border border-slate-100">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">تم تسجيل طلبك بنجاح!</h2>
          <p className="text-slate-600 mb-8">
            شكراً لك، تم استلام طلب الانضمام الخاص بك. سنتواصل معك قريباً لتأكيد الحجز.
          </p>
          <button 
            onClick={() => {
              setFormData({ name: '', phone: '', courseId: '' });
              setSubmitted(false);
            }}
            className="px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors w-full"
          >
            تسجيل طالب آخر
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 border border-slate-100">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
            <GraduationCap className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">طلب انضمام للمركز</h2>
          <p className="text-slate-500 text-sm mt-1">سجل بياناتك للالتحاق بالكورسات المتاحة</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">اسم الطالب ثلاثي *</label>
            <input
              required
              type="text"
              placeholder="الاسم الكامل"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">رقم الهاتف (واتساب) *</label>
            <input
              required
              type="tel"
              dir="ltr"
              placeholder="01..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-right font-mono"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">الكورس المطلوب *</label>
            <select
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              value={formData.courseId}
              onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
            >
              <option value="" disabled>-- اختر الكورس --</option>
              {courses?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={!formData.name || !formData.phone || !formData.courseId}
            className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            تأكيد إرسال الطلب
          </button>
        </form>
      </div>
    </div>
  );
}
