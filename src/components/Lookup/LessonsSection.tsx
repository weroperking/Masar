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
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 space-y-3 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
              سجل الحصص والمحاضرات
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              متابعة الحضور والغياب والالتزام الدراسي
            </p>
          </div>
        </div>

        <div className="text-left shrink-0">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {rate}% التزام
          </span>
        </div>
      </div>

      {/* Progress Ratio Bar */}
      <div className="space-y-1">
        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-3 gap-1.5 text-center">
        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
          <span className="block text-[9px] font-medium text-slate-500 dark:text-slate-400">
            إجمالي الحصص
          </span>
          <span className="text-xs sm:text-sm font-bold font-mono text-slate-800 dark:text-slate-200">
            {total}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/70 dark:border-emerald-900/30">
          <span className="block text-[9px] font-medium text-emerald-700 dark:text-emerald-400">
            أيام الحضور
          </span>
          <span className="text-xs sm:text-sm font-bold font-mono text-emerald-800 dark:text-emerald-200">
            {attended}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100/70 dark:border-rose-900/30">
          <span className="block text-[9px] font-medium text-rose-700 dark:text-rose-400">
            أيام الغياب
          </span>
          <span className="text-xs sm:text-sm font-bold font-mono text-rose-800 dark:text-rose-200">
            {missed}
          </span>
        </div>
      </div>

      {/* Detailed Sessions List */}
      <div className="pt-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
            تفاصيل الحصص الأخيرة
          </span>
          {sessions.length > 0 && (
            <span className="text-[9px] text-slate-400">
              اضغط لعرض التفاصيل
            </span>
          )}
        </div>

        {sessions.length === 0 ? (
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              تم رصد {attended} حصة حضور حتى الآن عبر كارت الطالب.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-0.5">
            {sessions.map((sess, idx) => {
              const badge = getStatusBadge(sess.status);
              const StatusIcon = badge.icon;

              return (
                <div
                  key={sess.id || idx}
                  onClick={() => onSelectSession(sess)}
                  className="p-2 rounded-lg bg-slate-50/70 hover:bg-slate-100/80 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-1 rounded-md shrink-0 ${badge.bg} ${badge.text}`}>
                      <StatusIcon className="w-3 h-3" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {sess.courseName || sess.groupName || 'حصة دراسية'}
                        </span>
                        {sess.groupName && sess.courseName && (
                          <span className="text-[9px] text-slate-400 truncate hidden xs:inline">
                            • {sess.groupName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-slate-400">
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
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}>
                      {badge.label}
                    </span>
                    <ChevronLeft className="w-3 h-3 text-slate-400" />
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
