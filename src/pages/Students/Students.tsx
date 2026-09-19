import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, X, Trash2, Edit2, BookOpen, Users as UsersIcon, Check, MessageCircle, Eye, DollarSign, Tag, QrCode, Hash } from 'lucide-react';
import { Student, Enrollment } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { useConfirm } from '../../context/ConfirmContext';
import { Link, useNavigate } from 'react-router-dom';
import { getWhatsAppUrl } from '../../utils/phone';
import { toMajorUnits, toMinorUnits } from '../../utils/currency';
import { EditPricingModal } from './StudentDetails';
import { syncStudentMonthlySubscriptions } from '../../utils/pricing';
import { getNextStudentCode, findStudentWithCode, normalizeStudentCode } from '../../utils/studentCode';
import { useApiQuery, useApiMutation } from '../../config/queryHooks';
import { useAuth } from '@clerk/clerk-react';

export function Students() {
  const navigate = useNavigate();
  const { subscription } = useSubscription();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [pricingEnrollmentData, setPricingEnrollmentData] = useState<{
    enrollment: Enrollment;
    course: any;
  } | null>(null);
  const [studentPricingSelector, setStudentPricingSelector] = useState<{
    student: Student;
    enrollments: Enrollment[];
  } | null>(null);

  const toast = useToast();
  const { confirm } = useConfirm();
  
  const { data: allStudents = [] } = useApiQuery<Student>('students', 60 * 1000);
  const students = allStudents.filter(s => s.name.includes(searchTerm) || s.phone.includes(searchTerm)).reverse();
  const { data: enrollments = [] } = useApiQuery<Enrollment>('enrollments', 2 * 60 * 1000);
  const { data: groups = [] } = useApiQuery<any>('groups', 2 * 60 * 1000);
  const { data: courses = [] } = useApiQuery<any>('courses', 2 * 60 * 1000);

  const { remove: removeStudent, update: updateStudent } = useApiMutation<Student>('students');


  const handleOpenStudentPricing = (student: Student, e: React.MouseEvent) => {
    e.stopPropagation();
    const studentActiveEnrollments = enrollments?.filter(en => en.studentId === student.id && en.status === 'active') || [];
    if (studentActiveEnrollments.length === 0) {
      toast.info('الطالب غير مسجل في أي مجموعة بعد. انقر على تعديل الطالب لتسكينه في مجموعة أولاً.');
      return;
    }
    if (studentActiveEnrollments.length === 1) {
      const en = studentActiveEnrollments[0];
      const crs = courses?.find(c => c.id === en.courseId);
      setPricingEnrollmentData({ enrollment: en, course: crs });
    } else {
      setStudentPricingSelector({ student, enrollments: studentActiveEnrollments });
    }
  };

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
      removeStudent.mutate(id, {
        onSuccess: () => toast.success(`تم حذف الطالب (${name}) بنجاح`),
        onError: () => toast.error('فشل حذف الطالب، يرجى المحاولة لاحقاً')
      });
    }
  };

  const handleToggleStatus = async (student: Student) => {
    updateStudent.mutate({ id: student.id, data: { isActive: !student.isActive } }, {
      onSuccess: () => toast.success(`تم تحديث حالة الطالب بنجاح`),
      onError: () => toast.error('فشل تحديث الحالة')
    });
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
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">تسجيل بيانات الطلاب، تسكين المجموعات والكورسات، ومتابعة أولياء الأمور</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/qrcards"
            className="flex items-center px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 text-xs font-semibold"
            title="طباعة وإدارة بطاقات وكروت الباركود والـ QR للطلاب"
          >
            <QrCode className="w-3.5 h-3.5 ml-1.5 text-blue-600 dark:text-blue-400" />
            <span>بطاقات وكروت الـ QR</span>
          </Link>

          {subscription?.limits?.max_students !== undefined && (students?.length || 0) >= subscription.limits.max_students ? (
            <div className="flex items-center gap-2 text-xs font-medium text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-lg border border-amber-200 dark:border-amber-800">
              <span>تجاوزت الحد الأقصى للطلاب. يرجى الترقية للإضافة.</span>
              <a href="https://masar.top/pricing" target="_blank" rel="noopener noreferrer" className="underline font-bold text-amber-700 dark:text-amber-400">ترقية</a>
            </div>
          ) : (
            <button 
              id="tour-students-add-btn"
              data-tour="tour-students-add-btn"
              onClick={() => { setEditingStudent(null); setIsModalOpen(true); }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-xs text-xs font-bold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 ml-1.5" />
              إضافة طالب جديد
            </button>
          )}
        </div>

      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5">
        <div className="relative w-full max-w-lg lg:max-w-xl mb-4">
          <input
            type="text"
            placeholder="بحث بالاسم أو رقم الهاتف أو كود الطالب..."
            className="w-full pl-3 pr-9 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs placeholder-slate-400 dark:placeholder-slate-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute right-2.5 top-2 text-slate-400 dark:text-slate-500 w-4 h-4" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-4 py-2.5 font-semibold">كود الطالب والاسم</th>
                <th className="px-4 py-2.5 font-semibold">الهاتف</th>
                <th className="px-4 py-2.5 font-semibold">المجموعات والكورسات</th>
                <th className="px-4 py-2.5 font-semibold">المدرسة / الصف</th>
                <th className="px-4 py-2.5 font-semibold">ولي الأمر</th>
                <th className="px-4 py-2.5 font-semibold">الحالة</th>
                <th className="px-4 py-2.5 font-semibold">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {students?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                    لا يوجد طلاب مسجلين
                  </td>
                </tr>
              ) : (
                students?.map(student => {
                  const studentActiveEnrollments = enrollments?.filter(e => e.studentId === student.id && e.status === 'active') || [];
                  const studentGroups = studentActiveEnrollments.map(e => groups?.find(g => g.id === e.groupId)).filter(Boolean);

                  return (
                    <tr 
                      key={student.id} 
                      onClick={() => navigate(`/students/${student.id}`)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group/row"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {student.studentCode && (
                            <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 font-bold">
                              #{student.studentCode}
                            </span>
                          )}
                          <span className="font-semibold text-slate-900 dark:text-slate-100 group-hover/row:text-blue-600 dark:group-hover/row:text-blue-400 transition-colors">
                            {student.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5" dir="ltr">
                          <span className="font-mono">{student.phone}</span>
                          {student.phone && getWhatsAppUrl(student.phone) && (
                            <a
                              href={getWhatsAppUrl(student.phone)}
                              target="_blank"
                              rel="noreferrer"
                              title="محادثة واتساب"
                              className="p-1 rounded text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {studentActiveEnrollments.length === 0 ? (
                          <span className="text-[11px] text-slate-400">غير مسجل بمجموعة</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {studentActiveEnrollments.map(en => {
                              const grp = groups?.find(g => g.id === en.groupId);
                              if (!grp) return null;
                              return (
                                <span key={en.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40 rounded text-[10px] font-medium">
                                  <UsersIcon className="w-2.5 h-2.5" />
                                  <span>{grp.name}</span>
                                  {en.pricingMode === 'free' && (
                                    <span className="px-1 py-0.2 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 rounded text-[9px] font-bold">
                                      مجاني
                                    </span>
                                  )}
                                  {en.pricingMode === 'discount' && (
                                    <span className="px-1 py-0.2 bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 rounded text-[9px] font-bold">
                                      خصم {en.discountPercentage ? `${en.discountPercentage}%` : ''}
                                    </span>
                                  )}
                                  {en.pricingMode === 'custom' && (
                                    <span className="px-1 py-0.2 bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 rounded text-[9px] font-bold">
                                      {toMajorUnits(en.customPrice || 0)} ج.م
                                    </span>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        <div>{student.school || '-'}</div>
                        {student.gradeLevel && (
                          <div className="text-[10px] text-slate-400 font-medium">{student.gradeLevel}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300" onClick={e => e.stopPropagation()}>
                        <div>{student.parentName || '-'}</div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500" dir="ltr">
                          <span className="font-mono">{student.parentPhone}</span>
                          {student.parentPhone && getWhatsAppUrl(student.parentPhone) && (
                            <a
                              href={getWhatsAppUrl(student.parentPhone)}
                              target="_blank"
                              rel="noreferrer"
                              title="محادثة ولي الأمر عبر واتساب"
                              className="p-0.5 rounded text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                            >
                              <MessageCircle className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
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
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => navigate(`/students/${student.id}`)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 cursor-pointer dark:hover:text-blue-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="عرض الملف الشامل للطالب (المجموعات، الحضور، المصاريف)"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/qrcards?studentId=${student.id}`)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 cursor-pointer dark:hover:text-blue-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="بطاقة وكود الـ QR للطالب"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleOpenStudentPricing(student, e)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 cursor-pointer dark:text-emerald-400 dark:hover:text-emerald-300 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                            title="تعديل الرسوم والخصومات (نصف السعر / خصم / إعفاء)"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEdit(student)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 cursor-pointer dark:hover:text-blue-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="تعديل بيانات الطالب"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(student.id, student.name)}
                            className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer dark:hover:text-red-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="حذف الطالب"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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

      {pricingEnrollmentData && (
        <EditPricingModal
          enrollment={pricingEnrollmentData.enrollment}
          course={pricingEnrollmentData.course}
          onClose={() => setPricingEnrollmentData(null)}
        />
      )}

      {studentPricingSelector && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">تعديل رسوم الطالب والخصم</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{studentPricingSelector.student.name}</p>
              </div>
              <button
                onClick={() => setStudentPricingSelector(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-xs text-slate-600 dark:text-slate-300">
              الطالب مسجل في أكثر من كورس/مجموعة. يرجى اختيار الكورس الذي ترغب في تعديل رسومه أو منحه خصماً:
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {studentPricingSelector.enrollments.map(en => {
                const grp = groups?.find(g => g.id === en.groupId);
                const crs = courses?.find(c => c.id === en.courseId);
                return (
                  <button
                    key={en.id}
                    onClick={() => {
                      setPricingEnrollmentData({ enrollment: en, course: crs });
                      setStudentPricingSelector(null);
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-800/40 text-right transition-colors cursor-pointer group"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {crs?.name || 'كورس'} - {grp?.name || 'مجموعة'}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          السعر الأساسي: {toMajorUnits(crs?.price || 0)} ج.م
                        </span>
                        {en.pricingMode === 'free' && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                            منحة مجانية
                          </span>
                        )}
                        {en.pricingMode === 'discount' && (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">
                            خصم {en.discountPercentage}%
                          </span>
                        )}
                        {en.pricingMode === 'custom' && (
                          <span className="text-[10px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded">
                            مخصص {toMajorUnits(en.customPrice || 0)} ج.م
                          </span>
                        )}
                      </div>
                    </div>
                    <DollarSign className="w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function StudentFormModal({ onClose, existingStudent }: { onClose: () => void, existingStudent: Student | null }) {
  const toast = useToast();
  const { data: courses = [] } = useApiQuery<any>('courses', 2 * 60 * 1000);
  const { data: groups = [] } = useApiQuery<any>('groups', 2 * 60 * 1000);
  const { data: allStudents = [] } = useApiQuery<Student>('students', 2 * 60 * 1000);
  const { data: enrollments = [] } = useApiQuery<Enrollment>('enrollments', 2 * 60 * 1000);
  
  const { create: createStudent, update: updateStudent } = useApiMutation<Student>('students');
  const { create: createEnrollment, update: updateEnrollment } = useApiMutation<Enrollment>('enrollments');
  const { getToken } = useAuth();

  const suggestedNextCode = useMemo(() => getNextStudentCode(allStudents), [allStudents]);

  const [formData, setFormData] = useState({
    studentCode: existingStudent?.studentCode || '',
    name: existingStudent?.name || '', 
    phone: existingStudent?.phone || '', 
    parentName: existingStudent?.parentName || '', 
    parentPhone: existingStudent?.parentPhone || '', 
    school: existingStudent?.school || '', 
    gradeLevel: existingStudent?.gradeLevel || 'الصف الأول الثانوي',
    leadSource: existingStudent?.leadSource || 'فيسبوك', 
    isActive: existingStudent ? existingStudent.isActive : true
  });

  // Automatically populate next sequential ID for new students
  useEffect(() => {
    if (!existingStudent && (!formData.studentCode || !formData.studentCode.trim())) {
      setFormData(prev => ({ ...prev, studentCode: suggestedNextCode }));
    }
  }, [existingStudent, suggestedNextCode]);

  // Real-time duplicate student code detection
  const duplicateStudent = useMemo(() => {
    const code = formData.studentCode.trim();
    if (!code) return undefined;
    return findStudentWithCode(code, allStudents, existingStudent?.id);
  }, [formData.studentCode, allStudents, existingStudent?.id]);

  interface GroupPricingState {
    pricingMode: 'default' | 'custom' | 'discount' | 'free';
    customPriceMajor?: number;
    discountPercentage?: number;
  }

  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [groupPricings, setGroupPricings] = useState<Record<string, GroupPricingState>>({});

  useEffect(() => {
    if (existingStudent) {
      const activeEnrolls = enrollments.filter(e => e.studentId === existingStudent.id && e.status === 'active');
      setSelectedGroupIds(activeEnrolls.map(e => e.groupId));
      const pricingMap: Record<string, GroupPricingState> = {};
      activeEnrolls.forEach(en => {
        pricingMap[en.groupId] = {
          pricingMode: en.pricingMode || 'default',
          customPriceMajor: en.customPrice !== undefined ? toMajorUnits(en.customPrice) : undefined,
          discountPercentage: en.discountPercentage
        };
      });
      setGroupPricings(pricingMap);
    }
  }, [existingStudent, enrollments]);

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds(prev => {
      const isSelected = prev.includes(groupId);
      if (isSelected) {
        return prev.filter(id => id !== groupId);
      } else {
        if (!groupPricings[groupId]) {
          setGroupPricings(current => ({
            ...current,
            [groupId]: { pricingMode: 'default' }
          }));
        }
        return [...prev, groupId];
      }
    });
  };

  const updateGroupPricing = (groupId: string, partial: Partial<GroupPricingState>) => {
    setGroupPricings(prev => ({
      ...prev,
      [groupId]: {
        ...(prev[groupId] || { pricingMode: 'default' }),
        ...partial
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalStudentCode = formData.studentCode.trim();
      
      if (!finalStudentCode) {
        finalStudentCode = suggestedNextCode;
      } else {
        finalStudentCode = normalizeStudentCode(finalStudentCode);
      }

      // Strict duplicate validation to prevent any duplicate student IDs
      const conflict = findStudentWithCode(finalStudentCode, allStudents, existingStudent?.id);
      if (conflict) {
        toast.error(`كود الطالب (${finalStudentCode}) مستخدم بالفعل للطالب: ${conflict.name}. غير مسموح بتكرار كود الطالب.`);
        return;
      }

      const cleanPhone = (formData.phone || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString()).trim();
      const cleanParentPhone = (formData.parentPhone || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString()).trim();
      const normalizedFormData = {
        ...formData,
        phone: cleanPhone,
        parentPhone: cleanParentPhone,
        studentCode: finalStudentCode
      };

      const token = await getToken();
      if (!token) throw new Error("No token");

      if (existingStudent) {
        await updateStudent.mutateAsync({
          id: existingStudent.id,
          data: normalizedFormData
        });

        const existingEnrolls = enrollments.filter(e => e.studentId === existingStudent.id);
        
        await Promise.all(selectedGroupIds.map(async (gId) => {
          const grp = groups?.find(g => g.id === gId);
          if (!grp) return;
          const crs = courses?.find(c => c.id === grp.courseId);
          const basePrice = crs?.price || 0;
          const pricing = groupPricings[gId] || { pricingMode: 'default' };

          let finalCustomPrice: number | undefined = undefined;
          if (pricing.pricingMode === 'custom') {
            finalCustomPrice = pricing.customPriceMajor !== undefined ? toMinorUnits(pricing.customPriceMajor) : undefined;
          } else if (pricing.pricingMode === 'discount') {
            const disc = pricing.discountPercentage || 0;
            finalCustomPrice = Math.round(basePrice * (1 - disc / 100));
          } else if (pricing.pricingMode === 'free') {
            finalCustomPrice = 0;
          }

          const found = existingEnrolls.find(e => e.groupId === gId);
          if (!found) {
            await createEnrollment.mutateAsync({
              studentId: existingStudent.id,
              groupId: gId,
              courseId: grp.courseId,
              enrolledAt: new Date().toISOString(),
              status: 'active',
              pricingMode: pricing.pricingMode,
              customPrice: finalCustomPrice,
              discountPercentage: pricing.discountPercentage
            });
          } else {
            await updateEnrollment.mutateAsync({
              id: found.id,
              data: {
                status: 'active',
                pricingMode: pricing.pricingMode,
                customPrice: finalCustomPrice,
                discountPercentage: pricing.discountPercentage
              }
            });
          }

          const effectiveFee = pricing.pricingMode === 'free'
            ? 0
            : finalCustomPrice !== undefined
              ? finalCustomPrice
              : basePrice;

          if (existingStudent.id && grp.courseId) {
            await syncStudentMonthlySubscriptions(existingStudent.id, grp.courseId, effectiveFee, token);
          }
        }));

        await Promise.all(existingEnrolls.map(async (oldEnr) => {
          if (!selectedGroupIds.includes(oldEnr.groupId) && oldEnr.status === 'active') {
            await updateEnrollment.mutateAsync({
              id: oldEnr.id,
              data: { status: 'withdrawn' }
            });
          }
        }));

        toast.success(`تم تحديث بيانات الطالب (${formData.name}) والرسوم بنجاح!`);
      } else {
        const newStudent = await createStudent.mutateAsync(normalizedFormData);

        await Promise.all(selectedGroupIds.map(async (gId) => {
          const grp = groups?.find(g => g.id === gId);
          if (!grp) return;
          const crs = courses?.find(c => c.id === grp.courseId);
          const basePrice = crs?.price || 0;
          const pricing = groupPricings[gId] || { pricingMode: 'default' };

          let finalCustomPrice: number | undefined = undefined;
          if (pricing.pricingMode === 'custom') {
            finalCustomPrice = pricing.customPriceMajor !== undefined ? toMinorUnits(pricing.customPriceMajor) : undefined;
          } else if (pricing.pricingMode === 'discount') {
            const disc = pricing.discountPercentage || 0;
            finalCustomPrice = Math.round(basePrice * (1 - disc / 100));
          } else if (pricing.pricingMode === 'free') {
            finalCustomPrice = 0;
          }

          await createEnrollment.mutateAsync({
            studentId: newStudent.id,
            groupId: gId,
            courseId: grp.courseId,
            enrolledAt: new Date().toISOString(),
            status: 'active',
            pricingMode: pricing.pricingMode,
            customPrice: finalCustomPrice,
            discountPercentage: pricing.discountPercentage
          });

          const effectiveFee = pricing.pricingMode === 'free'
            ? 0
            : finalCustomPrice !== undefined
              ? finalCustomPrice
              : basePrice;

          if (newStudent.id && grp.courseId) {
            await syncStudentMonthlySubscriptions(newStudent.id, grp.courseId, effectiveFee, token);
          }
        }));

        toast.success(`تم تسجيل الطالب (${formData.name}) في المجموعات وتحديد رسومه بنجاح!`);
      }
      
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء حفظ بيانات الطالب والمجموعات');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {existingStudent ? 'تعديل بيانات الطالب والمجموعات' : 'إضافة طالب جديد وتسكينه في المجموعات'}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">سجل بيانات الطالب والاتصال واختر المجموعات والكورسات فوراً</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-3.5">
          
          {/* Automatically generated student ID (hidden field) */}
          <input type="hidden" value={formData.studentCode} />

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
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">الصف الدراسي</label>
              <select
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                value={formData.gradeLevel}
                onChange={e => setFormData({...formData, gradeLevel: e.target.value})}
              >
                <option value="الصف الأول الابتدائي">الصف الأول الابتدائي</option>
                <option value="الصف الثاني الابتدائي">الصف الثاني الابتدائي</option>
                <option value="الصف الثالث الابتدائي">الصف الثالث الابتدائي</option>
                <option value="الصف الرابع الابتدائي">الصف الرابع الابتدائي</option>
                <option value="الصف الخامس الابتدائي">الصف الخامس الابتدائي</option>
                <option value="الصف السادس الابتدائي">الصف السادس الابتدائي</option>
                <option value="الصف الأول الإعدادي">الصف الأول الإعدادي</option>
                <option value="الصف الثاني الإعدادي">الصف الثاني الإعدادي</option>
                <option value="الصف الثالث الإعدادي">الصف الثالث الإعدادي</option>
                <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
                <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
                <option value="الصف الثالث الثانوي">الصف الثالث الثانوي</option>
                <option value="جامعي / أخرى">جامعي / أخرى</option>
              </select>
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

          <div className="grid grid-cols-2 gap-3">
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
          </div>

          {/* Groups & Courses Selection */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                تسجيل الطالب في المجموعات والكورسات
              </label>
              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-900/40">
                {selectedGroupIds.length} مجموعة مختارة
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">اختر المجموعات التي سينضم إليها الطالب لتسجيله وتوليد سجل الحضور والاشتراكات فوراً</p>

            {groups?.length === 0 ? (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-center text-xs text-slate-500">
                لا توجد مجموعات متاحة حالياً. يمكنك إضافة مجموعات من قسم المجموعات الدراسية.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-48 overflow-y-auto p-1">
                {courses?.map(course => {
                  const courseGroups = groups?.filter(g => g.courseId === course.id) || [];
                  if (courseGroups.length === 0) return null;

                  return (
                    <div key={course.id} className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                        <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>{course.name}</span>
                        {course.subject && <span className="text-[10px] text-slate-500 font-normal">({course.subject})</span>}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {courseGroups.map(grp => {
                          const isSelected = selectedGroupIds.includes(grp.id);
                          return (
                            <button
                              type="button"
                              key={grp.id}
                              onClick={() => toggleGroup(grp.id)}
                              className={`flex items-center justify-between p-2 rounded-md border text-right transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200 font-semibold'
                                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/40'
                              }`}
                            >
                              <div className="truncate">
                                <p className="text-xs truncate">{grp.name}</p>
                                {grp.daysOfWeek && grp.daysOfWeek.length > 0 && (
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{grp.daysOfWeek.join('، ')}</p>
                                )}
                              </div>
                              <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                                isSelected 
                                  ? 'bg-blue-600 border-blue-600 text-white' 
                                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                              }`}>
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Group Pricing & Discounts Configuration */}
          {selectedGroupIds.length > 0 && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    تحديد رسوم واشتراكات الطالب والخصومات
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    حدد ما إذا كان الطالب سيدفع كامل المبلغ، أو نصف السعر (خصم 50%)، أو منحة مجانية، أو مبلغ مخصص
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {selectedGroupIds.map(gId => {
                  const grp = groups?.find(g => g.id === gId);
                  if (!grp) return null;
                  const crs = courses?.find(c => c.id === grp.courseId);
                  const basePrice = crs?.price ? toMajorUnits(crs.price) : 0;
                  const pricing = groupPricings[gId] || { pricingMode: 'default' };

                  // Calculate effective price
                  let effectivePrice = basePrice;
                  if (pricing.pricingMode === 'free') effectivePrice = 0;
                  else if (pricing.pricingMode === 'discount') {
                    const disc = pricing.discountPercentage || 0;
                    effectivePrice = Math.round(basePrice * (1 - disc / 100));
                  } else if (pricing.pricingMode === 'custom') {
                    effectivePrice = pricing.customPriceMajor || 0;
                  }

                  return (
                    <div key={gId} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{crs?.name || 'كورس'}</span>
                          <span className="text-xs text-slate-500 mr-1.5 font-medium">({grp.name})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-500">السعر الأساسي: {basePrice} ج.م</span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                            المطلوب: {effectivePrice} ج.م
                          </span>
                        </div>
                      </div>

                      {/* Quick preset buttons */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => updateGroupPricing(gId, { pricingMode: 'default', discountPercentage: undefined, customPriceMajor: undefined })}
                          className={`px-2 py-1.5 rounded-md border font-medium text-center transition-colors cursor-pointer ${
                            pricing.pricingMode === 'default'
                              ? 'bg-blue-600 border-blue-600 text-white font-bold'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          كامل ({basePrice} ج.م)
                        </button>

                        <button
                          type="button"
                          onClick={() => updateGroupPricing(gId, { 
                            pricingMode: 'discount', 
                            discountPercentage: 50, 
                            customPriceMajor: Math.round(basePrice / 2) 
                          })}
                          className={`px-2 py-1.5 rounded-md border font-medium text-center transition-colors cursor-pointer ${
                            pricing.pricingMode === 'discount' && pricing.discountPercentage === 50
                              ? 'bg-amber-600 border-amber-600 text-white font-bold'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          نصف السعر (50%)
                        </button>

                        <button
                          type="button"
                          onClick={() => updateGroupPricing(gId, { 
                            pricingMode: 'discount', 
                            discountPercentage: 25, 
                            customPriceMajor: Math.round(basePrice * 0.75) 
                          })}
                          className={`px-2 py-1.5 rounded-md border font-medium text-center transition-colors cursor-pointer ${
                            pricing.pricingMode === 'discount' && pricing.discountPercentage === 25
                              ? 'bg-amber-600 border-amber-600 text-white font-bold'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          خصم 25%
                        </button>

                        <button
                          type="button"
                          onClick={() => updateGroupPricing(gId, { pricingMode: 'free', customPriceMajor: 0, discountPercentage: 100 })}
                          className={`px-2 py-1.5 rounded-md border font-medium text-center transition-colors cursor-pointer ${
                            pricing.pricingMode === 'free'
                              ? 'bg-emerald-600 border-emerald-600 text-white font-bold'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          إعفاء مجاني (0)
                        </button>

                        <button
                          type="button"
                          onClick={() => updateGroupPricing(gId, { 
                            pricingMode: 'custom', 
                            customPriceMajor: pricing.customPriceMajor !== undefined ? pricing.customPriceMajor : basePrice 
                          })}
                          className={`px-2 py-1.5 rounded-md border font-medium text-center transition-colors cursor-pointer ${
                            pricing.pricingMode === 'custom'
                              ? 'bg-purple-600 border-purple-600 text-white font-bold'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          سعر مخصص
                        </button>
                      </div>

                      {/* Custom inputs if custom or discount */}
                      {pricing.pricingMode === 'custom' && (
                        <div className="flex items-center gap-2 pt-1">
                          <label className="text-xs text-slate-600 dark:text-slate-400">المبلغ الشهري المتفق عليه لهذا الطالب:</label>
                          <div className="relative w-32">
                            <input
                              type="number"
                              min="0"
                              value={pricing.customPriceMajor ?? basePrice}
                              onChange={e => updateGroupPricing(gId, { customPriceMajor: Number(e.target.value) })}
                              className="w-full px-2.5 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 pl-8 font-bold"
                            />
                            <span className="absolute left-2 top-1 text-[10px] text-slate-400">ج.م</span>
                          </div>
                        </div>
                      )}

                      {pricing.pricingMode === 'discount' && (
                        <div className="flex items-center gap-2 pt-1">
                          <label className="text-xs text-slate-600 dark:text-slate-400">نسبة الخصم المئوية:</label>
                          <div className="relative w-24">
                            <input
                              type="number"
                              min="1"
                              max="99"
                              value={pricing.discountPercentage ?? 50}
                              onChange={e => updateGroupPricing(gId, { discountPercentage: Number(e.target.value) })}
                              className="w-full px-2.5 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 pl-6 font-bold"
                            />
                            <span className="absolute left-2 top-1 text-[10px] text-slate-400">%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
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
              disabled={Boolean(duplicateStudent) || createStudent.isPending || updateStudent.isPending || createEnrollment.isPending || updateEnrollment.isPending}
              className="px-4 py-1.5 text-white bg-blue-600 rounded-md hover:bg-blue-700 text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(createStudent.isPending || updateStudent.isPending || createEnrollment.isPending || updateEnrollment.isPending) && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {existingStudent ? 'حفظ التعديلات' : 'حفظ الطالب والتسكين'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
