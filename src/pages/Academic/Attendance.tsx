import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Play, CheckCircle, Clock } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export function Attendance() {
  const [activeTab, setActiveTab] = useState<'live' | 'upcoming' | 'history' | 'absent'>('live');
  
  const groups = useLiveQuery(() => db.groups.where('status').equals('in_progress').toArray(), []);
  const courses = useLiveQuery(() => db.courses.toArray(), []);
  const activeSessions = useLiveQuery(() => db.attendanceSessions.where('status').equals('live').toArray(), []);

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
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">الحضور والغياب</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">بدء حصة جديدة</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {groups?.map(group => (
            <div key={group.id} className="border border-slate-200 rounded-lg p-4 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-slate-800">{group.name}</h3>
                <p className="text-xs text-slate-500 mb-3">{courses?.find(c => c.id === group.courseId)?.name}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleStartSession(group.id, group.courseId)}
                  className="flex-1 flex items-center justify-center py-2 bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200 transition-colors text-sm font-medium"
                >
                  <Play className="w-3 h-3 ml-1" />
                  بدء حصة
                </button>
              </div>
            </div>
          ))}
          {groups?.length === 0 && (
            <div className="col-span-full text-center text-slate-500 py-4">لا توجد مجموعات قيد التنفيذ حالياً</div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {[
            { id: 'live', label: 'الحصص النشطة' },
            { id: 'upcoming', label: 'مجدول اليوم' },
            { id: 'history', label: 'السجل' },
            { id: 'absent', label: 'غائبون اليوم' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`shrink-0 px-6 py-3 text-sm font-medium border-b-2 ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'live' && (
            <div className="space-y-4">
              {activeSessions?.length === 0 ? (
                <div className="py-12 text-center text-slate-500">لا توجد حصص نشطة حالياً</div>
              ) : (
                activeSessions?.map(session => {
                  const group = groups?.find(g => g.id === session.groupId);
                  const course = courses?.find(c => c.id === session.courseId);
                  return (
                    <div key={session.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-emerald-200 bg-emerald-50 rounded-xl gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                          </span>
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">{group?.name || 'مجموعة غير معروفة'}</h3>
                          <p className="text-sm text-slate-600">{course?.name}</p>
                          <div className="flex items-center text-xs text-slate-500 mt-1">
                            <Clock className="w-3 h-3 ml-1" />
                            بدأت منذ: {Math.round((Date.now() - session.startedAt) / 60000)} دقيقة
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium flex items-center">
                          <CheckCircle className="w-4 h-4 ml-2 text-indigo-600" />
                          تسجيل الحضور
                        </button>
                        <button 
                          onClick={() => handleEndSession(session.id)}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
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

          {activeTab !== 'live' && (
            <div className="py-12 text-center text-slate-500">جاري تطوير هذا القسم...</div>
          )}
        </div>
      </div>
    </div>
  );
}
