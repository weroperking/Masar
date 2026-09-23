import { useState, useRef, useEffect, useMemo } from 'react';
import { useUser, useClerk, useOrganization } from '@clerk/clerk-react';
import { LogOut, User as UserIcon, Settings, ChevronDown, Building, Users2, Lock, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useApiQuery } from '../config/queryHooks';
import { Settings as SettingsType } from '../types';
import { useProfile } from '../context/ProfileContext';

export function CustomUserButton() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { organization } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { currentProfile, accounts, lockProfile, openProfileSelector } = useProfile();

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

  // Resolve active profile details
  const activeProfileAccount = currentProfile === 'assistant' && accounts.assistant
    ? accounts.assistant
    : accounts.admin;

  const currentDisplayName = activeProfileAccount.name;
  const isAssistantActive = currentProfile === 'assistant';

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
        className="flex items-center gap-2.5 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700/80 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer select-none"
      >
        <div className="relative w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-slate-200 dark:ring-slate-700">
          <img
            src={activeProfileAccount.avatarUrl || '/download.png'}
            alt={currentDisplayName}
            className="w-full h-full object-cover"
            onError={(e) => {
              if (user.imageUrl) {
                (e.target as HTMLImageElement).src = user.imageUrl;
              }
            }}
          />
          {isAssistantActive && (
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white" />
          )}
        </div>
        <div className="flex flex-col text-right hidden sm:block max-w-[130px]">
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate tracking-tight">
            {currentDisplayName}
          </span>
          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium leading-none truncate">
            {isAssistantActive ? 'فريق المساعدين' : 'المعلم (المدير)'}
          </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden z-50 origin-top-left animate-in fade-in zoom-in-95 duration-100">
          {/* Active Profile Header */}
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 ring-2 ring-blue-500/30 flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src={activeProfileAccount.avatarUrl || '/download.png'}
                  alt={currentDisplayName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate tracking-tight">
                    {currentDisplayName}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    isAssistantActive
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                      : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                  }`}>
                    {isAssistantActive ? 'مساعد' : 'مدير'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5" dir="ltr">
                  {user.primaryEmailAddress?.emailAddress}
                </span>
              </div>
            </div>
          </div>

          {/* Profile Switch & Security Section */}
          <div className="p-1.5 border-b border-slate-100 dark:border-slate-800">
            <button
              onClick={() => {
                setIsOpen(false);
                openProfileSelector();
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 dark:hover:text-blue-400 rounded-lg transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Users2 className="w-4 h-4 text-blue-600" />
                <span className="font-semibold">تبديل الملف الشخصي</span>
              </div>
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">
                {accounts.assistant ? '2 ملفات' : 'ملف 1'}
              </span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                lockProfile();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors cursor-pointer"
            >
              <Lock className="w-4 h-4 text-amber-500" />
              <span>قفل الشاشة الآن (Lock)</span>
            </button>
          </div>

          {/* General Navigation Actions */}
          <div className="p-1.5 space-y-0.5">
            {!isAssistantActive && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/settings');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 rounded-lg transition-colors cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-slate-400" />
                <span>إعدادات النظام والأمان</span>
              </button>
            )}

            <button
              onClick={() => {
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 rounded-lg transition-colors cursor-pointer"
            >
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span className="truncate">{academyName}</span>
            </button>

            <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

