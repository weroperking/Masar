import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { v4 as uuidv4 } from 'uuid';
import { Plus, X } from 'lucide-react';
import { Course } from '../../types';

export function Courses() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const courses = useLiveQuery(() => db.courses.toArray(), []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">الكورسات</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4 ml-2" />
          إضافة كورس
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses?.length === 0 ? (
            <div className="col-span-full py-8 text-center text-slate-500">لا توجد كورسات مضافة</div>
          ) : (
            courses?.map(course => (
              <div key={course.id} className="border border-slate-200 rounded-lg p-5 hover:border-emerald-500 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-slate-900">{course.name}</h3>
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs ${course.isActive ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>
                    {course.isActive ? 'نشط' : 'موقف'}
                  </span>
                </div>
                <div className="space-y-2 mt-4 text-sm text-slate-600">
                  <div className="flex justify-between">
                    <span>نظام الدفع:</span>
                    <span className="font-medium text-slate-900">{course.paymentType === 'monthly' ? 'شهري' : 'باقة'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>السعر:</span>
                    <span className="font-bold text-emerald-600">{course.price} ج.م</span>
                  </div>
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
  const [formData, setFormData] = useState({
    name: '', price: '', paymentType: 'monthly' as const, isActive: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">إضافة كورس جديد</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">اسم الكورس *</label>
              <input required type="text" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">السعر (ج.م) *</label>
                <input required type="number" min="0" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">نظام الدفع</label>
                <select className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={formData.paymentType} onChange={e => setFormData({...formData, paymentType: e.target.value as 'monthly' | 'package'})}>
                  <option value="monthly">اشتراك شهري</option>
                  <option value="package">باقة كاملة</option>
                </select>
              </div>
            </div>

            <div className="flex items-center pt-2">
              <input type="checkbox" id="isActiveCourse" className="rounded text-emerald-600 focus:ring-emerald-500 ml-2" 
                checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} />
              <label htmlFor="isActiveCourse" className="text-sm text-slate-700">كورس نشط</label>
            </div>
          </div>
          
          <div className="mt-8 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">إلغاء</button>
            <button type="submit" className="px-4 py-2 text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">حفظ الكورس</button>
          </div>
        </form>
      </div>
    </div>
  );
}
