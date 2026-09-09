import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { 
  ArrowRight, User, BookOpen, Clock, Calendar, Wallet, 
  QrCode, Printer, RefreshCw, Sparkles, CheckCircle2, ShieldAlert, Palette
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toMajorUnits } from '../../utils/currency';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { QrCardBadge, CardThemeColor } from '../../components/Qr/QrCardBadge';

export function StudentDetails() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'overview' | 'enrollments' | 'attendance' | 'payments' | 'qrcard'>('overview');
  const toast = useToast();
  const { confirm } = useConfirm();

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

  if (!student) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500 text-xs">جاري تحميل بيانات الطالب...</p>
      </div>
    );
  }

  const activeEnrollments = enrollments?.filter(e => e.status === 'active') || [];

  // Issue new card for the student
  const handleIssueCard = async () => {
    if (!student) return;
    try {
      const now = Date.now();
      const serial = `MSR-${uuidv4().slice(0, 6).toUpperCase()}`;
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
      toast.success(`تم إصدار كرنيه الطالب بنجاح برقم (${serial})`);
    } catch (err) {
      toast.error('فشل إصدار الكرنيه، يرجى المحاولة لاحقاً');
    }
  };

  // Re-issue / replace current card
  const handleReissueCard = async () => {
    if (!studentCard) return;
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

        // Add new card
        const serial = `MSR-${uuidv4().slice(0, 6).toUpperCase()}`;
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

        toast.success(`تم إصدار الكرنيه الجديد برقم (${serial}) وإيقاف البطاقة السابقة`);
      } catch (err) {
        toast.error('فشل إعادة إصدار الكرنيه');
      }
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
              <span className="font-mono" dir="ltr">{student.phone}</span>
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
                <p className="font-semibold text-slate-900 dark:text-slate-100 font-mono" dir="ltr">{student.parentPhone || '-'}</p>
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
                    <span className="font-mono text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold rounded-md">
                      {studentCard.cardNumber}
                    </span>
                  </div>

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
                      <span>إعادة إصدار بدل فاقد</span>
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
                    cardNumber={studentCard.cardNumber || 'MSR-SAMPLE'}
                    qrCodeData={studentCard.qrCodeData || studentCard.cardNumber}
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
                  جاهز للطباعة على طابعات PVC الكارنيهات أو على ورق الطباعة اللاصق
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
