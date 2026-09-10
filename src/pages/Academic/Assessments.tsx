import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { 
  FileText, Plus, Search, Edit2, Trash2, X, Users, CheckCircle, 
  GraduationCap, Check, Sparkles, UserPlus, SlidersHorizontal, Calculator 
} from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {existingAssessment ? 'تعديل التقييم' : 'إنشاء تقييم / واجب جديد'}
              </h2>
              <p className="text-xs text-slate-500">حدد بيانات الاختبار أو الواجب لربطه بدرجات الطلاب</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">اسم الاختبار / الواجب *</label>
            <input 
              required 
              type="text" 
              placeholder="مثال: امتحان الشهر الأول - فيزياء"
              className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-2xs"
              value={formData.name} 
              onChange={e => setFormData({ ...formData, name: e.target.value })} 
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">النوع *</label>
              <select 
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-2xs"
                value={formData.type} 
                onChange={e => setFormData({ ...formData, type: e.target.value as any })}
              >
                <option value="exam">امتحان / اختبار رسمي</option>
                <option value="assignment">واجب منزلي / كويز سريع</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">الكورس التابع له *</label>
              <select 
                required
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-2xs"
                value={formData.courseId} 
                onChange={e => setFormData({ ...formData, courseId: e.target.value })}
              >
                {courses.length === 0 && <option value="">لا يوجد كورسات متاحة</option>}
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">تاريخ الاختبار</label>
              <input 
                type="date" 
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-2xs"
                value={formData.date} 
                onChange={e => setFormData({ ...formData, date: e.target.value })} 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">نظام التقييم *</label>
              <select 
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-2xs"
                value={formData.gradingMethod} 
                onChange={e => setFormData({ ...formData, gradingMethod: e.target.value as 'numeric' | 'rating' })}
              >
                <option value="numeric">درجات رقمية (أرقام ومعدلات)</option>
                <option value="rating">تقييم وصفي (ممتاز، جيد جداً، إلخ)</option>
              </select>
            </div>
          </div>

          {formData.gradingMethod === 'numeric' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">الدرجة العظمى (النهائية) *</label>
              <input 
                type="number" 
                min="1"
                step="any"
                required
                placeholder="مثال: 20 أو 50 أو 100"
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-2xs font-mono font-bold"
                value={formData.maxGrade} 
                onChange={e => setFormData({ ...formData, maxGrade: Number(e.target.value) })} 
              />
            </div>
          )}

          <div className="mt-6 flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold transition-colors"
            >
              إلغاء
            </button>
            <button 
              type="submit" 
              className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-xs font-bold shadow-2xs transition-colors"
            >
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
  const toast = useToast();
  const groups = useLiveQuery(() => db.groups.toArray(), []);
  const enrollments = useLiveQuery(() => db.enrollments.where('status').equals('active').toArray(), []);
  const allStudents = useLiveQuery(() => db.students.filter(s => !s.deleted_at).toArray(), []);
  
  const [scope, setScope] = useState<'course' | 'all'>('course');
  const [searchQuery, setSearchQuery] = useState('');
  const [extraStudents, setExtraStudents] = useState<Student[]>([]);
  const [showAddStudentPicker, setShowAddStudentPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  // Enrolled students in course groups
  const courseRosterStudents = useMemo(() => {
    if (!groups || !enrollments || !allStudents) return [];
    const courseGroups = groups.filter(g => g.courseId === assessment.courseId).map(g => g.id);
    const enrolledStudentIds = Array.from(new Set(
      enrollments.filter(e => courseGroups.includes(e.groupId)).map(e => e.studentId)
    ));
    return allStudents.filter(s => enrolledStudentIds.includes(s.id));
  }, [groups, enrollments, allStudents, assessment.courseId]);

  // If course has no enrolled students yet, automatically default to all students so user can grade immediately!
  React.useEffect(() => {
    if (courseRosterStudents.length === 0 && allStudents && allStudents.length > 0) {
      setScope('all');
    }
  }, [courseRosterStudents.length, allStudents]);

  // Combined active list based on scope and manually added extra students
  const activeStudentList = useMemo(() => {
    const baseList = scope === 'course' ? courseRosterStudents : (allStudents || []);
    const merged = [...baseList];
    extraStudents.forEach(st => {
      if (!merged.some(m => m.id === st.id)) {
        merged.push(st);
      }
    });
    return merged;
  }, [scope, courseRosterStudents, allStudents, extraStudents]);

  // Filtered by search query
  const displayedStudents = useMemo(() => {
    if (!searchQuery.trim()) return activeStudentList;
    const q = searchQuery.toLowerCase().trim();
    return activeStudentList.filter(s => 
      s.name.toLowerCase().includes(q) ||
      (s.studentCode && s.studentCode.includes(q)) ||
      (s.phone && s.phone.includes(q))
    );
  }, [activeStudentList, searchQuery]);

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

  const handleGradeChange = (studentId: string, value: string) => {
    setGradesMap(prev => ({
      ...prev,
      [studentId]: value
    }));
  };

  const setAllGrades = (val: string) => {
    const nextMap = { ...gradesMap };
    activeStudentList.forEach(s => {
      nextMap[s.id] = val;
    });
    setGradesMap(nextMap);
  };

  const clearAllGrades = () => {
    const nextMap = { ...gradesMap };
    activeStudentList.forEach(s => {
      nextMap[s.id] = '';
    });
    setGradesMap(nextMap);
  };

  const handleAddStudentToRoster = (student: Student) => {
    setExtraStudents(prev => [...prev.filter(s => s.id !== student.id), student]);
    setShowAddStudentPicker(false);
    setPickerSearch('');
    toast.success(`تمت إضافة الطالب ${student.name} إلى كشف الرصد`);
  };

  const handleSave = async () => {
    const now = Date.now();
    let savedCount = 0;

    // Save grades for all students in the active roster
    for (const student of activeStudentList) {
      const gradeVal = gradesMap[student.id];
      if (gradeVal === '' || gradeVal === undefined) continue;
      
      const parsedGrade = assessment.gradingMethod === 'numeric' 
        ? Number(gradeVal) 
        : gradeVal;

      const existing = existingGrades?.find(g => g.studentId === student.id);
      
      if (existing) {
        if (existing.grade.toString() !== gradeVal) {
          await db.assessmentGrades.update(existing.id, {
            grade: parsedGrade,
            gradedAt: now,
            updated_at: now,
            sync_status: 'pending'
          });
          savedCount++;
        }
      } else {
        await db.assessmentGrades.add({
          id: uuidv4(),
          assessmentId: assessment.id,
          studentId: student.id,
          grade: parsedGrade,
          gradedAt: now,
          created_at: now,
          updated_at: now,
          sync_status: 'pending'
        });
        savedCount++;
      }
    }
    
    setIsSaved(true);
    toast.success('تم حفظ وتحديث درجات الطلاب بنجاح');
    setTimeout(() => {
      onClose();
    }, 700);
  };

  const ratingsList = ['ممتاز', 'جيد جدا', 'جيد', 'مقبول', 'ضعيف'];

  // Calculate statistics
  const gradedCount = Object.keys(gradesMap).filter(k => gradesMap[k] !== '' && gradesMap[k] !== undefined).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl h-[85vh] max-h-[850px] min-h-[580px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>رصد الدرجات: {assessment.name}</span>
              <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded text-[11px] font-bold border border-blue-200 dark:border-blue-800">
                {assessment.type === 'exam' ? 'اختبار' : 'واجب'}
              </span>
            </h2>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
              <span>إجمالي الطلاب المتاحين: <strong className="text-slate-700 dark:text-slate-300 font-mono">{activeStudentList.length}</strong></span>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">تم رصد: <strong className="font-mono">{gradedCount}</strong></span>
              {assessment.gradingMethod === 'numeric' && (
                <>
                  <span>•</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold">الدرجة النهائية: <strong className="font-mono">{assessment.maxGrade}</strong></span>
                </>
              )}
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Scope Switch, Quick Add Student, Quick Fill */}
        <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Scope toggle */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => setScope('course')}
                className={`px-3 py-1.5 rounded-md font-bold text-xs transition-all ${
                  scope === 'course'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                طلاب الكورس ({courseRosterStudents.length})
              </button>
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`px-3 py-1.5 rounded-md font-bold text-xs transition-all ${
                  scope === 'all'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                جميع طلاب السنتر ({allStudents?.length || 0})
              </button>
            </div>

            {/* Quick Add Student Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAddStudentPicker(!showAddStudentPicker)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg font-bold hover:bg-blue-100 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ إضافة طالب للرصد</span>
              </button>

              {/* Student Picker Dropdown */}
              {showAddStudentPicker && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl z-50 p-2 text-xs">
                  <div className="relative mb-2">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="ابحث باسم الطالب أو كوده..."
                      value={pickerSearch}
                      onChange={e => setPickerSearch(e.target.value)}
                      className="w-full pl-2 pr-8 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {allStudents
                      ?.filter(s => {
                        const inActive = activeStudentList.some(a => a.id === s.id);
                        if (inActive) return false;
                        if (!pickerSearch.trim()) return true;
                        const q = pickerSearch.toLowerCase();
                        return s.name.toLowerCase().includes(q) || (s.studentCode && s.studentCode.includes(q));
                      })
                      .slice(0, 10)
                      .map(student => (
                        <button
                          key={student.id}
                          type="button"
                          onClick={() => handleAddStudentToRoster(student)}
                          className="w-full text-right p-2 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-lg transition-colors flex items-center justify-between"
                        >
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200">{student.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">#{student.studentCode || '-'}</p>
                          </div>
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">+ إضافة</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Search bar & quick fill actions */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="بحث في القائمة..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-2 pr-8 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 w-44"
              />
            </div>

            {assessment.gradingMethod === 'numeric' && (
              <button
                type="button"
                onClick={() => setAllGrades(assessment.maxGrade.toString())}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/40 text-slate-700 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300 rounded-lg text-[11px] font-semibold transition-colors border border-slate-200 dark:border-slate-700"
                title="تعيين الدرجة النهائية لجميع الطلاب في الكشف"
              >
                الدرجة الكاملة للكل
              </button>
            )}

            <button
              type="button"
              onClick={clearAllGrades}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-950/40 text-slate-600 hover:text-red-700 dark:text-slate-400 dark:hover:text-red-300 rounded-lg text-[11px] font-semibold transition-colors border border-slate-200 dark:border-slate-700"
              title="تفريغ جميع الدرجات الحالية"
            >
              تفريغ
            </button>
          </div>
        </div>
        
        {/* Main List */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/40 dark:bg-slate-950/20">
          {displayedStudents.length === 0 ? (
            <div className="text-center py-16 text-slate-500 max-w-sm mx-auto">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-25 text-blue-500" />
              <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">لا يوجد طلاب في كشف الرصد</p>
              <p className="text-xs text-slate-400 mt-1">
                يمكنك التبديل إلى "جميع طلاب السنتر" أو الضغط على زر "+ إضافة طالب للرصد" لتحديد أي طالب.
              </p>
              <button
                type="button"
                onClick={() => setScope('all')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-2xs hover:bg-blue-700 transition-colors"
              >
                عرض جميع طلاب السنتر الآن
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {displayedStudents.map((student, idx) => {
                const currentGrade = gradesMap[student.id];
                const hasGrade = currentGrade !== undefined && currentGrade !== '';
                const numVal = hasGrade ? Number(currentGrade) : null;
                
                // Percentage
                let pct: number | null = null;
                if (numVal !== null && assessment.gradingMethod === 'numeric' && assessment.maxGrade > 0) {
                  pct = Math.round((numVal / assessment.maxGrade) * 100);
                }

                // Status color
                let pctColor = 'text-slate-400 bg-slate-100 dark:bg-slate-800';
                let ratingDesc = '';
                if (pct !== null) {
                  if (pct >= 85) {
                    pctColor = 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800';
                    ratingDesc = 'ممتاز';
                  } else if (pct >= 75) {
                    pctColor = 'text-blue-700 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800';
                    ratingDesc = 'جيد جداً';
                  } else if (pct >= 65) {
                    pctColor = 'text-amber-700 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800';
                    ratingDesc = 'جيد';
                  } else if (pct >= 50) {
                    pctColor = 'text-orange-700 bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-800';
                    ratingDesc = 'مقبول';
                  } else {
                    pctColor = 'text-red-700 bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800';
                    ratingDesc = 'ضعيف';
                  }
                }

                return (
                  <div 
                    key={student.id} 
                    className={`p-3.5 bg-white dark:bg-slate-900 rounded-xl border transition-all flex items-center justify-between gap-3 shadow-2xs ${
                      hasGrade 
                        ? 'border-blue-200 dark:border-blue-900/60 ring-1 ring-blue-500/10' 
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs font-mono shrink-0 ${
                        hasGrade
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>
                        {idx + 1}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 dark:text-slate-100 text-xs">{student.name}</p>
                          {student.studentCode && (
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              #{student.studentCode}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 font-mono">
                          <span>{student.phone || '-'}</span>
                          {pct !== null && (
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${pctColor}`}>
                              {pct}% ({ratingDesc})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      {assessment.gradingMethod === 'numeric' ? (
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="number"
                            max={assessment.maxGrade}
                            min="0"
                            step="any"
                            placeholder="--"
                            value={gradesMap[student.id] || ''}
                            onChange={e => handleGradeChange(student.id, e.target.value)}
                            className="w-20 px-2 py-1.5 border-2 border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 rounded-lg text-center font-bold text-blue-700 dark:text-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/15 text-sm bg-white dark:bg-slate-800 transition-all font-mono"
                          />
                          <span className="text-xs font-bold text-slate-400 font-mono">/ {assessment.maxGrade}</span>
                        </div>
                      ) : (
                        <select
                          value={gradesMap[student.id] || ''}
                          onChange={e => handleGradeChange(student.id, e.target.value)}
                          className="w-32 px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-white dark:bg-slate-800 transition-colors"
                        >
                          <option value="">- لم يرصد -</option>
                          {ratingsList.map(rating => (
                            <option key={rating} value={rating}>{rating}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
          <div className="text-xs">
            {isSaved ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ تم حفظ درجات التقييم بنجاح!</span>
            ) : (
              <span className="text-slate-500">
                تم رصد <strong className="text-blue-600 dark:text-blue-400 font-mono text-sm">{gradedCount}</strong> من إجمالي <strong className="font-mono text-sm">{activeStudentList.length}</strong> طالب
              </span>
            )}
          </div>
          <div className="flex gap-2.5">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors"
            >
              إلغاء
            </button>
            <button 
              type="button" 
              onClick={handleSave} 
              className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-2xs hover:bg-blue-700 transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>حفظ ورصد الدرجات</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
