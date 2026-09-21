import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApiQuery, useApiMutation } from '../config/queryHooks';
import { BookingRequest, Course, Group, Settings as SettingsType } from '../types';
import { CourseBottomSheet } from '../components/Booking/CourseBottomSheet';
import { GradeBottomSheet } from '../components/Booking/GradeBottomSheet';
import { GroupBottomSheet } from '../components/Booking/GroupBottomSheet';
import { StudentDetailsBottomSheet } from '../components/Booking/StudentDetailsBottomSheet';
import { BookingSuccessBottomSheet } from '../components/Booking/BookingSuccessBottomSheet';
import {
  BookOpen,
  GraduationCap,
  Calendar,
  Check,
  ChevronDown,
  User,
  Edit3,
  RotateCcw,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';

function getOrCreateDeviceId(): string {
  const STORAGE_KEY = 'masar_booking_device_id';
  try {
    let deviceId = localStorage.getItem(STORAGE_KEY);
    if (!deviceId) {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        deviceId = crypto.randomUUID();
      } else {
        deviceId = 'dev_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      }
      localStorage.setItem(STORAGE_KEY, deviceId);
    }
    return deviceId;
  } catch (e) {
    return 'fallback_device_' + Date.now();
  }
}

export function PublicBooking() {
  const [searchParams] = useSearchParams();
  const orgCode = searchParams.get('org') || 
                  searchParams.get('code') || 
                  new URLSearchParams(window.location.search).get('org') || 
                  new URLSearchParams(window.location.search).get('code') || 
                  '';

  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State (Student Name and Phone only)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });

  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  // Bottom Sheets state
  const [isCourseSheetOpen, setIsCourseSheetOpen] = useState(false);
  const [isGradeSheetOpen, setIsGradeSheetOpen] = useState(false);
  const [isGroupSheetOpen, setIsGroupSheetOpen] = useState(false);
  const [isStudentDetailsSheetOpen, setIsStudentDetailsSheetOpen] = useState(false);

  // Queries
  const { data: allCourses = [] } = useApiQuery<Course>('courses', 60 * 1000);
  const { data: allGroups = [] } = useApiQuery<Group>('groups', 60 * 1000);
  const { data: allEnrollments = [] } = useApiQuery<any>('enrollments', 60 * 1000);
  const { data: settingsList = [] } = useApiQuery<SettingsType>('settings', 60 * 1000);
  const { create: createBooking } = useApiMutation<BookingRequest>('bookingRequests');

  // Academy name from settings or saved storage
  const academyName = useMemo(() => {
    return (
      settingsList[0]?.academyName ||
      localStorage.getItem('masar_academy_name') ||
      'أكاديمية مسار التعليمية'
    );
  }, [settingsList]);

  // Active courses - only actual courses added by the teacher
  const courses = useMemo(() => {
    return allCourses.filter((c) => !c.deleted_at && c.isActive);
  }, [allCourses]);

  // Current selected course object
  const selectedCourse = useMemo(() => {
    if (selectedCourseId) {
      const found = courses.find((c) => c.id === selectedCourseId);
      if (found) return found;
    }
    return courses[0] || null;
  }, [courses, selectedCourseId]);

  // Enrollment counts for each group to determine available seats
  const enrollmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const enr of allEnrollments) {
      if (enr.groupId && enr.status !== 'dropped' && enr.status !== 'inactive') {
        counts[enr.groupId] = (counts[enr.groupId] || 0) + 1;
      }
    }
    return counts;
  }, [allEnrollments]);

  // Course groups - only actual groups added by the teacher for this course
  const courseGroups = useMemo(() => {
    if (!selectedCourse?.id) return [];
    return allGroups.filter((g) => !g.deleted_at && g.courseId === selectedCourse.id);
  }, [allGroups, selectedCourse?.id]);

  // Selected Group Object
  const selectedGroup = useMemo(() => {
    if (!selectedGroupId) return null;
    return courseGroups.find((g) => g.id === selectedGroupId) || null;
  }, [courseGroups, selectedGroupId]);

  const handleSubmitBooking = async () => {
    if (!selectedCourse) {
      return;
    }

    // If student details are not filled, open the student details bottomsheet
    if (!formData.name.trim() || !formData.phone.trim()) {
      setIsStudentDetailsSheetOpen(true);
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const deviceId = getOrCreateDeviceId();
      const code = orgCode || 'default';
      const endpoint = `/api/public/booking/${encodeURIComponent(code)}`;

      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        courseId: selectedCourse.id,
        courseName: selectedCourse.name,
        subject: selectedCourse.subject || selectedCourse.name,
        teacher: academyName,
        groupId: selectedGroup?.id || undefined,
        groupName: selectedGroup?.name || undefined,
        slot: selectedGroup
          ? `${selectedGroup.name}${selectedGroup.startTime ? ` (${selectedGroup.startTime} - ${selectedGroup.endTime || ''})` : ''}`
          : undefined,
        gradeLevel: selectedGrade || undefined,
        grade: selectedGrade || undefined,
        declaredAmount: 0,
        requestDate: new Date().toISOString().split('T')[0],
        status: 'pending',
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': deviceId,
          'x-device-id': deviceId,
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 429) {
        const errJson = await response.json().catch(() => ({}));
        const msg = errJson.message || 'تم إرسال عدد كبير من الطلبات، يرجى المحاولة مرة أخرى لاحقاً.';
        setErrorMessage(msg);
        setIsSubmitting(false);
        return;
      }

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const msg = errJson.message || errJson.error || 'حدث خطأ أثناء إرسال طلب الحجز، يرجى المحاولة لاحقاً.';
        setErrorMessage(msg);
        setIsSubmitting(false);
        return;
      }

      // Record to local mutations cache silently as backup
      try {
        createBooking.mutate({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          courseId: selectedCourse.id,
          groupId: selectedGroup?.id || undefined,
          gradeLevel: selectedGrade || undefined,
          declaredAmount: 0,
          requestDate: new Date().toISOString().split('T')[0],
          status: 'pending',
        } as any);
      } catch (_) {}

      // Confirmation state (booking received / pending approval)
      setSubmitted(true);
    } catch (error: any) {
      console.error('Booking submission error:', error);
      setErrorMessage('تعذر الاتصال بالخادم، يرجى التحقق من اتصال الإنترنت والمحاولة لاحقاً.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({ name: '', phone: '' });
    setSelectedGroupId('');
    setErrorMessage(null);
    setSubmitted(false);
  };

  return (
    <div
      className="relative min-h-screen w-full overflow-x-hidden flex flex-col justify-end md:justify-center p-0 md:p-6 lg:p-10 font-sans text-slate-900 dark:text-slate-100"
      dir="rtl"
    >
      {/* BACKGROUND IFRAME (Placed behind all components) */}
      <div className="fixed inset-0 w-full h-full z-0 overflow-hidden pointer-events-none select-none">
        <iframe
          src="https://backgrounds.supply/gradient-lab/embed#s=eyJtIjoibGF2YSIsImMiOlsiIzA2N2M4NyIsIiM2YzgxZTYiLCIjMGUwZjViIiwiIzI1NGZkNiIsIiMzNTBlYzMiLCIjMDAwMDAwIiwiIzAwMDAwMCIsIiMwMDAwMDAiXSwibyI6W1swLjMyLDBdLFswLjA5ODg4NTQzODE5OTk4MzE5LDAuMzA0MzM4MDg1MjE0NDQ5MTZdLFstMC4yNTg4ODU0MzgxOTk5ODMxNiwwLjE4ODA5MTI4MDczMzU5MTQ0XSxbLTAuMjU4ODg1NDM4MTk5OTgzMiwtMC4xODgwOTEyODA3MzM1OTEzOF0sWzAuMDk4ODg1NDM4MTk5OTgzMTIsLTAuMzA0MzM4MDg1MjE0NDQ5MTZdLFswLDBdLFswLDBdLFswLDBdXSwibiI6NSwiYiI6MSwiayI6MS4wNSwicyI6MS4xLCJnIjowLjAyLCJwIjp7InVfem9vbSI6MS42LCJ1X2dsb3ciOjEsInVfY3J1c3QiOjAuNSwidV9zcGVlZCI6MC4xOH19"
          className="w-full h-full border-0 scale-105 opacity-90 dark:opacity-80"
          loading="lazy"
          allow="fullscreen"
          title="Gradient by Backgrounds Supply"
        />
        {/* Soft slate overlay for contrast and legibility */}
        <div className="absolute inset-0 bg-slate-950/25 backdrop-blur-[2px] pointer-events-none" />
      </div>

      {/* PRE-OPENED BOTTOM SHEET COMPONENT (Full width on mobile, responsive card on tablets & widescreen) */}
      <div className="relative z-10 w-full flex flex-col items-center justify-end md:justify-center pointer-events-auto">
        {/* Container: Full width on mobile, fluid max-w on tablets and widescreens */}
        <div className="w-full max-w-lg md:max-w-xl lg:max-w-2xl mx-auto flex flex-col shadow-2xl">
          {/* Frosted Translucent Glass Top Header with Notch & Grab Handle */}
          <div className="w-full flex flex-col items-center justify-center pt-3 pb-1.5 bg-gradient-to-b from-white/70 to-white/95 dark:from-slate-900/70 dark:to-slate-900/95 backdrop-blur-xl rounded-t-[32px] md:rounded-t-3xl border-t border-x border-white/60 dark:border-slate-800/80 transition-all">
            {/* Grab handle pill */}
            <div className="w-14 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full shadow-sm mb-1 cursor-pointer opacity-90 hover:opacity-100 transition-opacity" />
          </div>

          {/* Main Card Body */}
          <div className="w-full bg-white dark:bg-slate-900 px-5 sm:px-8 pt-3 pb-6 sm:pb-8 shadow-2xl border-x md:border-b border-slate-100 dark:border-slate-800 md:rounded-b-3xl space-y-4 sm:space-y-5">
            {/* Header: Academy Name (Verified badge deleted as requested) */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                  <span>{academyName}</span>
                </h1>
              </div>
            </div>

            {/* Specifications Grid: 3 columns (Course, Grade Level, Group) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              {/* Item 1: Course */}
              <button
                type="button"
                onClick={() => setIsCourseSheetOpen(true)}
                className="group p-3 sm:p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 hover:bg-blue-50/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/70 hover:border-blue-300 dark:hover:border-blue-800 transition-all text-right flex flex-col justify-between gap-2 active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center justify-end w-full">
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <div className="w-full">
                  <span className="text-[11px] text-slate-400 dark:text-slate-400 font-medium block">
                    الكورس المطلوب
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                    {selectedCourse ? selectedCourse.name : 'لا توجد كورسات متاحة'}
                  </p>
                </div>
              </button>

              {/* Item 2: Grade Level */}
              <button
                type="button"
                onClick={() => setIsGradeSheetOpen(true)}
                className="group p-3 sm:p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 hover:bg-blue-50/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/70 hover:border-blue-300 dark:hover:border-blue-800 transition-all text-right flex flex-col justify-between gap-2 active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <div className="w-full">
                  <span className="text-[11px] text-slate-400 dark:text-slate-400 font-medium block">
                    المرحلة الدراسية
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                    {selectedGrade || 'اختر المرحلة'}
                  </p>
                </div>
              </button>

              {/* Item 3: Group & Schedule (Selection based on available seats) */}
              <button
                type="button"
                onClick={() => setIsGroupSheetOpen(true)}
                className="group p-3 sm:p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 hover:bg-blue-50/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/70 hover:border-blue-300 dark:hover:border-blue-800 transition-all text-right flex flex-col justify-between gap-2 active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <div className="w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 dark:text-slate-400 font-medium block">
                      المجموعة والموعد
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                    {selectedGroup ? selectedGroup.name : (courseGroups.length > 0 ? 'اختر المجموعة' : 'لا توجد مجموعات متاحة')}
                  </p>
                </div>
              </button>
            </div>

            {/* Student Information Row (Opens StudentDetailsBottomSheet) */}
            <button
              type="button"
              onClick={() => setIsStudentDetailsSheetOpen(true)}
              className="w-full p-3 sm:p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 hover:bg-blue-100/60 dark:hover:bg-blue-950/50 transition-all flex items-center justify-between text-right cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <User className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">
                    بيانات الطالب للتسجيل والتواصل
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {formData.name ? `${formData.name} — ${formData.phone}` : 'اضغط لإدخال اسم الطالب ورقم الواتساب'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-bold shrink-0 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-blue-200/80 dark:border-blue-900/60 shadow-xs">
                <Edit3 className="w-3.5 h-3.5" />
                <span>{formData.name ? 'تعديل' : 'إدخال'}</span>
              </div>
            </button>

            {/* Error message alert (e.g. 429 rate limit or network error) */}
            {errorMessage && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center justify-between gap-2 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{errorMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="p-1 text-red-400 hover:text-red-600 dark:hover:text-red-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Bottom Action Area: Status & Pill "Book Now" + Cancel/Reset Button */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {/* Left Side: Real-time Seat Reservation Status */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-start">
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-400">حالة المقاعد</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                      {!selectedCourse ? 'لا توجد كورسات متاحة' : (courseGroups.length > 0 && selectedGroup && (selectedGroup.maxStudents || 25) <= (enrollmentCounts[selectedGroup.id] || 0) ? 'اكتملت المقاعد' : 'متاح للتسجيل')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Side: Action Buttons with Cancel option */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* Reset / Cancel Button */}
                {formData.name && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="py-3 px-4 rounded-full border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    title="إلغاء وتفريغ البيانات"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>إلغاء</span>
                  </button>
                )}

                {/* Primary "Book Now" Button in Masar Blue */}
                <button
                  type="button"
                  disabled={!selectedCourse || isSubmitting}
                  onClick={handleSubmitBooking}
                  className={`flex-1 sm:flex-initial px-8 sm:px-10 py-3.5 rounded-full font-bold text-sm sm:text-base transition-all shadow-lg flex items-center justify-center gap-2 ${
                    !selectedCourse || isSubmitting
                      ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/25 active:scale-95 cursor-pointer'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري إرسال الطلب...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>احجز الآن</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DETECTED BOTTOM SHEETS */}

      {/* 1. Course Selection BottomSheet */}
      <CourseBottomSheet
        isOpen={isCourseSheetOpen}
        onClose={() => setIsCourseSheetOpen(false)}
        courses={courses}
        selectedCourseId={selectedCourse?.id || ''}
        onSelect={(course) => {
          setSelectedCourseId(course.id);
          setSelectedGroupId('');
        }}
      />

      {/* 2. Grade Level Selection BottomSheet */}
      <GradeBottomSheet
        isOpen={isGradeSheetOpen}
        onClose={() => setIsGradeSheetOpen(false)}
        selectedGrade={selectedGrade}
        onSelect={(grade) => setSelectedGrade(grade)}
      />

      {/* 3. Group Selection BottomSheet (Enforcing available seats) */}
      <GroupBottomSheet
        isOpen={isGroupSheetOpen}
        onClose={() => setIsGroupSheetOpen(false)}
        groups={courseGroups}
        selectedGroupId={selectedGroupId}
        onSelect={(group) => {
          setSelectedGroupId(group ? group.id : '');
        }}
        enrollmentCounts={enrollmentCounts}
      />

      {/* 4. Student Personal Details BottomSheet */}
      <StudentDetailsBottomSheet
        isOpen={isStudentDetailsSheetOpen}
        onClose={() => setIsStudentDetailsSheetOpen(false)}
        name={formData.name}
        phone={formData.phone}
        onSave={(data) => {
          setFormData({
            name: data.name,
            phone: data.phone,
          });
        }}
      />

      {/* 5. Booking Success BottomSheet */}
      {submitted && (
        <BookingSuccessBottomSheet
          studentName={formData.name}
          studentPhone={formData.phone}
          courseName={selectedCourse?.name || ''}
          groupName={selectedGroup ? selectedGroup.name : undefined}
          gradeLevel={selectedGrade}
          onReset={handleReset}
          onClose={() => setSubmitted(false)}
        />
      )}
    </div>
  );
}
