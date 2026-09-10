import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { FileText, Plus, Search, Edit2, Trash2, X, Users, CheckCircle, GraduationCap } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Assessment, Student, Course } from '../../types';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

export function Assessments() {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  const [gradingAssessment, setGradingAssessment] = useState<Assessment | null>(null);

  const assessments = useLiveQuery(() => db.assessments.filter(a => !a.deleted_at).toArray(), []);
  const courses = useLiveQuery(() => db.courses.filter(c => !c.deleted_at).toArray(), []);
  const groups = useLiveQuery(() => db.groups.filter(g => !g.deleted_at).toArray(), []);
  const enrollments = useLiveQuery(() => db.enrollments.where('status').equals('active').filter(e => !e.deleted_at).toArray(), []);
  const allGrades = useLiveQuery(() => db.assessmentGrades.filter(g => !g.deleted_at).toArray(), []);

  const courseMap = new Map(courses?.map(c => [c.id, c.name]));

  const filteredAssessments = assessments?.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (courseMap.get(a.courseId) || '').toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => b.created_at - a.created_at);

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: 'حذف التقييم والواجب',
      message: 'هل أنت متأكد من حذف هذا التقييم؟',
      description: 'سيتم نقله لسلة المهملات مع أرشفة جميع درجات وتقييمات الطلاب المرتبطة به.',
      confirmText: 'نعم، احذف التقييم',
      cancelText: 'إلغاء',
      variant: 'danger',
    });

    if (isConfirmed) {
      const now = Date.now();
      // Soft-delete the assessment
      await db.assessments.update(id, {
        deleted_at: now,
        updated_at: now,
        sync_status: 'pending'
      });
      // Soft-delete associated grades
      const gradesToDelete = allGrades?.filter(g => g.assessmentId === id && !g.deleted_at) || [];
      for (const grade of gradesToDelete) {
        await db.assessmentGrades.update(grade.id, {
          deleted_at: now,
          updated_at: now,
          sync_status: 'pending'
        });
      }
      toast.success('تم حذف التقييم بنجاح');
    }
  };

  const openEdit = (assessment: Assessment) => {
    setEditingAssessment(assessment);
    setIsModalOpen(true);
  };

  const getAssessmentStats = (assessmentId: string, courseId: string) => {
    // 1. Get groups for course
    const courseGroups = groups?.filter(g => g.courseId === courseId).map(g => g.id) || [];
    
    // 2. Get active enrollments for those groups
    const enrolledStudentIds = Array.from(new Set(
      enrollments?.filter(e => courseGroups.includes(e.groupId)).map(e => e.studentId) || []
    ));
    const totalStudents = enrolledStudentIds.length;

    // 3. Get graded count
    const gradedCount = allGrades?.filter(g => g.assessmentId === assessmentId).length || 0;

    return { totalStudents, gradedCount };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">الامتحانات والواجبات</h1>
          <p className="text-sm text-slate-500 mt-1">إدارة التقييمات ورصد درجات الطلاب</p>
        </div>
        <button 
          onClick={() => { setEditingAssessment(null); setIsModalOpen(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          إضافة تقييم
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="البحث باسم الامتحان أو الكورس..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-6 py-4 font-semibold">اسم التقييم</th>
                <th className="px-6 py-4 font-semibold">النوع</th>
                <th className="px-6 py-4 font-semibold">الكورس</th>
                <th className="px-6 py-4 font-semibold">التاريخ</th>
                <th className="px-6 py-4 font-semibold">الدرجة العظمى / التقييم</th>
                <th className="px-6 py-4 font-semibold">نسبة الرصد</th>
                <th className="px-6 py-4 font-semibold">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredAssessments?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    لا توجد تقييمات مضافة
                  </td>
                </tr>
              ) : (
                filteredAssessments?.map(assessment => {
                  const stats = getAssessmentStats(assessment.id, assessment.courseId);
                  
                  return (
                  <tr key={assessment.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">
                      {assessment.name}
                    </td>
                    <td className="px-6 py-4">
                      {assessment.type === 'exam' ? (
                        <span className="inline-flex items-center px-2.5 py-1 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-md text-xs font-bold">امتحان</span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-md text-xs font-bold">واجب</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-blue-600 dark:text-blue-400">
                      {courseMap.get(assessment.courseId)}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {assessment.date ? format(new Date(assessment.date), 'dd MMM yyyy', { locale: ar }) : '-'}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">
                      {assessment.gradingMethod === 'numeric' ? assessment.maxGrade : 'تقييم وصفي'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                          {stats.gradedCount} / {stats.totalStudents}
                        </span>
                        {stats.gradedCount === stats.totalStudents && stats.totalStudents > 0 && (
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setGradingAssessment(assessment)}
                          className="px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-md text-xs font-bold transition-colors flex items-center"
                        >
                          <GraduationCap className="w-3.5 h-3.5 ml-1" />
                          رصد الدرجات
                        </button>
                        <button onClick={() => openEdit(assessment)} className="p-1.5 text-slate-400 hover:text-blue-600 cursor-pointer transition-colors rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(assessment.id)} className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )})
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <AssessmentFormModal 
          onClose={() => setIsModalOpen(false)} 
          courses={courses || []} 
          existingAssessment={editingAssessment}
        />
      )}

      {gradingAssessment && (
        <GradingModal 
          assessment={gradingAssessment}
          onClose={() => setGradingAssessment(null)}
        />
      )}
    </div>
  );
}

function AssessmentFormModal({ 
  onClose, 
  courses,
  existingAssessment
}: { 
  onClose: () => void;
  courses: Course[];
  existingAssessment: Assessment | null;
}) {
  const [formData, setFormData] = useState({
    name: existingAssessment?.name || '',
    type: existingAssessment?.type || 'exam',
    courseId: existingAssessment?.courseId || (courses.length > 0 ? courses[0].id : ''),
    date: existingAssessment?.date || new Date().toISOString().split('T')[0],
    maxGrade: existingAssessment?.maxGrade || 10,
    gradingMethod: existingAssessment?.gradingMethod || 'numeric' as 'numeric' | 'rating',
    semester: existingAssessment?.semester || '1',
    status: existingAssessment?.status || 'draft' as 'draft' | 'completed'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const now = Date.now();
    
    if (existingAssessment) {
      await db.assessments.update(existingAssessment.id, {
        ...formData,
        updated_at: now,
        sync_status: 'pending'
      });
    } else {
      await db.assessments.add({
        id: uuidv4(),
        ...formData,
        created_at: now,
        updated_at: now,
        sync_status: 'pending'
      });
    }
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {existingAssessment ? 'تعديل التقييم' : 'إضافة تقييم جديد'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">اسم الاختبار / الواجب *</label>
            <input 
              required 
              type="text" 
              placeholder="مثال: امتحان الشهر الأول"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              value={formData.name} 
              onChange={e => setFormData({ ...formData, name: e.target.value })} 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">النوع</label>
              <select 
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={formData.type} 
                onChange={e => setFormData({ ...formData, type: e.target.value as any })}
              >
                <option value="exam">امتحان</option>
                <option value="assignment">واجب منزلي</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الكورس التابع له *</label>
              <select 
                required
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={formData.courseId} 
                onChange={e => setFormData({ ...formData, courseId: e.target.value })}
              >
                {courses.length === 0 && <option value="">لا يوجد كورسات</option>}
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">التاريخ</label>
              <input 
                type="date" 
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={formData.date} 
                onChange={e => setFormData({ ...formData, date: e.target.value })} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">طريقة التقييم</label>
              <select 
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={formData.gradingMethod} 
                onChange={e => setFormData({ ...formData, gradingMethod: e.target.value as 'numeric' | 'rating' })}
              >
                <option value="numeric">درجات (أرقام)</option>
                <option value="rating">تقييم وصفي (ممتاز، جيد، إلخ)</option>
              </select>
            </div>
          </div>

          {formData.gradingMethod === 'numeric' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الدرجة العظمى</label>
              <input 
                type="number" 
                min="1"
                required
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={formData.maxGrade} 
                onChange={e => setFormData({ ...formData, maxGrade: Number(e.target.value) })} 
              />
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-sm font-semibold transition-colors">
              إلغاء
            </button>
            <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold shadow-sm transition-colors">
              {existingAssessment ? 'حفظ التعديلات' : 'إنشاء التقييم'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GradingModal({ 
  assessment, 
  onClose 
}: { 
  assessment: Assessment; 
  onClose: () => void; 
}) {
  const groups = useLiveQuery(() => db.groups.toArray(), []);
  const enrollments = useLiveQuery(() => db.enrollments.where('status').equals('active').toArray(), []);
  const allStudents = useLiveQuery(() => db.students.filter(s => !s.deleted_at).toArray(), []);
  
  // Real roster for this specific course
  const rosterStudents = useMemo(() => {
    if (!groups || !enrollments || !allStudents) return [];
    
    // Find all groups belonging to the assessment's course
    const courseGroups = groups.filter(g => g.courseId === assessment.courseId).map(g => g.id);
    
    // Find all active student IDs enrolled in those groups
    const enrolledStudentIds = Array.from(new Set(
      enrollments.filter(e => courseGroups.includes(e.groupId)).map(e => e.studentId)
    ));
    
    // Get actual student records
    return allStudents.filter(s => enrolledStudentIds.includes(s.id));
  }, [groups, enrollments, allStudents, assessment.courseId]);

  const existingGrades = useLiveQuery(
    () => db.assessmentGrades.where('assessmentId').equals(assessment.id).filter(g => !g.deleted_at).toArray(),
    [assessment.id]
  );
  
  const [gradesMap, setGradesMap] = useState<Record<string, string>>({});
  const [isSaved, setIsSaved] = useState(false);

  React.useEffect(() => {
    if (existingGrades) {
      const map: Record<string, string> = {};
      existingGrades.forEach(g => {
        map[g.studentId!] = g.grade.toString();
      });
      setGradesMap(map);
    }
  }, [existingGrades]);

  const handleSave = async () => {
    const now = Date.now();
    for (const student of rosterStudents) {
      const gradeVal = gradesMap[student.id];
      if (gradeVal === '' || gradeVal === undefined) continue;
      
      const existing = existingGrades?.find(g => g.studentId === student.id);
      
      if (existing) {
        if (existing.grade.toString() !== gradeVal) {
          await db.assessmentGrades.update(existing.id, {
            grade: assessment.gradingMethod === 'numeric' ? Number(gradeVal) : gradeVal,
            gradedAt: now,
            updated_at: now,
            sync_status: 'pending'
          });
        }
      } else {
        await db.assessmentGrades.add({
          id: uuidv4(),
          assessmentId: assessment.id,
          studentId: student.id,
          grade: assessment.gradingMethod === 'numeric' ? Number(gradeVal) : gradeVal,
          gradedAt: now,
          created_at: now,
          updated_at: now,
          sync_status: 'pending'
        });
      }
    }
    
    setIsSaved(true);
    setTimeout(() => {
      onClose();
    }, 700);
  };

  const ratingsList = ['ممتاز', 'جيد جدا', 'جيد', 'مقبول', 'ضعيف'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              رصد الدرجات: {assessment.name}
            </h2>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                إجمالي المقيدين: {rosterStudents.length}
              </span>
              {assessment.gradingMethod === 'numeric' && (
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded">
                  الدرجة العظمى: {assessment.maxGrade}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800">
          {rosterStudents.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>لا يوجد طلاب مقيدين في هذا الكورس حالياً.</p>
            </div>
          ) : (
            rosterStudents.map(student => (
              <div key={student.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{student.name}</p>
                  <p className="text-xs text-slate-500">{student.school || student.phone}</p>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  {assessment.gradingMethod === 'numeric' ? (
                    <>
                      <input 
                        type="number"
                        max={assessment.maxGrade}
                        min="0"
                        placeholder="--"
                        value={gradesMap[student.id] || ''}
                        onChange={e => setGradesMap({ ...gradesMap, [student.id]: e.target.value })}
                        className="w-20 px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-center font-bold text-blue-700 dark:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-blue-50 dark:bg-slate-800 transition-colors"
                      />
                      <span className="text-xs font-bold text-slate-400">/ {assessment.maxGrade}</span>
                    </>
                  ) : (
                    <select
                      value={gradesMap[student.id] || ''}
                      onChange={e => setGradesMap({ ...gradesMap, [student.id]: e.target.value })}
                      className="w-32 px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50 dark:bg-slate-800 transition-colors"
                    >
                      <option value="">- لم يرصد -</option>
                      {ratingsList.map(rating => (
                        <option key={rating} value={rating}>{rating}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          {isSaved ? (
            <span className="text-emerald-600 font-bold text-sm">✓ تم حفظ درجات التقييم بنجاح!</span>
          ) : (
            <span className="text-xs text-slate-500">
              {Object.keys(gradesMap).filter(k => gradesMap[k] !== '').length} / {rosterStudents.length} تم رصده
            </span>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors">
              إلغاء
            </button>
            <button type="button" onClick={handleSave} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors">
              حفظ الدرجات
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
