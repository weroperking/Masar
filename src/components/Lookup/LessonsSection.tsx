import { Clock, CheckCircle2, XCircle, AlertCircle, ChevronLeft, MapPin } from 'lucide-react';

export interface LessonSessionItem {
  id: string;
  date: string;
  status: 'present' | 'absent' | 'compensation';
  courseName?: string;
  groupName?: string;
  room?: string;
  branch?: string;
}

interface LessonsSectionProps {
  attendance?: {
    attended: number;
    missed: number;
    total: number;
    rate?: number;
    sessions?: LessonSessionItem[];
  };
  onSelectSession: (session: LessonSessionItem) => void;
}

export function LessonsSection({ attendance, onSelectSession }: LessonsSectionProps) {
  const attended = attendance?.attended || 0;
  const missed = attendance?.missed || 0;
  const total = attended + missed;
  const rate = total > 0 ? Math.round((attended / total) * 100) : 100;
  const sessions = attendance?.sessions || [];

  const getStatusBadge = (status: LessonSessionItem['status']) => {
    switch (status) {
      case 'present':
        return {
          label: 'حاضر',
          icon: CheckCircle2,
          bg: 'bg-emerald-50 dark:bg-emerald-950/40',
          text: 'text-emerald-700 dark:text-emerald-400',
          border: 'border-emerald-200 dark:border-emerald-800/60'
        };
      case 'compensation':
        return {
          label: 'حصة تعويضية',
          icon: AlertCircle,
          bg: 'bg-amber-50 dark:bg-amber-950/40',
          text: 'text-amber-700 dark:text-amber-400',
          border: 'border-amber-200 dark:border-amber-800/60'
        };
      case 'absent':
      default:
        return {
          label: 'غائب',
          icon: XCircle,
          bg: 'bg-rose-50 dark:bg-rose-950/40',
          text: 'text-rose-700 dark:text-rose-400',
          border: 'border-rose-200 dark:border-rose-800/60'
        };
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 space-y-3.5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100">
              سجل الحصص والمحاضرات
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              متابعة الحضور والغياب والالتزام الدراسي
            </p>
          </div>
        </div>

        <div className="text-left shrink-0">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {rate}% التزام
          </span>
        </div>
      </div>

      {/* Progress Ratio Bar */}
      <div className="space-y-1">
        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
          <div
            className="bg-emerald-500 transition-all duration-500 rounded-r-full"
            style={{ width: `${total > 0 ? (attended / total) * 100 : 100}%` }}
          />
          <div
            className="bg-rose-500 transition-all duration-500 rounded-l-full"
            style={{ width: `${total > 0 ? (missed / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Summary KPI Capsule */}
      <div className="p-3 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800/80 grid grid-cols-3 divide-x divide-x-reverse divide-slate-200/60 dark:divide-slate-700/60 text-center">
        <div className="px-1">
          <span className="block text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-slate-100">
            {total}
          </span>
          <span className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            إجمالي الحصص
          </span>
        </div>

        <div className="px-1">
          <span className="block text-xs sm:text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
            {attended}
          </span>
          <span className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            أيام الحضور
          </span>
        </div>

        <div className="px-1">
          <span className="block text-xs sm:text-sm font-black font-mono text-rose-600 dark:text-rose-400">
            {missed}
          </span>
          <span className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            أيام الغياب
          </span>
        </div>
      </div>

      {/* Detailed Sessions List */}
      <div className="pt-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            تفاصيل الحصص الأخيرة
          </span>
          {sessions.length > 0 && (
            <span className="text-[10px] text-slate-400">
              اضغط لعرض التفاصيل
            </span>
          )}
        </div>

        {sessions.length === 0 ? (
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              تم رصد {attended} حصة حضور حتى الآن عبر كارت الطالب.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-0.5">
            {sessions.map((sess, idx) => {
              const badge = getStatusBadge(sess.status);
              const StatusIcon = badge.icon;

              return (
                <div
                  key={sess.id || idx}
                  onClick={() => onSelectSession(sess)}
                  className="p-3 rounded-2xl bg-slate-50/80 hover:bg-slate-100/90 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2.5 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center shrink-0 shadow-2xs border border-slate-100 dark:border-slate-800">
                      <StatusIcon className={`w-3.5 h-3.5 ${badge.text}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {sess.courseName || sess.groupName || 'حصة دراسية'}
                        </span>
                        {sess.groupName && sess.courseName && (
                          <span className="text-[10px] text-slate-400 truncate hidden xs:inline">
                            • {sess.groupName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
                        {sess.date && <span className="font-mono">{sess.date}</span>}
                        {sess.branch && (
                          <span className="inline-flex items-center gap-0.5 truncate max-w-[100px]">
                            <MapPin className="w-2.5 h-2.5 shrink-0" />
                            <span>{sess.branch}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                      {badge.label}
                    </span>
                    <ChevronLeft className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
