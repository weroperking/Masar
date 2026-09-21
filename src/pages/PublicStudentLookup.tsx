import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  AlertCircle, Building2, UserCheck, 
  CheckCircle2, MapPin, GraduationCap, 
  School, Phone, User, ShieldCheck, RefreshCw, Search
} from 'lucide-react';
import { PublicLookupData, Student, QrCard } from '../types';
import { db } from '../db/db';
import { MasarLogo } from '../components/MasarLogo';
import { LostCardNotice } from '../components/Lookup/LostCardNotice';
import { LessonsSection, LessonSessionItem } from '../components/Lookup/LessonsSection';
import { ExamsSection, ExamItem } from '../components/Lookup/ExamsSection';
import { SubscriptionSection } from '../components/Lookup/SubscriptionSection';
import { LookupDetailSheet } from '../components/Lookup/LookupDetailSheet';
import { decryptRecord, Envelope } from '../services/cryptoService';
import { isNotDeleted } from '../config/queryHooks';
import { normalizeStudentCode } from '../utils/studentCode';

async function getDecryptedStudents(): Promise<Student[]> {
  try {
    const raw = await db.students.toArray();
    const list: Student[] = [];
    for (const item of raw) {
      if (item.envelope) {
        try {
          const plain = await decryptRecord<Student>(item.envelope as Envelope);
          if (isNotDeleted(plain) && isNotDeleted(item)) {
            list.push({ ...plain, id: item.id });
          }
        } catch {}
      } else {
        if (isNotDeleted(item)) {
          list.push(item as Student);
        }
      }
    }
    return list;
  } catch {
    return [];
  }
}

