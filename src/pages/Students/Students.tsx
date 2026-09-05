import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { v4 as uuidv4 } from 'uuid';
import { Search, Plus, X } from 'lucide-react';
import { Student } from '../../types';

export function Students() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const students = useLiveQuery(
    () => db.students.filter(s => s.name.includes(searchTerm) || s.phone.includes(searchTerm)).toArray(),
    [searchTerm]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900">الطلاب</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4 ml-2" />
          إضافة طالب
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
        <div className="relative max-w-md mb-6">
          <input
            type="text"
            placeholder="بحث بالاسم أو الهاتف..."
            className="w-full pl-4 pr-10 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute right-3 top-2.5 text-slate-400 w-5 h-5" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium rounded-r-lg">الاسم</th>
                <th className="px-4 py-3 font-medium">الهاتف</th>
                <th className="px-4 py-3 font-medium">المدرسة</th>
                <th className="px-4 py-3 font-medium">ولي الأمر</th>
                <th className="px-4 py-3 font-medium">مصدر التعارف</th>
                <th className="px-4 py-3 font-medium rounded-l-lg">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">لا يوجد طلاب</td>
                </tr>
              ) : (
                students?.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{student.name}</td>
                    <td className="px-4 py-3 text-slate-600" dir="ltr">{student.phone}</td>
                    <td className="px-4 py-3 text-slate-600">{student.school || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{student.parentName || '-'}</div>
                      <div className="text-xs text-slate-400" dir="ltr">{student.parentPhone}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="inline-flex px-2 py-1 bg-slate-100 rounded text-xs">{student.leadSource}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        student.isActive ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {student.isActive ? 'نشط' : 'غير نشط'}
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
        <StudentFormModal onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
}

function StudentFormModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: '', phone: '', parentName: '', parentPhone: '', school: '', leadSource: 'فيسبوك', isActive: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const now = Date.now();
    const newStudent: Student = {
      id: uuidv4(),
      ...formData,
      created_at: now,
      updated_at: now,
      sync_status: 'pending'
    };
    
    await db.students.add(newStudent);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">إضافة طالب جديد</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">اسم الطالب *</label>
              <input required type="text" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">هاتف الطالب *</label>
                <input required type="tel" dir="ltr" className="w-full px-3 py-2 border border-slate-300 rounded-md text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">المدرسة</label>
                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.school} onChange={e => setFormData({...formData, school: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">اسم ولي الأمر</label>
                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.parentName} onChange={e => setFormData({...formData, parentName: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">هاتف ولي الأمر *</label>
                <input required type="tel" dir="ltr" className="w-full px-3 py-2 border border-slate-300 rounded-md text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.parentPhone} onChange={e => setFormData({...formData, parentPhone: e.target.value})} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">قناة التعرف علينا</label>
              <select className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.leadSource} onChange={e => setFormData({...formData, leadSource: e.target.value})}>
                <option value="فيسبوك">فيسبوك</option>
                <option value="انستجرام">انستجرام</option>
                <option value="ترشيح صديق">ترشيح صديق</option>
                <option value="إعلان شارع">إعلان شارع</option>
                <option value="أخرى">أخرى</option>
              </select>
            </div>
            
            <div className="flex items-center">
              <input type="checkbox" id="isActive" className="rounded text-indigo-600 focus:ring-indigo-500 ml-2" 
                checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} />
              <label htmlFor="isActive" className="text-sm text-slate-700">حساب نشط</label>
            </div>
          </div>
          
          <div className="mt-8 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">إلغاء</button>
            <button type="submit" className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">حفظ الطالب</button>
          </div>
        </form>
      </div>
    </div>
  );
}
