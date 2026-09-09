import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { v4 as uuidv4 } from 'uuid';
import { Search, Plus, X, Trash2, Edit2, ShieldAlert } from 'lucide-react';
import { Student } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { Link } from 'react-router-dom';

export function Students() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const toast = useToast();
  const { confirm } = useConfirm();
  
  const students = useLiveQuery(
    () => db.students
      .filter(s => !s.deleted_at && (s.name.includes(searchTerm) || s.phone.includes(searchTerm)))
      .reverse()
      .toArray(),
    [searchTerm]
  );

  const handleDelete = async (id: string, name: string) => {
    const isConfirmed = await confirm({
      title: 'أرشفة وحذف الطالب',
      message: `هل أنت متأكد من حذف الطالب (${name})؟`,
      description: 'هذا الإجراء سيقوم بأرشفة بيانات الطالب ولن يظهر في القوائم النشطة.',
      confirmText: 'نعم، احذف الطالب',
      cancelText: 'تراجع',
      variant: 'danger',
    });

    if (isConfirmed) {
      try {
        await db.students.update(id, { 
          deleted_at: Date.now(), 
          sync_status: 'pending' 
        });
        toast.success(`تم حذف الطالب (${name}) بنجاح`);
      } catch (err) {
        toast.error('فشل حذف الطالب، يرجى المحاولة لاحقاً');
      }
    }
  };

  const handleToggleStatus = async (student: Student) => {
    try {
      await db.students.update(student.id, { 
        isActive: !student.isActive, 
        updated_at: Date.now(),
        sync_status: 'pending'
      });
      toast.success(`تم تحديث حالة الطالب بنجاح`);
    } catch (err) {
      toast.error('فشل تحديث الحالة');
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStudent(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">إدارة الطلاب</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">تسجيل بيانات الطلاب، متابعة أولياء الأمور، وإدارة الحالات</p>
        </div>
        <button 
          onClick={() => { setEditingStudent(null); setIsModalOpen(true); }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-xs text-xs font-bold"
        >
          <Plus className="w-3.5 h-3.5 ml-1.5" />
          إضافة طالب جديد
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5">
        <div className="relative max-w-sm mb-4">
          <input
            type="text"
            placeholder="بحث بالاسم أو رقم الهاتف..."
            className="w-full pl-3 pr-9 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs placeholder-slate-400 dark:placeholder-slate-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute right-2.5 top-2 text-slate-400 dark:text-slate-500 w-4 h-4" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-4 py-2.5 font-semibold">الاسم</th>
                <th className="px-4 py-2.5 font-semibold">الهاتف</th>
                <th className="px-4 py-2.5 font-semibold">المدرسة</th>
                <th className="px-4 py-2.5 font-semibold">ولي الأمر</th>
                <th className="px-4 py-2.5 font-semibold">الحالة</th>
                <th className="px-4 py-2.5 font-semibold">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {students?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                    لا يوجد طلاب مسجلين
                  </td>
                </tr>
              ) : (
                students?.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                      <Link to={`/students/${student.id}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        {student.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono" dir="ltr">{student.phone}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{student.school || '-'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      <div>{student.parentName || '-'}</div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono" dir="ltr">{student.parentPhone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleStatus(student)}
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-colors ${
                          student.isActive 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                        title="انقر لتغيير الحالة"
                      >
                        {student.isActive ? 'نشط' : 'غير نشط'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(student)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="تعديل بيانات الطالب"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(student.id, student.name)}
                          className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="حذف الطالب"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <StudentFormModal 
          onClose={handleCloseModal} 
          existingStudent={editingStudent} 
        />
      )}
    </div>
  );
}

function StudentFormModal({ onClose, existingStudent }: { onClose: () => void, existingStudent: Student | null }) {
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: existingStudent?.name || '', 
    phone: existingStudent?.phone || '', 
    parentName: existingStudent?.parentName || '', 
    parentPhone: existingStudent?.parentPhone || '', 
    school: existingStudent?.school || '', 
    leadSource: existingStudent?.leadSource || 'فيسبوك', 
    isActive: existingStudent ? existingStudent.isActive : true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const now = Date.now();
      
      if (existingStudent) {
        await db.students.update(existingStudent.id, {
          ...formData,
          updated_at: now,
          sync_status: 'pending'
        });
        toast.success(`تم تحديث بيانات الطالب (${formData.name}) بنجاح!`);
      } else {
        const newStudent: Student = {
          id: uuidv4(),
          ...formData,
          created_at: now,
          updated_at: now,
          sync_status: 'pending'
        };
        await db.students.add(newStudent);
        toast.success(`تم تسجيل الطالب (${formData.name}) بنجاح!`);
      }
      
      onClose();
    } catch (err) {
      toast.error('حدث خطأ أثناء حفظ بيانات الطالب');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {existingStudent ? 'تعديل بيانات طالب' : 'إضافة طالب جديد'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">اسم الطالب *</label>
            <input 
              required 
              type="text" 
              placeholder="الاسم ثلاثي أو رباعي"
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">هاتف الطالب *</label>
              <input 
                required 
                type="tel" 
                dir="ltr" 
                placeholder="01xxxxxxxxx"
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-right focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-mono"
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">المدرسة</label>
              <input 
                type="text" 
                placeholder="المدرسة الحالية"
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                value={formData.school} 
                onChange={e => setFormData({...formData, school: e.target.value})} 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">اسم ولي الأمر</label>
              <input 
                type="text" 
                placeholder="الأب أو الأم"
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                value={formData.parentName} 
                onChange={e => setFormData({...formData, parentName: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">هاتف ولي الأمر *</label>
              <input 
                required 
                type="tel" 
                dir="ltr" 
                placeholder="01xxxxxxxxx"
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-right focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-mono"
                value={formData.parentPhone} 
                onChange={e => setFormData({...formData, parentPhone: e.target.value})} 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">قناة التعرف علينا</label>
            <select 
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
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
          
          <div className="flex items-center pt-1">
            <input 
              type="checkbox" 
              id="isActive" 
              className="rounded text-blue-600 focus:ring-blue-500 ml-2 w-3.5 h-3.5" 
              checked={formData.isActive} 
              onChange={e => setFormData({...formData, isActive: e.target.checked})} 
            />
            <label htmlFor="isActive" className="text-xs font-medium text-slate-700 dark:text-slate-300">
              حساب نشط
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
              {existingStudent ? 'حفظ التعديلات' : 'حفظ الطالب'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
