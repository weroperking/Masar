import { useState, useRef, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { LogOut, User as UserIcon, Settings, ChevronDown, Building } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function CustomUserButton() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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

  if (!isLoaded || !user) {
    return (
      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
    );
  }

  const handleSignOut = () => {
    signOut(() => navigate('/'));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 pr-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
      >
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 hidden sm:block">
          {user.firstName || user.username || 'مستخدم'}
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
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  {user.fullName || user.username || 'مستخدم المنصة'}
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
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>الإعدادات</span>
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                // The main App.tsx AuthGate forces org selection if active org is missing, 
                // but setting active to null might trigger it if we wanted to switch orgs.
                // For simplicity, we just provide the logout here.
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Building className="w-4 h-4 text-slate-400" />
              <span>الأكاديمية الخاصة بك</span>
            </button>
            
            <div className="h-px bg-slate-100 dark:bg-slate-800 my-1.5" />
            
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
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
