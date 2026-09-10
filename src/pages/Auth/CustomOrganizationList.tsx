import React, { useState } from 'react';
import { useOrganizationList } from '@clerk/clerk-react';
import { Building2, Plus, ArrowRight, Loader2, LogOut } from 'lucide-react';
import { useClerk } from '@clerk/clerk-react';

export function CustomOrganizationList() {
  const { userMemberships, isLoaded, setActive, createOrganization } = useOrganizationList({
    userMemberships: { infinite: true },
  });
  const { signOut } = useClerk();
  const [mode, setMode] = useState<'list' | 'create'>('list');
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-slate-500 text-sm">جاري تحميل الأكاديميات...</p>
      </div>
    );
  }

  const handleSelect = async (organizationId: string) => {
    try {
      setLoading(true);
      await setActive({ organization: organizationId });
    } catch (err: any) {
      console.error(err);
      setError('فشل اختيار الأكاديمية');
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || !createOrganization) return;
    
    try {
      setLoading(true);
      setError('');
      const newOrg = await createOrganization({ name: orgName });
      await setActive({ organization: newOrg.id });
    } catch (err: any) {
      console.error(err);
      setError(err.errors?.[0]?.longMessage || 'حدث خطأ أثناء إنشاء الأكاديمية');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-8">
      {mode === 'list' && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-4">
              <Building2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">الأكاديميات المتاحة</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              اختر أكاديمية للدخول أو قم بإنشاء أكاديمية جديدة
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {userMemberships.data?.map((membership) => (
              <button
                key={membership.organization.id}
                onClick={() => handleSelect(membership.organization.id)}
                disabled={loading}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-right disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
                    {membership.organization.imageUrl ? (
                      <img src={membership.organization.imageUrl} alt={membership.organization.name} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{membership.organization.name}</span>
                    <span className="text-xs text-slate-500">{membership.role === 'admin' ? 'مدير' : 'عضو'}</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>
            ))}

            {userMemberships.data?.length === 0 && (
              <div className="text-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                <p className="text-slate-500 dark:text-slate-400 text-sm">لا توجد أكاديميات مسجلة باسمك</p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <button
              onClick={() => {
                setMode('create');
                setError('');
              }}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-xl font-bold transition-all"
            >
              <Plus className="w-5 h-5" />
              <span>إنشاء أكاديمية جديدة</span>
            </button>

            <button
              onClick={() => signOut()}
              className="w-full flex items-center justify-center gap-2 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl font-semibold transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      )}

      {mode === 'create' && (
        <form onSubmit={handleCreate} className="space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 mb-4">
              <Plus className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">إنشاء أكاديمية جديدة</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              أدخل اسم الأكاديمية أو السنتر التعليمي الخاص بك
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              اسم الأكاديمية
            </label>
            <input
              type="text"
              required
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-slate-100"
              placeholder="مثال: سنتر الأوائل"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !orgName.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <span>إنشاء ومتابعة</span>
            )}
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setMode('list');
                setError('');
              }}
              className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-sm font-semibold"
            >
              العودة لقائمة الأكاديميات
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
