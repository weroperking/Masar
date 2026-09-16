import { db } from '../db/db';
import { v4 as uuidv4 } from 'uuid';
import { AttendanceSession } from '../types';

export const autoScheduleService = {
  isRunning: false,

  async checkAndRunSchedules(): Promise<{ started: number, ended: number }> {
    if (this.isRunning) return { started: 0, ended: 0 };
    this.isRunning = true;
    
    let started = 0;
    try {
      const now = new Date();
      const arabicDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const todayName = arabicDays[now.getDay()];
      
      const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      const activeGroups = await db.groups.filter(g => g.status === 'in_progress' && !g.deleted_at).toArray();
      
      // Get all sessions from today to avoid duplicates
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const endOfDay = startOfDay + 24 * 60 * 60 * 1000;
      
      const todaySessions = await db.attendanceSessions
        .filter(s => s.startedAt >= startOfDay && s.startedAt < endOfDay && !s.deleted_at)
        .toArray();
      
      const sessionsByGroup = new Set(todaySessions.map(s => s.groupId));
      
      for (const group of activeGroups) {
        // If group is scheduled for today
        if (group.daysOfWeek && group.daysOfWeek.includes(todayName)) {
          // If past start time and no session created today
          if (group.startTime && group.startTime <= currentTimeStr && !sessionsByGroup.has(group.id)) {
            
            const newSession: AttendanceSession = {
              id: uuidv4(),
              groupId: group.id,
              courseId: group.courseId,
              startedAt: Date.now(),
              endedAt: null,
              status: 'live',
              created_at: Date.now(),
              updated_at: Date.now(),
              sync_status: 'pending'
            };
            
            await db.attendanceSessions.add(newSession);
            started++;
          }
        }
      }
    } catch (error) {
      console.error('Error in auto schedule check:', error);
    } finally {
      this.isRunning = false;
    }
    
    return { started, ended: 0 };
  }
};

