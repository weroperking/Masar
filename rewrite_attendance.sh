#!/bin/bash
cat << 'INNER_EOF' > src/pages/Academic/Attendance.tsx
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Play, CheckCircle, Clock, X, Users, MessageCircle, StopCircle, Calendar } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { AttendanceSession, Student } from '../../types';
import { useToast } from '../../context/ToastContext';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export function Attendance() {
  const toast = useToast();
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

  const handleStartSession = async (groupId: string, courseId: string) => {
    const now = Date.now();
    await db.attendanceSessions.add({
      id: uuidv4(),
      groupId,
      courseId,
      startedAt: now,
      endedAt: null,
      status: 'live',
      created_at: now,
      updated_at: now,
      sync_status: 'pending'
    });
    toast.success('تم بدء الحصة بنجاح!');
  };

  const handleEndSession = async (sessionId: string) => {
    if (confirm('هل أنت متأكد من إنهاء هذه الحصة؟ لا يمكن التعديل على الحضور بعد الإنهاء.')) {
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

  // Determine Arabic day of week today
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">الحضور والغياب</h1>
          <p className="text-sm text-slate-500 mt-0.5">اليوم: {todayName}، {format(new Date(), 'dd MMMM yyyy', { locale: ar })}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">بدء حصة جديدة</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {groups?.filter(g => g.status === 'in_progress').map(group => {
            const isLive = activeSessions?.some(s => s.groupId === group.id);
            return (
              <div key={group.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex flex-col justify-between hover:border-blue-400 transition-colors">
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">{group.name}</h3>
                    {isLive && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-800 font-medium">
                        نشطة الآن
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mb-3">{courseMap.get(group.courseId)}</p>
                  <p className="text-xs text-slate-600 mb-4">{group.startTime} - {group.endTime}</p>
                </div>
                <div>
                  {isLive ? (
                    <button 
                      onClick={() => {
                        const session = activeSessions?.find(s => s.groupId === group.id);
                        if (session) setMarkingSession(session);
                      }}
                      className="w-full flex items-center justify-center py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors text-sm font-medium"
                    >
                      <CheckCircle className="w-4 h-4 ml-1.5" />
                      إدارة الحضور
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleStartSession(group.id, group.courseId)}
                        className="flex-1 flex items-center justify-center py-2 bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200 transition-colors text-sm font-medium"
                      >
                        <Play className="w-3.5 h-3.5 ml-1.5" />
                        بدء حصة
                      </button>
                      <button 
                        onClick={() => handleStartSession(group.id, group.courseId)}
                        className="flex-1 flex items-center justify-center py-2 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors text-sm font-medium"
                      >
                        <Play className="w-3.5 h-3.5 ml-1.5" />
                        ترايل
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {groups?.filter(g => g.status === 'in_progress').length === 0 && (
            <div className="col-span-full text-center text-slate-500 py-6">لا توجد مجموعات قيد التنفيذ حالياً</div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
          {[
            { id: 'live', label: `الحصص النشطة (${activeSessions?.length || 0})` },
            { id: 'upcoming', label: `مجدول اليوم (${todayScheduledGroups.length})` },
            { id: 'history', label: `السجل المنتهي (${completedSessions?.length || 0})` },
            { id: 'absent', label: `سجل الغائبين (${absentRecords.length})` },
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as any)} 
              className={`shrink-0 px-6 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id 
                  ? 'border-blue-600 text-blue-600 font-bold' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'live' && (
            <div>
              {activeSessions?.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Play className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>لا توجد حصص نشطة في الوقت الحالي.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {activeSessions?.map(session => (
                    <div key={session.id} className="border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-1">{groupMap.get(session.groupId)?.name}</h3>
                          <p className="text-sm text-slate-600">{courseMap.get(session.courseId)}</p>
                        </div>
                        <span className="flex items-center px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold animate-pulse">
                          <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full ml-1.5"></span>
                          جاري الآن
                        </span>
                      </div>
                      
                      <div className="text-sm text-slate-500 mb-6 flex gap-4">
                        <span className="flex items-center"><Clock className="w-4 h-4 ml-1" /> بدأ: {format(new Date(session.startedAt), 'hh:mm a')}</span>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={() => setMarkingSession(session)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-semibold transition-colors"
                        >
                          تسجيل الحضور والغياب
                        </button>
                        <button 
                          onClick={() => handleEndSession(session.id)}
                          className="px-4 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 rounded-lg text-sm font-semibold transition-colors"
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
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="px-4 py-3 font-medium rounded-r-lg">المجموعة</th>
                        <th className="px-4 py-3 font-medium">التاريخ</th>
                        <th className="px-4 py-3 font-medium">وقت البدء</th>
                        <th className="px-4 py-3 font-medium rounded-l-lg">وقت الانتهاء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {completedSessions?.sort((a,b) => b.startedAt - a.startedAt).map(session => (
                        <tr key={session.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="px-4 py-3 font-bold">{groupMap.get(session.groupId)?.name}</td>
                          <td className="px-4 py-3 text-slate-500">{format(new Date(session.startedAt), 'dd MMM yyyy', { locale: ar })}</td>
                          <td className="px-4 py-3 text-slate-500" dir="ltr">{format(new Date(session.startedAt), 'hh:mm a')}</td>
                          <td className="px-4 py-3 text-slate-500" dir="ltr">{session.endedAt ? format(new Date(session.endedAt), 'hh:mm a') : '-'}</td>
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
                <div className="text-center py-12 text-slate-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-20 text-emerald-500" />
                  <p>لا يوجد غياب مسجل!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-right">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="px-4 py-3 font-medium rounded-r-lg">الطالب</th>
                        <th className="px-4 py-3 font-medium">المجموعة</th>
                        <th className="px-4 py-3 font-medium">ولي الأمر</th>
                        <th className="px-4 py-3 font-medium">التاريخ</th>
                        <th className="px-4 py-3 font-medium rounded-l-lg">تواصل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {absentRecords.map(record => {
                        const student = students?.find(s => s.id === record.studentId);
                        if (!student) return null;
                        
                        const msg = `مرحباً ولي أمر الطالب ${student.name}، نود إعلامكم بغياب الطالب عن حصة مجموعة ${groupMap.get(record.groupId)?.name || ''} اليوم.`;
                        const waLink = `https://wa.me/2${student.parentPhone || student.phone}?text=${encodeURIComponent(msg)}`;
                        
                        return (
                          <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-4 py-3 font-bold">{student.name}</td>
                            <td className="px-4 py-3">{groupMap.get(record.groupId)?.name}</td>
                            <td className="px-4 py-3 text-slate-600">{student.parentName || '-'} <span dir="ltr">({student.parentPhone})</span></td>
                            <td className="px-4 py-3 text-slate-500">{format(new Date(record.markedAt), 'dd MMM yyyy', { locale: ar })}</td>
                            <td className="px-4 py-3">
                              <a 
                                href={waLink} 
                                target="_blank" 
                                rel="noreferrer"
                                className="inline-flex items-center px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-xs font-medium transition-colors"
                              >
                                <MessageCircle className="w-3.5 h-3.5 ml-1" />
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
  
  // 1. Fetch real roster for this group via enrollments
  const groupEnrollments = useLiveQuery(
    () => db.enrollments.where('groupId').equals(session.groupId).toArray(),
    [session.groupId]
  );
  
  // Filter for active students
  const activeStudentIds = groupEnrollments?.filter(e => e.status === 'active').map(e => e.studentId) || [];
  
  // Load actual student records
  const allStudents = useLiveQuery(() => db.students.filter(s => !s.deleted_at).toArray(), []);
  const rosterStudents = allStudents?.filter(s => activeStudentIds.includes(s.id)) || [];

  // Load existing attendance records for this session
  const existingRecords = useLiveQuery(
    () => db.attendanceRecords.where('sessionId').equals(session.id).toArray(),
    [session.id]
  );
  
  const [recordMap, setRecordMap] = useState<Record<string, 'present' | 'absent'>>({});
  const [isSaved, setIsSaved] = useState(false);

  // Sync loaded records to local state
  useState(() => {
    if (existingRecords) {
      const map: Record<string, 'present' | 'absent'> = {};
      existingRecords.forEach(r => {
        map[r.studentId] = r.status;
      });
      setRecordMap(map);
    }
  });

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
    const now = Date.now();
    let updates = 0;
    
    for (const student of rosterStudents) {
      // By default if unselected, they are absent
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
          groupId: session.groupId, // Note: GroupId added for simpler absent queries
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">تسجيل كشف الحضور: {groupName}</h2>
            <p className="text-xs text-slate-500 mt-1">
              إجمالي المقيدين: <span className="font-bold">{rosterStudents.length}</span> |
              الحاضرين: <span className="text-emerald-600 font-bold">{presentCount}</span> | 
              الغائبين: <span className="text-red-600 font-bold">{absentCount}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-slate-600 dark:text-slate-300 font-medium">إجراء سريع:</span>
          <div className="flex gap-2">
            <button onClick={() => markAll('present')} className="px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-md hover:bg-emerald-200 font-semibold transition-colors">تحضير الجميع</button>
            <button onClick={() => markAll('absent')} className="px-3 py-1.5 bg-red-100 text-red-800 rounded-md hover:bg-red-200 font-semibold transition-colors">تغييب الجميع</button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800">
          {rosterStudents.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p>لا يوجد طلاب مقيدين نشطين في هذه المجموعة.</p>
            </div>
          ) : (
            rosterStudents.map(student => {
              const currentStatus = recordMap[student.id];
              return (
                <div key={student.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{student.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{student.phone} - {student.school || '-'}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleStudentStatus(student.id, 'present')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                        currentStatus === 'present'
                          ? 'bg-emerald-600 text-white shadow-md scale-105'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      حاضر
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleStudentStatus(student.id, 'absent')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                        currentStatus === 'absent'
                          ? 'bg-red-600 text-white shadow-md scale-105'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
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
        
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          {isSaved ? (
            <span className="text-emerald-600 font-bold text-sm">✓ تم حفظ كشف الحضور بنجاح!</span>
          ) : (
            <span className="text-xs text-slate-500">الطلاب غير المحددين يعتبرون غائبين تلقائياً</span>
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium transition-colors">إلغاء</button>
            <button onClick={handleSave} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold shadow-sm transition-colors">حفظ كشف الحضور</button>
          </div>
        </div>
      </div>
    </div>
  );
}
INNER_EOF
