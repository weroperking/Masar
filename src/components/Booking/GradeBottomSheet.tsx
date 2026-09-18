import React from 'react';
import { BottomSheet } from './BottomSheet';
import { GraduationCap, Check } from 'lucide-react';

interface GradeBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedGrade: string;
  onSelect: (grade: string) => void;
}

const GRADE_OPTIONS = [
  { id: 'sec_3', name: 'الصف الثالث الثانوي (الثانوية العامة)', category: 'المرحلة الثانوية' },
  { id: 'sec_2', name: 'الصف الثاني الثانوي', category: 'المرحلة الثانوية' },
  { id: 'sec_1', name: 'الصف الأول الثانوي', category: 'المرحلة الثانوية' },
  { id: 'prep_3', name: 'الصف الثالث الإعدادي (الشهادة الإعدادية)', category: 'المرحلة الإعدادية' },
  { id: 'prep_2', name: 'الصف الثاني الإعدادي', category: 'المرحلة الإعدادية' },
  { id: 'prep_1', name: 'الصف الأول الإعدادي', category: 'المرحلة الإعدادية' },
  { id: 'primary', name: 'المرحلة الابتدائية', category: 'الصفوف الأساسية' },
  { id: 'general', name: 'مستوى عام / تأسيسي', category: 'أخرى' },
];

export function GradeBottomSheet({
  isOpen,
  onClose,
  selectedGrade,
  onSelect,
}: GradeBottomSheetProps) {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="اختيار المرحلة الدراسية"
      subtitle="حدد سنتك الدراسية الحالية لتخصيص جدول الحصص"
      showCancelFooter={true}
      cancelText="إلغاء التغيير"
    >
      <div className="space-y-2">
        {GRADE_OPTIONS.map((grade) => {
          const isSelected = selectedGrade === grade.name;
          return (
            <button
              key={grade.id}
              type="button"
              onClick={() => {
                onSelect(grade.name);
                onClose();
              }}
              className={`w-full text-right p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 ring-1 ring-blue-500/40'
                  : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {grade.name}
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    {grade.category}
                  </span>
                </div>
              </div>

              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-300 dark:border-slate-700 text-transparent'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
              </div>
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}
