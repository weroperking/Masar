import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  AlertCircle, Building2, UserCheck, 
  CheckCircle2, MapPin
} from 'lucide-react';
import { PublicLookupData } from '../types';
import { db } from '../db/db';
import { MasarLogo } from '../components/MasarLogo';
import { LostCardNotice } from '../components/Lookup/LostCardNotice';
import { LessonsSection, LessonSessionItem } from '../components/Lookup/LessonsSection';
import { ExamsSection, ExamItem } from '../components/Lookup/ExamsSection';
import { SubscriptionSection } from '../components/Lookup/SubscriptionSection';
import { LookupDetailSheet } from '../components/Lookup/LookupDetailSheet';

async function resolveStudentFromDexie(token: string): Promise<PublicLookupData | null> {
  try {
    const cleanToken = token.replace(/\D/g, '');
    const localStudent = (await db.students.get(token)) ||
      (await db.students.where('studentCode').equals(token).first()) ||
      (cleanToken ? await db.students.filter(s => !!s.studentCode && s.studentCode.replace(/\D/g, '') === cleanToken).first() : null);

    if (!localStudent) return null;

    // Load Center Settings
    const settingsList = await db.settings.toArray();
    const currentSettings = settingsList[0];
    const teacherName = currentSettings?.teacherName || localStorage.getItem('masar_teacher_name') || undefined;
    const academyName = currentSettings?.academyName || localStorage.getItem('masar_academy_name') || undefined;

    // Resolve Enrollments and Branch
    const enrollments = await db.enrollments.where('studentId').equals(localStudent.id).toArray();
    const activeEnrollment = enrollments.find(e => e.status === 'active');
    const group = activeEnrollment ? await db.groups.get(activeEnrollment.groupId) : null;
    const studentBranch = localStudent.branch || group?.branch || currentSettings?.branch || 'الفرع الرئيسي';

    // Attendance & Lessons
    const studentRecords = await db.attendanceRecords.where('studentId').equals(localStudent.id).toArray();
    const attended = studentRecords.filter(r => r.status === 'present' || r.status === 'compensation').length;
    const missed = studentRecords.filter(r => r.status === 'absent').length;
    const total = attended + missed;
    const rate = total > 0 ? Math.round((attended / total) * 100) : 100;

    // Build session list
    const sessionsList: LessonSessionItem[] = [];
    const sortedRecords = studentRecords
      .slice()
      .sort((a, b) => (b.markedAt || 0) - (a.markedAt || 0))
      .slice(0, 15);

    for (const rec of sortedRecords) {
      const sess = rec.sessionId ? await db.attendanceSessions.get(rec.sessionId) : null;
      const grp = await db.groups.get(rec.groupId || sess?.groupId || '');
      const crs = await db.courses.get(sess?.courseId || grp?.courseId || '');
      const dateStr = sess?.startedAt
        ? new Date(sess.startedAt).toISOString().split('T')[0]
        : rec.markedAt
        ? new Date(rec.markedAt).toISOString().split('T')[0]
        : '';

      sessionsList.push({
        id: rec.id,
        date: dateStr,
        status: rec.status,
        courseName: crs?.name,
        groupName: grp?.name,
        room: sess?.room || grp?.room,
        branch: grp?.branch || studentBranch
      });
    }

    // Exams
    const grades = await db.assessmentGrades.where('studentId').equals(localStudent.id).toArray();
    const examList: ExamItem[] = [];
    for (const g of grades) {
      const assessment = await db.assessments.get(g.assessmentId);
      const numericGrade = typeof g.grade === 'number' ? g.grade : parseFloat(g.grade as string) || 0;
      const maxGrade = assessment?.maxGrade || 100;
      const pct = maxGrade > 0 ? Math.round((numericGrade / maxGrade) * 100) : 0;

      examList.push({
        id: g.id,
        name: assessment?.name || 'اختبار',
        grade: numericGrade,
        maxGrade,
        date: assessment?.date || (g.gradedAt ? new Date(g.gradedAt).toISOString().split('T')[0] : undefined),
        type: assessment?.type || 'exam',
        percentage: pct
      });
    }

    // Subscription
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const sub = await db.monthlySubscriptions
      .where('studentId')
      .equals(localStudent.id)
      .filter(s => s.month === currentMonth && s.year === currentYear)
      .first();

    return {
      student: {
        id: localStudent.id,
        name: localStudent.name,
        studentCode: localStudent.studentCode,
        gradeLevel: localStudent.gradeLevel,
        school: localStudent.school,
        phone: localStudent.phone,
        parentPhone: localStudent.parentPhone,
        parentName: localStudent.parentName,
        branch: studentBranch
      },
      teacherName,
      academyName,
      centerName: academyName,
      branch: studentBranch,
      attendance: {
        attended,
        missed,
        total,
        rate,
        sessions: sessionsList
      },
      exams: examList,
      subscription: {
        status: (sub?.status === 'paid' ? 'paid' : sub?.status === 'partial' ? 'partial' : 'no_record') as any,
        month: currentMonth,
        year: currentYear,
        amountTotal: sub?.amountTotal || 0,
        amountPaid: sub?.amountPaid || 0
      }
    };
  } catch (err) {
    console.error('Failed to resolve student from Dexie:', err);
    return null;
  }
}

