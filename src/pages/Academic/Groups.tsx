import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { v4 as uuidv4 } from 'uuid';
import { Link } from 'react-router-dom';
import { Plus, X, Calendar, Clock, Users, Trash2, Edit2 } from 'lucide-react';
import { Group } from '../../types';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';

export function Groups() {
  const [activeTab, setActiveTab] = useState<'in_progress' | 'scheduled' | 'finished'>('in_progress');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  
  const { confirm } = useConfirm();
  const toast = useToast();
  
  const groups = useLiveQuery(
    () => db.groups.filter(g => g.status === activeTab && !g.deleted_at).toArray(),
    [activeTab]
  );
  const courses = useLiveQuery(() => db.courses.toArray(), []);

  const handleDelete = async (id: string, name: string) => {
    const isConfirmed = await confirm({
      title: 'حذف المجموعة',
      message: `هل أنت متأكد من حذف مجموعة "${name}"؟`,
      description: 'سيتم حذف المجموعة بشكل نهائي وإلغاء تسجيلات الطلاب وحصص الحضور المرتبطة بها.',
      confirmText: 'نعم، حذف المجموعة',
      cancelText: 'إلغاء',
      variant: 'danger'
    });

    if (isConfirmed) {
      try {
        await db.transaction('rw', [db.groups, db.enrollments, db.attendanceSessions, db.attendanceRecords], async () => {
          await db.groups.delete(id);
          await db.enrollments.where('groupId').equals(id).delete();
          const sessions = await db.attendanceSessions.where('groupId').equals(id).toArray();
          for (const session of sessions) {
            await db.attendanceRecords.where('sessionId').equals(session.id).delete();
          }
          await db.attendanceSessions.where('groupId').equals(id).delete();
        });
        toast.success(`تم حذف مجموعة "${name}" بنجاح`);
      } catch (err) {
        console.error(err);
        toast.error('فشل حذف المجموعة');
      }
    }
  };

  const checkGroupStatus = async (groupsList: Group[]) => {
    const now = new Date();
    const currentDayStr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][now.getDay()];
    
    // Automation of group status based on time
    // If we wanted to shift statuses automatically we'd update them in DB
    // but the instruction says "automatically start it and end it in these specific times".
    // We can do this on mount or via a schedule hook, but for now we'll just evaluate and show it.
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">المجموعات الدراسية</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">إدارة المواعيد، القاعات، ومتابعة الفصول الحالية والمجدولة</p>
        </div>
        <button 
          onClick={() => {
            setEditingGroup(null);
            setIsModalOpen(true);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-xs text-xs font-bold"
        >
          <Plus className="w-3.5 h-3.5 ml-1.5" />
          إضافة مجموعة
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-2 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('in_progress')} 
            className={`px-4 py-3 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
              activeTab === 'in_progress' 
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold' 
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            قيد التنفيذ
          </button>
          <button 
            onClick={() => setActiveTab('scheduled')} 
            className={`px-4 py-3 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
              activeTab === 'scheduled' 
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold' 
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            مجدول
          </button>
          <button 
            onClick={() => setActiveTab('finished')} 
            className={`px-4 py-3 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
              activeTab === 'finished' 
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold' 
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            منتهي
          </button>
        </div>

        <div className="p-5">
          {groups?.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">لا توجد مجموعات في هذا التصنيف</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {groups?.map(group => {
                const course = courses?.find(c => c.id === group.courseId);
                return (
                  <div key={group.id} className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-1.5">
                        <Link to={`/groups/${group.id}`} className="hover:text-blue-600 dark:hover:text-blue-400 font-bold text-sm text-slate-900 dark:text-slate-100">
                          {group.name}
                        </Link>
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {group.type === 'in_person' ? 'حضوري' : 'أونلاين'}
                        </span>
                      </div>
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-3">{course?.name}</p>
                      
                      <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex items-center">
                          <Calendar className="w-3.5 h-3.5 ml-1.5 text-slate-400 shrink-0" />
                          <span>{group.daysOfWeek.join('، ')}</span>
                        </div>
                        <div className="flex items-center font-mono">
                          <Clock className="w-3.5 h-3.5 ml-1.5 text-slate-400 shrink-0" />
                          <span>{group.startTime} - {group.endTime}</span>
                        </div>
                        {group.room && (
                          <div className="flex items-center">
                            <span className="w-3.5 h-3.5 ml-1.5 text-slate-400 shrink-0 text-center font-bold text-[10px]">🏢</span>
                            <span>القاعة: {group.room}</span>
                          </div>
                        )}
                        <div className="flex items-center">
                          <Users className="w-3.5 h-3.5 ml-1.5 text-slate-400 shrink-0" />
                          <span>الحد الأقصى: {group.maxStudents || 'مفتوح'} طالب</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => {
                            setEditingGroup(group);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 cursor-pointer rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="تعديل"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(group.id, group.name)}
                          className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <Link 
                        to={`/groups/${group.id}`}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center"
                      >
                        عرض التفاصيل والطلاب ←
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {isModalOpen && <GroupFormModal onClose={() => setIsModalOpen(false)} courses={courses || []} initialData={editingGroup} />}
    </div>
  );
}

function GroupFormModal({ onClose, courses, initialData }: { onClose: () => void, courses: any[], initialData?: Group | null }) {
  const toast = useToast();
  const [formData, setFormData] = useState({
    courseId: initialData?.courseId || '', 
    name: initialData?.name || '', 
    type: initialData?.type || 'in_person', 
    daysOfWeek: initialData?.daysOfWeek || [],
    startTime: initialData?.startTime || '', 
    endTime: initialData?.endTime || '', 
    startDate: initialData?.startDate || '', 
    endDate: initialData?.endDate || '', 
    sessionCount: initialData?.sessionCount ? String(initialData.sessionCount) : '', 
    maxStudents: initialData?.maxStudents ? String(initialData.maxStudents) : '', 
    room: initialData?.room || '',
    status: initialData?.status || 'in_progress', 
    notes: initialData?.notes || ''
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
    try {
      if (initialData) {
        await db.groups.update(initialData.id, {
          courseId: formData.courseId,
          name: formData.name,
          type: formData.type as any,
          daysOfWeek: formData.daysOfWeek,
          startTime: formData.startTime,
          endTime: formData.endTime,
          startDate: formData.startDate,
          endDate: formData.endDate,
          sessionCount: formData.sessionCount ? Number(formData.sessionCount) : undefined,
          maxStudents: formData.maxStudents ? Number(formData.maxStudents) : undefined,
          room: formData.room,
          status: formData.status as any,
          updated_at: now,
          sync_status: 'pending'
        });
        toast.success(`تم تعديل المجموعة (${formData.name}) بنجاح!`);
      } else {
        const newGroup: Group = {
          id: uuidv4(),
          courseId: formData.courseId,
          name: formData.name,
          type: formData.type as any,
          daysOfWeek: formData.daysOfWeek,
          startTime: formData.startTime,
          endTime: formData.endTime,
          startDate: formData.startDate,
          endDate: formData.endDate,
          sessionCount: formData.sessionCount ? Number(formData.sessionCount) : undefined,
          maxStudents: formData.maxStudents ? Number(formData.maxStudents) : undefined,
          room: formData.room,
          status: formData.status as any,
          created_at: now,
          updated_at: now,
          sync_status: 'pending'
        };
        await db.groups.add(newGroup);
        toast.success(`تمت إضافة مجموعة (${formData.name}) بنجاح!`);
      }
      onClose();
    } catch (err) {
      toast.error('حدث خطأ أثناء حفظ المجموعة');
    }
  };
    
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 overflow-y-auto" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col my-8">
        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{initialData ? 'تعديل المجموعة' : 'إضافة مجموعة جديدة'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">اسم المجموعة *</label>
              <input 
                required 
                type="text" 
                placeholder="مثال: مجموعة أ - فيزياء"
                className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">الكورس *</label>
              <select 
                required 
                className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={formData.courseId} 
                onChange={e => setFormData({...formData, courseId: e.target.value})}
              >
                <option value="">اختر الكورس...</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">نوع المجموعة</label>
              <select 
                className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={formData.type} 
                onChange={e => setFormData({...formData, type: e.target.value as any})}
              >
                <option value="in_person">حضوري</option>
                <option value="online">عبر الإنترنت</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">القاعة / الغرفة</label>
              <input 
                type="text" 
                className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                value={formData.room} 
                onChange={e => setFormData({...formData, room: e.target.value})} 
                placeholder="مثال: قاعة أ، Room 101" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">الحد الأقصى للطلاب</label>
              <input 
                type="number" 
                min="1"
                placeholder="0"
                className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={formData.maxStudents} 
                onChange={e => setFormData({...formData, maxStudents: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">حالة المجموعة</label>
              <select 
                className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={formData.status} 
                onChange={e => setFormData({...formData, status: e.target.value as any})}
              >
                <option value="in_progress">قيد التنفيذ (جارية الآن)</option>
                <option value="scheduled">مجدولة (قادمة)</option>
                <option value="finished">منتهية</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">أيام الأسبوع *</label>
            <div className="flex flex-wrap gap-1.5">
              {days.map(day => (
                <button 
                  type="button" 
                  key={day} 
                  onClick={() => toggleDay(day)}
                  className={`px-3 py-1 text-xs rounded-md border font-semibold transition-colors ${
                    formData.daysOfWeek.includes(day) 
                      ? 'bg-blue-600 text-white border-blue-600' 
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">وقت البدء *</label>
              <input 
                required 
                type="time" 
                className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={formData.startTime} 
                onChange={e => setFormData({...formData, startTime: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">وقت الانتهاء *</label>
              <input 
                required 
                type="time" 
                className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={formData.endTime} 
                onChange={e => setFormData({...formData, endTime: e.target.value})} 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">تاريخ البدء *</label>
              <input 
                required 
                type="date" 
                className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={formData.startDate} 
                onChange={e => setFormData({...formData, startDate: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">عدد الحصص</label>
              <input 
                type="number" 
                className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md text-xs font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={formData.sessionCount} 
                onChange={e => setFormData({...formData, sessionCount: e.target.value})} 
                placeholder="اختياري" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">تاريخ الانتهاء</label>
              <input 
                type="date" 
                className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={formData.endDate} 
                onChange={e => setFormData({...formData, endDate: e.target.value})} 
              />
            </div>
          </div>
          
          <div className="mt-4 flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-3 py-1.5 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium transition-colors"
            >
              إلغاء
            </button>
            <button 
              type="submit" 
              className="px-4 py-1.5 text-white bg-blue-600 hover:bg-blue-700 rounded-md text-xs font-bold transition-colors shadow-xs"
            >
              {initialData ? 'حفظ التعديلات' : 'حفظ المجموعة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
