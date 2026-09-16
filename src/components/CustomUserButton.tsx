import { useState, useRef, useEffect, useMemo } from 'react';
import { useUser, useClerk, useOrganization } from '@clerk/clerk-react';
import { LogOut, User as UserIcon, Settings, ChevronDown, Building } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useApiQuery } from '../config/queryHooks';
import { Settings as SettingsType } from '../types';

export function CustomUserButton() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { organization } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Fetch local and API settings
  const settingsList = useLiveQuery(() => db.settings.toArray(), []);
  const localSettings = settingsList?.[0];
  const { data: apiSettings = [] } = useApiQuery<SettingsType>('settings', 60 * 1000);
  const apiSetting = apiSettings?.[0];

  // Fetch local users to check for teacher or admin profile
  const dbUsers = useLiveQuery(() => db.users.toArray(), []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Resolve the teacher name added during academy setup
  const { teacherFullName, teacherDisplayName } = useMemo(() => {
    const orgId = organization?.id;

    // 1. Organization-specific or global localStorage keys
    const localOrgTeacherName = orgId ? localStorage.getItem(`masar_teacher_name_${orgId}`) : null;
    const localTeacherName = localStorage.getItem('masar_teacher_name');
    const localTeacherFirstName = localStorage.getItem('masar_teacher_first_name');
    const localTeacherNameAlt =
      localStorage.getItem('teacher_name') ||
      localStorage.getItem('teacherName') ||
      localStorage.getItem('masar_setup_teacher');

    // 2. Database settings table
    const settingsTeacherName = localSettings?.teacherName || apiSetting?.teacherName;

    // 3. Clerk User metadata
    const userMetaTeacherName =
      (user?.unsafeMetadata as any)?.teacherName ||
      (user?.publicMetadata as any)?.teacherName ||
      (user?.unsafeMetadata as any)?.firstName;

    // 4. Clerk Organization metadata
    const orgMetaTeacherName =
      (organization as any)?.unsafeMetadata?.teacherName ||
      (organization as any)?.publicMetadata?.teacherName;

    // 5. Database Users table (admin or teacher record)
    const userEmail = user?.primaryEmailAddress?.emailAddress;
    const matchedUser =
      dbUsers?.find((u) => (u.clerkUserId && u.clerkUserId === user?.id) || (userEmail && u.email === userEmail)) ||
      dbUsers?.find((u) => u.role === 'admin' || u.role === 'teacher');
    const dbUserName = matchedUser?.name;

    // 6. Clerk User standard fields (first & last name)
    const clerkCombined = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
    const clerkFullName = user?.fullName;

    // Resolve full teacher name
    const resolvedFullName =
      localOrgTeacherName ||
      localTeacherName ||
      localTeacherNameAlt ||
      settingsTeacherName ||
      userMetaTeacherName ||
      orgMetaTeacherName ||
      dbUserName ||
      (clerkCombined || null) ||
      (clerkFullName && !clerkFullName.includes('@') && clerkFullName !== user?.username ? clerkFullName : null) ||
      user?.firstName ||
      user?.username ||
      'معلم الأكاديمية';

    // Resolve display name for header button
    const resolvedDisplayName =
      localTeacherFirstName ||
      (user?.firstName ? user.firstName : null) ||
      (resolvedFullName && resolvedFullName !== 'معلم الأكاديمية' ? resolvedFullName : null) ||
      user?.username ||
      'المعلم';

    return {
      teacherFullName: resolvedFullName,
      teacherDisplayName: resolvedDisplayName
    };
  }, [user, organization, localSettings, apiSetting, dbUsers]);

  // Keep local storage & Dexie in sync if teacherFullName exists
  useEffect(() => {
    if (teacherFullName && teacherFullName !== 'معلم الأكاديمية') {
      if (!localStorage.getItem('masar_teacher_name')) {
        localStorage.setItem('masar_teacher_name', teacherFullName);
      }
      if (organization?.id && !localStorage.getItem(`masar_teacher_name_${organization.id}`)) {
        localStorage.setItem(`masar_teacher_name_${organization.id}`, teacherFullName);
      }
    }
  }, [teacherFullName, organization?.id]);

  if (!isLoaded || !user) {
    return (
      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
    );
  }

  const handleSignOut = () => {
    signOut(() => navigate('/'));
  };

  const academyName =
    organization?.name ||
    localSettings?.academyName ||
    apiSetting?.academyName ||
    localStorage.getItem('masar_academy_name') ||
    'الأكاديمية الخاصة بك';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 pr-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
      >
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 hidden sm:block max-w-[140px] truncate tracking-tight">
          {teacherDisplayName}
        </span>
        <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center overflow-hidden shrink-0">
          {user.hasImage ? (
            <img src={user.imageUrl} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <UserIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          )}
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden z-50 origin-top-left animate-in fade-in zoom-in-95 duration-100">
          {/* User Info Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center overflow-hidden shrink-0">
                {user.hasImage ? (
                  <img src={user.imageUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate tracking-tight font-['Readex_Pro']">
                  {teacherFullName}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 truncate" dir="ltr">
                  {user.primaryEmailAddress?.emailAddress}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-1.5">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/settings');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>الإعدادات</span>
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <Building className="w-4 h-4 text-slate-400" />
              <span className="truncate">{academyName}</span>
            </button>

            <div className="h-px bg-slate-100 dark:bg-slate-800 my-1.5" />

            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
