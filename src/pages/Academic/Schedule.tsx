import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Calendar as CalendarIcon, Users, Clock, Play, CheckCircle, Filter } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';

export function Schedule() {
  const navigate = useNavigate();
  const toast = useToast();
  const [view, setView] = useState<'week' | 'day'>('week');
  const [selectedDay, setSelectedDay] = useState<string>('السبت');
  
  // Filters
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [roomFilter, setRoomFilter] = useState<string>('all');
  
  const groups = useLiveQuery(() => db.groups.toArray(), []);
  const courses = useLiveQuery(() => db.courses.toArray(), []);
  const enrollments = useLiveQuery(() => db.enrollments.filter(e => e.status === 'active').toArray(), []);
  const activeSessions = useLiveQuery(() => db.attendanceSessions.where('status').equals('live').toArray(), []);
  
  const courseMap = new Map(courses?.map(c => [c.id, c.name]));
  const arabicDays = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
  const uniqueRooms = Array.from(new Set(groups?.map(g => g.room).filter(Boolean))) as string[];
  
  const dayIndices: Record<number, string> = {
    0: 'الأحد', 1: 'الإثنين', 2: 'الثلاثاء', 3: 'الأربعاء', 4: 'الخميس', 5: 'الجمعة', 6: 'السبت'
  };
  const todayArabic = dayIndices[new Date().getDay()];

  // Filtering groups
  const filteredGroups = useMemo(() => {
    let filtered = groups || [];
    if (courseFilter !== 'all') {
      filtered = filtered.filter(g => g.courseId === courseFilter);
    }
    if (roomFilter !== 'all') {
      filtered = filtered.filter(g => g.room === roomFilter);
    }
    return filtered;
  }, [groups, courseFilter, roomFilter]);

  // KPIs
  const groupsToday = filteredGroups.filter(g => g.daysOfWeek?.includes(todayArabic));
  
  const totalStudentsToday = useMemo(() => {
    if (!enrollments) return 0;
    const groupIdsToday = new Set(groupsToday.map(g => g.id));
    return enrollments.filter(e => groupIdsToday.has(e.groupId)).length;
  }, [enrollments, groupsToday]);

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
    toast.success(isTrial ? 'تم بدء الحصة التجريبية. انتقل لصفحة الحضور لإدارتها.' : 'تم بدء الحصة. انتقل لصفحة الحضور لإدارتها.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">جدول الحصص والمواعيد</h1>
          <p className="text-sm text-slate-500 mt-1">عرض وتنظيم مواعيد المجموعات والحصص</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setView('week')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              view === 'week' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            أسبوعي
          </button>
          <button 
            onClick={() => setView('day')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              view === 'day' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            يومي
          </button>
        </div>
      </div>

      {/* Filters & Live KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-5 h-5 text-slate-400" />
            <h3 className="font-semibold text-slate-700 dark:text-slate-300">فلتر الكورسات</h3>
          </div>
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">جميع الكورسات</option>
            {courses?.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-5 h-5 text-slate-400" />
            <h3 className="font-semibold text-slate-700 dark:text-slate-300">فلتر القاعات</h3>
          </div>
          <select
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">جميع القاعات</option>
            {uniqueRooms.map(room => (
              <option key={room} value={room}>{room}</option>
            ))}
          </select>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">حصص اليوم</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{groupsToday.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            {activeSessions && activeSessions.length > 0 && (
              <span className="flex items-center px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold animate-pulse">
                <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full ml-1.5"></span>
                لايف
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">حصص نشطة حالياً</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{activeSessions?.length || 0}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">متوقع حضورهم اليوم</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{totalStudentsToday}</p>
          </div>
        </div>
      </div>

      {/* Weekly View */}
      {view === 'week' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-6">الجدول الأسبوعي</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
            {arabicDays.map(day => {
              const dayGroups = filteredGroups.filter(g => g.daysOfWeek?.includes(day)) || [];
              const isToday = day === todayArabic;
              return (
                <div 
                  key={day} 
                  className={`rounded-xl p-3 border flex flex-col min-h-[300px] ${
                    isToday ? 'border-blue-300 bg-blue-50/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50/30'
                  }`}
                >
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700 mb-3">
                    <span className={`font-bold text-sm ${isToday ? 'text-blue-600' : 'text-slate-800 dark:text-slate-200'}`}>
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
                            className={`p-3 rounded-lg border shadow-xs transition-colors flex flex-col justify-between text-xs space-y-2 ${
                              isLive ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                            }`}
                          >
                            <div>
                              <div className="flex justify-between items-start">
                                <span className="font-bold text-slate-900 dark:text-slate-100 text-xs leading-snug cursor-pointer hover:text-blue-600" onClick={() => navigate(`/groups/${group.id}`)}>
                                  {group.name}
                                </span>
                                {isLive && (
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" title="حصة نشطة"></span>
                                )}
                              </div>
                              <p className="text-blue-600 mt-0.5 truncate">{courseMap.get(group.courseId)}</p>
                              <p className="text-slate-500 mt-1 font-mono" dir="ltr">
                                {group.startTime} - {group.endTime}
                              </p>
                              {group.room && <p className="text-slate-500 text-[10px] mt-1 bg-slate-100 dark:bg-slate-800 inline-block px-1.5 py-0.5 rounded">قاعة: {group.room}</p>}
                            </div>
                            
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                              <span className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                {group.type === 'in_person' ? 'حضوري' : 'أونلاين'}
                              </span>
                              
                              {!isLive ? (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleStartSession(group.id, group.courseId)}
                                    className="text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-1 rounded font-bold flex items-center text-[10px] transition-colors"
                                    title="بدء حصة عادية"
                                  >
                                    <Play className="w-2.5 h-2.5 ml-0.5" />
                                    بدء
                                  </button>
                                  <button
                                    onClick={() => handleStartSession(group.id, group.courseId, true)}
                                    className="text-purple-600 hover:text-purple-700 bg-purple-50 dark:bg-purple-900/30 px-1.5 py-1 rounded font-bold flex items-center text-[10px] transition-colors"
                                    title="بدء حصة تجريبية"
                                  >
                                    <Play className="w-2.5 h-2.5 ml-0.5" />
                                    ترايل
                                  </button>
                                </div>
                              ) : (
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
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {day} {day === todayArabic && '(اليوم)'}
              </button>
            ))}
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-4">جدول يوم {selectedDay}</h3>
            {filteredGroups.filter(g => g.daysOfWeek?.includes(selectedDay)).length === 0 ? (
              <div className="py-16 text-center text-slate-400">لا توجد مجموعات مجدولة في يوم {selectedDay}</div>
            ) : (
              <div className="space-y-3">
                {filteredGroups.filter(g => g.daysOfWeek?.includes(selectedDay)).map(group => {
                  const isLive = activeSessions?.some(s => s.groupId === group.id);
                  return (
                    <div key={group.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="text-blue-600 dark:text-blue-400 font-mono font-bold text-base mt-0.5" dir="ltr">
                          {group.startTime}
                        </div>
                        <div>
                          <h4 
                            className="font-bold text-slate-900 dark:text-slate-100 text-base cursor-pointer hover:text-blue-600 transition-colors"
                            onClick={() => navigate(`/groups/${group.id}`)}
                          >
                            {group.name}
                          </h4>
                          <p className="text-sm text-blue-600 font-medium">{courseMap.get(group.courseId)}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            ينتهي في {group.endTime} • السعة: {group.maxStudents || 'مفتوح'} طالب {group.room && `• قاعة: ${group.room}`}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 self-end md:self-auto">
                        <span className={`px-2.5 py-1 rounded text-xs font-semibold ${
                          group.type === 'in_person' ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {group.type === 'in_person' ? 'حضوري' : 'أونلاين'}
                        </span>
                        
                        {!isLive ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleStartSession(group.id, group.courseId)}
                              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-xs font-semibold flex items-center transition-colors shadow-xs"
                            >
                              <Play className="w-3.5 h-3.5 ml-1" />
                              بدء الحصة
                            </button>
                            <button
                              onClick={() => handleStartSession(group.id, group.courseId, true)}
                              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-xs font-semibold flex items-center transition-colors shadow-xs"
                              title="بدء حصة تجريبية"
                            >
                              <Play className="w-3.5 h-3.5 ml-1" />
                              بدء ترايل
                            </button>
                          </div>
                        ) : (
                          <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold flex items-center">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 ml-1.5 animate-pulse"></span>
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
