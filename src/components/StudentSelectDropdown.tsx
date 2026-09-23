import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, User, Hash, Phone } from 'lucide-react';
import { Student } from '../types';
import { matchStudent, normalizeStudentCode } from '../utils/studentCode';

export interface StudentSelectDropdownProps {
  students: Student[];
  value: string;
  onChange: (studentId: string, student?: Student) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  buttonClassName?: string;
  label?: string;
  error?: string;
  allowClear?: boolean;
  emptyMessage?: string;
  accentColor?: 'blue' | 'emerald';
  excludeStudentIds?: string[];
  autoFocusSearch?: boolean;
}

export function StudentSelectDropdown({
  students = [],
  value,
  onChange,
  placeholder = 'اختر الطالب أو ابحث بالاسم أو الكود...',
  disabled = false,
  required = false,
  className = '',
  buttonClassName = '',
  label,
  error,
  allowClear = false,
  emptyMessage = 'لا يوجد طلاب مطابقين للبحث',
  accentColor = 'blue',
  excludeStudentIds = [],
  autoFocusSearch = true,
}: StudentSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter out excluded or soft-deleted students
  const availableStudents = useMemo(() => {
    return students.filter(
      (s) => !s.deleted_at && !excludeStudentIds.includes(s.id)
    );
  }, [students, excludeStudentIds]);

  // Selected student object
  const selectedStudent = useMemo(() => {
    return students.find((s) => s.id === value);
  }, [students, value]);

  // Filtered students according to search query (by name, student code/ID, phone)
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) {
      return availableStudents;
    }
    return availableStudents.filter((s) => matchStudent(s, searchQuery));
  }, [availableStudents, searchQuery]);

  // Reset highlight when list changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredStudents.length]);

  // Auto-focus search input on dropdown open
  useEffect(() => {
    if (isOpen) {
      if (autoFocusSearch) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
      }
    } else {
      setSearchQuery('');
    }
  }, [isOpen, autoFocusSearch]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredStudents.length - 1 ? prev + 1 : prev
        );
        scrollHighlightedIntoView(highlightedIndex + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        scrollHighlightedIntoView(highlightedIndex - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredStudents[highlightedIndex]) {
          handleSelectStudent(filteredStudents[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  const scrollHighlightedIntoView = (index: number) => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll<HTMLElement>('[data-student-item]');
    const targetItem = items[index];
    if (targetItem) {
      targetItem.scrollIntoView({ block: 'nearest' });
    }
  };

  const handleSelectStudent = (student: Student) => {
    onChange(student.id, student);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', undefined);
    setSearchQuery('');
  };

  // Color theme classes
  const ringFocusClass =
    accentColor === 'emerald'
      ? 'focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500'
      : 'focus:ring-1 focus:ring-blue-500 focus:border-blue-500';

  const badgeBgClass =
    accentColor === 'emerald'
      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
      : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';

  const formatCode = (s?: Student) => {
    if (!s) return '';
    if (s.studentCode) {
      const norm = normalizeStudentCode(s.studentCode);
      return `#${norm || s.studentCode}`;
    }
    if (s.lookup_code) return `#${s.lookup_code}`;
    return `#${s.id.slice(0, 6)}`;
  };

  return (
    <div className={`relative ${className}`} ref={containerRef} dir="rtl">
      {label && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Hidden input for HTML form validation */}
      <input
        type="text"
        tabIndex={-1}
        className="sr-only"
        value={value || ''}
        required={required}
        onChange={() => {}}
        onFocus={() => setIsOpen(true)}
      />

      {/* Dropdown Trigger Button */}
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`w-full px-3 py-2 bg-white dark:bg-slate-800 border ${
          error
            ? 'border-red-500'
            : isOpen
            ? accentColor === 'emerald'
              ? 'border-emerald-500 ring-1 ring-emerald-500'
              : 'border-blue-500 ring-1 ring-blue-500'
            : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
        } rounded-lg text-xs text-slate-900 dark:text-slate-100 flex items-center justify-between cursor-pointer transition-colors select-none ${
          disabled ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800/50' : ''
        } ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
          {selectedStudent ? (
            <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
              <span className={`shrink-0 px-1.5 py-0.5 font-mono text-[11px] font-bold rounded border ${badgeBgClass}`}>
                {formatCode(selectedStudent)}
              </span>
              <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                {selectedStudent.name}
              </span>
              {selectedStudent.phone && (
                <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px] hidden sm:inline-block shrink-0">
                  ({selectedStudent.phone})
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 truncate">
              <Search className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{placeholder}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 mr-1.5">
          {allowClear && selectedStudent && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="إلغاء التحديد"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
            }`}
          />
        </div>
      </div>

      {/* Error message */}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

      {/* Floating Dropdown Menu */}
      {isOpen && !disabled && (
        <div
          className="absolute z-50 top-full mt-1.5 right-0 left-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100 flex flex-col"
          style={{ minWidth: '280px', maxHeight: '340px' }}
        >
          {/* Search Header */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="ابحث بالاسم أو كود الطالب أو رقم الهاتف..."
                className={`w-full pr-8 pl-8 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none ${ringFocusClass}`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex justify-between items-center px-1 pt-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              <span>ابحث بالاسم أو الكود (#)</span>
              <span>
                {filteredStudents.length} {filteredStudents.length === 1 ? 'طالب' : 'طلاب'}
              </span>
            </div>
          </div>

          {/* Student Items List */}
          <div
            ref={listRef}
            role="listbox"
            className="overflow-y-auto max-h-56 divide-y divide-slate-100 dark:divide-slate-800/60 p-1"
          >
            {filteredStudents.length === 0 ? (
              <div className="py-6 px-4 text-center">
                <User className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {emptyMessage}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  تأكد من كتابة الاسم أو رقم الكود أو الهاتف بشكل صحيح
                </p>
              </div>
            ) : (
              filteredStudents.map((student, idx) => {
                const isSelected = student.id === value;
                const isHighlighted = idx === highlightedIndex;
                const studentCode = formatCode(student);

                return (
                  <div
                    key={student.id}
                    data-student-item
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectStudent(student)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-2.5 py-2 rounded-lg cursor-pointer transition-colors flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? accentColor === 'emerald'
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-100 font-bold'
                          : 'bg-blue-50/80 dark:bg-blue-950/50 text-blue-900 dark:text-blue-100 font-bold'
                        : isHighlighted
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                        : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Avatar initial */}
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${
                          isSelected
                            ? accentColor === 'emerald'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {student.name ? student.name[0] : <User className="w-3.5 h-3.5" />}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs truncate leading-snug">
                            {student.name}
                          </span>
                          <span
                            className={`shrink-0 px-1.5 py-0.2 rounded font-mono text-[10px] font-bold border ${badgeBgClass}`}
                          >
                            {studentCode}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {student.phone && (
                            <span className="font-mono flex items-center gap-1">
                              <Phone className="w-2.5 h-2.5 opacity-60" />
                              {student.phone}
                            </span>
                          )}
                          {student.gradeLevel && (
                            <>
                              <span>•</span>
                              <span className="truncate">{student.gradeLevel}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Selected Checkmark */}
                    {isSelected && (
                      <div
                        className={`shrink-0 p-0.5 rounded-full ${
                          accentColor === 'emerald'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
