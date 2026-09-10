import { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { 
  Play, CheckCircle, Clock, X, Users, MessageCircle, StopCircle, Calendar, 
  AlertTriangle, QrCode, Check, Search, Sparkles, UserCheck, UserX, Trash2, ArrowRight
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { AttendanceSession, Student } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { getWhatsAppUrl } from '../../utils/phone';

export function Attendance() {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState<'live' | 'upcoming' | 'history' | 'absent'>('live');
  const [markingSession, setMarkingSession] = useState<AttendanceSession | null>(null);
  const groups = useLiveQuery(() => db.groups.toArray(), []);
  const courses = useLiveQuery(() => db.courses.toArray(), []);
  
  const activeSessions = useLiveQuery(() => db.attendanceSessions.where('status').equals('live').toArray(), []);
  const completedSessions = useLiveQuery(() => db.attendanceSessions.where('status').equals('completed').toArray(), []);
  const allRecords = useLiveQuery(() => db.attendanceRecords.toArray(), []);
  const students = useLiveQuery(() => db.students.filter(s => !s.deleted_at).toArray(), []);
  
  const courseMap = new Map(courses?.map(c => [c.id, c.name]));
  const groupMap = new Map(groups?.map(g => [g.id, g]));

  const handleStartSession = async (groupId: string, courseId: string, isTrial: boolean = false) => {
    const now = Date.now();
    await db.attendanceSessions.add({
      id: uuidv4(),
      groupId,
      courseId,
      isTrial,
      startedAt: now,
      endedAt: null,
      status: 'live',
      created_at: now,
      updated_at: now,
      sync_status: 'pending'
    });
    toast.success(isTrial ? 'تم بدء حصة تجريبية بنجاح!' : 'تم بدء الحصة بنجاح!');
  };

  const handleEndSession = async (sessionId: string) => {
    const isConfirmed = await confirm({
      title: 'إنهاء وتوثيق الحصة',
      message: 'هل أنت متأكد من إنهاء هذه الحصة الحالية؟',
      description: 'لا يمكن التعديل على سجل الحضور والغياب لهذه الحصة بعد إتمام الإنهاء.',
      confirmText: 'نعم، إنهاء الحصة',
      cancelText: 'تراجع',
      variant: 'warning',
    });

    if (isConfirmed) {
      await db.attendanceSessions.update(sessionId, {
        endedAt: Date.now(),
        status: 'completed',
        updated_at: Date.now(),
        sync_status: 'pending'
      });
      if (markingSession?.id === sessionId) {
        setMarkingSession(null);
      }
      toast.success('تم إنهاء الحصة وتوثيق الحضور.');
    }
  };

  const arabicDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const todayName = arabicDays[new Date().getDay()];
  const todayScheduledGroups = groups?.filter(g => 
    g.status === 'in_progress' && (g.daysOfWeek?.includes(todayName) || g.daysOfWeek?.length === 0)
  ) || [];

  const absentRecords = allRecords?.filter(r => r.status === 'absent') || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">الحضور والغياب</h1>
          <p className="text-xs text-slate-500 mt-0.5">اليوم: {todayName}، {format(new Date(), 'dd MMMM yyyy', { locale: ar })}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">بدء حصة جديدة</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {groups?.filter(g => g.status === 'in_progress').map(group => {
            const isLive = activeSessions?.some(s => s.groupId === group.id);
            return (
              <div key={group.id} className="border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs">{group.name}</h3>
                    {isLive && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                        نشطة الآن
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mb-2">{courseMap.get(group.courseId)}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">{group.startTime} - {group.endTime}</p>
                </div>
                <div>
                  {isLive ? (
                    <button 
                      onClick={() => {
                        const session = activeSessions?.find(s => s.groupId === group.id);
                        if (session) setMarkingSession(session);
                      }}
                      className="w-full flex items-center justify-center py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors text-xs font-semibold border border-blue-200 dark:border-blue-900/50"
                    >
                      <CheckCircle className="w-3.5 h-3.5 ml-1.5" />
                      إدارة الحضور
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleStartSession(group.id, group.courseId, false)}
                        className="flex-1 flex items-center justify-center py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-md transition-colors text-xs font-semibold shadow-xs"
                      >
                        <Play className="w-3 h-3 ml-1" />
                        بدء حصة
                      </button>
                      <button 
                        onClick={() => handleStartSession(group.id, group.courseId, true)}
                        className="flex-1 flex items-center justify-center py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md transition-colors text-xs font-semibold border border-slate-200 dark:border-slate-700"
                        title="بدء حصة تجريبية (تطبق حدود حصص التجربة)"
                      >
                        <Play className="w-3 h-3 ml-1" />
                        تجربة
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {groups?.filter(g => g.status === 'in_progress').length === 0 && (
            <div className="col-span-full text-center text-slate-500 py-6 text-xs">لا توجد مجموعات قيد التنفيذ حالياً</div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto px-2">
          {[
            { id: 'live', label: `الحصص النشطة (${activeSessions?.length || 0})` },
            { id: 'upcoming', label: `مجدول اليوم (${todayScheduledGroups.length})` },
            { id: 'history', label: `السجل المنتهي (${completedSessions?.length || 0})` },
            { id: 'absent', label: `سجل الغائبين (${absentRecords.length})` },
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as any)} 
              className={`shrink-0 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === tab.id 
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === 'live' && (
            <div>
              {activeSessions?.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  <Play className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-40" />
                  <p>لا توجد حصص نشطة في الوقت الحالي.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {activeSessions?.map(session => (
                    <div key={session.id} className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <span>{groupMap.get(session.groupId)?.name}</span>
                            {session.isTrial && (
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-[10px] border border-slate-200 dark:border-slate-700">
                                حصة تجريبية
                              </span>
                            )}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">{courseMap.get(session.courseId)}</p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full text-[11px] font-semibold">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                          جاري الآن
                        </span>
                      </div>
                      
                      <div className="text-xs text-slate-500 mb-4 flex gap-4 font-mono">
                        <span className="flex items-center"><Clock className="w-3.5 h-3.5 ml-1 text-slate-400" /> بدأ: {format(new Date(session.startedAt), 'hh:mm a')}</span>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={() => setMarkingSession(session)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded-md text-xs font-bold transition-colors shadow-xs"
                        >
                          تسجيل الحضور والغياب
                        </button>
                        <button 
                          onClick={() => handleEndSession(session.id)}
                          className="px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-1.5 rounded-md text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
                        >
                          إنهاء الحصة
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'upcoming' && (
            <div>
              {todayScheduledGroups.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>لا توجد مجموعات مجدولة لهذا اليوم.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {todayScheduledGroups.map(group => (
                    <div key={group.id} className="border border-slate-200 dark:border-slate-800 rounded-lg p-5">
                      <h3 className="font-bold text-slate-900 dark:text-slate-100">{group.name}</h3>
                      <p className="text-sm text-slate-500 mb-3">{courseMap.get(group.courseId)}</p>
                      <div className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
                        <Clock className="w-4 h-4 ml-1.5 text-blue-500" />
                        {group.startTime} - {group.endTime}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              {completedSessions?.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <StopCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>لم يتم إنهاء أي حصص بعد.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-right">
                    <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 text-xs border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">المجموعة</th>
                        <th className="px-4 py-2.5 font-semibold">النوع</th>
                        <th className="px-4 py-2.5 font-semibold">التاريخ</th>
                        <th className="px-4 py-2.5 font-semibold">وقت البدء</th>
                        <th className="px-4 py-2.5 font-semibold">وقت الانتهاء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {completedSessions?.sort((a,b) => b.startedAt - a.startedAt).map(session => (
                        <tr key={session.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">{groupMap.get(session.groupId)?.name}</td>
                          <td className="px-4 py-2.5">
                            {session.isTrial ? (
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[10px] font-semibold border border-slate-200 dark:border-slate-700">تجريبية</span>
                            ) : (
                              <span className="text-slate-500 text-xs">عادية</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-slate-500 font-mono">{format(new Date(session.startedAt), 'dd MMM yyyy', { locale: ar })}</td>
                          <td className="px-4 py-2.5 text-slate-500 font-mono" dir="ltr">{format(new Date(session.startedAt), 'hh:mm a')}</td>
                          <td className="px-4 py-2.5 text-slate-500 font-mono" dir="ltr">{session.endedAt ? format(new Date(session.endedAt), 'hh:mm a') : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'absent' && (
            <div>
              {absentRecords.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-500" />
                  <p>لا يوجد غياب مسجل!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-right">
                    <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 text-xs border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">الطالب</th>
                        <th className="px-4 py-2.5 font-semibold">المجموعة</th>
                        <th className="px-4 py-2.5 font-semibold">ولي الأمر</th>
                        <th className="px-4 py-2.5 font-semibold">التاريخ</th>
                        <th className="px-4 py-2.5 font-semibold text-center">تواصل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {absentRecords.map(record => {
                        const student = students?.find(s => s.id === record.studentId);
                        if (!student) return null;
                        
                        const msg = `مرحباً ولي أمر الطالب ${student.name}، نود إعلامكم بغياب الطالب عن حصة مجموعة ${groupMap.get(record.groupId)?.name || ''} اليوم.`;
                        const targetPhone = student.parentPhone || student.phone;
                        const waLink = getWhatsAppUrl(targetPhone, msg);
                        
                        return (
                          <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">{student.name}</td>
                            <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{groupMap.get(record.groupId)?.name}</td>
                            <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{student.parentName || '-'} <span className="font-mono text-slate-500" dir="ltr">({student.parentPhone})</span></td>
                            <td className="px-4 py-2.5 text-slate-500 font-mono">{format(new Date(record.markedAt), 'dd MMM yyyy', { locale: ar })}</td>
                            <td className="px-4 py-2.5 text-center">
                              {waLink ? (
                                <a 
                                  href={waLink} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="inline-flex items-center px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-semibold transition-colors shadow-2xs"
                                >
                                  <MessageCircle className="w-3 h-3 ml-1" />
                                  واتساب
                                </a>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-600 text-[11px]">بدون رقم</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {markingSession && (
        <AttendanceModal 
          session={markingSession}
          onClose={() => setMarkingSession(null)}
          groupName={groupMap.get(markingSession.groupId)?.name || ''}
        />
      )}
    </div>
  );
}

function AttendanceModal({ 
  session, 
  onClose, 
  groupName 
}: { 
  session: AttendanceSession; 
  onClose: () => void; 
  groupName: string; 
}) {
  const toast = useToast();
  
  const groupEnrollments = useLiveQuery(
    () => db.enrollments.where('groupId').equals(session.groupId).toArray(),
    [session.groupId]
  );
  
  const activeStudentIds = groupEnrollments?.filter(e => e.status === 'active').map(e => e.studentId) || [];
  
  const allStudents = useLiveQuery(() => db.students.filter(s => !s.deleted_at).toArray(), []);
  const rosterStudents = allStudents?.filter(s => activeStudentIds.includes(s.id)) || [];

  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const currentSubscriptions = useLiveQuery(() => 
    db.monthlySubscriptions
      .where('courseId').equals(session.courseId)
      .and(sub => sub.month === currentMonth && sub.year === currentYear)
      .toArray(), 
  [session.courseId, currentMonth, currentYear]);

  const existingRecords = useLiveQuery(
    () => db.attendanceRecords.where('sessionId').equals(session.id).toArray(),
    [session.id]
  );

  // Settings for trial session limit
  const settingsArray = useLiveQuery(() => db.settings.toArray(), []);
  const settings = settingsArray?.[0];
  const freeSessionLimit = settings?.freeSessionLimitPerStudent || 1;

  // Trial limits verification (if session is trial)
  const allTrialSessions = useLiveQuery(() => 
    db.attendanceSessions.filter(s => s.isTrial === true).toArray(),
  []);
  const trialSessionIds = allTrialSessions?.map(s => s.id) || [];
  const allTrialRecords = useLiveQuery(() => 
    db.attendanceRecords.toArray()
  );
  
  // Previous Session Verification
  const groupCompletedSessions = useLiveQuery(() => 
    db.attendanceSessions.where('status').equals('completed').toArray()
  );
  const prevSession = groupCompletedSessions?.filter(s => s.groupId === session.groupId)
                                            .sort((a,b) => b.endedAt! - a.endedAt!)[0];
  const prevSessionRecords = useLiveQuery(() => 
    prevSession ? db.attendanceRecords.where('sessionId').equals(prevSession.id).toArray() : []
  );
  
  const [recordMap, setRecordMap] = useState<Record<string, 'present' | 'absent'>>({});
  const [isSaved, setIsSaved] = useState(false);
  const [viewTab, setViewTab] = useState<'attended' | 'absent'>('attended');
  const [extraGuestStudents, setExtraGuestStudents] = useState<Student[]>([]);
  
  // QR Code Scanner State
  const qrCards = useLiveQuery(() => db.qrCards.filter(c => !c.deleted_at).toArray(), []);
  const [qrInput, setQrInput] = useState('');
  
  const qrInputRef = useRef<HTMLInputElement>(null);
  const handleQrScanRef = useRef<any>(null);

  // Combine roster students and any guest students attended in this session
  const combinedStudents = [
    ...rosterStudents,
    ...extraGuestStudents.filter(g => !rosterStudents.some(r => r.id === g.id))
  ];

  // Process code scanning or manual submit
  const processStudentCode = (rawCode: string) => {
    const code = rawCode.trim();
    setQrInput('');
    if (!code) return;

    const cleanDigits = code.replace(/\D/g, '');

    // 1. Try finding in roster first
    let foundStudent: any = rosterStudents.find(s => 
      s.studentCode === code || 
      (cleanDigits && s.studentCode === cleanDigits) ||
      (cleanDigits && s.studentCode && parseInt(s.studentCode, 10) === parseInt(cleanDigits, 10)) ||
      s.phone === code ||
      s.id === code
    );

    // 2. If not found by student code, check qr cards
    if (!foundStudent) {
      const card = qrCards?.find(c => 
        c.cardNumber === code || 
        c.qrCodeData === code ||
        (cleanDigits && (c.cardNumber === cleanDigits || c.qrCodeData === cleanDigits)) ||
        (cleanDigits && c.cardNumber && parseInt(c.cardNumber, 10) === parseInt(cleanDigits, 10))
      );
      if (card && card.status === 'active' && card.studentId) {
        foundStudent = rosterStudents.find(s => s.id === card.studentId);
      } else if (card && card.status !== 'active') {
        toast.error('هذه البطاقة موقوفة وغير صالحة');
        return;
      }
    }

    // 3. If still not found in roster, check all students in academy
    if (!foundStudent && allStudents) {
      const globalStudent = allStudents.find(s => 
        s.studentCode === code || 
        (cleanDigits && s.studentCode === cleanDigits) ||
        (cleanDigits && s.studentCode && parseInt(s.studentCode, 10) === parseInt(cleanDigits, 10)) ||
        s.phone === code ||
        s.id === code
      );

      if (globalStudent) {
        foundStudent = globalStudent;
        // add to guest students so it gets tracked and saved
        setExtraGuestStudents(prev => [...prev.filter(x => x.id !== globalStudent.id), globalStudent]);
      } else {
        // check global qr card
        const card = qrCards?.find(c => 
          c.cardNumber === code || 
          c.qrCodeData === code ||
          (cleanDigits && (c.cardNumber === cleanDigits || c.qrCodeData === cleanDigits)) ||
          (cleanDigits && c.cardNumber && parseInt(c.cardNumber, 10) === parseInt(cleanDigits, 10))
        );
        if (card && card.status === 'active' && card.studentId) {
          const cardStudent = allStudents.find(s => s.id === card.studentId);
          if (cardStudent) {
            foundStudent = cardStudent;
            setExtraGuestStudents(prev => [...prev.filter(x => x.id !== cardStudent.id), cardStudent]);
          }
        }
      }
    }

    if (!foundStudent) {
      toast.error(`لم يتم العثور على طالب بكود (${code}) في النظام`);
      return;
    }

    if (session.isTrial) {
      const pastTrialsCount = allTrialRecords?.filter(r => 
        r.studentId === foundStudent.id && 
        r.status === 'present' && 
        trialSessionIds.includes(r.sessionId) &&
        r.sessionId !== session.id
      ).length || 0;
      
      if (pastTrialsCount >= freeSessionLimit) {
        toast.error('استنفد الطالب الحد الأقصى لحصص التجربة');
        return;
      }
    }

    setRecordMap(prev => ({ ...prev, [foundStudent.id]: 'present' }));
    
    // Switch to attended view so user immediately sees the success feedback
    setViewTab('attended');

    const sub = currentSubscriptions?.find(s => s.studentId === foundStudent.id);
    if (!session.isTrial && (!sub || sub.status !== 'paid')) {
      toast.success(`تم التحضير: ${foundStudent.name} (تنبيه: لم يسدد اشتراك الشهر)`);
    } else {
      toast.success(`تم تحضير الطالب: ${foundStudent.name} (#${foundStudent.studentCode || code})`);
    }
  };

  useEffect(() => {
    handleQrScanRef.current = (e: any, overrideCode?: string) => {
      if (e?.key === 'Enter') {
        e.preventDefault();
        processStudentCode(overrideCode || qrInput);
      }
    };
  });

  useEffect(() => {
    // Focus barcode input on mount and when modal opens
    setTimeout(() => {
      if (qrInputRef.current) {
        qrInputRef.current.focus();
      }
    }, 100);
    
    // Global keyboard listener to capture barcode even if input loses focus
    let buffer = '';
    let lastKeyTime = 0;
    
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
         return;
      }

      const currentTime = performance.now();
      if (currentTime - lastKeyTime > 100) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      if (/^[0-9a-zA-Z\-]$/.test(e.key)) {
        buffer += e.key;
      } else if (e.key === 'Enter' && buffer.length > 0) {
        e.preventDefault();
        const code = buffer.trim();
        buffer = '';
        if (!code) return;
        processStudentCode(code);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleQrScan = (e: any) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      processStudentCode(qrInput);
    }
  };

  useEffect(() => {
    if (existingRecords) {
      const map: Record<string, 'present' | 'absent'> = {};
      existingRecords.forEach(r => {
        map[r.studentId] = r.status;
      });
      setRecordMap(map);
    }
  }, [existingRecords]);

  const toggleStudentStatus = (studentId: string, status: 'present' | 'absent') => {
    setRecordMap(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const markAll = (status: 'present' | 'absent') => {
    const nextMap: Record<string, 'present' | 'absent'> = {};
    combinedStudents.forEach(s => {
      nextMap[s.id] = status;
    });
    setRecordMap(nextMap);
  };

  const handleSave = async () => {
    // If it's a trial session, prevent saving if limit exceeded for any present student
    if (session.isTrial) {
      const overLimitStudents = combinedStudents.filter(student => {
        if (recordMap[student.id] === 'present') {
          const pastTrials = allTrialRecords?.filter(r => 
            r.studentId === student.id && 
            r.status === 'present' && 
            trialSessionIds.includes(r.sessionId) &&
            r.sessionId !== session.id
          ).length || 0;
          
          if (pastTrials >= freeSessionLimit) return true;
        }
        return false;
      });

      if (overLimitStudents.length > 0) {
        toast.error(`يوجد ${overLimitStudents.length} طلاب استنفدوا حد حصص التجربة المسموح (${freeSessionLimit}). يرجى تغييبهم أو تعديل الإعدادات.`);
        return;
      }
    }

    const now = Date.now();
    
    for (const student of combinedStudents) {
      const status = recordMap[student.id] || 'absent';
      const existing = existingRecords?.find(r => r.studentId === student.id);
      
      if (existing) {
        if (existing.status !== status) {
          await db.attendanceRecords.update(existing.id, {
            status,
            markedAt: now,
            updated_at: now,
            sync_status: 'pending'
          });
        }
      } else {
        await db.attendanceRecords.add({
          id: uuidv4(),
          sessionId: session.id,
          studentId: student.id,
          groupId: session.groupId,
          status,
          markedAt: now,
          created_at: now,
          updated_at: now,
          sync_status: 'pending'
        });
      }
    }
    
    setIsSaved(true);
    toast.success('تم حفظ كشف الحضور بنجاح');
    setTimeout(() => {
      onClose();
    }, 800);
  };

  // Split students into attended (present) and absent
  const attendedStudents = combinedStudents.filter(s => recordMap[s.id] === 'present');
  const absentStudents = combinedStudents.filter(s => recordMap[s.id] !== 'present');

  const presentCount = attendedStudents.length;
  const absentCount = absentStudents.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl h-[85vh] max-h-[850px] min-h-[580px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>تسجيل كشف الحضور: {groupName}</span>
              {session.isTrial && (
                <span className="px-2.5 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-full text-[11px] border border-amber-200 dark:border-amber-800 font-bold">
                  حصة تجريبية
                </span>
              )}
            </h2>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
              <span>إجمالي مقيدي المجموعة: <strong className="text-slate-700 dark:text-slate-300 font-mono">{rosterStudents.length}</strong></span>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">الحاضرين: <strong className="font-mono">{presentCount}</strong></span>
              <span>•</span>
              <span className="text-slate-400">المتبقين / الغائبين: <strong className="font-mono">{absentCount}</strong></span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Clean, Prominent Scanner Input Bar */}
        <div className="p-5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <QrCode className="w-5 h-5 text-blue-600 dark:text-blue-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={qrInputRef}
                type="text"
                placeholder="أدخل كود الطالب أو امسح الباركود (مثال: 0009)..."
                className="w-full pl-4 pr-11 py-3 border-2 border-blue-300 dark:border-blue-700/80 rounded-xl text-base text-slate-900 dark:text-slate-100 bg-blue-50/20 dark:bg-slate-800/40 focus:bg-white dark:focus:bg-slate-800 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/15 focus:outline-none text-left font-mono font-bold tracking-wider transition-all placeholder:text-slate-400 placeholder:text-xs placeholder:font-sans placeholder:tracking-normal shadow-2xs"
                dir="ltr"
                value={qrInput}
                onChange={e => setQrInput(e.target.value)}
                onKeyDown={handleQrScan}
              />
            </div>
            
            <button
              type="button"
              onClick={() => processStudentCode(qrInput)}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors shadow-sm shrink-0"
            >
              <Check className="w-4 h-4" />
              <span>تسجيل الحضور (Enter)</span>
            </button>
          </div>

          {/* Sub-bar: View Selector & Quick Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => setViewTab('attended')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-xs transition-all ${
                  viewTab === 'attended'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>الطلاب الحاضرين ({presentCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setViewTab('absent')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-xs transition-all ${
                  viewTab === 'absent'
                    ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <UserX className="w-3.5 h-3.5" />
                <span>الطلاب المتبقين / الغائبين ({absentCount})</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => markAll('present')} 
                className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold transition-colors"
              >
                تحضير الكل
              </button>
              <button 
                onClick={() => markAll('absent')} 
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold transition-colors"
              >
                تغييب الكل
              </button>
            </div>
          </div>
        </div>

        {/* Content Body: DOES NOT list all students by default, shows live attended feed */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/40 dark:bg-slate-950/20">
          {viewTab === 'attended' ? (
            attendedStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                  <QrCode className="w-8 h-8 opacity-70" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  في انتظار مسح أكواد الطلاب
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  مرر كارت أو باركود الطالب أمام القارئ أو اكتب كود الطالب (مثال: <strong>0009</strong>) ثم اضغط Enter ليتم إدراجه فوراً في كشف الحاضرين.
                </p>
                <button
                  type="button"
                  onClick={() => qrInputRef.current?.focus()}
                  className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                >
                  التركيز على خانة المسح الآن
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-500 px-1 mb-1">
                  <span>تم تحضير <strong>{attendedStudents.length}</strong> طالب في هذه الحصة:</span>
                  <span className="text-[11px]">مرتب حسب التسجيل</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {attendedStudents.map(student => {
                    const studentSub = currentSubscriptions?.find(s => s.studentId === student.id);
                    const isPaid = studentSub && studentSub.status === 'paid';
                    
                    return (
                      <div 
                        key={student.id} 
                        className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200/80 dark:border-emerald-900/40 shadow-2xs flex items-center justify-between gap-3 hover:border-emerald-400 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0 border border-emerald-200/60 dark:border-emerald-800/40">
                            ✓
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                                {student.name}
                              </p>
                              {student.studentCode && (
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                  #{student.studentCode}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[11px]">
                              <span className="text-slate-400 font-mono">{student.phone || '-'}</span>
                              <span className="text-slate-300">•</span>
                              {isPaid ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">سدد الاشتراك</span>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400 font-medium">لم يسدد الشهر</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleStudentStatus(student.id, 'absent')}
                          className="px-2.5 py-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-[11px] font-semibold transition-colors shrink-0"
                          title="إلغاء التحضير ورصده كغائب"
                        >
                          إلغاء التحضير
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>قائمة الطلاب غير المسجلين كحضور بعد ({absentStudents.length}):</span>
                <span className="text-[11px]">يمكنك الضغط على "تحضير" لتسجيل الطالب يدوياً</span>
              </div>

              {absentStudents.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  <UserCheck className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
                  <p className="font-bold text-slate-800 dark:text-slate-200">اكتمل الحضور! تم تحضير جميع الطلاب المقيدين.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {absentStudents.map(student => (
                    <div 
                      key={student.id} 
                      className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900 dark:text-slate-100 text-xs">{student.name}</p>
                          {student.studentCode && (
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              #{student.studentCode}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">{student.phone || '-'}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleStudentStatus(student.id, 'present')}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                      >
                        + تحضير
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
          <div className="text-xs">
            {isSaved ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ تم حفظ كشف الحضور بنجاح!</span>
            ) : (
              <span className="text-slate-500">
                إجمالي المسجلين كحضور: <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">{presentCount}</strong>
              </span>
            )}
          </div>

          <div className="flex gap-2.5">
            <button 
              onClick={onClose} 
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
            >
              إلغاء
            </button>
            <button 
              onClick={handleSave} 
              className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-xs font-bold transition-colors shadow-2xs"
            >
              حفظ كشف الحضور
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