async function resolveStudentFromDexie(token: string): Promise<PublicLookupData | null> {
  try {
    const rawToken = String(token || '').trim();
    const cleanToken = rawToken.replace(/\D/g, '');
    const numToken = cleanToken ? parseInt(cleanToken, 10) : null;
    const strippedToken = rawToken.replace(/^[#№s_STst-]+\s*/i, '').trim();

    const students = await getDecryptedStudents();
    if (!students || students.length === 0) return null;

    // 1. Match by ID, studentCode, cleanDigits, or stripped
    let localStudent = students.find(s => {
      if (!s) return false;
      const sRaw = String(s.studentCode || '').trim();
      const sDigits = sRaw.replace(/\D/g, '');
      const sNum = sDigits ? parseInt(sDigits, 10) : null;
      const sCleanCode = sRaw.replace(/^[#№\s]+/, '').trim();

      return (
        s.id === rawToken ||
        sRaw === rawToken ||
        sCleanCode === rawToken ||
        sCleanCode === strippedToken ||
        (cleanToken.length > 0 && sDigits === cleanToken) ||
        (cleanToken.length > 0 && sDigits.padStart(4, '0') === cleanToken.padStart(4, '0')) ||
        (numToken !== null && sNum !== null && !isNaN(numToken) && !isNaN(sNum) && numToken === sNum) ||
        (s.phone && cleanToken.length >= 8 && s.phone.replace(/\D/g, '').endsWith(cleanToken))
      );
    });

    // 2. If still not found, check qrCards table to see if token matches a card's cardNumber
    if (!localStudent) {
      const cards = await db.qrCards.toArray().catch(() => []);
      const matchedCard = cards.find((c: QrCard) => 
        c.cardNumber === rawToken || 
        c.qrCodeData === rawToken || 
        (cleanToken && c.cardNumber && c.cardNumber.replace(/\D/g, '') === cleanToken)
      );
      if (matchedCard && matchedCard.studentId) {
        localStudent = students.find(s => s.id === matchedCard.studentId);
      }
    }

    if (!localStudent) return null;

    // Load Center Settings
    const settingsList = await db.settings.toArray().catch(() => []);
    const currentSettings = settingsList[0];
    let teacherName = currentSettings?.teacherName || localStorage.getItem('masar_teacher_name') || undefined;
    let academyName = currentSettings?.academyName || localStorage.getItem('masar_academy_name') || undefined;

    // Check users table if teacherName is still empty
    if (!teacherName) {
      const teachers = await db.users.where('role').equals('teacher').toArray().catch(() => []);
      if (teachers.length > 0 && teachers[0]?.name) {
        teacherName = teachers[0].name;
      } else {
        const admins = await db.users.where('role').equals('admin').toArray().catch(() => []);
        if (admins.length > 0 && admins[0]?.name) {
          teacherName = admins[0].name;
        }
      }
    }

    // Resolve Enrollments, Groups, and Branch
    const enrollments = await db.enrollments.where('studentId').equals(localStudent.id).toArray().catch(() => []);
    const activeEnrollment = enrollments.find((e: any) => e.status === 'active') || enrollments[0];
    const group = activeEnrollment ? await db.groups.get(activeEnrollment.groupId).catch(() => null) : null;
    const course = activeEnrollment ? await db.courses.get(activeEnrollment.courseId).catch(() => null) : null;

    const studentBranch = localStudent.branch || group?.branch || currentSettings?.branch || 'الفرع الرئيسي';
    const resolvedTeacher = teacherName || (course ? `مدرس ${course.name}` : 'إدارة المركز التعليمي');
    const resolvedAcademy = academyName || 'سنتر مسار التعليمي';

    // Attendance & Lessons
    const studentRecords = await db.attendanceRecords.where('studentId').equals(localStudent.id).toArray().catch(() => []);
    const attended = studentRecords.filter((r: any) => r.status === 'present' || r.status === 'compensation').length;
    const missed = studentRecords.filter((r: any) => r.status === 'absent').length;
    const total = attended + missed;
    const rate = total > 0 ? Math.round((attended / total) * 100) : 100;

    // Build session list
    const sessionsList: LessonSessionItem[] = [];
    const sortedRecords = studentRecords
      .slice()
      .sort((a: any, b: any) => (b.markedAt || 0) - (a.markedAt || 0))
      .slice(0, 15);

    for (const rec of sortedRecords) {
      const sess = rec.sessionId ? await db.attendanceSessions.get(rec.sessionId).catch(() => null) : null;
      const grp = await db.groups.get(rec.groupId || sess?.groupId || '').catch(() => null);
      const crs = await db.courses.get(sess?.courseId || grp?.courseId || '').catch(() => null);
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
    const grades = await db.assessmentGrades.where('studentId').equals(localStudent.id).toArray().catch(() => []);
    const examList: ExamItem[] = [];
    for (const g of grades) {
      const assessment = await db.assessments.get(g.assessmentId).catch(() => null);
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
    const subs = await db.monthlySubscriptions
      .where('studentId')
      .equals(localStudent.id)
      .toArray().catch(() => []);
    const sub = subs.find((s: any) => s.month === currentMonth && s.year === currentYear);

    const fullResult: PublicLookupData = {
      student: {
        id: localStudent.id,
        name: localStudent.name,
        studentCode: localStudent.studentCode || normalizeStudentCode(localStudent.studentCode),
        gradeLevel: localStudent.gradeLevel || 'المرحلة العامة',
        school: localStudent.school || 'مدرسة عامة',
        phone: localStudent.phone || '',
        parentPhone: localStudent.parentPhone || '',
        parentName: localStudent.parentName || '',
        branch: studentBranch
      },
      teacherName: resolvedTeacher,
      academyName: resolvedAcademy,
      centerName: resolvedAcademy,
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

    // Auto-sync this resolved record to the server in background
    fetch('/api/public/sync-lookups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([fullResult])
    }).catch(() => {});

    return fullResult;
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
  const [searchQuery, setSearchQuery] = useState('');

  // BottomSheet states for mobile & desktop interactive details
  const [sheetType, setSheetType] = useState<'session' | 'exam' | null>(null);
  const [selectedSession, setSelectedSession] = useState<LessonSessionItem | null>(null);
  const [selectedExam, setSelectedExam] = useState<ExamItem | null>(null);

  const fetchLookupData = useCallback(async (tokenToFetch?: string) => {
    const currentToken = tokenToFetch || token;
    if (!currentToken) {
      setError(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);

    // 1. Try URL decoding if base64 encoded
    try {
      let base64 = currentToken;
      base64 = base64.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }
      const decoded = JSON.parse(decodeURIComponent(escape(atob(base64))));
      if (decoded && decoded.student) {
        setData(decoded);
        setLoading(false);
        return;
      }
    } catch (e) {
      // Not a client-side base64 payload, proceed with server lookup
    }

    // 2. Fetch live data from backend endpoint (trying variations)
    const cleanDigits = currentToken.replace(/\D/g, '');
    const tokensToTry = [
      currentToken,
      encodeURIComponent(currentToken),
      cleanDigits,
      cleanDigits ? cleanDigits.padStart(4, '0') : '',
      cleanDigits ? String(parseInt(cleanDigits, 10)) : ''
    ].filter(Boolean);

    for (const t of tokensToTry) {
      try {
        let res = await fetch(`/api/public/lookup/${t}`);
        if (!res.ok) {
          res = await fetch(`/public/lookup/${t}`);
        }

        if (res.ok) {
          const result = await res.json();
          if (result && result.student) {
            setData(result);
            setLoading(false);
            return;
          }
        }
      } catch {}
    }

    // 3. Fallback to local Dexie IndexedDB
    try {
      const localData = await resolveStudentFromDexie(currentToken);
      if (localData) {
        setData(localData);
        setLoading(false);
        return;
      }
    } catch {}

    setError(true);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchLookupData();
  }, [fetchLookupData]);

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    fetchLookupData(searchQuery.trim());
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 font-cairo" dir="rtl">
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 font-cairo" dir="rtl">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-900/40">
            <AlertCircle className="w-7 h-7" />
          </div>
          
          <div className="space-y-1.5">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              لم يتم العثور على بيانات الطالب
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
              تأكد من صحة الرابط أو كود الطالب، أو قم بإدخال كود الطالب يدوياً للبحث.
            </p>
          </div>

          <form onSubmit={handleManualSearch} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="أدخل كود الطالب (مثال: 0001 أو 1001)..."
              className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>بحث</span>
            </button>
          </form>

          <button
            type="button"
            onClick={() => fetchLookupData()}
            className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 py-1 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      </div>
    );
  }

  const { student, attendance, exams, subscription, teacherName, academyName, branch } = data;
  const resolvedStudentName = student?.name || 'طالب مسار';
  const resolvedStudentCode = student?.studentCode || '0001';
  const resolvedTeacher = teacherName || 'إدارة المركز التعليمي';
  const resolvedAcademy = academyName || data.centerName || 'سنتر مسار التعليمي';
  const resolvedBranch = student?.branch || branch || 'الفرع الرئيسي';
  const resolvedSchool = student?.school || 'مدرسة عامة';
  const resolvedGrade = student?.gradeLevel || 'المرحلة العامة';

  const initialLetter = resolvedStudentName.trim().charAt(0) || 'ط';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-4 sm:py-8 px-3 sm:px-4 flex flex-col items-center justify-start text-right selection:bg-blue-500/20" dir="rtl">
      <div className="w-full max-w-md space-y-3 sm:space-y-4">

        {/* 1. Top Brand & System Bar */}
        <header className="flex items-center justify-between px-1 py-1">
          <div className="flex items-center gap-2">
            <MasarLogo size="sm" showText={false} className="shrink-0 scale-90" />
            <div className="leading-tight">
              <span className="font-bold text-[11px] sm:text-xs text-slate-800 dark:text-slate-200 block">
                منصة مسار التعليمية
              </span>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 block">
                بطاقة المتابعة الرسمية للطالب
              </span>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/50 px-2 py-0.5 rounded-md">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>بيانات رسمية موثقة</span>
          </span>
        </header>

        {/* 2. Top Notice Banner: Lost Card Notice */}
        <LostCardNotice
          studentName={resolvedStudentName}
          studentPhone={student?.phone}
          parentPhone={student?.parentPhone}
          parentName={student?.parentName}
        />

        {/* 3. Comprehensive Student & Academic Identity Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 space-y-4 shadow-sm">
          
          {/* Main Student Identity Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                {initialLetter}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 leading-tight">
                    {resolvedStudentName}
                  </h1>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200/60 dark:border-blue-800/60">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    طالب منتظم
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                  <span>كود الطالب:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">#{resolvedStudentCode}</span>
                </p>
              </div>
            </div>

            <div className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 rounded-lg text-center shrink-0">
              <span className="block text-[8px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">كود QR</span>
              <span className="font-mono font-extrabold text-xs sm:text-sm text-blue-600 dark:text-blue-400">
                #{resolvedStudentCode}
              </span>
            </div>
          </div>

          {/* Academic Info Grid: Teacher, School, Branch, Grade, Academy */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            
            {/* Teacher Name */}
            <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
              <div className="p-1.5 rounded-md bg-blue-600 text-white shrink-0">
                <UserCheck className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium block">المدرس / الأستاذ</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate block">
                  {resolvedTeacher}
                </span>
              </div>
            </div>

            {/* School Name */}
            <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70">
              <div className="p-1.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 shrink-0">
                <School className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">المدرسة</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate block">
                  {resolvedSchool}
                </span>
              </div>
            </div>

            {/* Branch */}
            <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70">
              <div className="p-1.5 rounded-md bg-amber-500 text-white shrink-0">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">المقر / الفرع</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate block">
                  {resolvedBranch}
                </span>
              </div>
            </div>

            {/* Grade Level */}
            <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70">
              <div className="p-1.5 rounded-md bg-emerald-600 text-white shrink-0">
                <GraduationCap className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">المرحلة الدراسية</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate block">
                  {resolvedGrade}
                </span>
              </div>
            </div>
          </div>

          {/* Academy / Center Banner */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-100/80 dark:bg-slate-800/70 border border-slate-200/50 dark:border-slate-700/50 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-medium">المركز التعليمي:</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">{resolvedAcademy}</span>
            </div>
            {student?.phone && (
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                {student.phone}
              </span>
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

        {/* 6. Subscription Section */}
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
