import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { v4 as uuidv4 } from 'uuid';
import { Plus, X, Trash2, BookOpen } from 'lucide-react';
import { Course } from '../../types';
import { useToast } from '../../context/ToastContext';

export function Courses() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const toast = useToast();
  
  const courses = useLiveQuery(() => db.courses.toArray(), []);

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف كورس (${name})؟`)) {
      try {
        await db.courses.delete(id);
        toast.success(`تم حذف كورس (${name}) بنجاح`);
      } catch (err) {
        toast.error('فشل حذف الكورس');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">الكورسات التعليمية</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">إدارة المواد الدراسية، التسعير، وأنظمة السداد</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm text-sm font-semibold"
        >
          <Plus className="w-4 h-4 ml-2" />
          إضافة كورس جديد
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses?.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 dark:text-slate-500">لا توجد كورسات مضافة بعد</div>
          ) : (
            courses?.map(course => (
              <div key={course.id} className="border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 rounded-xl p-5 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">{course.name}</h3>
                    </div>
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                      course.isActive ? 'bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 dark:text-slate-300'
                    }`}>
                      {course.isActive ? 'نشط' : 'متوقف'}
                    </span>
                  </div>

                  <div className="space-y-2 mt-4 text-xs">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>نظام الدفع:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 dark:text-slate-200">{course.paymentType === 'monthly' ? 'شهري' : 'باقة'}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>السعر:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">{course.price} ج.م</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 dark:border-slate-700/60 flex justify-end">
                  <button
                    onClick={() => handleDelete(course.id, course.name)}
                    className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    title="حذف الكورس"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isModalOpen && (
        <CourseFormModal onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
}

function CourseFormModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: '', price: '', paymentType: 'monthly' as const, isActive: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const now = Date.now();
      const newCourse: Course = {
        id: uuidv4(),
        name: formData.name,
        price: Number(formData.price),
        paymentType: formData.paymentType,
        isActive: formData.isActive,
        created_at: now,
        updated_at: now,
        sync_status: 'pending'
      };
      
      await db.courses.add(newCourse);
      toast.success(`تمت إضافة كورس (${formData.name}) بنجاح!`);
      onClose();
    } catch (err) {
      toast.error('حدث خطأ أثناء حفظ الكورس');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">إضافة كورس جديد</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">اسم الكورس *</label>
            <input 
              required 
              type="text" 
              placeholder="مثال: رياضيات - الصف الثالث الثانوي"
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">السعر (ج.م) *</label>
            <input 
              required 
              type="number" 
              min="0"
              placeholder="مثال: 300"
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-mono"
              value={formData.price} 
              onChange={e => setFormData({...formData, price: e.target.value})} 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">نظام الدفع</label>
            <select 
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              value={formData.paymentType} 
              onChange={e => setFormData({...formData, paymentType: e.target.value as any})}
            >
              <option value="monthly">شهري (تجديد كل شهر)</option>
              <option value="package">باقة كاملة (ترم أو كورس كامل)</option>
            </select>
          </div>

          <div className="flex items-center pt-2">
            <input 
              type="checkbox" 
              id="courseActive" 
              className="rounded text-emerald-600 focus:ring-emerald-500 ml-2.5 w-4 h-4" 
              checked={formData.isActive} 
              onChange={e => setFormData({...formData, isActive: e.target.checked})} 
            />
            <label htmlFor="courseActive" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              كورس متاح للتسجيل (نشط)
            </label>
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
              className="px-5 py-2 text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 text-sm font-semibold shadow-sm"
            >
              حفظ الكورس
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
