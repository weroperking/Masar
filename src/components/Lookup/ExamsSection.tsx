import { GraduationCap, Award, ChevronLeft, Calendar } from 'lucide-react';

export interface ExamItem {
  id: string;
  name: string;
  grade: number | string;
  maxGrade?: number;
  date?: string;
  type?: string;
  percentage?: number;
}

interface ExamsSectionProps {
  exams?: ExamItem[];
  onSelectExam: (exam: ExamItem) => void;
}

export function ExamsSection({ exams = [], onSelectExam }: ExamsSectionProps) {
  const validExams = exams || [];
  
  // Calculate average percentage
  let totalPct = 0;
  let gradedCount = 0;
  validExams.forEach(e => {
    const num = Number(e.grade);
    const max = e.maxGrade || 100;
    if (!isNaN(num) && max > 0) {
      totalPct += (num / max) * 100;
      gradedCount++;
    }
  });
  const avgPercentage = gradedCount > 0 ? Math.round(totalPct / gradedCount) : 0;

  const getEvaluation = (pct: number) => {
    if (pct >= 90) return { label: 'ممتاز', color: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60' };
    if (pct >= 80) return { label: 'جيد جداً', color: 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60' };
    if (pct >= 65) return { label: 'جيد', color: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60' };
    if (pct >= 50) return { label: 'مقبول', color: 'text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800/60' };
    return { label: 'يحتاج لمتابعة', color: 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60' };
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 space-y-3 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
            <GraduationCap className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
              نتائج الاختبارات والتقييمات
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              سجل التحصيل الأكاديمي والدرجات
            </p>
          </div>
        </div>

        {validExams.length > 0 && (
          <div className="flex items-center gap-1 shrink-0">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              متوسط {avgPercentage}%
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      {validExams.length === 0 ? (
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            لا توجد نتائج اختبارات مرصودة حتى الآن.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {validExams.map((exam, idx) => {
            const numGrade = Number(exam.grade);
            const maxGrade = exam.maxGrade || 100;
            const pct = !isNaN(numGrade) && maxGrade > 0 ? Math.round((numGrade / maxGrade) * 100) : 0;
            const evaluation = getEvaluation(pct);

            return (
              <div
                key={exam.id || idx}
                onClick={() => onSelectExam(exam)}
                className="p-2.5 rounded-lg bg-slate-50/70 hover:bg-slate-100/80 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 cursor-pointer transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100 truncate">
                      {exam.name}
                    </span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold border ${evaluation.color}`}>
                      {evaluation.label}
                    </span>
                  </div>
                  {exam.date && (
                    <div className="flex items-center gap-1 mt-0.5 text-[9px] text-slate-400 font-mono">
                      <Calendar className="w-2.5 h-2.5" />
                      <span>{exam.date}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-left">
                    <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                      {exam.grade} <span className="text-slate-400 text-[10px] font-normal">/ {maxGrade}</span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 block text-left">
                      {pct}%
                    </span>
                  </div>
                  <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
