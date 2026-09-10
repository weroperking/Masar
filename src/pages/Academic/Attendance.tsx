import { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Play, CheckCircle, Clock, X, Users, MessageCircle, StopCircle, Calendar, AlertTriangle, QrCode } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { AttendanceSession, Student } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

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
                        const waLink = `https://wa.me/2${student.parentPhone || student.phone}?text=${encodeURIComponent(msg)}`;
                        
                        return (
                          <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">{student.name}</td>
                            <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{groupMap.get(record.groupId)?.name}</td>
                            <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{student.parentName || '-'} <span className="font-mono text-slate-500" dir="ltr">({student.parentPhone})</span></td>
                            <td className="px-4 py-2.5 text-slate-500 font-mono">{format(new Date(record.markedAt), 'dd MMM yyyy', { locale: ar })}</td>
                            <td className="px-4 py-2.5 text-center">
                              <a 
                                href={waLink} 
                                target="_blank" 
                                rel="noreferrer"
                                className="inline-flex items-center px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-semibold transition-colors shadow-xs"
                              >
                                <MessageCircle className="w-3 h-3 ml-1" />
                                واتساب
                              </a>
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
  
  // QR Code Scanner State
  const qrCards = useLiveQuery(() => db.qrCards.filter(c => !c.deleted_at).toArray(), []);
  const [qrInput, setQrInput] = useState('');
  
  
  const qrInputRef = useRef<HTMLInputElement>(null);
  const handleQrScanRef = useRef<any>(null);


  
  
  useEffect(() => {
    handleQrScanRef.current = handleQrScan;
  });

  useEffect(() => {

    // Always focus barcode input on mount and when modal opens
    setTimeout(() => {
      if (qrInputRef.current) {
        qrInputRef.current.focus();
      }
    }, 100);
    
    // Global keyboard listener to capture barcode even if input loses focus
    let buffer = '';
    let lastKeyTime = 0;
    
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if already in an input/textarea (like the barcode input itself)
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
        
        // We simulate setting the input and firing handleQrScan
        setQrInput(code);
        setTimeout(() => {
          const fakeEvent = { key: 'Enter', preventDefault: () => {} };
          handleQrScanRef.current(fakeEvent, code);
        }, 10);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleQrScan = (e: any, overrideCode?: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = overrideCode || qrInput.trim();
      setQrInput('');
      
      if (!code) return;
      
      let foundStudentId = null;
      const cleanDigits = code.replace(/\D/g, '');

      let matchedStudent = rosterStudents.find(s => 
        s.studentCode === code || 
        (cleanDigits && s.studentCode === cleanDigits) ||
        (cleanDigits && s.studentCode && parseInt(s.studentCode, 10) === parseInt(cleanDigits, 10))
      );
      
      if (matchedStudent) {
        foundStudentId = matchedStudent.id;
      } else {
        const card = qrCards?.find(c => 
          c.cardNumber === code || 
          c.qrCodeData === code ||
          (cleanDigits && (c.cardNumber === cleanDigits || c.qrCodeData === cleanDigits)) ||
          (cleanDigits && c.cardNumber && parseInt(c.cardNumber, 10) === parseInt(cleanDigits, 10))
        );
        if (card && card.status === 'active' && card.studentId) {
          foundStudentId = card.studentId;
        } else if (card && card.status !== 'active') {
          toast.error('هذه البطاقة موقوفة');
          return;
        }
      }

      if (!foundStudentId) {
        toast.error('لم يتم العثور على طالب بهذا الكود في النظام');
        return;
      }
      
      const studentInRoster = rosterStudents.find(s => s.id === foundStudentId);
      if (!studentInRoster) {
        toast.error('الطالب غير مقيد في هذه المجموعة');
        return;
      }

      if (session.isTrial) {
        const pastTrialsCount = allTrialRecords?.filter(r => 
          r.studentId === foundStudentId && 
          r.status === 'present' && 
          trialSessionIds.includes(r.sessionId) &&
          r.sessionId !== session.id
        ).length || 0;
        
        if (pastTrialsCount >= freeSessionLimit) {
          toast.error('استنفد الطالب الحد الأقصى لحصص التجربة');
          return;
        }
      }

      
      setRecordMap(prev => ({ ...prev, [foundStudentId]: 'present' }));
      
      const sub = currentSubscriptions?.find(s => s.studentId === foundStudentId);
      if (!session.isTrial && (!sub || sub.status !== 'paid')) {
        toast.success(`تم التحضير: ${studentInRoster.name} (تنبيه: لم يسدد اشتراك الشهر)`);
      } else {
        toast.success(`تم تحضير الطالب: ${studentInRoster.name}`);
      }

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
    rosterStudents.forEach(s => {
      nextMap[s.id] = status;
    });
    setRecordMap(nextMap);
  };

  const handleSave = async () => {
    // If it's a trial session, prevent saving if limit exceeded for any present student
    if (session.isTrial) {
      const overLimitStudents = rosterStudents.filter(student => {
        if (recordMap[student.id] === 'present') {
          const pastTrials = allTrialRecords?.filter(r => 
            r.studentId === student.id && 
            r.status === 'present' && 
            trialSessionIds.includes(r.sessionId) &&
            r.sessionId !== session.id // exclude current
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
    let updates = 0;
    
    for (const student of rosterStudents) {
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
          updates++;
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
        updates++;
      }
    }
    
    setIsSaved(true);
    toast.success('تم حفظ سجل الحضور بنجاح');
    setTimeout(() => {
      onClose();
    }, 800);
  };

  const presentCount = Object.values(recordMap).filter(s => s === 'present').length;
  const absentCount = Object.values(recordMap).filter(s => s === 'absent').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>تسجيل كشف الحضور: {groupName}</span>
              {session.isTrial && (
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[10px] border border-slate-200 dark:border-slate-700 font-semibold">
                  حصة تجريبية
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              المقيدين: <span className="font-bold text-slate-700 dark:text-slate-300">{rosterStudents.length}</span> |
              الحاضرين: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{presentCount}</span> | 
              الغائبين: <span className="text-red-600 dark:text-red-400 font-bold">{absentCount}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 text-xs gap-3">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">إجراء سريع:</span>
            <button 
              onClick={() => markAll('present')} 
              className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-[11px] font-semibold transition-colors"
            >
              تحضير الجميع
            </button>
            <button 
              onClick={() => markAll('absent')} 
              className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-red-600 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-[11px] font-semibold transition-colors"
            >
              تغييب الجميع
            </button>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto relative group">
            <QrCode className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              ref={qrInputRef}
              type="text"
              placeholder="انتظار قارئ الباركود..."
              className="pl-3 pr-9 py-1.5 border-2 border-blue-200 dark:border-blue-900/50 rounded-lg text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:outline-none w-full sm:w-56 text-left font-mono font-bold tracking-widest transition-all shadow-sm"
              dir="ltr"
              value={qrInput}
              onChange={e => setQrInput(e.target.value)}
              onKeyDown={handleQrScan}
              onBlur={() => {
                // Try to keep focus on scanner input if clicked outside within the modal
                setTimeout(() => {
                  if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
                    qrInputRef.current?.focus();
                  }
                }, 100);
              }}
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 rounded">
              جاهز
            </span>
          </div>
        </div>
        
        <div className="p-5 overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800">
          {rosterStudents.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-40" />
              <p>لا يوجد طلاب مقيدين نشطين في هذه المجموعة.</p>
            </div>
          ) : (
            rosterStudents.map(student => {
              
              const currentStatus = recordMap[student.id];
              
              // Subscription check
              const studentSub = currentSubscriptions?.find(s => s.studentId === student.id);
              const hasUnpaidSub = studentSub && studentSub.status !== 'paid';
              const noSubRecord = !studentSub;

              
              // 1. Check if absent previously
              const wasAbsentPreviously = prevSessionRecords?.some(r => r.studentId === student.id && r.status === 'absent');
              
              // 2. Check if exceeds free trial limit
              let pastTrialsCount = 0;
              let trialLimitExceeded = false;
              if (session.isTrial) {
                pastTrialsCount = allTrialRecords?.filter(r => 
                  r.studentId === student.id && 
                  r.status === 'present' && 
                  trialSessionIds.includes(r.sessionId) &&
                  r.sessionId !== session.id
                ).length || 0;
                
                trialLimitExceeded = pastTrialsCount >= freeSessionLimit;
              }

              return (
                <div key={student.id} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900 dark:text-slate-100 text-xs">{student.name}</p>
                      {student.studentCode && (
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          #{student.studentCode}
                        </span>
                      )}
                      {wasAbsentPreviously && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded text-[10px] font-medium" title="تغيب الطالب عن الحصة الماضية">
                          <AlertTriangle className="w-3 h-3" />
                          غائب الحصة السابقة
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-mono">{student.phone} - {student.school || '-'}</p>
                    {session.isTrial && trialLimitExceeded && (
                      <p className="text-[11px] text-red-600 dark:text-red-400 mt-1 font-medium">
                        استنفد الحد الأقصى لحصص التجربة ({freeSessionLimit})
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <button
                      type="button"
                      disabled={session.isTrial && trialLimitExceeded && currentStatus !== 'present'}
                      onClick={() => toggleStudentStatus(student.id, 'present')}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                        currentStatus === 'present'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      حاضر
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleStudentStatus(student.id, 'absent')}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                        currentStatus === 'absent'
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      غائب
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          {isSaved ? (
            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">✓ تم حفظ كشف الحضور بنجاح!</span>
          ) : (
            <span className="text-xs text-slate-500">الطلاب غير المحددين يعتبرون غائبين تلقائياً</span>
          )}
          <div className="flex gap-2">
            <button 
              onClick={onClose} 
              className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium transition-colors"
            >
              إلغاء
            </button>
            <button 
              onClick={handleSave} 
              className="px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs font-bold transition-colors shadow-xs"
            >
              حفظ كشف الحضور
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
