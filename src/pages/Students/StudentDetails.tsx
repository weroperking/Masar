import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import QRCode from 'qrcode';
import { 
  ArrowRight, User, BookOpen, Clock, Calendar, Wallet, 
  QrCode, Printer, RefreshCw, Sparkles, CheckCircle2, ShieldAlert, Palette,
  GraduationCap, Edit2, Check, X, MessageCircle, Globe, Copy, ExternalLink,
  Share2, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toMajorUnits } from '../../utils/currency';
import { getWhatsAppUrl } from '../../utils/phone';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { QrCardBadge, CardThemeColor } from '../../components/Qr/QrCardBadge';

export function StudentDetails() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'overview' | 'enrollments' | 'attendance' | 'payments' | 'grades' | 'qrcard'>('overview');
  const toast = useToast();
  const { confirm } = useConfirm();

  const [isEditingCardNumber, setIsEditingCardNumber] = useState(false);
  const [newCardNumberInput, setNewCardNumberInput] = useState('');
  
  // Public Lookup Token & QR Code State
  const [serverLookupToken, setServerLookupToken] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const student = useLiveQuery(() => db.students.get(id as string), [id]);
  const settings = useLiveQuery(() => db.settings.toArray(), []);
  const centerName = settings?.[0]?.academyName || 'أكاديمية مسار التعليمية';

  // Active QR Card for the student
  const studentCard = useLiveQuery(
    () => db.qrCards.where('studentId').equals(id as string).filter(c => !c.deleted_at && c.status === 'active').first(),
    [id]
  );
  
  // Roster / Enrollments
  const enrollments = useLiveQuery(
    () => db.enrollments.where('studentId').equals(id as string).toArray(),
    [id]
  );
  
  // Map group and course names
  const groups = useLiveQuery(() => db.groups.toArray(), []);
  const courses = useLiveQuery(() => db.courses.toArray(), []);

  // Payments
  const monthlySubscriptions = useLiveQuery(
    () => db.monthlySubscriptions.where('studentId').equals(id as string).toArray(),
    [id]
  );
  const sessionPayments = useLiveQuery(
    () => db.sessionPayments.where('studentId').equals(id as string).toArray(),
    [id]
  );

  // Attendance
  const attendanceRecords = useLiveQuery(
    () => db.attendanceRecords.where('studentId').equals(id as string).toArray(),
    [id]
  );

  // Assessments and Grades
  const allAssessments = useLiveQuery(() => db.assessments.filter(a => !a.deleted_at).toArray(), []);
  const studentGrades = useLiveQuery(
    () => db.assessmentGrades.where('studentId').equals(id as string).filter(g => !g.deleted_at).toArray(),
    [id]
  );

  const activeLookupToken = student?.public_lookup_token || serverLookupToken;

  // Sync token from backend on mount
  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    async function syncTokenFromBackend() {
      try {
        let res = await fetch(`/api/students/${id}`);
        if (!res.ok) {
          res = await fetch(`/students/${id}`);
        }
        if (res.ok) {
          const data = await res.json();
          if (data?.public_lookup_token && isMounted) {
            setServerLookupToken(data.public_lookup_token);
            if (student && !student.public_lookup_token) {
              await db.students.update(student.id, { 
                public_lookup_token: data.public_lookup_token,
                updated_at: Date.now()
              });
            }
          }
        }
      } catch (err) {
        // Silent fallback to local storage
      }
    }

    syncTokenFromBackend();
    return () => {
      isMounted = false;
    };
  }, [id, student?.id, student?.public_lookup_token]);

  // Generate QR Code data URL whenever activeLookupToken changes
  useEffect(() => {
    if (activeLookupToken) {
      const fullUrl = `${window.location.origin}/s/${activeLookupToken}`;
      QRCode.toDataURL(fullUrl, {
        width: 256,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      })
      .then(url => setQrCodeDataUrl(url))
      .catch(err => {
        console.error('Failed to generate QR code data URL', err);
      });
    } else {
      setQrCodeDataUrl('');
    }
  }, [activeLookupToken]);

  if (!student) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500 text-xs">جاري تحميل بيانات الطالب...</p>
      </div>
    );
  }

  const activeEnrollments = enrollments?.filter(e => e.status === 'active') || [];

  // Generate or Regenerate Public Lookup Token
  const handleGenerateLookupToken = async (isRegenerate: boolean) => {
    if (!student) return;

    if (isRegenerate) {
      const isConfirmed = await confirm({
        title: 'إعادة توليد رابط الاستعلام العام',
        message: 'هل أنت متأكد من إعادة توليد رابط الاستعلام العام للطالب؟',
        description: 'تحذير: سيتم إبطال الرابط القديم ورمز QR السابق فوراً، ولن يعمل الرابط أو الكود المطبوع/المشارك مسبقاً بعد الآن.',
        confirmText: 'نعم، إعادة التوليد',
        cancelText: 'إلغاء',
        variant: 'warning'
      });

      if (!isConfirmed) return;
    }

    setIsGeneratingToken(true);

    try {
      // Calculate live attendance
      const attendedCount = attendanceRecords?.filter(a => a.status === 'present').length || 0;
      const missedCount = attendanceRecords?.filter(a => a.status === 'absent').length || 0;
      const totalSessions = attendedCount + missedCount;
      const attendanceRate = totalSessions > 0 ? Math.round((attendedCount / totalSessions) * 100) : 100;

      // Calculate exams
      const examsList = (studentGrades || []).map(g => {
        const assessment = (allAssessments || []).find(a => a.id === g.assessmentId);
        return {
          id: g.id,
          name: assessment?.name || 'اختبار تقييمي',
          grade: g.grade,
          maxGrade: assessment?.maxGrade || 100,
          date: assessment?.date ? format(new Date(assessment.date), 'yyyy-MM-dd') : undefined
        };
      });

      // Calculate current subscription status
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const currentSub = monthlySubscriptions?.find(s => s.month === currentMonth && s.year === currentYear);

      let subStatus: 'paid' | 'partial' | 'overdue' | 'no_record' = 'no_record';
      if (currentSub) {
        if (currentSub.status === 'paid' || (currentSub.amountPaid >= currentSub.amountTotal && currentSub.amountTotal > 0)) {
          subStatus = 'paid';
        } else if (currentSub.amountPaid > 0) {
          subStatus = 'partial';
        } else {
          subStatus = 'overdue';
        }
      }

      const payload = {
        student: {
          id: student.id,
          name: student.name,
          studentCode: student.studentCode || '',
          gradeLevel: student.gradeLevel || '',
          school: student.school || ''
        },
        attendance: {
          attended: attendedCount,
          missed: missedCount,
          total: totalSessions,
          rate: attendanceRate
        },
        exams: examsList,
        subscription: {
          status: subStatus,
          month: currentMonth,
          year: currentYear,
          amountTotal: currentSub?.amountTotal || 0,
          amountPaid: currentSub?.amountPaid || 0
        }
      };

      let res = await fetch(`/api/students/${student.id}/lookup-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        res = await fetch(`/students/${student.id}/lookup-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        throw new Error('Server returned error status');
      }

      const result = await res.json();
      const newToken = result.token || result.public_lookup_token;

      // Update student in local Dexie database
      await db.students.update(student.id, {
        public_lookup_token: newToken,
        updated_at: Date.now()
      });

      setServerLookupToken(newToken);

      toast.success(
        isRegenerate 
          ? 'تمت إعادة توليد رابط الاستعلام بنجاح وإبطال الرابط السابق' 
          : 'تم توليد رابط الاستعلام العام بنجاح'
      );
    } catch (err) {
      console.error('Error generating lookup token:', err);
      toast.error('حدث خطأ أثناء توليد رابط الاستعلام، يرجى المحاولة مرة أخرى');
    } finally {
      setIsGeneratingToken(false);
    }
  };

  const handleCopyLookupLink = () => {
    if (!activeLookupToken) return;
    const fullUrl = `${window.location.origin}/s/${activeLookupToken}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    toast.success('تم نسخ رابط الاستعلام إلى الحافظة بنجاح');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Issue new card for the student
  const handleIssueCard = async () => {
    if (!student) return;
    try {
      const now = Date.now();
      const serial = student.studentCode || (student.phone ? student.phone.slice(-4) : '0001');
      await db.qrCards.add({
        id: uuidv4(),
        cardNumber: serial,
        qrCodeData: serial,
        studentId: student.id,
        linkedAt: now,
        printStatus: 'available',
        status: 'active',
        themeColor: 'blue',
        centerName,
        created_at: now,
        updated_at: now,
        sync_status: 'pending'
      });
      toast.success(`تم إصدار كرنيه الطالب بنجاح برقم كود (${serial})`);
    } catch (err) {
      toast.error('فشل إصدار الكرنيه، يرجى المحاولة لاحقاً');
    }
  };

  // Re-issue / replace current card
  const handleReissueCard = async () => {
    if (!studentCard || !student) return;
    const isConfirmed = await confirm({
      title: 'إعادة إصدار كرنيه جديد',
      message: `هل أنت متأكد من إلغاء البطاقة الحالية (${studentCard.cardNumber}) وإصدار بطاقة جديدة؟`,
      description: 'سيتم إيقاف البطاقة القديمة فوراً حتى لا تُستخدم في مسح الحضور.',
      confirmText: 'نعم، إصدار كرنيه بديل',
      cancelText: 'إلغاء',
      variant: 'warning'
    });

    if (isConfirmed) {
      try {
        const now = Date.now();
        // Revoke old card
        await db.qrCards.update(studentCard.id, {
          status: 'revoked',
          updated_at: now,
          sync_status: 'pending'
        });

        // Add new card with student's actual studentCode
        const serial = student.studentCode || (student.phone ? student.phone.slice(-4) : '0001');
        await db.qrCards.add({
          id: uuidv4(),
          cardNumber: serial,
          qrCodeData: serial,
          studentId: student.id,
          linkedAt: now,
          printStatus: 'available',
          status: 'active',
          themeColor: studentCard.themeColor || 'blue',
          centerName: studentCard.centerName || centerName,
          created_at: now,
          updated_at: now,
          sync_status: 'pending'
        });

        toast.success(`تم إصدار الكرنيه الجديد بكود الطالب (${serial}) وإيقاف البطاقة السابقة`);
      } catch (err) {
        toast.error('فشل إعادة إصدار الكرنيه');
      }
    }
  };

  // Sync card number with studentCode (e.g. migrate from MSR-xxx to 0009)
  const handleSyncWithStudentCode = async () => {
    if (!studentCard || !student?.studentCode) return;
    try {
      const now = Date.now();
      await db.qrCards.update(studentCard.id, {
        cardNumber: student.studentCode,
        qrCodeData: student.studentCode,
        updated_at: now,
        sync_status: 'pending'
      });
      toast.success(`تمت مزامنة الكرنيه والباركود مع كود الطالب (${student.studentCode}) بنجاح`);
    } catch (err) {
      toast.error('فشل تحديث رقم الكرنيه');
    }
  };

  // Manually update card number
  const handleSaveCustomCardNumber = async () => {
    if (!studentCard) return;
    const trimmed = newCardNumberInput.trim();
    if (!trimmed) {
      toast.error('يرجى إدخال رقم كود صحيح');
      return;
    }
    try {
      const now = Date.now();
      await db.qrCards.update(studentCard.id, {
        cardNumber: trimmed,
        qrCodeData: trimmed,
        updated_at: now,
        sync_status: 'pending'
      });
      setIsEditingCardNumber(false);
      setNewCardNumberInput('');
      toast.success(`تم تعديل كود الكرنيه إلى (${trimmed}) بنجاح`);
    } catch (err) {
      toast.error('فشل تعديل رقم الكرنيه');
    }
  };

  // Update card theme color
  const handleUpdateTheme = async (color: CardThemeColor) => {
    if (!studentCard) return;
    try {
      await db.qrCards.update(studentCard.id, {
        themeColor: color,
        updated_at: Date.now(),
        sync_status: 'pending'
      });
      toast.success('تم تحديث لون سمة الكرنيه');
    } catch (err) {
      toast.error('فشل تحديث السمة');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const colors: { id: CardThemeColor; name: string; bg: string }[] = [
    { id: 'blue', name: 'أزرق مسار', bg: 'bg-blue-600' },
    { id: 'emerald', name: 'أخضر زمردي', bg: 'bg-emerald-600' },
    { id: 'indigo', name: 'كحلي داكن', bg: 'bg-indigo-600' },
    { id: 'amber', name: 'ذهبي كهرماني', bg: 'bg-amber-600' },
    { id: 'rose', name: 'عنابي وردي', bg: 'bg-rose-600' },
    { id: 'slate', name: 'رمادي ليلي', bg: 'bg-slate-700' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Link to="/students" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-500 transition-colors">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{student.name}</h1>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                student.isActive 
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}>
                {student.isActive ? 'نشط' : 'غير نشط'}
              </span>
              <span>•</span>
              <div className="inline-flex items-center gap-1.5">
                <span className="font-mono" dir="ltr">{student.phone}</span>
                {student.phone && getWhatsAppUrl(student.phone) && (
                  <a
                    href={getWhatsAppUrl(student.phone)}
                    target="_blank"
                    rel="noreferrer"
                    title="محادثة واتساب سريعة"
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
                  >
                    <MessageCircle className="w-2.5 h-2.5" />
                    <span>واتساب</span>
                  </a>
                )}
              </div>
              {student.gradeLevel && (
                <>
                  <span>•</span>
                  <span>{student.gradeLevel}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick QR Card Shortcut in Header */}
        <div className="flex items-center gap-2">
          {studentCard ? (
            <button
              onClick={() => setActiveTab('qrcard')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <QrCode className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>الكرنيه:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{studentCard.cardNumber}</span>
            </button>
          ) : (
            <button
              onClick={handleIssueCard}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>إصدار كرنيه QR فوري</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-px print:hidden">
        {[
          { id: 'overview', label: 'نظرة عامة', icon: User },
          { id: 'enrollments', label: 'المجموعات المسجل بها', icon: BookOpen },
          { id: 'attendance', label: 'سجل الحضور', icon: Clock },
          { id: 'payments', label: 'المدفوعات', icon: Wallet },
          { id: 'grades', label: 'الامتحانات والتقييمات', icon: GraduationCap },
          { id: 'qrcard', label: 'كرنيه وباركود الطالب (QR)', icon: QrCode },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-3.5 py-2 border-b-2 font-semibold text-xs transition-colors whitespace-nowrap ${
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

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Personal Info */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-4">البيانات الشخصية</h3>
            <div className="space-y-3 text-xs">
              <div>
                <span className="block text-[11px] text-slate-500 mb-0.5">المدرسة</span>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{student.school || '-'}</p>
              </div>
              <div>
                <span className="block text-[11px] text-slate-500 mb-0.5">الصف الدراسي</span>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{student.gradeLevel || '-'}</p>
              </div>
              <div>
                <span className="block text-[11px] text-slate-500 mb-0.5">مصدر التعارف</span>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{student.leadSource || '-'}</p>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <span className="block text-[11px] text-slate-500 mb-0.5">ولي الأمر</span>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{student.parentName || '-'}</p>
              </div>
              <div>
                <span className="block text-[11px] text-slate-500 mb-0.5">هاتف ولي الأمر</span>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-900 dark:text-slate-100 font-mono" dir="ltr">{student.parentPhone || '-'}</p>
                  {student.parentPhone && getWhatsAppUrl(student.parentPhone) && (
                    <a
                      href={getWhatsAppUrl(student.parentPhone)}
                      target="_blank"
                      rel="noreferrer"
                      title="مراسلة ولي الأمر عبر واتساب"
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
                    >
                      <MessageCircle className="w-2.5 h-2.5" />
                      <span>واتساب</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Performance Summary */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-4">ملخص الأداء والحضور</h3>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-md border border-slate-100 dark:border-slate-800">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">المجموعات النشطة</span>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{activeEnrollments.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-md border border-slate-100 dark:border-slate-800">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">أيام الحضور</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{attendanceRecords?.filter(a => a.status === 'present').length || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-md border border-slate-100 dark:border-slate-800">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">أيام الغياب</span>
                <span className="text-sm font-bold text-red-600 dark:text-red-400">{attendanceRecords?.filter(a => a.status === 'absent').length || 0}</span>
              </div>
            </div>
          </div>

          {/* QR Card Status Box in Overview */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  بطاقة الطالب ورمز QR
                </h3>
                {studentCard ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                    <CheckCircle2 className="w-3 h-3" />
                    مفعلة
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
                    غير مصدرة
                  </span>
                )}
              </div>

              {studentCard ? (
                <div className="space-y-2 text-xs">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-0.5">كود البطاقة المخصص:</span>
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                      {studentCard.cardNumber}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    يستخدم هذا الرمز لمسح الحضور السريع عبر كاميرا الاستقبال أو ماسح الباركود اليدوي.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500 leading-relaxed">
                  لم يتم إصدار بطاقة QR ذكية لهذا الطالب بعد. إصدار البطاقة يسهل تسجيل الحضور اليومي في ثانية واحدة.
                </p>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
              {studentCard ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('qrcard')}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>عرض ومعاينة وطباعة الكرنيه</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleIssueCard}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>توليد كرنيه فوري الآن</span>
                </button>
              )}
            </div>
          </div>

          {/* 4. Public Student Lookup Link & Live Report Card */}
          <div className="md:col-span-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>رابط الاستعلام العام المباشر ورمز QR</span>
                    {activeLookupToken ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                        <CheckCircle2 className="w-3 h-3" />
                        مفعل ومتاح للمعاينة
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        غير مولد
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    رابط عام مستقل ومباشر يمكّن ولي الأمر والطالب من استعراض الحضور، الدرجات، وحالة الاشتراك فوراً بدون تسجيل دخول.
                  </p>
                </div>
              </div>

              <div>
                {activeLookupToken ? (
                  <button
                    type="button"
                    onClick={() => handleGenerateLookupToken(true)}
                    disabled={isGeneratingToken}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingToken ? 'animate-spin' : ''}`} />
                    <span>إعادة توليد الرابط (إبطال القديم)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleGenerateLookupToken(false)}
                    disabled={isGeneratingToken}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-2xs cursor-pointer"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isGeneratingToken ? 'animate-spin' : ''}`} />
                    <span>توليد رابط الاستعلام العام</span>
                  </button>
                )}
              </div>
            </div>

            {activeLookupToken ? (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
                {/* Left: Token & Link controls */}
                <div className="md:col-span-2 space-y-3.5">
                  <div>
                    <span className="block text-[11px] font-medium text-slate-500 mb-1">
                      رمز الاستعلام الفريد (Token):
                    </span>
                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-200 select-all">
                      {activeLookupToken}
                    </div>
                  </div>

                  <div>
                    <span className="block text-[11px] font-medium text-slate-500 mb-1">
                      الرابط العام المباشر:
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        dir="ltr"
                        value={`${window.location.origin}/s/${activeLookupToken}`}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-700 dark:text-slate-300 select-all outline-none"
                      />
                      
                      <button
                        type="button"
                        onClick={handleCopyLookupLink}
                        title="نسخ الرابط"
                        className="inline-flex items-center gap-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? 'تم النسخ' : 'نسخ'}</span>
                      </button>

                      <a
                        href={`/s/${activeLookupToken}`}
                        target="_blank"
                        rel="noreferrer"
                        title="فتح الرابط في تبويب جديد"
                        className="inline-flex items-center gap-1 px-3 py-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg text-xs font-bold transition-colors shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>معاينة</span>
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <span>
                      <strong>ملاحظة أمان:</strong> إعادة توليد الرابط تبطل هذا الكود ورمز QR فوراً وتمنع أي شخص يمتلك الرابط القديم من الوصول لبيانات الطالب.
                    </span>
                  </div>
                </div>

                {/* Right: QR Code Visual Preview */}
                <div className="flex flex-col items-center justify-center p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                  {qrCodeDataUrl ? (
                    <div className="space-y-2">
                      <img 
                        src={qrCodeDataUrl} 
                        alt="QR Code" 
                        className="w-32 h-32 mx-auto rounded-lg bg-white p-1.5 shadow-2xs border border-slate-200 dark:border-slate-700" 
                      />
                      <span className="block text-[10px] text-slate-500 font-medium">
                        مسح مباشر عبر كاميرا هاتف ولي الأمر
                      </span>
                    </div>
                  ) : (
                    <div className="w-32 h-32 flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 text-xs">
                      جاري إنشاء الرمز...
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-right">
                <p className="text-xs text-slate-500">
                  لم يتم إنشاء رابط استعلام عام لهذا الطالب بعد. اضغط على "توليد رابط الاستعلام العام" لتمكين المتابعة المباشرة.
                </p>
                <button
                  type="button"
                  onClick={() => handleGenerateLookupToken(false)}
                  disabled={isGeneratingToken}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors shrink-0 shadow-2xs cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>توليد الرابط الآن</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enrollments Tab */}
      {activeTab === 'enrollments' && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5">
          {enrollments?.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-40" />
              <p>الطالب غير مسجل في أي مجموعات حالياً.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {enrollments?.map(enrollment => {
                const group = groups?.find(g => g.id === enrollment.groupId);
                const course = courses?.find(c => c.id === enrollment.courseId);
                return (
                  <div key={enrollment.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3.5 border border-slate-200 dark:border-slate-800 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors gap-3">
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        {group?.name || 'مجموعة غير معروفة'}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                          enrollment.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                          enrollment.status === 'withdrawn' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20' :
                          'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                        }`}>
                          {enrollment.status === 'active' ? 'نشط' : enrollment.status === 'withdrawn' ? 'منسحب' : 'مكتمل'}
                        </span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">{course?.name}</p>
                      <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        تاريخ التسجيل: {format(new Date(enrollment.enrolledAt), 'dd MMM yyyy', { locale: ar })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      
      {/* Attendance Tab */}
      {activeTab === 'attendance' && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5">
          {attendanceRecords?.length === 0 ? (
             <div className="text-center py-8 text-slate-500 text-xs">
               <Clock className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-40" />
               <p>لا يوجد سجل حضور للطالب حتى الآن.</p>
             </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">التاريخ</th>
                    <th className="px-4 py-2.5 font-semibold">الوقت</th>
                    <th className="px-4 py-2.5 font-semibold">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {attendanceRecords?.sort((a, b) => b.markedAt - a.markedAt).map(record => (
                    <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-2.5">{format(record.markedAt, 'dd MMM yyyy', { locale: ar })}</td>
                      <td className="px-4 py-2.5 text-slate-500 font-mono" dir="ltr">{format(record.markedAt, 'hh:mm a')}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          record.status === 'present' 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                            : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                        }`}>
                          {record.status === 'present' ? 'حاضر' : 'غائب'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-3">الاشتراكات الشهرية</h3>
            {monthlySubscriptions?.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">لا يوجد سجل اشتراكات شهرية</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">الكورس</th>
                      <th className="px-4 py-2.5 font-semibold">الشهر/السنة</th>
                      <th className="px-4 py-2.5 font-semibold">المبلغ الإجمالي</th>
                      <th className="px-4 py-2.5 font-semibold">المدفوع</th>
                      <th className="px-4 py-2.5 font-semibold">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {monthlySubscriptions?.sort((a, b) => b.created_at - a.created_at).map(sub => {
                      const course = courses?.find(c => c.id === sub.courseId);
                      return (
                        <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-2.5 font-medium">{course?.name || '-'}</td>
                          <td className="px-4 py-2.5 text-slate-500 font-mono">{sub.month}/{sub.year}</td>
                          <td className="px-4 py-2.5 font-mono">{toMajorUnits(sub.amountTotal)} ج.م</td>
                          <td className="px-4 py-2.5 font-mono text-blue-600 dark:text-blue-400">{toMajorUnits(sub.amountPaid)} ج.م</td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              sub.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                              sub.status === 'partial' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' :
                              'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                            }`}>
                              {sub.status === 'paid' ? 'خالص' : sub.status === 'partial' ? 'جزئي' : 'متأخر'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-3">مدفوعات الحصص (الملازم والحصص الفردية)</h3>
            {sessionPayments?.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">لا يوجد سجل مدفوعات حصص</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">الكورس</th>
                      <th className="px-4 py-2.5 font-semibold">النوع</th>
                      <th className="px-4 py-2.5 font-semibold">التاريخ</th>
                      <th className="px-4 py-2.5 font-semibold">المبلغ الإجمالي</th>
                      <th className="px-4 py-2.5 font-semibold">المدفوع</th>
                      <th className="px-4 py-2.5 font-semibold">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sessionPayments?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(pay => {
                      const course = courses?.find(c => c.id === pay.courseId);
                      return (
                        <tr key={pay.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-2.5 font-medium">{course?.name || '-'}</td>
                          <td className="px-4 py-2.5">{pay.type === 'fee' ? 'حصة فردية' : 'باقة'}</td>
                          <td className="px-4 py-2.5 text-slate-500">{format(new Date(pay.date), 'dd MMM yyyy', { locale: ar })}</td>
                          <td className="px-4 py-2.5 font-mono">{toMajorUnits(pay.amount)} ج.م</td>
                          <td className="px-4 py-2.5 font-mono text-blue-600 dark:text-blue-400">{toMajorUnits(pay.paidAmount)} ج.م</td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              pay.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                              pay.status === 'partial' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' :
                              pay.status === 'refunded' ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700' :
                              'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                            }`}>
                              {pay.status === 'paid' ? 'خالص' : pay.status === 'partial' ? 'جزئي' : pay.status === 'refunded' ? 'مسترد' : 'غير مدفوع'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Grades and Assessments Tab */}
      {activeTab === 'grades' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  سجل الامتحانات والواجبات والتقييمات
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  عرض درجات الطالب في كافة الاختبارات مع إمكانية رصد وتعديل الدرجة فوراً
                </p>
              </div>
            </div>

            {allAssessments?.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">
                <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>لا توجد امتحانات أو واجبات مضافة في النظام حتى الآن.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3 font-semibold">اسم الاختبار / الواجب</th>
                      <th className="px-4 py-3 font-semibold">النوع</th>
                      <th className="px-4 py-3 font-semibold">الكورس</th>
                      <th className="px-4 py-3 font-semibold">التاريخ</th>
                      <th className="px-4 py-3 font-semibold">الدرجة العظمى</th>
                      <th className="px-4 py-3 font-semibold">درجة الطالب</th>
                      <th className="px-4 py-3 font-semibold">النسبة والتقدير</th>
                      <th className="px-4 py-3 font-semibold">تعديل / رصد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {allAssessments?.map(assessment => {
                      const gradeRecord = studentGrades?.find(g => g.assessmentId === assessment.id);
                      const course = courses?.find(c => c.id === assessment.courseId);
                      const numericGrade = gradeRecord ? Number(gradeRecord.grade) : null;
                      const percentage = (numericGrade !== null && assessment.maxGrade > 0)
                        ? Math.round((numericGrade / assessment.maxGrade) * 100)
                        : null;

                      return (
                        <tr key={assessment.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                            {assessment.name}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              assessment.type === 'exam' 
                                ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}>
                              {assessment.type === 'exam' ? 'امتحان' : 'واجب'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                            {course?.name || '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-500 font-mono">
                            {assessment.date ? format(new Date(assessment.date), 'dd/MM/yyyy') : '-'}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-600 dark:text-slate-400">
                            {assessment.maxGrade}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold">
                            {gradeRecord ? (
                              <span className="text-blue-600 dark:text-blue-400 text-sm">
                                {gradeRecord.grade}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">- لم ترصد -</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {percentage !== null ? (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                percentage >= 85 
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  : percentage >= 65 
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                  : percentage >= 50
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                  : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                              }`}>
                                {percentage}% ({percentage >= 85 ? 'ممتاز' : percentage >= 65 ? 'جيد جداً' : percentage >= 50 ? 'ناجح' : 'راسب'})
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={async () => {
                                const input = window.prompt(`أدخل درجة الطالب في (${assessment.name}) من أصل ${assessment.maxGrade}:`, gradeRecord?.grade?.toString() || '');
                                if (input === null) return;
                                const parsed = parseFloat(input.trim());
                                if (isNaN(parsed) || parsed < 0) {
                                  toast.error('يرجى إدخال درجة رقمية صحيحة');
                                  return;
                                }
                                const now = Date.now();
                                if (gradeRecord) {
                                  await db.assessmentGrades.update(gradeRecord.id, {
                                    grade: parsed,
                                    gradedAt: now,
                                    updated_at: now,
                                    sync_status: 'pending'
                                  });
                                } else {
                                  await db.assessmentGrades.add({
                                    id: uuidv4(),
                                    assessmentId: assessment.id,
                                    studentId: student.id,
                                    grade: parsed,
                                    gradedAt: now,
                                    created_at: now,
                                    updated_at: now,
                                    sync_status: 'pending'
                                  });
                                }
                                toast.success(`تم رصد الدرجة (${parsed}/${assessment.maxGrade}) للطالب بنجاح`);
                              }}
                              className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded text-[11px] font-semibold transition-colors"
                            >
                              {gradeRecord ? 'تعديل الدرجة' : '+ رصد درجة'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dedicated QR Card & ID Badge Tab */}
      {activeTab === 'qrcard' && (
        <div className="space-y-6">
          {studentCard ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Controls Column */}
              <div className="lg:col-span-6 space-y-5 print:hidden">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      إدارة بطاقة الطالب
                    </h3>
                    {!isEditingCardNumber ? (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold rounded-md">
                          #{studentCard.cardNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setNewCardNumberInput(studentCard.cardNumber || '');
                            setIsEditingCardNumber(true);
                          }}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-blue-600"
                          title="تعديل كود الكرنيه يدوياً"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={newCardNumberInput}
                          onChange={e => setNewCardNumberInput(e.target.value)}
                          placeholder="الكود الجديد (مثال: 0009)"
                          className="px-2 py-1 border border-blue-400 rounded text-xs font-mono font-bold w-28 text-left bg-white dark:bg-slate-800 dark:text-slate-100"
                          dir="ltr"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleSaveCustomCardNumber}
                          className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                          title="حفظ"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingCardNumber(false)}
                          className="p-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-300"
                          title="إلغاء"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Migration banner if old MSR format or not matching studentCode */}
                  {student?.studentCode && studentCard.cardNumber !== student.studentCode && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center justify-between gap-3 text-xs">
                      <div>
                        <p className="font-semibold text-amber-800 dark:text-amber-300">
                          الكرنيه الحالي برقم ({studentCard.cardNumber})
                        </p>
                        <p className="text-[11px] text-amber-700 dark:text-amber-400">
                          كود الطالب المسجل بالنظام هو (#{student.studentCode})
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleSyncWithStudentCode}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-xs shrink-0 transition-colors shadow-2xs"
                      >
                        مزامنة مع كود الطالب
                      </button>
                    </div>
                  )}

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">حالة الكرنيه:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        ساري ومفعل
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">تاريخ التوليد والربط:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {studentCard.linkedAt ? format(studentCard.linkedAt, 'dd/MM/yyyy - hh:mm a') : '-'}
                      </span>
                    </div>
                  </div>

                  {/* Theme Color Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-slate-400" />
                      اختيار لون سمة الكرنيه:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {colors.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleUpdateTheme(c.id)}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition-all ${
                            (studentCard.themeColor || 'blue') === c.id
                              ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                              : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span className={`w-3.5 h-3.5 rounded-full ${c.bg} shrink-0`} />
                          <span className="truncate">{c.name.split(' ')[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={handlePrint}
                      className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                    >
                      <Printer className="w-4 h-4" />
                      <span>طباعة الكرنيه (A4 / ID-1)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleReissueCard}
                      className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>إعادة إصدار بكود الطالب</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Preview Column */}
              <div className="lg:col-span-6 flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="w-full flex items-center justify-between mb-4 print:hidden">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    المعاينة الفعلية للبطاقة
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    معايير ID-1 القياسية
                  </span>
                </div>

                {/* The card */}
                <div className="py-4 px-2">
                  <QrCardBadge
                    cardNumber={studentCard.cardNumber || student.studentCode || '0001'}
                    qrCodeData={studentCard.qrCodeData || studentCard.cardNumber || student.studentCode || '0001'}
                    studentName={student.name}
                    studentPhone={student.phone}
                    studentGrade={student.gradeLevel}
                    studentSchool={student.school}
                    centerName={studentCard.centerName || centerName}
                    themeColor={(studentCard.themeColor as CardThemeColor) || 'blue'}
                    status={studentCard.status}
                    size="large"
                  />
                </div>

                <p className="text-[11px] text-slate-400 text-center mt-3 print:hidden">
                  كود الباركود المشفر مطابق تماماً لرقم الكرنيه وكود الطالب
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center max-w-lg mx-auto space-y-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  لا توجد بطاقة QR مسجلة للطالب حتى الآن
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  يمكنك بضغطة زر واحدة إنشاء كرنيه ذكي للطالب {student.name} يحتوي على باركود مشفر وبياناته المدرسية لتسجيل الحضور الفوري.
                </p>
              </div>
              <button
                type="button"
                onClick={handleIssueCard}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
              >
                <Sparkles className="w-4 h-4" />
                <span>إصدار وتجهيز كرنيه فوري الآن</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
