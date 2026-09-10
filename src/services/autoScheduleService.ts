import { db } from '../db/db';
import { v4 as uuidv4 } from 'uuid';

export const autoScheduleService = {
  async checkAndRunSchedules() {
    try {
      const now = new Date();
      const currentDay = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][now.getDay()];
      const currentHour = now.getHours().toString().padStart(2, '0');
      const currentMin = now.getMinutes().toString().padStart(2, '0');
      const currentTimeStr = `${currentHour}:${currentMin}`;

      const groups = await db.groups.toArray();
      const activeSessions = await db.attendanceSessions.where('status').equals('live').toArray();
      const completedSessions = await db.attendanceSessions.where('status').equals('completed').toArray();
      
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      for (const group of groups) {
        if (!group.daysOfWeek?.includes(currentDay)) continue;
        if (!group.startTime || !group.endTime) continue;

        const isTimeActive = currentTimeStr >= group.startTime && currentTimeStr < group.endTime;
        const isTimeOver = currentTimeStr >= group.endTime;

        const activeSession = activeSessions.find(s => s.groupId === group.id);
        const hasCompletedToday = completedSessions.some(s => s.groupId === group.id && s.startedAt >= todayStart.getTime());

        if (isTimeActive && !activeSession && !hasCompletedToday) {
          // Auto start session
          const timeNow = Date.now();
          await db.attendanceSessions.add({
            id: uuidv4(),
            groupId: group.id,
            courseId: group.courseId,
            isTrial: false,
            startedAt: timeNow,
            endedAt: null,
            status: 'live',
            created_at: timeNow,
            updated_at: timeNow,
            sync_status: 'pending'
          });
          console.log(`Auto-started session for group ${group.name}`);
        } else if (isTimeOver && activeSession) {
          // Auto end session
          const timeNow = Date.now();
          await db.attendanceSessions.update(activeSession.id, {
            status: 'completed',
            endedAt: timeNow,
            sync_status: 'pending'
          });
          console.log(`Auto-ended session for group ${group.name}`);
        }
      }
    } catch (e) {
      console.error('Error in auto schedule service:', e);
    }
  }
};
