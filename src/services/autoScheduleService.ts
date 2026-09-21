import { db } from '../db/db';
import { v4 as uuidv4 } from 'uuid';
import { AttendanceSession } from '../types';

export const autoScheduleService = {
  isRunning: false,

  markSessionCancelledOrEnded(groupId: string) {
    try {
      if (!groupId) return;
      const now = new Date();
      const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      localStorage.setItem(`masar_session_cancelled_${groupId}_${todayDateStr}`, 'true');
      
      const stored = localStorage.getItem(`masar_cancelled_sessions_${todayDateStr}`);
      const list: string[] = stored ? JSON.parse(stored) : [];
      if (!list.includes(groupId)) {
        list.push(groupId);
        localStorage.setItem(`masar_cancelled_sessions_${todayDateStr}`, JSON.stringify(list));
      }
    } catch (e) {
      console.warn('Failed to store cancelled session flag:', e);
    }
  },

  async checkAndRunSchedules(): Promise<{ started: number, ended: number }> {
    if (this.isRunning) return { started: 0, ended: 0 };
    if (localStorage.getItem('masar_auto_schedule_enabled') === 'false') {
      return { started: 0, ended: 0 };
    }

    this.isRunning = true;
    
    let started = 0;
    try {
      const now = new Date();
      const arabicDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const todayName = arabicDays[now.getDay()];
      const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      const activeGroups = await db.groups.filter(g => g.status === 'in_progress' && !g.deleted_at).toArray();
      
      // Get all sessions created today to avoid duplicates (INCLUDING soft-deleted / ended / cancelled)
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const endOfDay = startOfDay + 24 * 60 * 60 * 1000;
      
      const todaySessions = await db.attendanceSessions
        .filter(s => s.startedAt >= startOfDay && s.startedAt < endOfDay)
        .toArray();
      
      const sessionsByGroup = new Set<string>();
      todaySessions.forEach(s => {
        if (s.groupId) {
          sessionsByGroup.add(s.groupId);
        }
      });
      
      // Also check explicit local cancellation flags
      const cancelledKeys = new Set<string>();
      try {
        const storedCancelled = localStorage.getItem(`masar_cancelled_sessions_${todayDateStr}`);
        if (storedCancelled) {
          JSON.parse(storedCancelled).forEach((gid: string) => cancelledKeys.add(gid));
        }
      } catch (_) {}

      for (const group of activeGroups) {
        // If group is scheduled for today
        if (group.daysOfWeek && group.daysOfWeek.includes(todayName)) {
          const isCancelledLocally = 
            cancelledKeys.has(group.id) || 
            localStorage.getItem(`masar_session_cancelled_${group.id}_${todayDateStr}`) === 'true';

          // If past start time AND no session created today AND not manually cancelled/ended today
          if (
            group.startTime && 
            group.startTime <= currentTimeStr && 
            !sessionsByGroup.has(group.id) &&
            !isCancelledLocally
          ) {
            
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
            sessionsByGroup.add(group.id);
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


