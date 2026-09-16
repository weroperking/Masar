import React, { useState, useEffect } from 'react';
import { useOrganizationList, useClerk, useUser } from '@clerk/clerk-react';
import {
  Building2,
  Plus,
  ArrowRight,
  Loader2,
  LogOut,
  LayoutDashboard,
  Users,
  BookOpen,
  Calendar,
  DollarSign,
  ShieldCheck,
  School,
  FileText,
  BarChart3,
  Settings,
  MessageSquare
} from 'lucide-react';
import { MasarLogo } from '../../components/MasarLogo';

export function CustomOrganizationList() {
  const { userMemberships, isLoaded, setActive, createOrganization } = useOrganizationList({
    userMemberships: { infinite: true },
  });
  const { signOut } = useClerk();
  const { user } = useUser();

  const [mode, setMode] = useState<'list' | 'create'>('list');
  const [orgName, setOrgName] = useState('');
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const hasAutoSelectedRef = React.useRef(false);

  useEffect(() => {
    if (user) {
      if (!firstName && user.firstName) setFirstName(user.firstName);
      if (!lastName && user.lastName) setLastName(user.lastName);
    }
  }, [user]);

  useEffect(() => {
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

  const displayName = [firstName, lastName].filter(Boolean).join(' ') || user?.fullName || 'محمد خالد';
  const displayAcademyName = orgName.trim() || 'سنتر الأوائل التعليمي';

  // --- LIST MODE (Existing Organizations) ---
  if (mode === 'list') {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="flex justify-center mb-8">
          <MasarLogo size="lg" />
        </div>

        <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 sm:p-10 shadow-sm">
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 mb-4">
                <Building2 className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight font-['Readex_Pro']">الأكاديميات المتاحة</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-['Cairo']">
                اختر الأكاديمية للمتابعة أو أنشئ أكاديمية جديدة
              </p>
            </div>

            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl text-center">
                {error}
              </div>
            )}

            <div className="space-y-2.5">
              {userMemberships.data?.map((membership) => (
                <button
                  key={membership.organization.id}
                  onClick={() => handleSelect(membership.organization.id)}
                  disabled={loading}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-600 hover:bg-blue-50/50 transition-all text-right disabled:opacity-50 group bg-white dark:bg-slate-900"
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
                className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 flex items-center justify-center gap-2"
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
        </div>
      </div>
    );
  }

  // --- CREATE MODE (Full-Screen Split Onboarding Matching Reference Image) ---
  return (
    <div className="w-full min-h-screen lg:h-screen lg:overflow-hidden flex flex-col lg:flex-row items-stretch bg-slate-50/50 dark:bg-slate-950">
      
      {/* FORM COLUMN (Centered in its half) */}
      <div className="w-full lg:w-[48%] xl:w-[44%] flex flex-col items-center justify-center px-6 sm:px-12 lg:px-16 py-10 lg:py-12 shrink-0">
        <div className="w-full max-w-sm sm:max-w-md mx-auto">
          
          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="mb-6">
              <MasarLogo size="lg" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight font-['Readex_Pro']">
              إنشاء أكاديمية جديدة
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-['Cairo']">
              أدخل اسم الأكاديمية أو المركز التعليمي لبدء العمل
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-sm rounded-xl text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4 font-['Cairo']">
            {/* User Name Inputs (First & Last Name) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  الاسم الأول
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="محمد"
                  className="block w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 transition-all text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  اسم العائلة
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="خالد"
                  className="block w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 transition-all text-sm"
                />
              </div>
            </div>

            {/* Academy Name (Main Field) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                اسم الأكاديمية أو السنتر
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="block w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 transition-all text-sm font-medium"
                  placeholder="مثال: سنتر الأوائل التعليمي"
                  autoFocus
                />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <School className="w-4 h-4 text-blue-600/70" />
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                سيظهر هذا الاسم للطلاب وفي التقارير والإيصالات.
              </p>
            </div>

            {/* CTA Button */}
            <div className="pt-3 space-y-3">
              <button
                type="submit"
                disabled={loading || !orgName.trim()}
                className="w-full py-3.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-sm shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري تجهيز الأكاديمية...</span>
                  </>
                ) : (
                  <>
                    <span>المتابعة إلى لوحة التحكم</span>
                    <ArrowRight className="w-4 h-4 rotate-180" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between pt-2 text-xs">
                {userMemberships.data && userMemberships.data.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('list');
                      setError('');
                    }}
                    className="text-blue-600 hover:text-blue-700 font-medium hover:underline transition-colors"
                  >
                    العودة لقائمة الأكاديميات
                  </button>
                ) : (
                  <span className="text-slate-400">إعداد فوري وآمن بالكامل</span>
                )}

                <button
                  type="button"
                  onClick={() => signOut()}
                  className="text-slate-500 hover:text-red-600 transition-colors flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* PREVIEW COLUMN (Takes full benefit of remaining screen space, matching screenshot) */}
      <div className="w-full lg:flex-1 p-4 sm:p-6 lg:p-8 lg:pr-0 flex flex-col justify-center h-full overflow-hidden">
        
        {/* Realistic Mock UI Container */}
        <div className="w-full h-full lg:max-h-[calc(100vh-4rem)] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl lg:rounded-l-none lg:rounded-r-2xl shadow-xl shadow-slate-200/50 dark:shadow-black/40 flex flex-col overflow-hidden">
          
          {/* Top Bar of the Mock App */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900">
            {/* Live Academy Name */}
            <div className="flex items-center">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base tracking-tight font-['Readex_Pro'] transition-all duration-200 max-w-[200px] sm:max-w-xs truncate">
                {displayAcademyName}
              </span>
            </div>

            {/* Live Greeting on Top Right (or Left in RTL) with Subtle Skeleton Lines */}
            <div className="text-left flex flex-col items-end">
              <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 font-['Readex_Pro']">
                مرحباً، {displayName}
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="h-1.5 w-16 bg-slate-200 dark:bg-slate-800 rounded-full" />
                <div className="h-1.5 w-8 bg-slate-100 dark:bg-slate-800/60 rounded-full" />
              </div>
            </div>
          </div>

          {/* Body of the Mock App */}
          <div className="flex-1 flex overflow-hidden">
            {/* Mock Mini-Sidebar */}
            <div className="w-36 sm:w-44 bg-slate-50/60 dark:bg-slate-950/40 border-l border-slate-100 dark:border-slate-800/70 p-3 sm:p-4 flex flex-col gap-2 shrink-0 select-none">
              
              {/* Group 1: 4 Items */}
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-blue-600 bg-blue-50/70 dark:bg-blue-950/30">
                  <LayoutDashboard className="w-4 h-4 shrink-0 text-blue-600" />
                  <div className="h-2 w-14 bg-blue-200/80 dark:bg-blue-800/60 rounded-full" />
                </div>

                <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-slate-400">
                  <FileText className="w-4 h-4 shrink-0 text-slate-400" />
                  <div className="h-2 w-16 bg-slate-200 dark:bg-slate-800 rounded-full" />
                </div>

                <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-slate-400">
                  <BarChart3 className="w-4 h-4 shrink-0 text-slate-400" />
                  <div className="h-2 w-12 bg-slate-200 dark:bg-slate-800 rounded-full" />
                </div>

                <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-slate-400">
                  <Settings className="w-4 h-4 shrink-0 text-slate-400" />
                  <div className="h-2 w-14 bg-slate-200 dark:bg-slate-800 rounded-full" />
                </div>
              </div>

              {/* Sidebar Divider */}
              <div className="my-1.5 border-t border-slate-200/60 dark:border-slate-800" />

              {/* Group 2 */}
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-slate-400">
                  <Users className="w-4 h-4 shrink-0 text-slate-400" />
                  <div className="h-2 w-16 bg-slate-200 dark:bg-slate-800 rounded-full" />
                </div>

                <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-slate-400">
                  <MessageSquare className="w-4 h-4 shrink-0 text-slate-400" />
                  <div className="h-2 w-14 bg-slate-200 dark:bg-slate-800 rounded-full" />
                </div>

                <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-slate-400">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-slate-400" />
                  <div className="h-2 w-10 bg-slate-200 dark:bg-slate-800 rounded-full" />
                </div>
              </div>
            </div>

            {/* Mock Main Content Area (Spacious Cards matching reference image) */}
            <div className="flex-1 p-5 sm:p-6 flex flex-col gap-4 bg-white dark:bg-slate-900 select-none overflow-hidden">
              
              {/* Top Skeleton Row */}
              <div className="flex items-center gap-3">
                <div className="h-3 w-32 bg-slate-200/90 dark:bg-slate-800 rounded-full" />
                <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800/60 rounded-full" />
              </div>

              {/* Large Main Rectangular Card */}
              <div className="flex-1 min-h-[220px] sm:min-h-[280px] border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="h-2.5 w-24 bg-slate-200/60 dark:bg-slate-800/70 rounded-full" />
                  <div className="h-2.5 w-12 bg-slate-200/40 dark:bg-slate-800/50 rounded-full" />
                </div>
                <div className="space-y-2">
                  <div className="h-2 w-full bg-slate-200/40 dark:bg-slate-800/40 rounded-full" />
                  <div className="h-2 w-3/4 bg-slate-200/30 dark:bg-slate-800/30 rounded-full" />
                </div>
              </div>

              {/* Secondary Lower Card */}
              <div className="h-28 sm:h-36 border border-slate-200/70 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-950/20 rounded-2xl p-4 flex flex-col justify-between">
                <div className="h-2.5 w-28 bg-slate-200/50 dark:bg-slate-800/60 rounded-full" />
                <div className="h-2 w-1/2 bg-slate-200/30 dark:bg-slate-800/30 rounded-full" />
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}


