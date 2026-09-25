import { db } from '../db/db';
import { decryptRecord, Envelope } from './cryptoService';
import { isNotDeleted } from '../config/queryHooks';
import { normalizeStudentCode, STUDENT_LOOKUP_PATH_PREFIX } from '../utils/studentCode';
import { API_BASE_URL } from '../config/api';
import { Student, Course, Group, Enrollment, AttendanceRecord, AttendanceSession, Assessment, AssessmentGrade, MonthlySubscription, Settings } from '../types';

async function getDecryptedTable<T extends { id?: string; envelope?: any; deleted_at?: number | null; deletedAt?: number | null }>(tableName: string): Promise<T[]> {
  try {
    const table = (db as any)[tableName];
    if (!table) return [];
    const rawItems = await table.toArray();
    const result: T[] = [];
    for (const item of rawItems) {
      if (item.envelope) {
        try {
          const plain = await decryptRecord<T>(item.envelope as Envelope);
          if (isNotDeleted(plain) && isNotDeleted(item)) {
            result.push({ ...plain, id: item.id });
          }
        } catch {
          // If decryption fails, skip
        }
      } else {
        if (isNotDeleted(item)) {
          result.push(item as T);
        }
      }
    }
    return result;
  } catch (e) {
    console.warn(`[lookupSyncService] Failed to read table ${tableName}:`, e);
    return [];
  }
}

let syncTimeout: any = null;

/**
 * Compiles all students' public lookup profiles and syncs them to the backend server
 * so that any QR code or short link (/p/s/:lookup_code) resolves instantly on any device.
 */
