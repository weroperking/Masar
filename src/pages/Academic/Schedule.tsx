import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Calendar as CalendarIcon, Users, Clock, Play, CheckCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export function Schedule() {
  const [view, setView] = useState<'week' | 'day'>('week');
  const [selectedDay, setSelectedDay] = useState<string>('السبت');

  const groups = useLiveQuery(() => db.groups.toArray(), []);
  const courses = useLiveQuery(() => db.courses.toArray(), []);
  const students = useLiveQuery(() => db.students.toArray(), []);
  const activeSessions = useLiveQuery(() => db.attendanceSessions.where('status').equals('live').toArray(), []);

  const courseMap = new Map(courses?.map(c => [c.id, c.name]));

  const arabicDays = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
  
  // Real-time calculation of today's stats
  const dayIndices: Record<number, string> = {
    0: 'الأحد',
    1: 'الإثنين',
    2: 'الثلاثاء',
    3: 'الأربعاء',
    4: 'الخميس',
    5: 'الجمعة',
    6: 'السبت'
  };
  const todayArabic = dayIndices[new Date().getDay()];
  const groupsToday = groups?.filter(g => g.daysOfWeek?.includes(todayArabic)) || [];

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">الجدول الزمني</h1>
          <p className="text-sm text-slate-500 mt-0.5">مواعيد المجموعات الدراسية وتوزيع الحصص على مدار الأسبوع</p>
        </div>
        <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1 shadow-sm">
          <button 
            onClick={() => setView('week')}
            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${
              view === 'week' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            جدول أسبوعي
          </button>
          <button 
            onClick={() => setView('day')}
            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${
              view === 'day' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            جدول يومي
          </button>
        </div>
      </div>

      {/* Real live statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 flex items-center gap-4">
          <div className="flex items-start justify-center"><Users className="w-8 h-8 text-blue-500 opacity-80" /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">الطلاب المسجلين في سنتر مسار</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{students?.length || 0}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 flex items-center gap-4">
          <div className="flex items-start justify-center"><Clock className="w-8 h-8 text-emerald-500 opacity-80" /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">حصص نشطة الآن</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{activeSessions?.length || 0}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 flex items-center gap-4">
          <div className="flex items-start justify-center"><CalendarIcon className="w-8 h-8 text-blue-500 opacity-80" /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">إجمالي حصص اليوم ({todayArabic})</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{groupsToday.length}</p>
          </div>
        </div>
      </div>

      {/* Weekly View */}
      {view === 'week' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-6">الجدول الأسبوعي للمجموعات</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
            {arabicDays.map(day => {
              const dayGroups = groups?.filter(g => g.daysOfWeek?.includes(day)) || [];
              const isToday = day === todayArabic;

              return (
                <div 
                  key={day} 
                  className={`rounded-xl p-3 border flex flex-col min-h-[300px] ${
                    isToday ? 'border-blue-300 bg-blue-50/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50/30'
                  }`}
                >
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700 mb-3">
                    <span className={`font-bold text-sm ${isToday ? 'text-blue-600' : 'text-slate-800'}`}>
                      {day}
                    </span>
                    {isToday && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-600 text-white rounded font-bold">اليوم</span>
                    )}
                  </div>

                  <div className="space-y-3 flex-1">
                    {dayGroups.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400">لا توجد حصص</div>
                    ) : (
                      dayGroups.map(group => {
                        const isLive = activeSessions?.some(s => s.groupId === group.id);
                        return (
                          <div 
                            key={group.id} 
                            className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs hover:border-blue-400 transition-colors flex flex-col justify-between text-xs space-y-2"
                          >
                            <div>
                              <div className="flex justify-between items-start">
                                <span className="font-bold text-slate-900 dark:text-slate-100 text-xs leading-snug">{group.name}</span>
                                {isLive && (
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                                )}
                              </div>
                              <p className="text-blue-600 mt-0.5">{courseMap.get(group.courseId)}</p>
                              <p className="text-slate-500 mt-1 font-mono" dir="ltr">{group.startTime} - {group.endTime}</p>
                            </div>

                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                              <span className="text-[10px] text-slate-500">{group.type === 'in_person' ? 'حضوري' : 'أونلاين'}</span>
                              {!isLive && (
                                <button
                                  onClick={() => handleStartSession(group.id, group.courseId)}
                                  className="text-emerald-600 hover:text-emerald-700 font-bold flex items-center text-[11px]"
                                >
                                  <Play className="w-3 h-3 ml-0.5" />
                                  بدء
                                </button>
                              )}
                              {isLive && (
                                <span className="text-emerald-700 font-bold flex items-center text-[10px]">
                                  <CheckCircle className="w-3 h-3 ml-0.5" />
                                  نشطة
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Daily View */}
      {view === 'day' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 space-y-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100 dark:border-slate-800">
            {arabicDays.map(day => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors shrink-0 ${
                  selectedDay === day 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {day} {day === todayArabic && '(اليوم)'}
              </button>
            ))}
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-4">جدول يوم {selectedDay}</h3>
            {groups?.filter(g => g.daysOfWeek?.includes(selectedDay)).length === 0 ? (
              <div className="py-16 text-center text-slate-400">لا توجد مجموعات مجدولة في يوم {selectedDay}</div>
            ) : (
              <div className="space-y-3">
                {groups?.filter(g => g.daysOfWeek?.includes(selectedDay)).map(group => {
                  const isLive = activeSessions?.some(s => s.groupId === group.id);
                  return (
                    <div key={group.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-900 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="text-blue-600 dark:text-blue-400 font-mono font-bold text-base mt-0.5">
                          {group.startTime}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">{group.name}</h4>
                          <p className="text-xs text-blue-600 font-medium">{courseMap.get(group.courseId)}</p>
                          <p className="text-xs text-slate-500 mt-1">المدة: حتى {group.endTime} • السعة: {group.maxStudents || 'مفتوح'} طالب</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 rounded text-xs font-semibold ${
                          group.type === 'in_person' ? 'bg-slate-100 dark:bg-slate-800 text-slate-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {group.type === 'in_person' ? 'حضوري' : 'أونلاين'}
                        </span>
                        {!isLive ? (
                          <button
                            onClick={() => handleStartSession(group.id, group.courseId)}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-xs font-semibold flex items-center transition-colors shadow-xs"
                          >
                            <Play className="w-3.5 h-3.5 ml-1" />
                            بدء الحصة
                          </button>
                        ) : (
                          <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold flex items-center">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 ml-1.5"></span>
                            نشطة حالياً
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