export function PublicStudentLookup() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PublicLookupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // BottomSheet states for mobile & desktop interactive details
  const [sheetType, setSheetType] = useState<'session' | 'exam' | null>(null);
  const [selectedSession, setSelectedSession] = useState<LessonSessionItem | null>(null);
  const [selectedExam, setSelectedExam] = useState<ExamItem | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchLookupData() {
      if (!token) {
        setError(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(false);

      // 1. Try URL decoding if base64 encoded
      try {
        let base64 = token;
        base64 = base64.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) {
          base64 += '=';
        }
        const decoded = JSON.parse(decodeURIComponent(escape(atob(base64))));
        if (decoded && decoded.student) {
          if (isMounted) {
            setData(decoded);
            setLoading(false);
          }
          return;
        }
      } catch (e) {
        // Not a client-side base64 payload, proceed with server lookup
      }

      // 2. Fetch live data from backend endpoint
      try {
        let res = await fetch(`/api/public/lookup/${token}`);
        if (!res.ok) {
          res = await fetch(`/public/lookup/${token}`);
        }

        if (res.ok) {
          const result = await res.json();
          if (isMounted) {
            setData(result);
            setLoading(false);
          }
          return;
        }

        // 3. Fallback to local Dexie IndexedDB
        const localData = await resolveStudentFromDexie(token);
        if (localData && isMounted) {
          setData(localData);
          setLoading(false);
          return;
        }

        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      } catch (err) {
        const localData = await resolveStudentFromDexie(token);
        if (localData && isMounted) {
          setData(localData);
          setLoading(false);
          return;
        }

        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    }

    fetchLookupData();

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 text-center space-y-4">
          <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            جاري تحميل بطاقة ومتابعة الطالب...
          </p>
        </div>
      </div>
    );
  }

  // Error State
  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            هذا الرابط غير صالح أو انتهت صلاحيته
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
            يُرجى التأكد من مسح أحدث كود QR متواجد على بطاقة الطالب الصادرة من إدارة المركز.
          </p>
        </div>
      </div>
    );
  }

  const { student, attendance, exams, subscription, teacherName, academyName, branch } = data;
  const resolvedBranch = student?.branch || branch || 'الفرع الرئيسي';
  const resolvedTeacher = teacherName || undefined;
  const resolvedAcademy = academyName || data.centerName || undefined;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-4 sm:py-8 px-3 sm:px-4 flex flex-col items-center justify-start text-right selection:bg-blue-500/20" dir="rtl">
      <div className="w-full max-w-md space-y-3 sm:space-y-4">

        {/* 1. Top Brand & System Bar (Compact & Minimalist) */}
        <header className="flex items-center justify-between px-1 py-1">
          <div className="flex items-center gap-2">
            <MasarLogo size="sm" showText={false} className="shrink-0 scale-90" />
            <div className="leading-tight">
              <span className="font-bold text-[11px] sm:text-xs text-slate-800 dark:text-slate-200 block">
                منصة مسار التعليمية
              </span>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 block">
                متابعة الطالب الأكاديمية
              </span>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
            <span>بيانات رسمية</span>
          </span>
        </header>

        {/* 2. Top Notice Banner: Lost Card Notice */}
        <LostCardNotice
          studentName={student?.name}
          studentPhone={student?.phone}
          parentPhone={student?.parentPhone}
          parentName={student?.parentName}
        />

        {/* 3. Student & Academic Header Card (Super Minimalist & Responsive) */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 space-y-2.5 shadow-xs">
          
          {/* Top Academic Strip: Teacher, Academy, and Branch */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2.5 border-b border-slate-100 dark:border-slate-800 text-[11px]">
            <div className="flex items-center gap-1.5 flex-wrap">
              {resolvedTeacher && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200/50 dark:border-blue-900/40 text-[11px]">
                  <UserCheck className="w-3 h-3 text-blue-500" />
                  <span>{resolvedTeacher}</span>
                </span>
              )}

              {resolvedAcademy && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px]">
                  <Building2 className="w-3 h-3 text-slate-400" />
                  <span>{resolvedAcademy}</span>
                </span>
              )}
            </div>

            {/* Branch Badge */}
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-800/80 px-2 py-0.5 rounded-md">
              <MapPin className="w-2.5 h-2.5 text-blue-500" />
              <span>{resolvedBranch}</span>
            </span>
          </div>

          {/* Student Identity Information */}
          <div className="flex items-start justify-between gap-2.5 pt-0.5">
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug truncate">
                {student?.name || 'طالب مسار'}
              </h1>

              <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                {student?.gradeLevel && (
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {student.gradeLevel}
                  </span>
                )}
                {student?.school && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="truncate">{student.school}</span>
                  </>
                )}
              </div>
            </div>

            {student?.studentCode && (
              <div className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/80 rounded-lg text-center shrink-0">
                <span className="block text-[8px] text-slate-400 font-medium">كود الطالب</span>
                <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                  #{student.studentCode}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 4. Lessons & Attendance Component */}
        <LessonsSection
          attendance={attendance}
          onSelectSession={(sess) => {
            setSelectedSession(sess);
            setSheetType('session');
          }}
        />

        {/* 5. Exams & Assessments Component */}
        <ExamsSection
          exams={exams}
          onSelectExam={(ex) => {
            setSelectedExam(ex);
            setSheetType('exam');
          }}
        />

        {/* 6. Subscription Section (Clean & Minimalist) */}
        <SubscriptionSection subscription={subscription} />

        {/* 7. Verification & Footer */}
        <footer className="pt-2 pb-6 text-center space-y-1">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
            <span>بيانات محدثة إلكترونياً عبر منصة مسار التعليمية</span>
          </p>
        </footer>

      </div>

      {/* 8. Interactive Mobile-first BottomSheet */}
      <LookupDetailSheet
        isOpen={!!sheetType}
        onClose={() => {
          setSheetType(null);
          setSelectedSession(null);
          setSelectedExam(null);
        }}
        type={sheetType}
        selectedSession={selectedSession}
        selectedExam={selectedExam}
        teacherName={resolvedTeacher}
        academyName={resolvedAcademy}
        branch={resolvedBranch}
      />
    </div>
  );
}