export async function syncAllStudentsToLookupServer(): Promise<void> {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  syncTimeout = setTimeout(async () => {
    try {
      const [
        students,
        courses,
        groups,
        enrollments,
        attendanceRecords,
        attendanceSessions,
        assessments,
        assessmentGrades,
        monthlySubscriptions,
        settingsList
      ] = await Promise.all([
        getDecryptedTable<Student>('students'),
        getDecryptedTable<Course>('courses'),
        getDecryptedTable<Group>('groups'),
        getDecryptedTable<Enrollment>('enrollments'),
        getDecryptedTable<AttendanceRecord>('attendanceRecords'),
        getDecryptedTable<AttendanceSession>('attendanceSessions'),
        getDecryptedTable<Assessment>('assessments'),
        getDecryptedTable<AssessmentGrade>('assessmentGrades'),
        getDecryptedTable<MonthlySubscription>('monthlySubscriptions'),
        getDecryptedTable<Settings>('settings')
      ]);

      if (!students || students.length === 0) return;

      const currentSettings = settingsList[0];
      const teacherName = currentSettings?.teacherName || localStorage.getItem('masar_teacher_name') || '';
      const academyName = currentSettings?.academyName || localStorage.getItem('masar_academy_name') || 'سنتر مسار التعليمي';
      const centerBranch = currentSettings?.branch || 'الفرع الرئيسي';

      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const snapshots = students.map(student => {
        const studentEnrollments = enrollments.filter(e => e.studentId === student.id);
        const activeEnrollment = studentEnrollments.find(e => e.status === 'active') || studentEnrollments[0];
        const studentGroup = groups.find(g => g.id === activeEnrollment?.groupId);
        const studentCourse = courses.find(c => c.id === (activeEnrollment?.courseId || studentGroup?.courseId));
        const studentBranch = student.branch || studentGroup?.branch || centerBranch;

        // Attendance stats
        const records = attendanceRecords.filter(r => r.studentId === student.id);
        const attended = records.filter(r => r.status === 'present' || r.status === 'compensation').length;
        const missed = records.filter(r => r.status === 'absent').length;
        const total = attended + missed;
        const rate = total > 0 ? Math.round((attended / total) * 100) : 100;

        // Sessions list (most recent 20)
        const sessionsList = records
          .slice()
          .sort((a, b) => (b.markedAt || 0) - (a.markedAt || 0))
          .slice(0, 20)
          .map(rec => {
            const sess = attendanceSessions.find(s => s.id === rec.sessionId);
            const grp = groups.find(g => g.id === (rec.groupId || sess?.groupId));
            const crs = courses.find(c => c.id === (sess?.courseId || grp?.courseId));
            const dateStr = sess?.startedAt
              ? new Date(sess.startedAt).toISOString().split('T')[0]
              : rec.markedAt
              ? new Date(rec.markedAt).toISOString().split('T')[0]
              : '';
            return {
              id: rec.id,
              date: dateStr,
              status: rec.status,
              courseName: crs?.name || studentCourse?.name || '',
              groupName: grp?.name || studentGroup?.name || '',
              room: sess?.room || grp?.room || '',
              branch: grp?.branch || studentBranch
            };
          });

        // Exams snapshot
        const grades = assessmentGrades.filter(g => g.studentId === student.id);
        const examsSnapshot = grades.map(grade => {
          const assessment = assessments.find(a => a.id === grade.assessmentId);
          const numericGrade = typeof grade.grade === 'number' ? grade.grade : parseFloat(grade.grade as string) || 0;
          const maxGrade = assessment?.maxGrade || 100;
          const percentage = maxGrade > 0 ? Math.round((numericGrade / maxGrade) * 100) : 0;
          return {
            id: grade.id,
            name: assessment?.name || 'اختبار',
            grade: numericGrade,
            maxGrade,
            date: assessment?.date || (grade.gradedAt ? new Date(grade.gradedAt).toISOString().split('T')[0] : ''),
            type: assessment?.type || 'exam',
            percentage
          };
        });

        // Current month subscription
        const currentSub = monthlySubscriptions.find(s => s.studentId === student.id && s.month === currentMonth && s.year === currentYear);

        const cleanCode = normalizeStudentCode(student.studentCode) || student.studentCode || '';

        return {
          student: {
            id: student.id,
            name: student.name,
            studentCode: cleanCode,
            lookup_code: student.lookup_code,
            gradeLevel: student.gradeLevel || '',
            school: student.school || '',
            phone: student.phone || '',
            parentPhone: student.parentPhone || '',
            parentName: student.parentName || '',
            branch: studentBranch
          },
          teacherName: teacherName || (studentCourse ? `مدرس ${studentCourse.name}` : 'إدارة المركز التعليمي'),
          academyName,
          centerName: academyName,
          branch: studentBranch,
          attendance: {
            attended,
            missed,
            total,
            rate,
            sessions: sessionsList
          },
          exams: examsSnapshot,
          subscription: {
            status: currentSub?.status || 'no_record',
            month: currentMonth,
            year: currentYear,
            amountTotal: currentSub?.amountTotal || 0,
            amountPaid: currentSub?.amountPaid || 0
          }
        };
      });

      // Send to server
      await fetch(`${API_BASE_URL}/api/public/sync-lookups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshots)
      }).catch(() => {
        // Fallback endpoint
        return fetch(`${API_BASE_URL}/public/sync-lookups`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(snapshots)
        });
      });

      console.log(`[lookupSyncService] Successfully synced ${snapshots.length} student lookup profiles to server`);
    } catch (err) {
      console.warn('[lookupSyncService] Sync lookups deferred:', err);
    }
  }, 1000);
}

/**
 * Calls POST /api/students/:id/lookup-token on the server to generate/fetch the canonical lookup token
 * for a student, updating the local database record and returning the token details.
 */
export async function requestStudentLookupToken(
  studentId: string,
  payload?: any,
  sessionToken?: string | null
): Promise<{ token: string; url: string } | null> {
  if (!studentId) return null;
  try {
    const url = `/api/students/${studentId}/lookup-token`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {})
      },
      body: JSON.stringify(payload || {})
    });

    if (res.ok) {
      const data = await res.json();
      const token = data.public_lookup_token || data.token || data.lookup_code;
      if (token) {
        try {
          const student = await db.students.get(studentId);
          if (student) {
            await db.students.update(studentId, { lookup_code: token, updated_at: Date.now() });
          }
        } catch (dbErr) {
          console.warn('[lookupSyncService] Could not update local Dexie student lookup_code:', dbErr);
        }
        return { token, url: data.url || `${STUDENT_LOOKUP_PATH_PREFIX}${token}` };
      }
    }
  } catch (err) {
    console.warn('[lookupSyncService] Failed calling POST /api/students/:id/lookup-token:', err);
  }
  return null;
}

