import { db } from './db';
import { v4 as uuidv4 } from 'uuid';
import { Course, Student, Group, Product, User, MessageTemplate, Settings, QrCard } from '../types';

/**
 * Initializes essential default system configuration (e.g. default settings & message templates).
 * Will NEVER automatically generate fake students, courses, financial transactions, or groups.
 */
export async function seedDatabaseIfEmpty() {
  try {
    // 1. Ensure default settings record exists
    const settingsCount = await db.settings.count();
    if (settingsCount === 0) {
      const now = Date.now();
      await db.settings.add({
        id: 'default-settings',
        autoStartEndSessions: false,
        autoConfirmPaymentOnAttendance: true,
        autoCreateAssignmentPerSession: false,
        freeSessionLimitPerStudent: 1,
        assignmentGradingMethod: 'numeric',
        numericMaxGrade: 100,
        created_at: now,
        updated_at: now,
        sync_status: 'synced'
      });
    }

    // 2. Ensure default message templates exist
    const templatesCount = await db.messageTemplates.count();
    if (templatesCount === 0) {
      const now = Date.now();
      await db.messageTemplates.bulkAdd([
        {
          id: uuidv4(),
          type: 'absence_alert',
          title: 'إشعار غياب (لولي الأمر)',
          content: 'مرحباً {{ParentName}}، نود إعلامكم بغياب الطالب {{StudentName}} عن حضور حصة {{CourseName}} بتاريخ {{Date}}.',
          created_at: now,
          updated_at: now,
          sync_status: 'synced'
        },
        {
          id: uuidv4(),
          type: 'payment_reminder',
          title: 'تذكير تأخر دفع (لولي الأمر)',
          content: 'مرحباً {{ParentName}}، يرجى سداد الدفعة المستحقة عن الكورس للطالب {{StudentName}} بحد أقصى {{DueDate}}.',
          created_at: now,
          updated_at: now,
          sync_status: 'synced'
        }
      ]);
    }
  } catch (err) {
    console.warn('System initialization notice:', err);
  }
}

/**
 * Completely purges all data from the database tables for a fresh clean slate.
 */
export async function clearAllData() {
  await Promise.all([
    db.students.clear(),
    db.courses.clear(),
    db.groups.clear(),
    db.enrollments.clear(),
    db.attendanceSessions.clear(),
    db.attendanceRecords.clear(),
    db.sessionPayments.clear(),
    db.monthlySubscriptions.clear(),
    db.products.clear(),
    db.courseProducts.clear(),
    db.productSales.clear(),
    db.ledgerEntries.clear(),
    db.bookingRequests.clear(),
    db.events.clear(),
    db.qrCards.clear(),
    db.assessments.clear(),
    db.assessmentGrades.clear()
  ]);
}

/**
 * Migration helper to sanitize existing IndexedDB records:
 * Converts any non-numeric card numbers or student codes to clean sequential digits.
 */
export async function sanitizeNumericCodes() {
  try {
    const students = await db.students.toArray();
    let maxNum = 0;

    // 1. Identify current highest numeric sequence
    for (const student of students) {
      if (student.studentCode) {
        const digits = student.studentCode.replace(/\D/g, '');
        if (digits) {
          const n = parseInt(digits, 10);
          if (n > maxNum) maxNum = n;
        }
      }
    }

    // 2. Sanitize student codes
    for (const student of students) {
      let code = student.studentCode;
      if (!code || !/^\d+$/.test(code)) {
        const digits = code ? code.replace(/\D/g, '') : '';
        if (digits.length > 0) {
          code = digits.padStart(4, '0');
        } else {
          maxNum++;
          code = String(maxNum).padStart(4, '0');
        }
        await db.students.update(student.id, {
          studentCode: code,
          updated_at: Date.now(),
          sync_status: 'pending'
        });
      }
    }

    // 3. Sanitize cards to match student codes or numeric sequences
    const currentStudents = await db.students.toArray();
    const studentMap = new Map(currentStudents.map(s => [s.id, s]));
    const cards = await db.qrCards.toArray();

    for (const card of cards) {
      let numericCode = '';
      if (card.studentId && studentMap.has(card.studentId)) {
        numericCode = studentMap.get(card.studentId)!.studentCode || '';
      }

      if (!numericCode || !/^\d+$/.test(numericCode)) {
        const digits = (card.cardNumber || '').replace(/\D/g, '');
        if (digits.length > 0) {
          numericCode = digits.padStart(4, '0');
        } else {
          maxNum++;
          numericCode = String(maxNum).padStart(4, '0');
        }
      }

      if (card.cardNumber !== numericCode || card.qrCodeData !== numericCode) {
        await db.qrCards.update(card.id, {
          cardNumber: numericCode,
          qrCodeData: numericCode,
          updated_at: Date.now(),
          sync_status: 'pending'
        });
      }
    }
  } catch (err) {
    console.warn('Could not complete numeric code sanitization:', err);
  }
}
