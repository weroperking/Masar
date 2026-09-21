import { 
  Building2, MapPin, GraduationCap, 
  UserCheck, ShieldCheck
} from 'lucide-react';
import { PublicLookupData } from '../../types';

interface MinimalStudentProfileCardProps {
  data: PublicLookupData;
  onContactClick?: (type: 'student' | 'parent') => void;
}

export function MinimalStudentProfileCard({ data }: MinimalStudentProfileCardProps) {
  const { student, attendance, subscription, teacherName, academyName, branch } = data;
  const resolvedStudentName = student?.name || 'طالب مسار';
  const resolvedStudentCode = student?.studentCode || '0001';
  const resolvedTeacher = teacherName || 'إدارة المركز التعليمي';
  const resolvedAcademy = academyName || data.centerName || 'سنتر مسار التعليمي';
  const resolvedBranch = student?.branch || branch || 'الفرع الرئيسي';
  const resolvedSchool = student?.school || 'مدرسة عامة';
  const resolvedGrade = student?.gradeLevel || 'المرحلة الدراسية';

  const initialLetter = resolvedStudentName.trim().charAt(0) || 'ط';

  const getSubStatusLabel = () => {
    if (subscription?.status === 'paid') return { text: 'مُسدد', color: 'text-emerald-600 dark:text-emerald-400' };
    if (subscription?.status === 'partial') return { text: 'سداد جزئي', color: 'text-amber-600 dark:text-amber-400' };
    return { text: 'منتظم', color: 'text-blue-600 dark:text-blue-400' };
  };

  const subStatus = getSubStatusLabel();

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden text-center relative transition-all">
      
      {/* 1. Atmospheric Sky & Cloud Header Banner */}
      <div className="h-28 sm:h-32 w-full relative overflow-hidden bg-gradient-to-b from-sky-200/80 via-sky-100/50 to-white dark:from-slate-800 dark:via-slate-850 dark:to-slate-900">
        
        {/* Soft SVG Cloud Illustration Backdrops */}
        <div className="absolute inset-0 opacity-40 dark:opacity-10 pointer-events-none">
          <svg className="w-full h-full object-cover" viewBox="0 0 400 120" fill="none" preserveAspectRatio="none">
            <path d="M0 80 Q 70 40 140 70 T 280 60 T 400 75 L 400 120 L 0 120 Z" fill="white" />
            <path d="M0 95 Q 90 70 180 90 T 360 80 T 400 90 L 400 120 L 0 120 Z" fill="white" opacity="0.6" />
          </svg>
        </div>

        {/* Top Header Highlighted Teacher Name & Student Code */}
        <div className="absolute top-3 inset-x-3 sm:inset-x-4 flex items-center justify-between z-10">
          
          {/* Highlighted Teacher Name Pill */}
          <div className="inline-flex items-center gap-1.5 bg-blue-600 text-white shadow-sm px-3 py-1 rounded-full text-xs font-bold border border-blue-500/80">
            <UserCheck className="w-3.5 h-3.5" />
            <span>الأستاذ / {resolvedTeacher}</span>
          </div>

          {/* Student Code Pill */}
          <div className="inline-flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/70 dark:border-slate-700/60 shadow-xs px-2.5 py-1 rounded-full text-[11px] font-bold text-slate-700 dark:text-slate-200">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            <span>كود #{resolvedStudentCode}</span>
          </div>
        </div>
      </div>

      {/* 2. Overlapping Circular Avatar with Halo Ring (Spark Removed) */}
      <div className="-mt-14 sm:-mt-16 mb-2 flex justify-center relative z-10">
        <div className="relative group">
          {/* Multi-color Spectrum Ring (Inspired by Reference) */}
          <div className="p-[3px] rounded-full bg-gradient-to-tr from-amber-400 via-rose-400 to-indigo-500 shadow-sm transition-transform duration-300 group-hover:scale-105">
            <div className="p-[2.5px] rounded-full bg-white dark:bg-slate-900">
              <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-center font-extrabold text-2xl sm:text-3xl shadow-inner select-none">
                {initialLetter}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Primary Name & Typographic Hierarchy */}
      <div className="px-4 space-y-1">
        <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          {resolvedStudentName}
        </h1>

        {/* Highlighted Teacher Subtitle */}
        <p className="text-xs font-bold text-blue-600 dark:text-blue-400">
          مجموعة الأستاذ {resolvedTeacher}
        </p>

        {/* Clean Minimalist Subtitle */}
        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          <span>{resolvedGrade}</span>
          <span className="mx-1.5 text-slate-300 dark:text-slate-700">•</span>
          <span>{resolvedSchool}</span>
        </p>
      </div>

      {/* 4. Minimalist Metadata Badges Row */}
      <div className="flex items-center justify-center gap-1.5 flex-wrap px-4 mt-2.5">
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100/90 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/50 px-2.5 py-0.5 rounded-full">
          <MapPin className="w-3 h-3 text-slate-400 dark:text-slate-500" />
          <span>{resolvedBranch}</span>
        </span>

        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100/90 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/50 px-2.5 py-0.5 rounded-full">
          <GraduationCap className="w-3 h-3 text-slate-400 dark:text-slate-500" />
          <span>{resolvedGrade}</span>
        </span>

        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100/90 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/50 px-2.5 py-0.5 rounded-full">
          <Building2 className="w-3 h-3 text-slate-400 dark:text-slate-500" />
          <span>{resolvedAcademy}</span>
        </span>
      </div>

      {/* 5. Minimalist Stats Capsule (Directly Inspired by Reference Card Bottom Panel) */}
      <div className="mt-4 mb-4 mx-3 sm:mx-4 p-3 sm:p-3.5 bg-slate-50/90 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs">
        <div className="grid grid-cols-3 divide-x divide-x-reverse divide-slate-200/60 dark:divide-slate-700/60 text-center">
          
          {/* Stat 1: Attendance Rate */}
          <div className="px-2">
            <span className="block text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              {attendance?.rate ?? 100}%
            </span>
            <span className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              نسبة الالتزام
            </span>
          </div>

          {/* Stat 2: Attended Sessions */}
          <div className="px-2">
            <span className="block text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {attendance?.attended ?? 0}
              <span className="text-xs font-normal text-slate-400 dark:text-slate-500 mx-0.5">/ {attendance?.total ?? 0}</span>
            </span>
            <span className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              الحصص المكتملة
            </span>
          </div>

          {/* Stat 3: Subscription Status */}
          <div className="px-2">
            <span className={`block text-sm sm:text-base font-black tracking-tight ${subStatus.color}`}>
              {subStatus.text}
            </span>
            <span className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              اشتراك الشهر
            </span>
          </div>

        </div>
      </div>

    </div>
  );
}
