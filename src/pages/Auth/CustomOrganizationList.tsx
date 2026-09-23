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
  MessageSquare,
  KeyRound,
  Lock,
  ArrowLeft
} from 'lucide-react';
import { MasarLogo } from '../../components/MasarLogo';
import { db } from '../../db/db';

export function CustomOrganizationList() {
  const { userMemberships, isLoaded, setActive, createOrganization } = useOrganizationList({
    userMemberships: { infinite: true },
  });
  const { signOut } = useClerk();
  const { user } = useUser();

  const [mode, setMode] = useState<'list' | 'create'>('list');
  const [setupStep, setSetupStep] = useState<'org_details' | 'profile_pins'>('org_details');
  const [orgName, setOrgName] = useState('');
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  
  // Profile PIN setup states
  const [adminPin, setAdminPin] = useState('1234');
  const [enableAssistant, setEnableAssistant] = useState(false);
  const [assistantName, setAssistantName] = useState('فريق المساعدين');
  const [assistantPinRequired, setAssistantPinRequired] = useState(false);
  const [assistantPin, setAssistantPin] = useState('');

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

      if (enableAssistant && assistantPinRequired) {
        if (!assistantPin || assistantPin.length !== 4) {
          setError('رمز PIN للمساعد يجب أن يتكون من 4 أرقام');
          setLoading(false);
          return;
        }
        if (assistantPin === adminPin) {
          setError('لا يمكن أن يكون رمز PIN الخاص بالمساعد مطابقاً لرمز المعلم (المدير). يرجى اختيار رمزين مختلفين.');
          setLoading(false);
          return;
        }
      }

      const teacherFullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');

      // 1. Update Clerk user profile with the entered teacher name
      if (user && (firstName.trim() || lastName.trim())) {
        try {
          await user.update({
            firstName: firstName.trim() || undefined,
            lastName: lastName.trim() || undefined,
            unsafeMetadata: {
              ...(user.unsafeMetadata || {}),
              teacherName: teacherFullName,
              firstName: firstName.trim(),
              lastName: lastName.trim()
            }
          });
        } catch (uErr) {
          console.warn('Could not update user directly in Clerk:', uErr);
        }
      }

      // 2. Create organization
      const newOrg = await createOrganization({ name: orgName.trim() });
      await setActive({ organization: newOrg.id });

      // 3. Persist to localStorage
      if (teacherFullName) {
        localStorage.setItem('masar_teacher_name', teacherFullName);
        if (firstName.trim()) localStorage.setItem('masar_teacher_first_name', firstName.trim());
        if (lastName.trim()) localStorage.setItem('masar_teacher_last_name', lastName.trim());
        if (newOrg?.id) {
          localStorage.setItem(`masar_teacher_name_${newOrg.id}`, teacherFullName);
        }
      }
      localStorage.setItem('masar_academy_name', orgName.trim());
      if (newOrg?.id) {
        localStorage.setItem(`masar_academy_name_${newOrg.id}`, orgName.trim());
      }

      // 4. Save to IndexedDB (Settings & Users)
      try {
        const profilesConfig = {
          adminPin: adminPin || '1234',
          adminName: teacherFullName,
          adminAvatarUrl: '/avatar-admin.svg',
          assistantEnabled: enableAssistant,
          assistantName: assistantName.trim() || 'فريق المساعدين',
          assistantAvatarUrl: '/avatar-assistant.svg',
          assistantPinRequired: assistantPinRequired,
          assistantPin: assistantPinRequired ? assistantPin : '',
          autoLockMinutes: 15
        };

        const existingSettings = await db.settings.toArray();
        if (existingSettings.length > 0) {
          await db.settings.update(existingSettings[0].id, {
            teacherName: teacherFullName || existingSettings[0].teacherName,
            academyName: orgName.trim(),
            profilesConfig,
            updated_at: Date.now()
          });
        } else {
          await db.settings.add({
            id: 'default-settings',
            teacherName: teacherFullName,
            academyName: orgName.trim(),
            autoCreateAssignmentPerSession: false,
            freeSessionLimitPerStudent: 1,
            assignmentGradingMethod: 'numeric',
            numericMaxGrade: 100,
            profilesConfig,
            created_at: Date.now(),
            updated_at: Date.now(),
            sync_status: 'synced'
          });
        }

        const userEmail = user?.primaryEmailAddress?.emailAddress || '';
        const existingUser = userEmail ? await db.users.where('email').equals(userEmail).first() : null;
        if (existingUser) {
          await db.users.update(existingUser.id, {
            name: teacherFullName || existingUser.name,
            clerkUserId: user?.id,
            role: 'admin',
            updated_at: Date.now()
          });
        } else if (teacherFullName) {
          await db.users.add({
            id: 'user-' + Date.now(),
            name: teacherFullName,
            email: userEmail,
            clerkUserId: user?.id,
            role: 'admin',
            status: 'active',
            created_at: Date.now(),
            updated_at: Date.now(),
            sync_status: 'synced'
          });
        }
      } catch (dbErr) {
        console.warn('Failed to seed settings/users in IndexedDB:', dbErr);
      }
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

          {setupStep === 'org_details' ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!orgName.trim()) return;
                setSetupStep('profile_pins');
              }}
              className="space-y-4 font-['Cairo']"
            >
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

              {/* Next Step Button */}
              <div className="pt-3 space-y-3">
                <button
                  type="submit"
                  disabled={!orgName.trim()}
                  className="w-full py-3.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-sm shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>التالي: إعداد رمز الحماية والملفات</span>
                  <ArrowRight className="w-4 h-4 rotate-180" />
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
          ) : (
            /* STEP 2: PROFILE PIN & ASSISTANT SETUP (Requested by User) */
            <form onSubmit={handleCreate} className="space-y-4 font-['Cairo']">
              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <KeyRound className="w-4 h-4 shrink-0 text-blue-600" />
                <span>قم بتعيين رمز PIN لملف المعلم، ويمكنك إضافة ملف للمساعدين الآن أو لاحقاً.</span>
              </div>

              {/* Admin PIN */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-600" />
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    رمز PIN الخاص بحساب المعلم (المدير)
                  </label>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  رمز من 4 أرقام لحماية الإعدادات والتقارير المالية والخزينة.
                </p>
                <input
                  type="password"
                  required
                  maxLength={4}
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="1234"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-sm font-mono tracking-widest focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Assistant Profile Option */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                      تفعيل ملف إضافي لفريق المساعدين؟
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      يسمح للمساعدين بتسجيل الحضور مع حجب تام لكافة الماليات.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableAssistant}
                    onChange={(e) => setEnableAssistant(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                </div>

                {enableAssistant && (
                  <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        اسم ملف المساعدين
                      </label>
                      <input
                        type="text"
                        value={assistantName}
                        onChange={(e) => setAssistantName(e.target.value)}
                        placeholder="مثال: فريق المساعدين أو الاستقبال"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                        طلب رمز PIN للمساعدين أيضاً؟
                      </span>
                      <input
                        type="checkbox"
                        checked={assistantPinRequired}
                        onChange={(e) => setAssistantPinRequired(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                      />
                    </div>

                    {assistantPinRequired && (
                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          رمز PIN للمساعد (4 أرقام)
                        </label>
                        <input
                          type="password"
                          maxLength={4}
                          value={assistantPin}
                          onChange={(e) => setAssistantPin(e.target.value.replace(/\D/g, ''))}
                          placeholder="****"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono tracking-widest text-center"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={loading || adminPin.length !== 4}
                  className="flex-1 py-3.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-sm shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري حفظ الأكاديمية...</span>
                    </>
                  ) : (
                    <>
                      <span>إنهاء وبدء الاستخدام</span>
                      <ArrowRight className="w-4 h-4 rotate-180" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setSetupStep('org_details')}
                  className="py-3.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  رجوع
                </button>
              </div>
            </form>
          )}
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


