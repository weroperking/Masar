import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { 
  ArrowRight, User, BookOpen, Clock, Calendar, Wallet, 
  QrCode, RefreshCw, CheckCircle2, Link2,
  GraduationCap, Edit2, Check, X, MessageCircle, Globe, Copy, ExternalLink,
  AlertTriangle, DollarSign, List, FileText, ArrowLeftRight, Activity, Users
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toMajorUnits, toMinorUnits } from '../../utils/currency';
import { getWhatsAppUrl } from '../../utils/phone';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { Enrollment, MonthlySubscription, Student, Settings } from '../../types';
import { StudentFormModal } from './Students';
import { calculateEnrollmentFee, syncStudentMonthlySubscriptions, recordLedgerRevenue } from '../../utils/pricing';
import { buildStudentLookupUrl, normalizeStudentCode } from '../../utils/studentCode';
import { API_BASE_URL } from '../../config/api';
import { useApiQuery, useApiMutation } from '../../config/queryHooks';
import { useAuth } from '@clerk/clerk-react';
import { triggerPennyDrop } from '../../components/PennyDropAnimation';
import { requestStudentLookupToken } from '../../services/lookupSyncService';

export function StudentDetails() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<"overview" | "info" | "attendance" | "bills" | "payments" | "grades" | "history" | "lookup">("overview");
  const toast = useToast();
  const { confirm } = useConfirm();
  const { getToken } = useAuth();

  const [loadingSync, setLoadingSync] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const { data: allStudents = [] } = useApiQuery<Student>('students', 60 * 1000);
  const student = allStudents.find(s => s.id === id);
  const { update: updateStudent } = useApiMutation<Student>('students');

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // The lookup code: strictly uses opaque lookup_code from server
  const lookupCode = student?.lookup_code;
  const hasLookupCode = Boolean(lookupCode);

  // The exact canonical short URL matching the back of the student card (/p/s/:lookup_code)
  const shortLookupUrl = useMemo(() => {
    if (!lookupCode) return '';
    return buildStudentLookupUrl(lookupCode);
  }, [lookupCode]);

  // Generate the simple, low-density QR code identical to the card back
  useEffect(() => {
    if (shortLookupUrl) {
      QRCode.toDataURL(
        shortLookupUrl,
        { margin: 1, width: 220, color: { dark: '#000000', light: '#ffffff' } },
        (err, url) => {
          if (!err && url) {
            setQrCodeUrl(url);
          }
        }
      );
    } else {
      setQrCodeUrl('');
    }
  }, [shortLookupUrl]);

  // Auto-request lookup token from server if missing on student record
  useEffect(() => {
    if (student && !student.lookup_code && id) {
      getToken().then(tok => {
        requestStudentLookupToken(
          id,
          { student: { id, name: student.name, studentCode: student.studentCode, phone: student.phone } },
          tok
        ).then(res => {
          if (res?.token) {
            updateStudent.mutate({ id, data: { lookup_code: res.token } });
          }
        }).catch(() => {});
      });
    }
  }, [student?.id, student?.lookup_code, id, getToken]);

  const handleCopyLink = () => {
    if (!shortLookupUrl || !hasLookupCode) return;
    navigator.clipboard.writeText(shortLookupUrl);
    setCopied(true);
    toast.success('تم نسخ رابط المتابعة المختصر بنجاح!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Roster / Enrollments
  const { data: allEnrollments = [] } = useApiQuery<Enrollment>('enrollments', 2 * 60 * 1000);
  const enrollments = allEnrollments.filter(e => e.studentId === id);
  
  // Data Maps
  const { data: groups = [] } = useApiQuery<any>('groups', 2 * 60 * 1000);
  const { data: courses = [] } = useApiQuery<any>('courses', 2 * 60 * 1000);

  // Payments & Bills
  const { data: allSubscriptions = [] } = useApiQuery<MonthlySubscription>('monthlySubscriptions', 60 * 1000);
  const monthlySubscriptions = allSubscriptions.filter(s => s.studentId === id);
  
  const { data: allLedgers = [] } = useApiQuery<any>('ledgerEntries', 60 * 1000);
  const ledgerEntries = allLedgers.filter(l => l.relatedType === 'subscription' && monthlySubscriptions.map(b => b.id).includes(l.relatedId || ''));

  // Attendance
  const { data: allAttendanceRecords = [] } = useApiQuery<any>('attendanceRecords', 60 * 1000);
  const attendanceRecords = allAttendanceRecords.filter(r => r.studentId === id);
  
  const { data: attendanceSessions = [] } = useApiQuery<any>('attendanceSessions', 60 * 1000);

  // Exams
  const { data: allAssessments = [] } = useApiQuery<any>('assessments', 2 * 60 * 1000);
  const { data: allGrades = [] } = useApiQuery<any>('assessmentGrades', 60 * 1000);
  const studentGrades = allGrades.filter(g => g.studentId === id);

  // System Settings (Teacher name, academy name, branch)
  const { data: allSettings = [] } = useApiQuery<Settings>('settings', 60 * 1000);
  const currentSettings = allSettings[0];

  // Background server sync for the canonical student lookup profile
  const handleSyncLookup = async (showToast = true) => {
    if (!student || !id) return;

    try {
      setLoadingSync(true);

      const attended = attendanceRecords.filter((r: any) => r.status === 'present' || r.status === 'compensation').length;
      const missed = attendanceRecords.filter((r: any) => r.status === 'absent').length;
      const total = attended + missed;
      const rate = total > 0 ? Math.round((attended / total) * 100) : 100;

      const currentSub = monthlySubscriptions?.find((s: any) => s.month === currentMonth && s.year === currentYear) || null;

      // Active group and branch
      const activeEnrollment = enrollments.find(e => e.status === 'active');
      const activeGroup = groups.find((g: any) => g.id === activeEnrollment?.groupId);
      const studentBranch = student.branch || activeGroup?.branch || currentSettings?.branch || 'الفرع الرئيسي';
      const teacherName = currentSettings?.teacherName || localStorage.getItem('masar_teacher_name') || '';
      const academyName = currentSettings?.academyName || localStorage.getItem('masar_academy_name') || '';

      // Detailed lessons list
      const sessionsList = attendanceRecords
        .slice()
        .sort((a: any, b: any) => (b.markedAt || 0) - (a.markedAt || 0))
        .slice(0, 20)
        .map((rec: any) => {
          const sess = attendanceSessions?.find((s: any) => s.id === rec.sessionId);
          const grp = groups?.find((g: any) => g.id === (rec.groupId || sess?.groupId));
          const crs = courses?.find((c: any) => c.id === (sess?.courseId || grp?.courseId));
          const dateStr = sess?.startedAt
            ? new Date(sess.startedAt).toISOString().split('T')[0]
            : rec.markedAt
            ? new Date(rec.markedAt).toISOString().split('T')[0]
            : '';
          return {
            id: rec.id,
            date: dateStr,
            status: rec.status,
            courseName: crs?.name || '',
            groupName: grp?.name || '',
            room: sess?.room || grp?.room || '',
            branch: grp?.branch || studentBranch
          };
        });

      const examsSnapshot = studentGrades.map((grade: any) => {
        const assessment = allAssessments?.find((a: any) => a.id === grade.assessmentId);
        const numericGrade = typeof grade.grade === 'number' ? grade.grade : parseFloat(grade.grade as string) || 0;
        const maxGrade = assessment?.maxGrade || 100;
        const percentage = maxGrade > 0 ? Math.round((numericGrade / maxGrade) * 100) : 0;
        return {
          id: grade.id,
          name: assessment?.name || 'اختبار',
          grade: numericGrade,
          maxGrade: maxGrade,
          date: assessment?.date || (grade.gradedAt ? new Date(grade.gradedAt).toISOString().split('T')[0] : ''),
          type: assessment?.type || 'exam',
          percentage
        };
      });

      const payload = {
        student: {
          id,
          name: student.name,
          studentCode: student.studentCode || normalizeStudentCode(student.studentCode),
          lookup_code: student.lookup_code,
          gradeLevel: student.gradeLevel,
          school: student.school,
          phone: student.phone,
          parentPhone: student.parentPhone,
          parentName: student.parentName,
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
        exams: examsSnapshot,
        subscription: {
          status: currentSub?.status || 'no_record',
          month: currentMonth,
          year: currentYear,
          amountTotal: currentSub?.amountTotal || 0,
          amountPaid: currentSub?.amountPaid || 0
        }
      };

      let tokenToPersist: string | null = student.lookup_code || null;
      try {
        const sessionToken = await getToken();
        const url = `/api/students/${id}/lookup-token`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': sessionToken ? `Bearer ${sessionToken}` : ''
          },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const resData = await res.json().catch(() => null);
          const newCode = resData?.lookup_code || resData?.token || resData?.public_lookup_token;
          if (newCode) {
            tokenToPersist = newCode;
          }
        }
      } catch (srvErr) {
        console.warn('[Sync lookup background] Server lookup storage was deferred:', srvErr);
      }

      if (tokenToPersist && tokenToPersist !== student.lookup_code) {
        await updateStudent.mutateAsync({
          id: student.id,
          data: { lookup_code: tokenToPersist }
        });
      }

      if (showToast) {
        toast.success('تمت مزامنة وتحديث بيانات متابعة الطالب بنجاح!');
      }
    } catch (err) {
      console.error(err);
      if (showToast) {
        toast.error('حدث خطأ أثناء مزامنة البيانات');
      }
    } finally {
      setLoadingSync(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'lookup' && student) {
      handleSyncLookup(false);
    }
  }, [activeTab, id, student?.id]);

  const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);
  const [isEditPricingModalOpen, setIsEditPricingModalOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<MonthlySubscription | null>(null);

  const activeEnrollments = useMemo(() => enrollments?.filter(e => e.status === 'active') || [], [enrollments]);

  // UI Handlers
  const handleEditStudent = () => {
    setIsEditStudentModalOpen(true);
  };

  const handleEditPricing = (enrollment: Enrollment) => {
    setSelectedEnrollment(enrollment);
    setIsEditPricingModalOpen(true);
  };

  const handleOpenPayment = (bill: MonthlySubscription) => {
    setSelectedBill(bill);
    setIsPaymentModalOpen(true);
  };

  if (!student) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500 text-xs">جاري تحميل بيانات الطالب...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Profile Section */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-start gap-4">
          <Link to="/students" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-500 transition-colors shrink-0 mt-1">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{student.name}</h1>
              {student.studentCode && (
                <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
                  #{student.studentCode}
                </span>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-500">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                student.isActive 
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}>
                {student.isActive ? 'نشط' : 'غير نشط'}
              </span>
              <span>•</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{student.gradeLevel || 'غير محدد الصف'}</span>
              <span>•</span>
              <div className="inline-flex items-center gap-1.5" dir="ltr">
                <span className="font-mono">{student.phone}</span>
                {student.phone && getWhatsAppUrl(student.phone) && (
                  <a
                    href={getWhatsAppUrl(student.phone)}
                    target="_blank"
                    rel="noreferrer"
                    title="محادثة واتساب مع الطالب"
                    className="p-1 rounded text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {student.parentPhone && getWhatsAppUrl(student.parentPhone) && (
            <a
              href={getWhatsAppUrl(student.parentPhone)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-semibold border border-emerald-200 dark:border-emerald-800 transition-colors"
              title="مراسلة ولي الأمر مباشرة عبر واتساب"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>واتساب ولي الأمر</span>
            </a>
          )}
          <Link
            to={`/qrcards?studentId=${student.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
            title="عرض وطباعة بطاقة الـ QR الخاصة بالطالب"
          >
            <QrCode className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>بطاقة الـ QR</span>
          </Link>
          {activeEnrollments.length > 0 && (
            <button 
              onClick={() => handleEditPricing(activeEnrollments[0])}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-semibold border border-blue-200 dark:border-blue-800 transition-colors"
              title="تعديل الرسوم أو منح خصم للطالب"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>تعديل الرسوم والخصومات</span>
            </button>
          )}
          <button 
            onClick={handleEditStudent}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>تعديل الطالب</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-px print:hidden scrollbar-hide">
        {[
          { id: 'overview', label: 'المجموعات والاشتراكات', icon: BookOpen },
          { id: 'attendance', label: 'سجل الحضور', icon: Clock },
          { id: 'bills', label: 'الفواتير الشهرية', icon: FileText },
          { id: 'payments', label: 'سجل المدفوعات', icon: Wallet },
          { id: 'grades', label: 'الامتحانات', icon: GraduationCap },
          { id: 'history', label: 'تاريخ التسجيل', icon: Activity },
          { id: 'info', label: 'البيانات الشخصية', icon: User },
          { id: 'lookup', label: 'رابط متابعة ولي الأمر', icon: Globe },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 border-b-2 font-semibold text-xs transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="mt-4">
        {/* OVERVIEW / GROUPS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-500">المجموعات النشطة</span>
                  <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{activeEnrollments.length}</div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-500">إجمالي الحضور</span>
                  <div className="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {attendanceRecords?.filter(r => r.status === 'present').length || 0}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-500">الغياب</span>
                  <div className="w-6 h-6 rounded-md bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                    <X className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {attendanceRecords?.filter(r => r.status === 'absent').length || 0}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-500">الرصيد المتبقي</span>
                  <div className="w-6 h-6 rounded-md bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <Wallet className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100" dir="ltr">
                  {/* Calculate outstanding bills */}
                  {(() => {
                    if (!monthlySubscriptions) return "0.00";
                    let totalOverdue = 0;
                    monthlySubscriptions.forEach(sub => {
                      if (sub.status !== 'paid' && sub.status !== 'rejected') {
                        totalOverdue += Math.max(0, sub.amountTotal - sub.amountPaid);
                      }
                    });
                    return toMajorUnits(totalOverdue).toFixed(2);
                  })()} ج.م
                </div>
              </div>
            </div>

            {/* Groups List */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                <span>المجموعات الحالية والتسعير</span>
              </h3>
              
              {activeEnrollments.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
                  لا توجد مجموعات نشطة حالياً للطالب.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {activeEnrollments.map(enrollment => {
                    const group = groups?.find(g => g.id === enrollment.groupId);
                    const course = courses?.find(c => c.id === enrollment.courseId);
                    
                    if (!group || !course) return null;

                    // Pricing logic
                    const basePrice = course.price || 0;
                    const effectivePrice = calculateEnrollmentFee(basePrice, enrollment);

                    // Find current month bill
                    const currentBill = monthlySubscriptions?.find(s => 
                      s.courseId === course.id && s.month === currentMonth && s.year === currentYear
                    );

                    return (
                      <div key={enrollment.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{group.name}</h4>
                              <p className="text-xs text-slate-500 mt-0.5">{course.name}</p>
                            </div>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              نشط
                            </span>
                          </div>

                          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-700/50 mb-3">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="text-[10px] text-slate-500 mb-0.5">رسوم الطالب الشهرية</p>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-base text-slate-900 dark:text-slate-100">{toMajorUnits(effectivePrice)} ج.م</span>
                                  {enrollment.pricingMode !== 'default' && (
                                    <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-200 dark:border-amber-800">
                                      {enrollment.pricingMode === 'free' ? 'منحة مجانية (100%)' : enrollment.pricingMode === 'custom' ? 'سعر مخصص' : 'مستفيد من خصم'}
                                    </span>
                                  )}
                                </div>
                                {enrollment.pricingMode !== 'default' && (
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    (السعر الأصلي للكورس: {toMajorUnits(basePrice)} ج.م)
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <button 
                              onClick={() => handleEditPricing(enrollment)}
                              className="w-full py-1.5 px-2.5 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-800 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>تعديل السعر أو تطبيق خصم (نصف المبلغ / نسبة / إعفاء)</span>
                            </button>
                          </div>
                        </div>

                        {/* Current Month Collection Status */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                              مستحقات شهر {currentMonth}/{currentYear}
                            </span>
                            {currentBill ? (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                currentBill.status === 'paid' ? 'text-emerald-600 bg-emerald-50' : 
                                currentBill.status === 'partial' ? 'text-amber-600 bg-amber-50' : 
                                'text-red-600 bg-red-50'
                              }`}>
                                {currentBill.status === 'paid' ? 'خالص' : currentBill.status === 'partial' ? 'مدفوع جزئياً' : 'غير مسدد'}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-slate-500 bg-slate-100">
                                لم يصدر إيصال
                              </span>
                            )}
                          </div>
                          
                          <div className="flex gap-2">
                            {currentBill ? (
                              <button 
                                onClick={() => handleOpenPayment(currentBill)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded text-[11px] font-bold transition-colors border border-blue-200 dark:border-blue-800/30"
                              >
                                <Wallet className="w-3 h-3" />
                                عرض الدفعة / سداد
                              </button>
                            ) : (
                              <button 
                                onClick={() => {
                                  // Create an in-memory draft bill to pay
                                  const newBill: MonthlySubscription = {
                                    id: '',
                                    studentId: student.id,
                                    courseId: course.id,
                                    month: currentMonth,
                                    year: currentYear,
                                    amountTotal: effectivePrice,
                                    amountPaid: 0,
                                    dueDate: new Date().toISOString().split('T')[0],
                                    status: 'no_record',
                                    notes: '',
                                    created_at: Date.now(),
                                    updated_at: Date.now(),
                                    sync_status: 'pending'
                                  };
                                  handleOpenPayment(newBill);
                                }}
                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[11px] font-bold transition-colors"
                              >
                                <DollarSign className="w-3 h-3" />
                                إصدار فاتورة وسداد
                              </button>
                            )}
                            <button 
                              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded transition-colors border border-slate-200 dark:border-slate-700"
                              title="نقل المجموعة"
                            >
                              <ArrowLeftRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ATTENDANCE */}
        {activeTab === 'attendance' && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">سجل الحضور التفصيلي</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">التاريخ</th>
                    <th className="px-4 py-2.5 font-semibold">المجموعة</th>
                    <th className="px-4 py-2.5 font-semibold">الكورس</th>
                    <th className="px-4 py-2.5 font-semibold text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {attendanceRecords?.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500">لا توجد سجلات حضور حتى الآن</td>
                    </tr>
                  ) : (
                    attendanceRecords?.sort((a, b) => b.markedAt - a.markedAt).map(record => {
                      const session = attendanceSessions?.find(s => s.id === record.sessionId);
                      const group = groups?.find(g => g.id === record.groupId);
                      const course = courses?.find(c => c.id === session?.courseId || c.id === group?.courseId);
                      
                      return (
                        <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-2.5 font-mono">{format(record.markedAt, 'yyyy-MM-dd')}</td>
                          <td className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">{group?.name || '-'}</td>
                          <td className="px-4 py-2.5 text-slate-500">{course?.name || '-'}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              record.status === 'present'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-red-500/10 text-red-600 dark:text-red-400'
                            }`}>
                              {record.status === 'present' ? 'حاضر' : 'غائب'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* BILLS */}
        {activeTab === 'bills' && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">فواتير الاشتراكات الشهرية</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">الشهر/السنة</th>
                    <th className="px-4 py-2.5 font-semibold">الكورس</th>
                    <th className="px-4 py-2.5 font-semibold text-center">المطلوب</th>
                    <th className="px-4 py-2.5 font-semibold text-center">المدفوع</th>
                    <th className="px-4 py-2.5 font-semibold text-center">المتبقي</th>
                    <th className="px-4 py-2.5 font-semibold text-center">الحالة</th>
                    <th className="px-4 py-2.5 font-semibold text-center">تاريخ الاستحقاق</th>
                    <th className="px-4 py-2.5 font-semibold text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {monthlySubscriptions?.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">لا توجد فواتير شهرية حتى الآن</td>
                    </tr>
                  ) : (
                    monthlySubscriptions?.sort((a, b) => b.created_at - a.created_at).map(sub => {
                      const course = courses?.find(c => c.id === sub.courseId);
                      const remaining = Math.max(0, sub.amountTotal - sub.amountPaid);
                      
                      return (
                        <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-2.5 font-mono text-slate-700 dark:text-slate-300 font-bold">{sub.month}/{sub.year}</td>
                          <td className="px-4 py-2.5 font-medium">{course?.name || '-'}</td>
                          <td className="px-4 py-2.5 text-center font-mono">{toMajorUnits(sub.amountTotal)}</td>
                          <td className="px-4 py-2.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">{toMajorUnits(sub.amountPaid)}</td>
                          <td className="px-4 py-2.5 text-center font-mono font-bold text-amber-600 dark:text-amber-400">{toMajorUnits(remaining)}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              sub.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600' :
                              sub.status === 'partial' ? 'bg-amber-500/10 text-amber-600' :
                              sub.status === 'rejected' ? 'bg-rose-500/10 text-rose-600' :
                              'bg-red-500/10 text-red-600'
                            }`}>
                              {sub.status === 'paid' ? 'خالص' : sub.status === 'partial' ? 'مدفوع جزئياً' : sub.status === 'rejected' ? 'ملغى' : 'غير مسدد'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center font-mono text-slate-500">{sub.dueDate || '-'}</td>
                          <td className="px-4 py-2.5 text-center">
                            <button 
                              onClick={() => handleOpenPayment(sub)}
                              className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PAYMENTS */}
        {activeTab === 'payments' && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">سجل المدفوعات التفصيلي</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">تاريخ الدفع</th>
                    <th className="px-4 py-2.5 font-semibold">المبلغ (ج.م)</th>
                    <th className="px-4 py-2.5 font-semibold">البيان</th>
                    <th className="px-4 py-2.5 font-semibold">طريقة الدفع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {ledgerEntries?.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500">لا توجد مدفوعات مسجلة</td>
                    </tr>
                  ) : (
                    ledgerEntries?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(entry => (
                      <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-2.5 font-mono">{entry.date}</td>
                        <td className="px-4 py-2.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">{toMajorUnits(entry.amount)}</td>
                        <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{entry.description}</td>
                        <td className="px-4 py-2.5 text-slate-500">{entry.paymentMethod || 'نقدي'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* INFO TAB */}
        {activeTab === 'info' && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">البيانات الشخصية</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <span className="block text-[11px] text-slate-500 mb-1">كود الطالب الداخلي</span>
                <p className="font-mono font-semibold text-sm text-slate-900 dark:text-slate-100">{student.studentCode || '-'}</p>
              </div>
              <div>
                <span className="block text-[11px] text-slate-500 mb-1">الاسم الكامل</span>
                <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">{student.name}</p>
              </div>
              <div>
                <span className="block text-[11px] text-slate-500 mb-1">رقم الهاتف الأساسي</span>
                <div className="flex items-center gap-2" dir="ltr">
                  <p className="font-mono font-semibold text-sm text-slate-900 dark:text-slate-100">{student.phone || '-'}</p>
                  {student.phone && getWhatsAppUrl(student.phone) && (
                    <a
                      href={getWhatsAppUrl(student.phone)}
                      target="_blank"
                      rel="noreferrer"
                      title="مراسلة الطالب عبر واتساب"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                    >
                      <MessageCircle className="w-3 h-3" />
                      <span>واتساب</span>
                    </a>
                  )}
                </div>
              </div>
              <div>
                <span className="block text-[11px] text-slate-500 mb-1">الصف الدراسي</span>
                <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">{student.gradeLevel || '-'}</p>
              </div>
              <div>
                <span className="block text-[11px] text-slate-500 mb-1">المدرسة</span>
                <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">{student.school || '-'}</p>
              </div>
              <div>
                <span className="block text-[11px] text-slate-500 mb-1">اسم ولي الأمر</span>
                <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">{student.parentName || '-'}</p>
              </div>
              <div>
                <span className="block text-[11px] text-slate-500 mb-1">رقم هاتف ولي الأمر</span>
                <div className="flex items-center gap-2" dir="ltr">
                  <p className="font-mono font-semibold text-sm text-slate-900 dark:text-slate-100">{student.parentPhone || '-'}</p>
                  {student.parentPhone && getWhatsAppUrl(student.parentPhone) && (
                    <a
                      href={getWhatsAppUrl(student.parentPhone)}
                      target="_blank"
                      rel="noreferrer"
                      title="مراسلة ولي الأمر عبر واتساب"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                    >
                      <MessageCircle className="w-3 h-3" />
                      <span>واتساب</span>
                    </a>
                  )}
                </div>
              </div>
              <div>
                <span className="block text-[11px] text-slate-500 mb-1">مصدر التعارف</span>
                <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">{student.leadSource || '-'}</p>
              </div>
            </div>
          </div>
        )}

        {/* GRADES TAB */}
        {activeTab === 'grades' && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">الامتحانات والتقييمات</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">التاريخ</th>
                    <th className="px-4 py-2.5 font-semibold">اسم الاختبار</th>
                    <th className="px-4 py-2.5 font-semibold">الكورس</th>
                    <th className="px-4 py-2.5 font-semibold text-center">الدرجة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {studentGrades?.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500">لا توجد درجات حتى الآن</td>
                    </tr>
                  ) : (
                    studentGrades?.sort((a, b) => b.gradedAt - a.gradedAt).map(grade => {
                      const assessment = allAssessments?.find(a => a.id === grade.assessmentId);
                      const course = courses?.find(c => c.id === assessment?.courseId);
                      
                      return (
                        <tr key={grade.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-2.5 font-mono">{assessment?.date ? format(new Date(assessment.date), 'yyyy-MM-dd') : '-'}</td>
                          <td className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">{assessment?.name || '-'}</td>
                          <td className="px-4 py-2.5 text-slate-500">{course?.name || '-'}</td>
                          <td className="px-4 py-2.5 text-center font-mono font-bold">
                            {grade.grade} <span className="text-slate-400 font-normal">/ {assessment?.maxGrade}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">تاريخ التسجيل بالمجموعات</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">تاريخ التسجيل</th>
                    <th className="px-4 py-2.5 font-semibold">المجموعة</th>
                    <th className="px-4 py-2.5 font-semibold">الكورس</th>
                    <th className="px-4 py-2.5 font-semibold text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {enrollments?.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500">لا يوجد تاريخ تسجيل</td>
                    </tr>
                  ) : (
                    enrollments?.sort((a, b) => new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime()).map(enrollment => {
                      const group = groups?.find(g => g.id === enrollment.groupId);
                      const course = courses?.find(c => c.id === enrollment.courseId);
                      
                      return (
                        <tr key={enrollment.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-2.5 font-mono">{format(new Date(enrollment.enrolledAt), 'yyyy-MM-dd')}</td>
                          <td className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">{group?.name || '-'}</td>
                          <td className="px-4 py-2.5 text-slate-500">{course?.name || '-'}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              enrollment.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' :
                              enrollment.status === 'withdrawn' ? 'bg-amber-500/10 text-amber-600' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {enrollment.status === 'active' ? 'نشط' : enrollment.status === 'withdrawn' ? 'منسحب' : 'مكتمل'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PUBLIC LOOKUP TAB */}
        {activeTab === 'lookup' && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">رابط المتابعة العام لولي الأمر والطالب</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  رابط مختصر ورمز الـ QR يمكن للطالب وولي الأمر استخدامه لمتابعة الحضور والدرجات والاشتراكات مباشرة.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleSyncLookup(true)}
                disabled={loadingSync}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 dark:bg-slate-800 rounded-lg hover:bg-slate-850 dark:hover:bg-slate-700 transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingSync ? 'animate-spin' : ''}`} />
                <span>تحديث وتزامن البيانات المباشرة</span>
              </button>
            </div>

            {!hasLookupCode ? (
              <div className="p-8 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/60 rounded-xl flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-800 shadow-sm">
                  <Globe className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                    لم يتم إنشاء رابط المتابعة لهذا الطالب بعد
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                    رابط المتابعة يسمح لولي الأمر بالاطلاع على مستوى الطالب وحضوره ودرجاته في أي وقت عبر رابط آمن وخاص.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSyncLookup(true)}
                  disabled={loadingSync}
                  className="px-6 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-xl transition-all shadow-lg shadow-blue-500/20 cursor-pointer flex items-center gap-2"
                >
                  {loadingSync ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                  <span>إنشاء رابط المتابعة وتفعيل الخدمة الآن</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">رابط المشاركة المباشر:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={shortLookupUrl}
                        dir="ltr"
                        className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono font-bold text-slate-700 dark:text-slate-300 outline-none select-all"
                      />
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className={`p-2 rounded-lg border transition-all cursor-pointer ${
                          copied
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                        title="نسخ الرابط"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <a
                        href={shortLookupUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg transition-colors animate-none"
                        title="فتح الرابط في نافذة جديدة"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/60 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>رمز ورابط موحد لكارت الطالب وصفحة المتابعة</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      هذا الرابط يمكن للطالب وولي الأمر استخدامه لمتابعة الحضور والدرجات والاشتراكات مباشرة. عند فتح الرابط يتم عرض البيانات المحدثة.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800 rounded-xl">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 font-semibold">رمز الـ QR المباشر (المطابق للكارت):</span>
                  {qrCodeUrl ? (
                    <div className="bg-white p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                      <img src={qrCodeUrl} alt="QR Code" className="w-40 h-40" />
                    </div>
                  ) : (
                    <div className="w-40 h-40 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg" />
                  )}
                  <span className="text-[10px] text-slate-400 mt-2 text-center font-medium">نفس رمز الـ QR الموجود على ظهر كارت الطالب</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Pricing Modal */}
      {isEditPricingModalOpen && selectedEnrollment && (
        <EditPricingModal
          enrollment={selectedEnrollment}
          course={courses?.find(c => c.id === selectedEnrollment.courseId)}
          onClose={() => setIsEditPricingModalOpen(false)}
        />
      )}

      {/* Edit Student Modal */}
      {isEditStudentModalOpen && (
        <StudentFormModal
          existingStudent={student as any}
          onClose={() => setIsEditStudentModalOpen(false)}
        />
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && selectedBill && (
        <PaymentModal
          bill={selectedBill}
          course={courses?.find(c => c.id === selectedBill.courseId)}
          studentName={student?.name}
          onClose={() => setIsPaymentModalOpen(false)}
        />
      )}

    </div>
  );
}

export function EditPricingModal({ 
  enrollment, 
  course, 
  onClose 
}: { 
  enrollment: Enrollment; 
  course: any; 
  onClose: () => void;
}) {
  const toast = useToast();
  const { getToken } = useAuth();
  const { update: updateEnrollment } = useApiMutation<Enrollment>('enrollments');
  
  const [pricingMode, setPricingMode] = useState<"default" | "custom" | "discount" | "free">(enrollment.pricingMode || "default");
  const [customPrice, setCustomPrice] = useState(enrollment.customPrice ? toMajorUnits(enrollment.customPrice).toString() : '');
  const [applyToCurrentBills, setApplyToCurrentBills] = useState(true);

  const basePrice = course?.price ? toMajorUnits(course.price) : 0;

  // Calculate dynamic values
  const numericInput = Number(customPrice) || 0;
  let finalPrice = basePrice;
  let discountAmount = 0;

  if (pricingMode === 'free') {
    finalPrice = 0;
    discountAmount = basePrice;
  } else if (pricingMode === 'discount') {
    discountAmount = Math.min(basePrice, Math.max(0, numericInput));
    finalPrice = Math.max(0, basePrice - discountAmount);
  } else if (pricingMode === 'custom') {
    finalPrice = Math.max(0, numericInput);
    discountAmount = Math.max(0, basePrice - finalPrice);
  } else {
    finalPrice = basePrice;
    discountAmount = 0;
  }

  // Quick preset handlers
  const handlePreset = (preset: 'half' | 'quarter' | 'threeQuarters' | 'free' | 'full') => {
    if (preset === 'full') {
      setPricingMode('default');
      setCustomPrice('');
    } else if (preset === 'half') {
      setPricingMode('discount');
      setCustomPrice(Math.round(basePrice / 2).toString());
    } else if (preset === 'quarter') {
      setPricingMode('discount');
      setCustomPrice(Math.round(basePrice * 0.25).toString());
    } else if (preset === 'threeQuarters') {
      setPricingMode('discount');
      setCustomPrice(Math.round(basePrice * 0.75).toString());
    } else if (preset === 'free') {
      setPricingMode('free');
      setCustomPrice('0');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = await getToken();
      if (!token) throw new Error("No token");
      const finalFeeMinor = toMinorUnits(finalPrice);
      const discountPercent = basePrice > 0 && discountAmount > 0 
        ? Math.round((discountAmount / basePrice) * 100) 
        : undefined;

      await updateEnrollment.mutateAsync({
        id: enrollment.id,
        data: {
          pricingMode: pricingMode,
          customPrice: pricingMode === 'default' ? undefined : finalFeeMinor,
          discountPercentage: pricingMode === 'discount' ? discountPercent : (pricingMode === 'free' ? 100 : undefined)
        }
      });

      // Synchronize all monthly bills using centralized helper
      if (applyToCurrentBills && enrollment.studentId) {
        await syncStudentMonthlySubscriptions(enrollment.studentId, enrollment.courseId, finalFeeMinor, token);
      }

      toast.success(`تم حفظ تسعير الطالب بنجاح! المبلغ الشهري: ${finalPrice} ج.م`);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء حفظ التسعير');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs transition-opacity" dir="rtl" onClick={onClose}>
      <div 
        className="w-full max-w-4xl lg:max-w-5xl bg-white dark:bg-slate-900 rounded-t-[24px] sm:rounded-xl shadow-2xl border-t sm:border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-auto max-h-[85vh] sm:max-h-[90vh] animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Grab Handle for mobile */}
        <div className="pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing sm:hidden shrink-0 bg-white dark:bg-slate-900">
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
        </div>

        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">تعديل رسوم واشتراك الطالب</h2>
            <p className="text-xs text-slate-500 mt-0.5">{course?.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs flex justify-between border border-slate-100 dark:border-slate-700">
            <span className="text-slate-500">السعر الأساسي المعتمد للكورس:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{basePrice} ج.م شهرياً</span>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              اختصارات الخصم السريعة:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handlePreset('half')}
                className="py-1.5 px-2 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-md text-xs font-bold transition-colors cursor-pointer text-center"
              >
                نصف السعر (50%)
              </button>
              <button
                type="button"
                onClick={() => handlePreset('quarter')}
                className="py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold transition-colors cursor-pointer text-center"
              >
                خصم 25%
              </button>
              <button
                type="button"
                onClick={() => handlePreset('threeQuarters')}
                className="py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold transition-colors cursor-pointer text-center"
              >
                خصم 75%
              </button>
              <button
                type="button"
                onClick={() => handlePreset('free')}
                className="py-1.5 px-2 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-md text-xs font-bold transition-colors cursor-pointer text-center"
              >
                منحة مجانية (100%)
              </button>
              <button
                type="button"
                onClick={() => handlePreset('full')}
                className="col-span-2 py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold transition-colors cursor-pointer text-center"
              >
                السعر الكامل (بدون أي خصم)
              </button>
            </div>
          </div>

          {/* Pricing Mode Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">نوع التسعير</label>
            <select
              value={pricingMode}
              onChange={(e) => {
                const mode = e.target.value as any;
                setPricingMode(mode);
                if (mode === 'default') setCustomPrice('');
                if (mode === 'free') setCustomPrice('0');
              }}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-800 font-semibold"
            >
              <option value="default">السعر الأساسي المعتمد للكورس ({basePrice} ج.م)</option>
              <option value="discount">خصم مبلغ مالي محدد من السعر الأساسي</option>
              <option value="custom">تحديد سعر شهري ثابت ومخصص للطالب</option>
              <option value="free">إعفاء كامل مجاني (0 ج.م)</option>
            </select>
          </div>

          {(pricingMode === 'custom' || pricingMode === 'discount') && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {pricingMode === 'custom' ? 'المبلغ المطلوب سداده من الطالب (ج.م):' : 'قيمة الخصم الممنوح للطالب (ج.م):'}
              </label>
              <input
                type="number"
                min="0"
                required
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder={pricingMode === 'custom' ? 'مثال: 150' : 'مثال: 50 أو 150'}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-mono font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          )}

          {/* Live Result Calculation Box */}
          <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/50 space-y-1.5">
            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>السعر الأصلي:</span>
              <span className="font-mono">{basePrice} ج.م</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400">
                <span>الخصم المطبق:</span>
                <span className="font-mono font-bold">- {discountAmount} ج.م</span>
              </div>
            )}
            <div className="pt-2 border-t border-blue-200/60 dark:border-blue-800/60 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">المبلغ الشهري المطلوب من الطالب:</span>
              <span className="font-mono font-bold text-base text-blue-700 dark:text-blue-300">{finalPrice} ج.م</span>
            </div>
          </div>

          {/* Sync With Current Bills */}
          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={applyToCurrentBills}
              onChange={(e) => setApplyToCurrentBills(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-700"
            />
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
              تطبيق هذا السعر وتحديث فاتورة واشتراك الشهر الحالي فوراً
            </span>
          </label>

          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
            >
              حفظ التسعير والخصم
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PaymentModal({ bill, course, studentName, onClose }: { bill: MonthlySubscription, course: any, studentName?: string, onClose: () => void }) {
  const toast = useToast();
  const { getToken } = useAuth();
  const { create: createSubscription, update: updateSubscription } = useApiMutation<MonthlySubscription>('monthlySubscriptions');
  const [amountTotal, setAmountTotal] = useState(toMajorUnits(bill.amountTotal).toString());
  const [paidAmount, setPaidAmount] = useState(toMajorUnits(bill.amountPaid).toString());
  const [paymentMethod, setPaymentMethod] = useState('نقدي');
  const [reference, setReference] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = await getToken();
      if (!token) throw new Error("No token");
      
      const pAmtMinor = toMinorUnits(Number(paidAmount));
      const tAmtMinor = toMinorUnits(Number(amountTotal));
      
      let derivedStatus = 'pending';
      if (pAmtMinor >= tAmtMinor && tAmtMinor > 0) {
        derivedStatus = 'paid';
      } else if (pAmtMinor > 0 && pAmtMinor < tAmtMinor) {
        derivedStatus = 'partial';
      } else {
        derivedStatus = 'overdue';
      }

      const paymentDiff = pAmtMinor - bill.amountPaid;
      let effectiveBillId = bill.id;

      // If this was an uncreated draft bill, create it on the server (server assigns ID)
      if (!bill.id || bill.status === 'no_record') {
        const created = await createSubscription.mutateAsync({
          studentId: bill.studentId,
          courseId: bill.courseId,
          month: bill.month,
          year: bill.year,
          amountTotal: tAmtMinor,
          amountPaid: pAmtMinor,
          dueDate: bill.dueDate || new Date().toISOString().split('T')[0],
          status: derivedStatus as any,
          notes: bill.notes || ''
        });
        effectiveBillId = (created as any)?.id;
      } else {
        await updateSubscription.mutateAsync({
          id: bill.id,
          data: {
            amountPaid: pAmtMinor,
            amountTotal: tAmtMinor,
            status: derivedStatus as any
          }
        });
      }

      if (paymentDiff > 0 && effectiveBillId) {
        await recordLedgerRevenue({
          relatedType: 'subscription',
          relatedId: effectiveBillId,
          amountMinor: paymentDiff,
          description: `${reference ? 'رقم المرجع: ' + reference + ' | ' : ''}سداد اشتراك ${course?.name || ''} لشهر ${bill.month}/${bill.year}`,
          paymentMethod: paymentMethod as any,
          token
        });

        triggerPennyDrop({
          amountMinor: paymentDiff,
          studentName: studentName || 'طالب',
          courseName: course?.name,
          type: 'subscription'
        });
      } else if (pAmtMinor > 0 && derivedStatus === 'paid' && bill.amountPaid === 0) {
        triggerPennyDrop({
          amountMinor: pAmtMinor,
          studentName: studentName || 'طالب',
          courseName: course?.name,
          type: 'subscription'
        });
      }
      
      toast.success('تم حفظ الدفعة بنجاح');
      onClose();
    } catch (err) {
      toast.error('حدث خطأ أثناء حفظ الدفعة');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs transition-opacity" dir="rtl" onClick={onClose}>
      <div 
        className="w-full max-w-4xl lg:max-w-5xl bg-white dark:bg-slate-900 rounded-t-[24px] sm:rounded-xl shadow-2xl border-t sm:border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-auto max-h-[85vh] sm:max-h-[90vh] animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Grab Handle for mobile */}
        <div className="pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing sm:hidden shrink-0 bg-white dark:bg-slate-900">
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
        </div>

        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">سداد الفاتورة الشهرية</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              كورس: <span className="font-semibold text-slate-800 dark:text-slate-200">{course?.name}</span> (شهر {bill.month}/{bill.year})
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">طريقة الدفع</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800">
                  <option value="نقدي">نقدي (كاش)</option>
                  <option value="فيزا / كارت">فيزا / كارت</option>
                  <option value="فودافون كاش">فودافون كاش</option>
                  <option value="إنستا باي">إنستا باي</option>
                  <option value="تحويل بنكي">تحويل بنكي</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">الرقم المرجعي (اختياري)</label>
                <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="رقم التحويل أو الإيصال" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono bg-white dark:bg-slate-800" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">المبلغ المطلوب (ج.م)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={amountTotal}
                  onChange={(e) => setAmountTotal(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">إجمالي المدفوع (ج.م)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-emerald-600 bg-white dark:bg-slate-800"
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
            >
              تسجيل السداد
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
