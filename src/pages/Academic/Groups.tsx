import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { v4 as uuidv4 } from 'uuid';
import { Plus, X, Calendar, Clock, Users } from 'lucide-react';
import { Group } from '../../types';

export function Groups() {
  const [activeTab, setActiveTab] = useState<'in_progress' | 'scheduled' | 'finished'>('in_progress');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const groups = useLiveQuery(() => db.groups.where('status').equals(activeTab).toArray(), [activeTab]);
  const courses = useLiveQuery(() => db.courses.toArray(), []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">المجموعات</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 ml-2" />
          إضافة مجموعة
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          <button onClick={() => setActiveTab('in_progress')} className={`px-6 py-3 text-sm font-medium border-b-2 ${activeTab === 'in_progress' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            قيد التنفيذ
          </button>
          <button onClick={() => setActiveTab('scheduled')} className={`px-6 py-3 text-sm font-medium border-b-2 ${activeTab === 'scheduled' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            مجدول
          </button>
          <button onClick={() => setActiveTab('finished')} className={`px-6 py-3 text-sm font-medium border-b-2 ${activeTab === 'finished' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            منتهي
          </button>
        </div>

        <div className="p-6">
          {groups?.length === 0 ? (
            <div className="py-12 text-center text-slate-500">لا توجد مجموعات في هذا التصنيف</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groups?.map(group => {
                const course = courses?.find(c => c.id === group.courseId);
                return (
                  <div key={group.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-blue-500 transition-colors cursor-pointer">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">{group.name}</h3>
                      <span className="inline-flex px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        {group.type === 'in_person' ? 'حضوري' : 'أونلاين'}
                      </span>
                    </div>
                    <p className="text-sm text-blue-600 mb-4">{course?.name}</p>
                    
                    <div className="space-y-2 text-sm text-slate-600">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 ml-2 text-slate-400" />
                        <span>{group.daysOfWeek.join('، ')}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 ml-2 text-slate-400" />
                        <span>{group.startTime} - {group.endTime}</span>
                      </div>
                      <div className="flex items-center">
                        <Users className="w-4 h-4 ml-2 text-slate-400" />
                        <span>الحد الأقصى: {group.maxStudents || 'مفتوح'} طالب</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {isModalOpen && <GroupFormModal onClose={() => setIsModalOpen(false)} courses={courses || []} />}
    </div>
  );
}

function GroupFormModal({ onClose, courses }: { onClose: () => void, courses: any[] }) {
  const [formData, setFormData] = useState({
    courseId: '', name: '', type: 'in_person' as const, daysOfWeek: [] as string[],
    startTime: '', endTime: '', startDate: '', endDate: '', sessionCount: '', maxStudents: '',
    status: 'scheduled' as const, notes: ''
  });

  const days = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day) 
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const now = Date.now();
    
    await db.groups.add({
      id: uuidv4(),
      ...formData,
      sessionCount: formData.sessionCount ? Number(formData.sessionCount) : undefined,
      maxStudents: formData.maxStudents ? Number(formData.maxStudents) : undefined,
      created_at: now,
      updated_at: now,
      sync_status: 'pending'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col my-8">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">إضافة مجموعة جديدة</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">اسم المجموعة *</label>
              <input required type="text" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الكورس *</label>
              <select required className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.courseId} onChange={e => setFormData({...formData, courseId: e.target.value})}>
                <option value="">اختر الكورس...</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">نوع المجموعة</label>
              <select className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                <option value="in_person">حضوري</option>
                <option value="online">عبر الإنترنت</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الحد الأقصى للطلاب</label>
              <input type="number" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.maxStudents} onChange={e => setFormData({...formData, maxStudents: e.target.value})} />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">أيام الأسبوع *</label>
            <div className="flex flex-wrap gap-2">
              {days.map(day => (
                <button type="button" key={day} onClick={() => toggleDay(day)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    formData.daysOfWeek.includes(day) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 dark:text-slate-300 border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}>
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">وقت البدء *</label>
              <input required type="time" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">وقت الانتهاء *</label>
              <input required type="time" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">تاريخ البدء *</label>
              <input required type="date" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">عدد الحصص</label>
              <input type="number" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.sessionCount} onChange={e => setFormData({...formData, sessionCount: e.target.value})} placeholder="يحسب تاريخ الانتهاء تلقائياً" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">تاريخ الانتهاء</label>
              <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
            </div>
          </div>
          
          <div className="mt-8 flex justify-end gap-3 shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200">إلغاء</button>
            <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">حفظ المجموعة</button>
          </div>
        </form>
      </div>
    </div>
  );
}
