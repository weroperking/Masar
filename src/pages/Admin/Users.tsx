import React, { useState } from 'react';
import { UserCog, Plus, Edit2, Trash2, Shield, User as UserIcon, Mail, Phone, BookOpen, Users as UsersIcon, X, Check } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { User } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { v4 as uuidv4 } from 'uuid';

export function Users() {
  const users = useLiveQuery(() => db.users.filter(u => !u.deleted_at).toArray(), []);
  const courses = useLiveQuery(() => db.courses.toArray(), []);
  const groups = useLiveQuery(() => db.groups.toArray(), []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const toast = useToast();
  const { confirm } = useConfirm();

  const handleDelete = async (id: string, name: string) => {
    const isConfirmed = await confirm({
      title: 'حذف المستخدم والصلاحيات',
      message: `هل أنت متأكد من حذف المستخدم ${name}؟`,
      description: 'لن يتمكن هذا المستخدم من الوصول للنظام بعد إتمام الحذف.',
      confirmText: 'نعم، احذف الحساب',
      cancelText: 'إلغاء',
      variant: 'danger',
    });

    if (isConfirmed) {
      await db.users.update(id, { deleted_at: Date.now(), sync_status: 'pending' });
      toast.success('تم حذف المستخدم بنجاح');
    }
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin': return 'مدير النظام (Admin)';
      case 'manager': return 'مدير فرع (Manager)';
      case 'teacher': return 'مدرس (Teacher)';
      case 'assistant': return 'مساعد (Assistant)';
      case 'staff': return 'موظف استقبال (Staff)';
      default: return role;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'manager': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'teacher': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">المستخدمين والصلاحيات</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">إدارة فريق العمل، تعيين الكورسات والمجموعات، والتحكم في الصلاحيات</p>
        </div>
        <button 
          onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-xs text-xs font-bold"
        >
          <Plus className="w-4 h-4 ml-1.5" />
          إضافة مستخدم جديد
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
          <p className="text-sm font-medium text-slate-500 mb-1">إجمالي المستخدمين</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">{users?.length || 0}</span>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
          <p className="text-sm font-medium text-slate-500 mb-1">المدراء</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">{users?.filter(u => u.role === 'admin').length || 0}</span>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
          <p className="text-sm font-medium text-slate-500 mb-1">المعلمون والمساعدون</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">{users?.filter(u => ['teacher', 'assistant'].includes(u.role)).length || 0}</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        {users?.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <UserCog className="w-12 h-12 text-slate-300 mb-4" />
            <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300">لا يوجد مستخدمين مسجلين</h2>
            <p className="text-slate-500 mt-2">قم بإضافة مستخدمين لإدارة النظام</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3 font-semibold">المستخدم</th>
                  <th className="px-5 py-3 font-semibold">بيانات الاتصال</th>
                  <th className="px-5 py-3 font-semibold">الدور والتخصص</th>
                  <th className="px-5 py-3 font-semibold">الكورسات والمجموعات المسندة</th>
                  <th className="px-5 py-3 font-semibold">الفرع</th>
                  <th className="px-5 py-3 font-semibold">الحالة</th>
                  <th className="px-5 py-3 font-semibold">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users?.map((user) => {
                  const assignedCourses = courses?.filter(c => user.assignedCourseIds?.includes(c.id)) || [];
                  const assignedGroups = groups?.filter(g => user.assignedGroupIds?.includes(g.id)) || [];

                  return (
                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                            {user.name.charAt(0) || <UserIcon className="w-4 h-4" />}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-slate-100 block">{user.name}</span>
                            {user.notes && <span className="text-[10px] text-slate-400 line-clamp-1">{user.notes}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span dir="ltr">{user.email}</span>
                        </div>
                        {user.phone && (
                          <div className="flex items-center gap-1.5 text-slate-500 font-mono" dir="ltr">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{user.phone}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 space-y-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${getRoleBadgeColor(user.role)}`}>
                          <Shield className="w-3 h-3 ml-1" />
                          {getRoleName(user.role)}
                        </span>
                        {user.subject && (
                          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            التخصص: <span className="text-slate-700 dark:text-slate-300 font-semibold">{user.subject}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="max-w-xs space-y-1">
                          {assignedCourses.length === 0 && assignedGroups.length === 0 ? (
                            <span className="text-slate-400 text-[11px]">غير مخصص لأي كورس أو مجموعة</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {assignedCourses.map(c => (
                                <span key={c.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 rounded text-[10px] font-semibold">
                                  <BookOpen className="w-2.5 h-2.5" />
                                  {c.name}
                                </span>
                              ))}
                              {assignedGroups.map(g => (
                                <span key={g.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 rounded text-[10px]">
                                  <UsersIcon className="w-2.5 h-2.5" />
                                  {g.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">{user.branch || '-'}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${user.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'}`}>
                          {user.status === 'active' ? 'نشط' : 'غير نشط'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(user)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 cursor-pointer dark:hover:text-blue-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="تعديل"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(user.id, user.name)}
                            className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer dark:hover:text-red-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <UserModal 
          user={editingUser} 
          courses={courses || []}
          groups={groups || []}
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </div>
  );
}

function UserModal({ 
  user, 
  courses, 
  groups, 
  onClose 
}: { 
  user: User | null; 
  courses: any[]; 
  groups: any[]; 
  onClose: () => void; 
}) {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [role, setRole] = useState<User['role']>(user?.role || 'teacher');
  const [subject, setSubject] = useState(user?.subject || '');
  const [branch, setBranch] = useState(user?.branch || '');
  const [status, setStatus] = useState(user?.status || 'active');
  const [notes, setNotes] = useState(user?.notes || '');
  
  const [assignedCourseIds, setAssignedCourseIds] = useState<string[]>(user?.assignedCourseIds || []);
  const [assignedGroupIds, setAssignedGroupIds] = useState<string[]>(user?.assignedGroupIds || []);

  const toast = useToast();

  const toggleCourse = (courseId: string) => {
    setAssignedCourseIds(prev => {
      if (prev.includes(courseId)) {
        // Also deselect groups belonging to this course
        const courseGroupIds = groups.filter(g => g.courseId === courseId).map(g => g.id);
        setAssignedGroupIds(gPrev => gPrev.filter(id => !courseGroupIds.includes(id)));
        return prev.filter(id => id !== courseId);
      } else {
        return [...prev, courseId];
      }
    });
  };

  const toggleGroup = (groupId: string, courseId: string) => {
    setAssignedGroupIds(prev => {
      const isSelected = prev.includes(groupId);
      if (isSelected) {
        return prev.filter(id => id !== groupId);
      } else {
        // Automatically make sure parent course is also selected
        if (!assignedCourseIds.includes(courseId)) {
          setAssignedCourseIds(cPrev => [...cPrev, courseId]);
        }
        return [...prev, groupId];
      }
    });
  };

  const selectAllGroupsForCourse = (courseId: string) => {
    const courseGroupIds = groups.filter(g => g.courseId === courseId).map(g => g.id);
    const allSelected = courseGroupIds.every(id => assignedGroupIds.includes(id));

    if (allSelected) {
      setAssignedGroupIds(prev => prev.filter(id => !courseGroupIds.includes(id)));
    } else {
      if (!assignedCourseIds.includes(courseId)) {
        setAssignedCourseIds(prev => [...prev, courseId]);
      }
      setAssignedGroupIds(prev => Array.from(new Set([...prev, ...courseGroupIds])));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const now = Date.now();

    try {
      if (user) {
        await db.users.update(user.id, {
          name,
          email,
          phone,
          role,
          subject,
          branch,
          status,
          notes,
          assignedCourseIds,
          assignedGroupIds,
          updated_at: now,
          sync_status: 'pending'
        });
        toast.success('تم تحديث بيانات المستخدم بنجاح');
      } else {
        const newUser: User = {
          id: uuidv4(),
          name,
          email,
          phone,
          role,
          subject,
          branch,
          status,
          notes,
          assignedCourseIds,
          assignedGroupIds,
          created_at: now,
          updated_at: now,
          sync_status: 'pending'
        };
        await db.users.add(newUser);
        toast.success('تم إضافة المستخدم وتعيين الكورسات والمجموعات بنجاح');
      }
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء حفظ بيانات المستخدم');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {user ? 'تعديل بيانات المستخدم والصلاحيات' : 'إضافة مستخدم جديد وتحديد الكورسات'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              حدد الدور والتخصص والكورسات والمجموعات المسندة لهذا المستخدم
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Main user info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">الاسم بالكامل *</label>
              <input
                required
                type="text"
                placeholder="أحمد سمير"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">البريد الإلكتروني *</label>
              <input
                required
                type="email"
                dir="ltr"
                placeholder="teacher@masar.edu"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 text-left"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">رقم الهاتف / واتساب</label>
              <input
                type="tel"
                dir="ltr"
                placeholder="01xxxxxxxxx"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-right"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">الصلاحية (الدور) *</label>
              <select
                required
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={role}
                onChange={e => setRole(e.target.value as User['role'])}
              >
                <option value="teacher">مدرس (Teacher)</option>
                <option value="assistant">مساعد مدرس (Assistant)</option>
                <option value="staff">موظف استقبال (Staff)</option>
                <option value="manager">مدير فرع (Manager)</option>
                <option value="admin">مدير النظام (Admin)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">المادة أو التخصص</label>
              <input
                type="text"
                placeholder="مثال: الرياضيات، الفيزياء"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={subject}
                onChange={e => setSubject(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">الفرع</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={branch}
                onChange={e => setBranch(e.target.value)}
                placeholder="مثال: الفرع الرئيسي"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">حالة الحساب</label>
              <select
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={status}
                onChange={e => setStatus(e.target.value)}
              >
                <option value="active">نشط (مفعل)</option>
                <option value="inactive">غير نشط (معطل)</option>
              </select>
            </div>
          </div>

          {/* Courses & Groups Assignment Section */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>الكورسات والمجموعات المسندة</span>
                </h3>
                <p className="text-[11px] text-slate-500">اختر الكورسات والمجموعات التي يتولى هذا المستخدم التدريس فيها أو إدارتها</p>
              </div>
              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-900/40">
                {assignedCourseIds.length} كورس / {assignedGroupIds.length} مجموعة
              </span>
            </div>

            {courses.length === 0 ? (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-center text-xs text-slate-500">
                لا توجد كورسات مضافة في النظام بعد.
              </div>
            ) : (
              <div className="space-y-3 max-h-56 overflow-y-auto p-1">
                {courses.map(course => {
                  const isCourseSelected = assignedCourseIds.includes(course.id);
                  const courseGroups = groups.filter(g => g.courseId === course.id);

                  return (
                    <div 
                      key={course.id} 
                      className={`p-3 rounded-lg border transition-colors ${
                        isCourseSelected 
                          ? 'border-blue-300 dark:border-blue-800/60 bg-blue-50/40 dark:bg-blue-950/20' 
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={isCourseSelected}
                            onChange={() => toggleCourse(course.id)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                          />
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{course.name}</span>
                          {course.subject && (
                            <span className="text-[10px] text-slate-500">({course.subject})</span>
                          )}
                        </label>
                        {courseGroups.length > 0 && (
                          <button
                            type="button"
                            onClick={() => selectAllGroupsForCourse(course.id)}
                            className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                          >
                            {courseGroups.every(g => assignedGroupIds.includes(g.id)) ? 'إلغاء تحديد المجموعات' : 'تحديد كل المجموعات'}
                          </button>
                        )}
                      </div>

                      {/* Groups under this course */}
                      {courseGroups.length > 0 && (
                        <div className="mt-2.5 mr-6 grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                          {courseGroups.map(group => {
                            const isGroupSelected = assignedGroupIds.includes(group.id);
                            return (
                              <label 
                                key={group.id} 
                                className={`flex items-center gap-2 p-1.5 rounded cursor-pointer text-[11px] transition-colors ${
                                  isGroupSelected
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-semibold'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                              >
                                <input 
                                  type="checkbox"
                                  checked={isGroupSelected}
                                  onChange={() => toggleGroup(group.id, course.id)}
                                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                                />
                                <span className="truncate">{group.name}</span>
                                {group.daysOfWeek?.length > 0 && (
                                  <span className="text-[9px] opacity-70">({group.daysOfWeek.join('، ')})</span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">ملاحظات إضافية</label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="أي تفاصيل أو ملاحظات تنظيمية خاصة بالمستخدم..."
            />
          </div>

          <div className="mt-6 flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-bold transition-colors shadow-xs"
            >
              حفظ وتثبيت البيانات
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
