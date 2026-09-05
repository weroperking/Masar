import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { FileText, Plus, X, Trash2, Award, CheckCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Assessment, Student, AssessmentGrade } from '../../types';

export function Assessments() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [gradingAssessment, setGradingAssessment] = useState<Assessment | null>(null);

  const assessments = useLiveQuery(() => db.assessments.toArray(), []);
  const courses = useLiveQuery(() => db.courses.toArray(), []);
  const students = useLiveQuery(() => db.students.toArray(), []);
  const grades = useLiveQuery(() => db.assessmentGrades.toArray(), []);

  const courseMap = new Map(courses?.map(c => [c.id, c.name]));

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الاختبار/الواجب؟')) {
      await db.assessments.delete(id);
      // delete associated grades
      await db.assessmentGrades.where('assessmentId').equals(id).delete();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">الاختبارات والواجبات</h1>
          <p className="text-sm text-slate-500 mt-1">إدارة الامتحانات، الواجبات الدورية، وتسجيل درجات الطلاب</p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-semibold"
        >
          <Plus className="w-4 h-4 ml-2" />
          إضافة اختبار/واجب
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
        {assessments?.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center">
            <FileText className="w-12 h-12 text-slate-300 mb-4" />
            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300">لا توجد اختبارات أو واجبات حالياً</h2>
            <p className="text-slate-500 text-sm mt-1 max-w-sm">اضغط على زر "إضافة اختبار/واجب" لإنشاء أول تقييم لطلابك.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {assessments?.map(item => {
              const itemGrades = grades?.filter(g => g.assessmentId === item.id) || [];
              const gradedCount = itemGrades.length;

              return (
                <div key={item.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-blue-400 transition-colors flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                        item.type === 'exam' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {item.type === 'exam' ? 'امتحان رئيسي' : 'واجب منزلي'}
                      </span>
                      <span className="text-xs text-slate-500">{item.date}</span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">{item.name}</h3>
                    <p className="text-sm text-blue-600 font-medium mt-0.5">{courseMap.get(item.courseId) || 'كورس غير محدد'}</p>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span>الدرجة العظمى:</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{item.maxGrade} درجة</span>
                      </div>
                      <div className="flex justify-between">
                        <span>طريقة التقييم:</span>
                        <span>{item.gradingMethod === 'numeric' ? 'رقمي' : 'تقديري'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>الطلاب الذين تم رصدهم:</span>
                        <span className="text-emerald-700 font-semibold">{gradedCount} طالب</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setGradingAssessment(item)}
                      className="flex-1 flex items-center justify-center py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors"
                    >
                      <Award className="w-3.5 h-3.5 ml-1.5" />
                      رصد الدرجات ({gradedCount})
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Assessment Modal */}
      {isCreateModalOpen && (
        <CreateAssessmentModal 
          onClose={() => setIsCreateModalOpen(false)} 
          courses={courses || []} 
        />
      )}

      {/* Grading Modal */}
      {gradingAssessment && (
        <GradingModal 
          assessment={gradingAssessment}
          onClose={() => setGradingAssessment(null)}
          students={students || []}
        />
      )}
    </div>
  );
}

function CreateAssessmentModal({ onClose, courses }: { onClose: () => void; courses: any[] }) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'exam' as 'exam' | 'assignment',
    courseId: courses[0]?.id || '',
    semester: 'الفصل الدراسي الأول',
    date: new Date().toISOString().split('T')[0],
    maxGrade: 100,
    gradingMethod: 'numeric' as 'numeric' | 'rating'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const now = Date.now();
    const newAssessment: Assessment = {
      id: uuidv4(),
      name: formData.name,
      type: formData.type,
      courseId: formData.courseId,
      semester: formData.semester,
      date: formData.date,
      maxGrade: Number(formData.maxGrade),
      gradingMethod: formData.gradingMethod,
      status: 'completed',
      created_at: now,
      updated_at: now,
      sync_status: 'pending'
    };

    await db.assessments.add(newAssessment);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">إضافة اختبار أو واجب جديد</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">اسم الاختبار / الواجب *</label>
            <input 
              required 
              type="text" 
              placeholder="مثال: امتحان الشهر الأول في الجبر" 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              value={formData.name} 
              onChange={e => setFormData({ ...formData, name: e.target.value })} 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">النوع</label>
              <select 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={formData.type} 
                onChange={e => setFormData({ ...formData, type: e.target.value as any })}
              >
                <option value="exam">امتحان</option>
                <option value="assignment">واجب منزلي</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الكورس التابع له</label>
              <select 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={formData.courseId} 
                onChange={e => setFormData({ ...formData, courseId: e.target.value })}
              >
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={formData.date} 
                onChange={e => setFormData({ ...formData, date: e.target.value })} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الدرجة العظمى</label>
              <input 
                type="number" 
                min="1"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={formData.maxGrade} 
                onChange={e => setFormData({ ...formData, maxGrade: Number(e.target.value) })} 
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 text-sm">
              إلغاء
            </button>
            <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold">
              إنشاء التقييم
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GradingModal({ 
  assessment, 
  onClose, 
  students 
}: { 
  assessment: Assessment; 
  onClose: () => void; 
  students: Student[]; 
}) {
  const existingGrades = useLiveQuery(
    () => db.assessmentGrades.where('assessmentId').equals(assessment.id).toArray(),
    [assessment.id]
  );

  const [gradesMap, setGradesMap] = useState<Record<string, string>>({});
  const [isSaved, setIsSaved] = useState(false);

  React.useEffect(() => {
    if (existingGrades) {
      const map: Record<string, string> = {};
      existingGrades.forEach(g => {
        map[g.studentId] = g.grade.toString();
      });
      setGradesMap(map);
    }
  }, [existingGrades]);

  const handleSave = async () => {
    const now = Date.now();
    for (const [studentId, gradeVal] of Object.entries(gradesMap)) {
      if (gradeVal === '' || gradeVal === undefined) continue;
      const existing = existingGrades?.find(g => g.studentId === studentId);
      if (existing) {
        await db.assessmentGrades.update(existing.id, {
          grade: Number(gradeVal),
          gradedAt: now,
          updated_at: now
        });
      } else {
        await db.assessmentGrades.add({
          id: uuidv4(),
          assessmentId: assessment.id,
          studentId,
          grade: Number(gradeVal),
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">رصد الدرجات: {assessment.name}</h2>
            <p className="text-xs text-slate-500 mt-0.5">الدرجة العظمى: {assessment.maxGrade}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {students.map(student => (
            <div key={student.id} className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{student.name}</p>
                <p className="text-xs text-slate-500">{student.school || student.phone}</p>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="number"
                  max={assessment.maxGrade}
                  min="0"
                  placeholder="0"
                  value={gradesMap[student.id] || ''}
                  onChange={e => setGradesMap({ ...gradesMap, [student.id]: e.target.value })}
                  className="w-20 px-3 py-1.5 border border-slate-300 rounded-lg text-center font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-slate-800 dark:text-slate-100"
                />
                <span className="text-xs text-slate-400">/ {assessment.maxGrade}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
          {isSaved ? (
            <span className="text-emerald-600 font-bold text-sm">✓ تم حفظ الدرجات بنجاح!</span>
          ) : (
            <span className="text-xs text-slate-500">سجل درجات الطلاب ثم اضغط حفظ</span>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 text-slate-700 dark:text-slate-300 rounded-lg text-sm">
              إلغاء
            </button>
            <button type="button" onClick={handleSave} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
              حفظ الدرجات
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
