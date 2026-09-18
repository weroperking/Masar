import React from 'react';
import { BottomSheet } from './BottomSheet';
import { Group } from '../../types';
import { Calendar, Clock, MapPin, Check } from 'lucide-react';
import { formatTimeRange12 } from '../../utils/time';

interface GroupBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  groups: Group[];
  selectedGroupId: string;
  onSelect: (group: Group) => void;
  enrollmentCounts?: Record<string, number>;
}

export function GroupBottomSheet({
  isOpen,
  onClose,
  groups,
  selectedGroupId,
  onSelect,
  enrollmentCounts = {},
}: GroupBottomSheetProps) {
  const formatDays = (days: string[] = []) => {
    const dayMap: Record<string, string> = {
      saturday: 'السبت',
      sunday: 'الأحد',
      monday: 'الإثنين',
      tuesday: 'الثلاثاء',
      wednesday: 'الأربعاء',
      thursday: 'الخميس',
      friday: 'الجمعة',
    };
    if (days.length === 0) return 'مواعيد منتظمة';
    return days.map((d) => dayMap[d.toLowerCase()] || d).join(' و ');
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="اختيار المجموعة والموعد"
      subtitle="اختر المجموعة الأنسب لك حسب المقاعد الشاغرة المتاحة"
      showCancelFooter={true}
      cancelText="إلغاء التغيير"
    >
      <div className="space-y-2.5">
        {groups.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            لا توجد مجموعات مضافة حالياً
          </div>
        ) : (
          groups.map((group) => {
          const isSelected = group.id === selectedGroupId;
          const enrolledCount = enrollmentCounts[group.id] || 0;
          const capacity = group.maxStudents || 25;
          const availableSeats = Math.max(0, capacity - enrolledCount);
          const isFull = availableSeats <= 0;

          return (
            <button
              key={group.id}
              type="button"
              disabled={isFull}
              onClick={() => {
                if (isFull) return;
                onSelect(group);
                onClose();
              }}
              className={`w-full text-right p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                isFull
                  ? 'opacity-55 cursor-not-allowed bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
                  : isSelected
                  ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 ring-1 ring-blue-500/40 cursor-pointer'
                  : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/60 cursor-pointer'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    isFull
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      : isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {group.name}
                    </h4>

                    {/* Available Seats Badge */}
                    {isFull ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-900/60">
                        مكتملة العدد
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60">
                        متاح {availableSeats} مقعد
                      </span>
                    )}

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        group.type === 'online'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {group.type === 'online' ? 'أونلاين' : 'حضوري'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1 font-mono" dir="rtl">
                      <Clock className="w-3.5 h-3.5 ml-0.5" />
                      {formatTimeRange12(group.startTime, group.endTime)}
                    </span>
                    <span>•</span>
                    <span>{formatDays(group.daysOfWeek)}</span>
                    {group.room && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {group.room}
                        </span>
                      </>
                    )}
                  </div>
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
