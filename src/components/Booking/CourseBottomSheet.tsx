import React, { useState } from 'react';
import { BottomSheet } from './BottomSheet';
import { Course } from '../../types';
import { BookOpen, Check, Search } from 'lucide-react';

interface CourseBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  selectedCourseId: string;
  onSelect: (course: Course) => void;
}

export function CourseBottomSheet({
  isOpen,
  onClose,
  courses,
  selectedCourseId,
  onSelect,
}: CourseBottomSheetProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCourses = courses.filter((c) => {
    const nameMatch = c.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const subjectMatch = c.subject?.toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || subjectMatch;
  });

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="اختيار الكورس الدراسي"
      subtitle="حدد المادة أو الكورس المراد حجز مقعد فيه"
      showCancelFooter={true}
      cancelText="إلغاء التغيير"
    >
      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث باسم الكورس أو المادة..."
          className="w-full pr-10 pl-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        />
      </div>

      {/* Courses List */}
      <div className="space-y-2.5 pt-1">
        {filteredCourses.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            لا توجد كورسات مطابقة لبحثك
          </div>
        ) : (
          filteredCourses.map((course) => {
            const isSelected = course.id === selectedCourseId;
            return (
              <button
                key={course.id}
                type="button"
                onClick={() => {
                  onSelect(course);
                  onClose();
                }}
                className={`w-full text-right p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 ring-1 ring-blue-500/40'
                    : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {course.name}
                    </h4>
                    {course.subject && (
                      <span className="inline-block mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {course.subject}
                      </span>
                    )}
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
          })
        )}
      </div>
    </BottomSheet>
  );
}
