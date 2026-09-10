import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { v4 as uuidv4 } from 'uuid';
import { Search, Plus, X, Trash2, Edit2, BookOpen, Users as UsersIcon, Check, MessageCircle } from 'lucide-react';
import { Student } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { Link } from 'react-router-dom';
import { getWhatsAppUrl } from '../../utils/phone';

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

  const enrollments = useLiveQuery(() => db.enrollments.toArray(), []);
  const groups = useLiveQuery(() => db.groups.toArray(), []);
  const courses = useLiveQuery(() => db.courses.toArray(), []);

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
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">تسجيل بيانات الطلاب، تسكين المجموعات والكورسات، ومتابعة أولياء الأمور</p>
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
                    <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {student.studentCode && (
                            <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 font-bold">
                              #{student.studentCode}
                            </span>
                          )}
                          <Link to={`/students/${student.id}`} className="font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            {student.name}
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
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
                        {studentGroups.length === 0 ? (
                          <span className="text-[11px] text-slate-400">غير مسجل بمجموعة</span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {studentGroups.map(grp => (
                              <span key={grp!.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40 rounded text-[10px] font-medium">
                                <UsersIcon className="w-2.5 h-2.5" />
                                {grp!.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        <div>{student.school || '-'}</div>
                        {student.gradeLevel && (
                          <div className="text-[10px] text-slate-400 font-medium">{student.gradeLevel}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
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
                            className="p-1.5 text-slate-400 hover:text-blue-600 cursor-pointer dark:hover:text-blue-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="تعديل بيانات الطالب"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
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
    </div>
  );
}

function StudentFormModal({ onClose, existingStudent }: { onClose: () => void, existingStudent: Student | null }) {
  const toast = useToast();
  const courses = useLiveQuery(() => db.courses.toArray(), []);
  const groups = useLiveQuery(() => db.groups.toArray(), []);

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

  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  useEffect(() => {
    if (existingStudent) {
      db.enrollments
        .where('studentId')
        .equals(existingStudent.id)
        .toArray()
        .then(enrolls => {
          const activeIds = enrolls.filter(e => e.status === 'active').map(e => e.groupId);
          setSelectedGroupIds(activeIds);
        });
    }
  }, [existingStudent]);

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds(prev => 
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const now = Date.now();
      let finalStudentCode = formData.studentCode.trim();
      
      if (!existingStudent && !finalStudentCode) {
        const allStudents = await db.students.toArray();
        let maxSeq = 0;
        allStudents.forEach(s => {
          if (s.studentCode && /^\d+$/.test(s.studentCode)) {
            const num = parseInt(s.studentCode, 10);
            if (num > maxSeq) maxSeq = num;
          }
        });
        finalStudentCode = String(maxSeq + 1).padStart(4, '0');
      }

      const cleanPhone = (formData.phone || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString()).trim();
      const cleanParentPhone = (formData.parentPhone || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString()).trim();
      const normalizedFormData = {
        ...formData,
        phone: cleanPhone,
        parentPhone: cleanParentPhone
      };

      await db.transaction('rw', [db.students, db.enrollments], async () => {
        if (existingStudent) {
          await db.students.update(existingStudent.id, {
            ...normalizedFormData,
            studentCode: finalStudentCode,
            updated_at: now,
            sync_status: 'pending'
          });

          // Sync enrollments
          const existingEnrolls = await db.enrollments.where('studentId').equals(existingStudent.id).toArray();
          
          // Groups to enroll
          for (const gId of selectedGroupIds) {
            const grp = groups?.find(g => g.id === gId);
            const found = existingEnrolls.find(e => e.groupId === gId);
            if (!found && grp) {
              await db.enrollments.add({
                id: uuidv4(),
                studentId: existingStudent.id,
                groupId: gId,
                courseId: grp.courseId,
                enrolledAt: new Date().toISOString(),
                status: 'active',
                created_at: now,
                updated_at: now,
                sync_status: 'pending'
              });
            } else if (found && found.status !== 'active') {
              await db.enrollments.update(found.id, {
                status: 'active',
                updated_at: now,
                sync_status: 'pending'
              });
            }
          }

          // Groups to withdraw
          for (const oldEnr of existingEnrolls) {
            if (!selectedGroupIds.includes(oldEnr.groupId) && oldEnr.status === 'active') {
              await db.enrollments.update(oldEnr.id, {
                status: 'withdrawn',
                updated_at: now,
                sync_status: 'pending'
              });
            }
          }

          toast.success(`تم تحديث بيانات الطالب (${formData.name}) وتسجيلات المجموعات بنجاح!`);
        } else {
          const studentId = uuidv4();
          const newStudent: Student = {
            id: studentId,
            ...normalizedFormData,
            studentCode: finalStudentCode,
            created_at: now,
            updated_at: now,
            sync_status: 'pending'
          };
          await db.students.add(newStudent);

          // Add enrollments
          for (const gId of selectedGroupIds) {
            const grp = groups?.find(g => g.id === gId);
            if (grp) {
              await db.enrollments.add({
                id: uuidv4(),
                studentId: studentId,
                groupId: gId,
                courseId: grp.courseId,
                enrolledAt: new Date().toISOString(),
                status: 'active',
                created_at: now,
                updated_at: now,
                sync_status: 'pending'
              });
            }
          }

          toast.success(`تم تسجيل الطالب (${formData.name}) في المجموعات المحددة بنجاح!`);
        }
      });
      
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
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">كود الطالب (رقم الباركود)</label>
              <input 
                type="text" 
                placeholder="تلقائي إذا تُرك فارغاً"
                dir="ltr"
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-mono text-left"
                value={formData.studentCode} 
                onChange={e => setFormData({...formData, studentCode: e.target.value.replace(/\D/g, '')})} 
              />
            </div>
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
              {existingStudent ? 'حفظ التعديلات' : 'حفظ الطالب والتسكين'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
