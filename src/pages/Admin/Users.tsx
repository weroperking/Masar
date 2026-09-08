import React from 'react';
import { UserCog, Plus, Edit2, Trash2, Shield, User as UserIcon, Mail } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { useState } from 'react';
import { User } from '../../types';
import { useToast } from '../../context/ToastContext';
import { v4 as uuidv4 } from 'uuid';
import { X } from 'lucide-react';

export function Users() {
  const users = useLiveQuery(() => db.users.filter(u => !u.deleted_at).toArray(), []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const toast = useToast();

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف المستخدم ${name}؟`)) {
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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">المستخدمين والصلاحيات</h1>
        <button 
          onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 ml-2" />
          إضافة مستخدم
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
          <p className="text-sm font-medium text-slate-500 mb-1">الموظفين والمساعدين</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">{users?.filter(u => ['staff', 'assistant'].includes(u.role)).length || 0}</span>
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
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-4 font-medium">الاسم</th>
                  <th className="px-6 py-4 font-medium">البريد الإلكتروني</th>
                  <th className="px-6 py-4 font-medium">الدور (الصلاحية)</th>
                  <th className="px-6 py-4 font-medium">الفرع</th>
                  <th className="px-6 py-4 font-medium">الحالة</th>
                  <th className="px-6 py-4 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users?.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                          <UserIcon className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Mail className="w-4 h-4" />
                        <span dir="ltr">{user.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                        <Shield className="w-3 h-3 ml-1" />
                        {getRoleName(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{user.branch || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${user.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'}`}>
                        {user.status === 'active' ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(user)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="تعديل"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id, user.name)}
                          className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <UserModal 
          user={editingUser} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </div>
  );
}

function UserModal({ user, onClose }: { user: User | null; onClose: () => void }) {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [role, setRole] = useState<User['role']>(user?.role || 'staff');
  const [branch, setBranch] = useState(user?.branch || '');
  const [status, setStatus] = useState(user?.status || 'active');
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const now = Date.now();

    try {
      if (user) {
        await db.users.update(user.id, {
          name,
          email,
          role,
          branch,
          status,
          updated_at: now,
          sync_status: 'pending'
        });
        toast.success('تم تحديث بيانات المستخدم بنجاح');
      } else {
        const newUser: User = {
          id: uuidv4(),
          name,
          email,
          role,
          branch,
          status,
          created_at: now,
          updated_at: now,
          sync_status: 'pending'
        };
        await db.users.add(newUser);
        toast.success('تم إضافة المستخدم بنجاح');
      }
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء حفظ بيانات المستخدم');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {user ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم جديد'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الاسم رباعي *</label>
            <input
              required
              type="text"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">البريد الإلكتروني *</label>
            <input
              required
              type="email"
              dir="ltr"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-left"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الصلاحية (الدور) *</label>
              <select
                required
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={role}
                onChange={e => setRole(e.target.value as User['role'])}
              >
                <option value="admin">مدير النظام</option>
                <option value="manager">مدير فرع</option>
                <option value="teacher">مدرس</option>
                <option value="assistant">مساعد مدرس</option>
                <option value="staff">موظف استقبال</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">حالة الحساب</label>
              <select
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={status}
                onChange={e => setStatus(e.target.value)}
              >
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الفرع (اختياري)</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={branch}
              onChange={e => setBranch(e.target.value)}
              placeholder="مثال: الفرع الرئيسي"
            />
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-sm transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold transition-colors"
            >
              حفظ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
