import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { v4 as uuidv4 } from 'uuid';
import { Plus, X, Trash2, BookOpen } from 'lucide-react';
import { Course } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { toMajorUnits, toMinorUnits } from '../../utils/currency';

export function Courses() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const toast = useToast();
  const { confirm } = useConfirm();
  
  const courses = useLiveQuery(() => db.courses.toArray(), []);

  const handleDelete = async (id: string, name: string) => {
    const isConfirmed = await confirm({
      title: 'حذف المادة التعليمية',
      message: `هل أنت متأكد من حذف كورس (${name})؟`,
      description: 'سيتم إزالة الكورس نهائياً من قاعدة البيانات المحلية.',
      confirmText: 'نعم، احذف الكورس',
      cancelText: 'إلغاء',
      variant: 'danger',
    });

    if (isConfirmed) {
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
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">الكورسات التعليمية</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">إدارة المواد الدراسية، التسعير، وأنظمة السداد</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-xs text-xs font-bold"
        >
          <Plus className="w-3.5 h-3.5 ml-1.5" />
          إضافة كورس جديد
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {courses?.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 dark:text-slate-500 text-xs">لا توجد كورسات مضافة بعد</div>
          ) : (
            courses?.map(course => (
              <div key={course.id} className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{course.name}</h3>
                    </div>
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${
                      course.isActive 
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}>
                      {course.isActive ? 'نشط' : 'متوقف'}
                    </span>
                  </div>

                  <div className="space-y-1.5 mt-3 text-xs">
                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>نظام الدفع:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{course.paymentType === 'monthly' ? 'شهري' : 'باقة'}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>السعر:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{toMajorUnits(course.price)} ج.م</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    onClick={() => handleDelete(course.id, course.name)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="حذف الكورس"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
        price: toMinorUnits(Number(formData.price)),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">إضافة كورس جديد</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">اسم الكورس *</label>
            <input 
              required 
              type="text" 
              placeholder="مثال: رياضيات - الصف الثالث الثانوي"
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">السعر (ج.م) *</label>
            <input 
              required 
              type="number" 
              min="0"
              placeholder="مثال: 300"
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-mono"
              value={formData.price} 
              onChange={e => setFormData({...formData, price: e.target.value})} 
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">نظام الدفع</label>
            <select 
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
              value={formData.paymentType} 
              onChange={e => setFormData({...formData, paymentType: e.target.value as any})}
            >
              <option value="monthly">شهري (تجديد كل شهر)</option>
              <option value="package">باقة كاملة (ترم أو كورس كامل)</option>
            </select>
          </div>

          <div className="flex items-center pt-1">
            <input 
              type="checkbox" 
              id="courseActive" 
              className="rounded text-blue-600 focus:ring-blue-500 ml-2 w-3.5 h-3.5" 
              checked={formData.isActive} 
              onChange={e => setFormData({...formData, isActive: e.target.checked})} 
            />
            <label htmlFor="courseActive" className="text-xs font-medium text-slate-700 dark:text-slate-300">
              كورس متاح للتسجيل (نشط)
            </label>
          </div>
          
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-3 py-1.5 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium transition-colors"
            >
              إلغاء
            </button>
            <button 
              type="submit" 
              className="px-4 py-1.5 text-white bg-blue-600 rounded-md hover:bg-blue-700 text-xs font-bold transition-colors shadow-xs"
            >
              حفظ الكورس
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
