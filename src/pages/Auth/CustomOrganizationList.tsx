import React, { useState } from 'react';
import { useOrganizationList } from '@clerk/clerk-react';
import { Building2, Plus, ArrowRight, Loader2, LogOut } from 'lucide-react';
import { useClerk } from '@clerk/clerk-react';
import { MasarLogo } from '../../components/MasarLogo';

export function CustomOrganizationList() {
  const { userMemberships, isLoaded, setActive, createOrganization } = useOrganizationList({
    userMemberships: { infinite: true },
  });
  const { signOut } = useClerk();
  const [mode, setMode] = useState<'list' | 'create'>('list');
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const hasAutoSelectedRef = React.useRef(false);

  React.useEffect(() => {
    if (isLoaded && userMemberships.data) {
      if (userMemberships.data.length === 0) {
        setMode('create');
      } else if (userMemberships.data.length === 1 && !hasAutoSelectedRef.current && !loading) {
        const firstOrg = userMemberships.data[0].organization;
        if (firstOrg?.id) {
          hasAutoSelectedRef.current = true;
          handleSelect(firstOrg.id);
        }
      }
    }
  }, [isLoaded, userMemberships.data, loading]);

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-slate-500 text-sm">جاري تحميل بيانات الأكاديمية...</p>
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
      const newOrg = await createOrganization({ name: orgName.trim() });
      await setActive({ organization: newOrg.id });
    } catch (err: any) {
      console.error(err);
      setError(err.errors?.[0]?.longMessage || 'حدث خطأ أثناء إنشاء الأكاديمية');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Brand Logo */}
      <div className="flex justify-center mb-8">
        <MasarLogo size="lg" />
      </div>

      <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 sm:p-10 shadow-sm">
        {mode === 'list' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-500/5 border border-blue-600/10 text-blue-600 mb-4">
                <Building2 className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">الأكاديميات المتاحة</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
                اختر الأكاديمية للمتابعة أو أنشئ أكاديمية جديدة
              </p>
            </div>

            {error && (
              <div className="p-3.5 bg-red-50/80 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-sm rounded-xl text-center">
                {error}
              </div>
            )}

            <div className="space-y-2.5">
              {userMemberships.data?.map((membership) => (
                <button
                  key={membership.organization.id}
                  onClick={() => handleSelect(membership.organization.id)}
                  disabled={loading}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-600 hover:bg-blue-500/5 transition-all text-right disabled:opacity-50 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700 text-slate-500">
                      {membership.organization.imageUrl ? (
                        <img src={membership.organization.imageUrl} alt={membership.organization.name} className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{membership.organization.name}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{membership.role === 'admin' ? 'مدير المركز' : 'عضو'}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:-translate-x-0.5 transition-all" />
                </button>
              ))}

              {userMemberships.data?.length === 0 && (
                <div className="text-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                  <p className="text-slate-500 dark:text-slate-400 text-sm">لا توجد أكاديميات مسجلة باسمك بعد</p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <button
                type="button"
                onClick={() => {
                  setMode('create');
                  setError('');
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-medium text-sm transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>إنشاء أكاديمية جديدة</span>
              </button>

              <button
                type="button"
                onClick={() => signOut()}
                className="w-full py-2.5 px-4 rounded-xl text-slate-500 hover:text-red-600 font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </div>
        )}

        {mode === 'create' && (
          <form onSubmit={handleCreate} className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-500/5 border border-blue-600/10 text-blue-600 mb-4">
                <Plus className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">إنشاء أكاديمية جديدة</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
                أدخل اسم الأكاديمية أو المركز التعليمي لبدء العمل
              </p>
            </div>

            {error && (
              <div className="p-3.5 bg-red-50/80 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-sm rounded-xl text-center">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">
                اسم الأكاديمية أو السنتر
              </label>
              <input
                type="text"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="block w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 transition-all sm:text-sm"
                placeholder="مثال: سنتر الأوائل التعليمي"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                سيظهر هذا الاسم للطلاب وفي التقارير والإيصالات
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="submit"
                disabled={loading || !orgName.trim()}
                className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-medium text-sm transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>إنشاء ومتابعة</span>}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('list');
                    setError('');
                  }}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                >
                  العودة لقائمة الأكاديميات
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

