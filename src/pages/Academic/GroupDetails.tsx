import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { ArrowRight, Users, UserPlus, Calendar, Clock, X, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '../../context/ToastContext';

export function GroupDetails() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);

  const group = useLiveQuery(() => db.groups.get(id as string), [id]);
  const course = useLiveQuery(() => group ? db.courses.get(group.courseId) : undefined, [group]);
  
  // Active Enrollments
  const enrollments = useLiveQuery(
    () => db.enrollments.where('groupId').equals(id as string).toArray(),
    [id]
  );
  const activeEnrollments = enrollments?.filter(e => e.status === 'active') || [];
  const activeStudentIds = activeEnrollments.map(e => e.studentId);

  // Get enrolled students details
  const students = useLiveQuery(
    () => db.students.filter(s => !s.deleted_at).toArray(), 
    []
  );

  if (!group || !course) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">جاري تحميل بيانات المجموعة...</p>
      </div>
    );
  }

  const handleRemoveStudent = async (enrollmentId: string, studentName: string) => {
    if (confirm(`هل أنت متأكد من سحب الطالب (${studentName}) من هذه المجموعة؟`)) {
      try {
        await db.enrollments.update(enrollmentId, {
          status: 'withdrawn',
          updated_at: Date.now(),
          sync_status: 'pending'
        });
        toast.success('تم سحب الطالب من المجموعة بنجاح');
      } catch (err) {
        toast.error('حدث خطأ أثناء سحب الطالب');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/groups" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{group.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
              group.status === 'in_progress' ? 'bg-green-100 text-green-800' :
              group.status === 'finished' ? 'bg-slate-100 text-slate-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {group.status === 'in_progress' ? 'جارية' : group.status === 'finished' ? 'منتهية' : 'مجدولة'}
            </span>
            <span>•</span>
            <span>{course.name}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">سجل الطلاب (الروستر)</h3>
              <span className="text-sm text-slate-500 mr-2">
                ({activeEnrollments.length} / {group.maxStudents || '∞'})
              </span>
            </div>
            <button
              onClick={() => setIsEnrollModalOpen(true)}
              disabled={group.maxStudents ? activeEnrollments.length >= group.maxStudents : false}
              className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <UserPlus className="w-4 h-4 ml-1" />
              إضافة طالب
            </button>
          </div>

          {activeEnrollments.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>لا يوجد طلاب مسجلين في هذه المجموعة حالياً.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3 font-medium rounded-r-lg">اسم الطالب</th>
                    <th className="px-4 py-3 font-medium">تاريخ التسجيل</th>
                    <th className="px-4 py-3 font-medium rounded-l-lg">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {activeEnrollments.map(enrollment => {
                    const student = students?.find(s => s.id === enrollment.studentId);
                    return (
                      <tr key={enrollment.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                          <Link to={`/students/${student?.id}`} className="hover:text-blue-600 hover:underline">
                            {student?.name || 'غير معروف'}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {format(new Date(enrollment.enrolledAt), 'dd MMM yyyy', { locale: ar })}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleRemoveStudent(enrollment.id, student?.name || '')}
                            className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                            title="سحب الطالب"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm self-start">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">معلومات المجموعة</h3>
          <div className="space-y-4">
            <div>
              <span className="block text-xs text-slate-500 mb-1">النوع</span>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {group.type === 'in_person' ? 'حضور بالسنتر' : 'عبر الإنترنت (أونلاين)'}
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <span className="block text-xs text-slate-500 mb-1">أيام المواعيد</span>
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-900 dark:text-slate-100">
                <Calendar className="w-4 h-4 text-blue-500" />
                {group.daysOfWeek.join('، ')}
              </div>
            </div>
            <div>
              <span className="block text-xs text-slate-500 mb-1">التوقيت</span>
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-900 dark:text-slate-100" dir="ltr">
                <Clock className="w-4 h-4 text-blue-500" />
                {group.startTime} - {group.endTime}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div>
                <span className="block text-xs text-slate-500 mb-1">تاريخ البدء</span>
                <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{group.startDate}</p>
              </div>
              <div>
                <span className="block text-xs text-slate-500 mb-1">تاريخ الانتهاء</span>
                <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{group.endDate || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isEnrollModalOpen && (
        <EnrollStudentModal 
          groupId={group.id} 
          courseId={course.id} 
          existingStudentIds={activeStudentIds} 
          onClose={() => setIsEnrollModalOpen(false)} 
        />
      )}
    </div>
  );
}

function EnrollStudentModal({ groupId, courseId, existingStudentIds, onClose }: { groupId: string, courseId: string, existingStudentIds: string[], onClose: () => void }) {
  const toast = useToast();
  const [selectedStudentId, setSelectedStudentId] = useState('');
  
  const students = useLiveQuery(
    () => db.students.filter(s => s.isActive && !s.deleted_at && !existingStudentIds.includes(s.id)).toArray(),
    [existingStudentIds]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;

    try {
      const now = Date.now();
      await db.enrollments.add({
        id: uuidv4(),
        studentId: selectedStudentId,
        groupId,
        courseId,
        enrolledAt: new Date().toISOString(),
        status: 'active',
        created_at: now,
        updated_at: now,
        sync_status: 'pending'
      });
      toast.success('تم تسجيل الطالب في المجموعة بنجاح');
      onClose();
    } catch (err) {
      toast.error('حدث خطأ أثناء التسجيل');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">إضافة طالب للمجموعة</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">الطالب *</label>
            <select 
              required 
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              value={selectedStudentId} 
              onChange={e => setSelectedStudentId(e.target.value)}
            >
              <option value="">اختر الطالب...</option>
              {students?.map(s => <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>)}
            </select>
            {students?.length === 0 && (
              <p className="text-xs text-amber-600 mt-2">لا يوجد طلاب نشطين غير مسجلين في هذه المجموعة.</p>
            )}
          </div>
          
          <div className="mt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-sm font-medium transition-colors">
              إلغاء
            </button>
            <button 
              type="submit" 
              disabled={!selectedStudentId}
              className="px-5 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 text-sm font-semibold shadow-sm disabled:opacity-50 transition-colors"
            >
              تأكيد التسجيل
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
