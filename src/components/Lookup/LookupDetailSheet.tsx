import { BottomSheet } from './BottomSheet';
import { LessonSessionItem } from './LessonsSection';
import { ExamItem } from './ExamsSection';
import { 
  Calendar, MapPin, CheckCircle2, XCircle, AlertCircle, 
  GraduationCap, BookOpen, Clock, Award, Building2 
} from 'lucide-react';

interface LookupDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'session' | 'exam' | null;
  selectedSession: LessonSessionItem | null;
  selectedExam: ExamItem | null;
  teacherName?: string;
  academyName?: string;
  branch?: string;
}

export function LookupDetailSheet({
  isOpen,
  onClose,
  type,
  selectedSession,
  selectedExam,
  teacherName,
  academyName,
  branch
}: LookupDetailSheetProps) {
  if (!isOpen || !type) return null;

  if (type === 'session' && selectedSession) {
    const isPresent = selectedSession.status === 'present';
    const isCompensation = selectedSession.status === 'compensation';

    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title="تفاصيل الحصة الدراسية"
        subtitle={selectedSession.courseName || selectedSession.groupName || 'حصة تدريسية'}
        showCancelFooter={true}
        cancelText="إغلاق"
      >
        <div className="space-y-4 p-1 text-right">
          {/* Status Banner */}
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between ${
              isPresent
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : isCompensation
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {isPresent ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              ) : isCompensation ? (
                <AlertCircle className="w-5 h-5 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 shrink-0" />
              )}
              <span className="font-extrabold text-sm">
                حالة الطالب: {isPresent ? 'حاضر في الموعد' : isCompensation ? 'حضور تعويضي' : 'غائب عن الحصة'}
              </span>
            </div>
            {selectedSession.date && (
              <span className="text-xs font-mono opacity-80">{selectedSession.date}</span>
            )}
          </div>

          {/* Details list */}
          <div className="space-y-2 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-500" />
                المادة / الكورس
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {selectedSession.courseName || 'المادة الدراسية'}
              </span>
            </div>

            {selectedSession.groupName && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  المجموعة والموعد
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedSession.groupName}
                </span>
              </div>
            )}

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-500" />
                المقر والفرع
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {selectedSession.branch || branch || 'الفرع الرئيسي'} {selectedSession.room ? `• ${selectedSession.room}` : ''}
              </span>
            </div>

            {teacherName && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">الأستاذ المسؤول</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{teacherName}</span>
              </div>
            )}
          </div>
        </div>
      </BottomSheet>
    );
  }

  if (type === 'exam' && selectedExam) {
    const numGrade = Number(selectedExam.grade);
    const maxGrade = selectedExam.maxGrade || 100;
    const pct = !isNaN(numGrade) && maxGrade > 0 ? Math.round((numGrade / maxGrade) * 100) : 0;

    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title="تفاصيل نتيجة الاختبار"
        subtitle={selectedExam.name}
        showCancelFooter={true}
        cancelText="إغلاق"
      >
        <div className="space-y-4 p-1 text-right">
          {/* Score Header */}
          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-center space-y-1">
            <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
              الدرجة المحققة
            </span>
            <div className="text-3xl font-mono font-black text-blue-900 dark:text-blue-100">
              {selectedExam.grade} <span className="text-base text-blue-500">/ {maxGrade}</span>
            </div>
            <span className="inline-block mt-1 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-600 text-white shadow-xs">
              نسبة التحصيل: {pct}%
            </span>
          </div>

          {/* Details */}
          <div className="space-y-2 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-500" />
                اسم التقييم
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {selectedExam.name}
              </span>
            </div>

            {selectedExam.date && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  تاريخ الاختبار
                </span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {selectedExam.date}
                </span>
              </div>
            )}

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                التقدير العام
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {pct >= 90 ? 'ممتاز' : pct >= 80 ? 'جيد جداً' : pct >= 65 ? 'جيد' : pct >= 50 ? 'مقبول' : 'يحتاج لمتابعة'}
              </span>
            </div>

            {teacherName && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">إشراف الأستاذ</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{teacherName}</span>
              </div>
            )}
          </div>
        </div>
      </BottomSheet>
    );
  }

  return null;
}
