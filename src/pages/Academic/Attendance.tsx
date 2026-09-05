import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Play, CheckCircle, Clock, X, Users, AlertCircle, MessageCircle, Calendar } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { AttendanceSession, Student, AttendanceRecord } from '../../types';

export function Attendance() {
  const [activeTab, setActiveTab] = useState<'live' | 'upcoming' | 'history' | 'absent'>('live');
  const [markingSession, setMarkingSession] = useState<AttendanceSession | null>(null);

  const groups = useLiveQuery(() => db.groups.toArray(), []);
  const courses = useLiveQuery(() => db.courses.toArray(), []);
  const activeSessions = useLiveQuery(() => db.attendanceSessions.where('status').equals('live').toArray(), []);
  const completedSessions = useLiveQuery(() => db.attendanceSessions.where('status').equals('completed').reverse().sortBy('startedAt'), []);
  const allRecords = useLiveQuery(() => db.attendanceRecords.toArray(), []);
  const students = useLiveQuery(() => db.students.toArray(), []);

  const courseMap = new Map(courses?.map(c => [c.id, c.name]));
  const groupMap = new Map(groups?.map(g => [g.id, g]));
  const studentMap = new Map(students?.map(s => [s.id, s]));

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
  };

  const handleEndSession = async (sessionId: string) => {
    await db.attendanceSessions.update(sessionId, {
      endedAt: Date.now(),
      status: 'completed',
      updated_at: Date.now(),
      sync_status: 'pending'
    });
    if (markingSession?.id === sessionId) {
      setMarkingSession(null);
    }
  };

  // Determine Arabic day of week today
  const arabicDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const todayName = arabicDays[new Date().getDay()];

  const todayScheduledGroups = groups?.filter(g => 
    g.status === 'in_progress' && (g.daysOfWeek?.includes(todayName) || g.daysOfWeek?.length === 0)
  ) || [];

  // Absent students
  const absentRecords = allRecords?.filter(r => r.status === 'absent') || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">الحضور والغياب</h1>
          <p className="text-sm text-slate-500 mt-0.5">اليوم: {todayName}، {new Date().toLocaleDateString('ar-EG')}</p>
        </div>
      </div>

      {/* Start new session quick cards */}
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
                    <button 
                      onClick={() => handleStartSession(group.id, group.courseId)}
                      className="w-full flex items-center justify-center py-2 bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200 transition-colors text-sm font-medium"
                    >
                      <Play className="w-3.5 h-3.5 ml-1.5" />
                      بدء حصة
                    </button>
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

      {/* Tabs */}
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
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Live Sessions Tab */}
          {activeTab === 'live' && (
            <div className="space-y-4">
              {activeSessions?.length === 0 ? (
                <div className="py-12 text-center text-slate-500">لا توجد حصص نشطة حالياً. يمكنك بدء حصة من القائمة أعلاه.</div>
              ) : (
                activeSessions?.map(session => {
                  const group = groupMap.get(session.groupId);
                  const courseName = courseMap.get(session.courseId);
                  const sessionRecords = allRecords?.filter(r => r.sessionId === session.id) || [];
                  const presentCount = sessionRecords.filter(r => r.status === 'present').length;
                  const absentCount = sessionRecords.filter(r => r.status === 'absent').length;

                  return (
                    <div key={session.id} className="flex flex-col md:flex-row md:items-center justify-between p-5 border border-emerald-200 bg-emerald-50/50 rounded-xl gap-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center shrink-0 w-8 h-8">
                          <span className="relative flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                          </span>
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">{group?.name || 'مجموعة غير معروفة'}</h3>
                          <p className="text-sm text-slate-600">{courseName}</p>
                          <div className="flex items-center gap-4 text-xs text-slate-500 mt-1.5">
                            <span className="flex items-center">
                              <Clock className="w-3.5 h-3.5 ml-1 text-slate-400" />
                              بدأت منذ: {Math.max(1, Math.round((Date.now() - session.startedAt) / 60000))} دقيقة
                            </span>
                            <span className="flex items-center text-emerald-700 font-medium">
                              <Users className="w-3.5 h-3.5 ml-1" />
                              حاضر: {presentCount} | غائب: {absentCount}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setMarkingSession(session)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center shadow-sm transition-colors"
                        >
                          <CheckCircle className="w-4 h-4 ml-1.5" />
                          تسجيل الحضور
                        </button>
                        <button 
                          onClick={() => handleEndSession(session.id)}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium transition-colors"
                        >
                          إنهاء الحصة
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Upcoming Tab */}
          {activeTab === 'upcoming' && (
            <div className="space-y-4">
              {todayScheduledGroups.length === 0 ? (
                <div className="py-12 text-center text-slate-500">لا توجد مجموعات مجدولة لهذا اليوم ({todayName})</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {todayScheduledGroups.map(group => (
                    <div key={group.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 flex flex-col justify-between">
                      <div>
                        <span className="inline-flex px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800 font-medium mb-2">
                          {group.startTime} - {group.endTime}
                        </span>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100">{group.name}</h4>
                        <p className="text-xs text-slate-500 mt-1">{courseMap.get(group.courseId)}</p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                        <button
                          onClick={() => handleStartSession(group.id, group.courseId)}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-xs font-semibold flex items-center transition-colors"
                        >
                          <Play className="w-3.5 h-3.5 ml-1.5" />
                          بدء الحصة الآن
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="overflow-x-auto">
              {completedSessions?.length === 0 ? (
                <div className="py-12 text-center text-slate-500">لا توجد حصص منتهية مسجلة بعد</div>
              ) : (
                <table className="w-full text-sm text-right">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium rounded-r-lg">المجموعة</th>
                      <th className="px-4 py-3 font-medium">الكورس</th>
                      <th className="px-4 py-3 font-medium">التاريخ والوقت</th>
                      <th className="px-4 py-3 font-medium">المدة</th>
                      <th className="px-4 py-3 font-medium">عدد الحضور</th>
                      <th className="px-4 py-3 font-medium rounded-l-lg">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {completedSessions?.map(session => {
                      const group = groupMap.get(session.groupId);
                      const courseName = courseMap.get(session.courseId);
                      const records = allRecords?.filter(r => r.sessionId === session.id) || [];
                      const present = records.filter(r => r.status === 'present').length;
                      const durationMinutes = session.endedAt 
                        ? Math.max(1, Math.round((session.endedAt - session.startedAt) / 60000))
                        : '-';

                      return (
                        <tr key={session.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-900">
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">{group?.name || 'غير معروف'}</td>
                          <td className="px-4 py-3 text-slate-600">{courseName}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {new Date(session.startedAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{durationMinutes} دقيقة</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800">
                              {present} طالب حاضر
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setMarkingSession(session)}
                              className="text-blue-600 hover:text-blue-800 font-medium text-xs"
                            >
                              عرض كشف الحضور
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Absent Students Tab */}
          {activeTab === 'absent' && (
            <div className="space-y-4">
              {absentRecords.length === 0 ? (
                <div className="py-12 text-center text-slate-500">لا يوجد طلاب مسجلين كغائبين</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-right">
                    <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600">
                      <tr>
                        <th className="px-4 py-3 font-medium rounded-r-lg">اسم الطالب</th>
                        <th className="px-4 py-3 font-medium">ولي الأمر</th>
                        <th className="px-4 py-3 font-medium">هاتف ولي الأمر</th>
                        <th className="px-4 py-3 font-medium">تاريخ الغياب</th>
                        <th className="px-4 py-3 font-medium rounded-l-lg">تواصل سريع</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {absentRecords.map(record => {
                        const student = studentMap.get(record.studentId);
                        if (!student) return null;
                        const cleanPhone = student.parentPhone?.replace(/[^0-9]/g, '');
                        const waLink = `https://wa.me/2${cleanPhone}?text=${encodeURIComponent(`السلام عليكم أ/ ${student.parentName}، نود إحاطة سيادتكم بغياب الطالب ${student.name} عن الحصة اليوم في سنتر مسار.`)}`;

                        return (
                          <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-900">
                            <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">{student.name}</td>
                            <td className="px-4 py-3 text-slate-600">{student.parentName || '-'}</td>
                            <td className="px-4 py-3 text-slate-600" dir="ltr">{student.parentPhone}</td>
                            <td className="px-4 py-3 text-slate-500 text-xs">
                              {new Date(record.markedAt).toLocaleDateString('ar-EG')}
                            </td>
                            <td className="px-4 py-3">
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-xs font-medium transition-colors"
                              >
                                <MessageCircle className="w-3.5 h-3.5 ml-1" />
                                إشعار واتساب
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

      {/* Interactive Attendance Marking Modal */}
      {markingSession && (
        <AttendanceModal 
          session={markingSession}
          onClose={() => setMarkingSession(null)}
          students={students || []}
          groupName={groupMap.get(markingSession.groupId)?.name || ''}
        />
      )}
    </div>
  );
}

function AttendanceModal({ 
  session, 
  onClose, 
  students, 
  groupName 
}: { 
  session: AttendanceSession; 
  onClose: () => void; 
  students: Student[]; 
  groupName: string; 
}) {
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
    students.forEach(s => {
      nextMap[s.id] = status;
    });
    setRecordMap(nextMap);
  };

  const handleSave = async () => {
    const now = Date.now();
    for (const student of students) {
      const status = recordMap[student.id] || 'absent';
      const existing = existingRecords?.find(r => r.studentId === student.id);
      if (existing) {
        await db.attendanceRecords.update(existing.id, {
          status,
          markedAt: now,
          updated_at: now
        });
      } else {
        await db.attendanceRecords.add({
          id: uuidv4(),
          sessionId: session.id,
          studentId: student.id,
          status,
          markedAt: now,
          created_at: now,
          updated_at: now,
          sync_status: 'pending'
        });
      }
    }
    setIsSaved(true);
    setTimeout(() => {
      onClose();
    }, 800);
  };

  const presentCount = Object.values(recordMap).filter(s => s === 'present').length;
  const absentCount = Object.values(recordMap).filter(s => s === 'absent').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">تسجيل كشف الحضور: {groupName}</h2>
            <p className="text-xs text-slate-500 mt-1">
              إجمالي الحاضرين: <span className="text-emerald-600 font-bold">{presentCount}</span> | 
              الغائبين: <span className="text-red-600 font-bold">{absentCount}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-slate-600">إجراء سريع:</span>
          <div className="flex gap-2">
            <button
              onClick={() => markAll('present')}
              className="px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-md hover:bg-emerald-200 font-medium"
            >
              تحضير الجميع
            </button>
            <button
              onClick={() => markAll('absent')}
              className="px-3 py-1.5 bg-red-100 text-red-800 rounded-md hover:bg-red-200 font-medium"
            >
              تغييب الجميع
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 divide-y divide-slate-100">
          {students.map(student => {
            const currentStatus = recordMap[student.id];
            return (
              <div key={student.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{student.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{student.phone} - {student.school || 'مدرسة غير محددة'}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => toggleStudentStatus(student.id, 'present')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      currentStatus === 'present'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    حاضر
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleStudentStatus(student.id, 'absent')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      currentStatus === 'absent'
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    غائب
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
          {isSaved ? (
            <span className="text-emerald-600 font-bold text-sm">✓ تم حفظ كشف الحضور بنجاح!</span>
          ) : (
            <span className="text-xs text-slate-500">اضغط حفظ لتأكيد السجلات</span>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 text-sm"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold shadow-sm"
            >
              حفظ كشف الحضور
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
