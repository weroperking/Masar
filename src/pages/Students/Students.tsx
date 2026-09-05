import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { v4 as uuidv4 } from 'uuid';
import { Search, Plus, X, Trash2, Phone, School, User } from 'lucide-react';
import { Student } from '../../types';
import { useToast } from '../../context/ToastContext';

export function Students() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const toast = useToast();
  
  const students = useLiveQuery(
    () => db.students.filter(s => s.name.includes(searchTerm) || s.phone.includes(searchTerm)).toArray(),
    [searchTerm]
  );

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف الطالب (${name})؟`)) {
      try {
        await db.students.delete(id);
        toast.success(`تم حذف الطالب (${name}) بنجاح`);
      } catch (err) {
        toast.error('فشل حذف الطالب، يرجى المحاولة لاحقاً');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">إدارة الطلاب</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">تسجيل بيانات الطلاب، متابعة أولياء الأمور، وإدارة الحالات</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-semibold"
        >
          <Plus className="w-4 h-4 ml-2" />
          إضافة طالب جديد
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
        <div className="relative max-w-md mb-6">
          <input
            type="text"
            placeholder="بحث بالاسم أو رقم الهاتف..."
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
                <th className="px-4 py-3 font-medium rounded-r-lg">الاسم</th>
                <th className="px-4 py-3 font-medium">الهاتف</th>
                <th className="px-4 py-3 font-medium">المدرسة</th>
                <th className="px-4 py-3 font-medium">ولي الأمر</th>
                <th className="px-4 py-3 font-medium">مصدر التعارف</th>
                <th className="px-4 py-3 font-medium">الحالة</th>
                <th className="px-4 py-3 font-medium rounded-l-lg">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {students?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400 dark:text-slate-500">
                    لا يوجد طلاب مسجلين
                  </td>
                </tr>
              ) : (
                students?.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-900 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">{student.name}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300" dir="ltr">{student.phone}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{student.school || '-'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      <div>{student.parentName || '-'}</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500" dir="ltr">{student.parentPhone}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      <span className="inline-flex px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs">
                        {student.leadSource}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                        student.isActive ? 'bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:text-slate-300'
                      }`}>
                        {student.isActive ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(student.id, student.name)}
                        className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-800 transition-colors"
                        title="حذف الطالب"
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
        <StudentFormModal onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
}

function StudentFormModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: '', phone: '', parentName: '', parentPhone: '', school: '', leadSource: 'فيسبوك', isActive: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const now = Date.now();
      const newStudent: Student = {
        id: uuidv4(),
        ...formData,
        created_at: now,
        updated_at: now,
        sync_status: 'pending'
      };
      
      await db.students.add(newStudent);
      toast.success(`تم تسجيل الطالب (${formData.name}) بنجاح!`);
      onClose();
    } catch (err) {
      toast.error('حدث خطأ أثناء حفظ بيانات الطالب');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">إضافة طالب جديد</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">اسم الطالب *</label>
            <input 
              required 
              type="text" 
              placeholder="الاسم ثلاثي أو رباعي"
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">هاتف الطالب *</label>
              <input 
                required 
                type="tel" 
                dir="ltr" 
                placeholder="01xxxxxxxxx"
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-right focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المدرسة</label>
              <input 
                type="text" 
                placeholder="المدرسة الحالية"
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={formData.school} 
                onChange={e => setFormData({...formData, school: e.target.value})} 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">اسم ولي الأمر</label>
              <input 
                type="text" 
                placeholder="الأب أو الأم"
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={formData.parentName} 
                onChange={e => setFormData({...formData, parentName: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">هاتف ولي الأمر *</label>
              <input 
                required 
                type="tel" 
                dir="ltr" 
                placeholder="01xxxxxxxxx"
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-right focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={formData.parentPhone} 
                onChange={e => setFormData({...formData, parentPhone: e.target.value})} 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">قناة التعرف علينا</label>
            <select 
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              value={formData.leadSource} 
              onChange={e => setFormData({...formData, leadSource: e.target.value})}
            >
              <option value="فيسبوك">فيسبوك</option>
              <option value="انستجرام">انستجرام</option>
              <option value="ترشيح صديق">ترشيح صديق</option>
              <option value="إعلان شارع">إعلان شارع</option>
              <option value="أخرى">أخرى</option>
            </select>
          </div>
          
          <div className="flex items-center pt-2">
            <input 
              type="checkbox" 
              id="isActive" 
              className="rounded text-blue-600 focus:ring-blue-500 ml-2.5 w-4 h-4" 
              checked={formData.isActive} 
              onChange={e => setFormData({...formData, isActive: e.target.checked})} 
            />
            <label htmlFor="isActive" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              حساب نشط
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
              className="px-5 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 text-sm font-semibold shadow-sm"
            >
              حفظ الطالب
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
