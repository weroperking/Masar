import Dexie from 'dexie';
import { db } from './db';
import { v4 as uuidv4 } from 'uuid';
import { Course, Student, Group, Product, User, MessageTemplate, Settings, QrCard, MonthlySubscription } from '../types';

export async function seedDatabaseIfEmpty() {
  if (typeof window !== 'undefined' && localStorage.getItem('masar_db_seeded_v1')) {
    return; // Already initialized in this browser
  }

  const [studentCount, groupCount, courseCount] = await Promise.all([
    db.students.count(),
    db.groups.count(),
    db.courses.count()
  ]);

  if (studentCount > 0 || groupCount > 0 || courseCount > 0) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('masar_db_seeded_v1', 'true');
    }
    return; // Already initialized or user has existing data
  }

  // Check if legacy EduSaaSDB has data to migrate
  try {
    const exists = await Dexie.exists('EduSaaSDB');
    if (exists) {
      const oldDb = new Dexie('EduSaaSDB');
      await oldDb.open();
      const tables = oldDb.tables;
      let hasData = false;
      for (const table of tables) {
        const count = await table.count();
        if (count > 0 && db.table(table.name)) {
          const records = await table.toArray();
          await db.table(table.name).bulkAdd(records);
          hasData = true;
        }
      }
      oldDb.close();
      if (hasData) return;
    }
  } catch (e) {
    console.warn('Legacy DB migration skipped:', e);
  }

  const now = Date.now();

  // 1. Seed Courses
  const course1: Course = {
    id: 'course-1',
    name: 'رياضيات الثانوية العامة',
    price: 45000,
    paymentType: 'monthly',
    isActive: true,
    created_at: now,
    updated_at: now,
    sync_status: 'pending'
  };

  const course2: Course = {
    id: 'course-2',
    name: 'لغة إنجليزية متقدمة',
    price: 38000,
    paymentType: 'monthly',
    isActive: true,
    created_at: now,
    updated_at: now,
    sync_status: 'pending'
  };

  const course3: Course = {
    id: 'course-3',
    name: 'فيزياء تطبيقية',
    price: 42000,
    paymentType: 'monthly',
    isActive: true,
    created_at: now,
    updated_at: now,
    sync_status: 'pending'
  };

  await db.courses.bulkAdd([course1, course2, course3]);

  // 2. Seed Students
  const s1: Student = {
    id: 'student-1',
    studentCode: '0001',
    name: 'أحمد محمد علي',
    phone: '01012345678',
    parentName: 'محمد علي',
    parentPhone: '01098765432',
    school: 'مدرسة المتفوقين',
    leadSource: 'فيسبوك',
    isActive: true,
    created_at: now,
    updated_at: now,
    sync_status: 'pending'
  };

  const s2: Student = {
    id: 'student-2',
    studentCode: '0002',
    name: 'سارة إبراهيم حسن',
    phone: '01122334455',
    parentName: 'إبراهيم حسن',
    parentPhone: '01199887766',
    school: 'مدرسة النور الخاصة',
    leadSource: 'ترشيح صديق',
    isActive: true,
    created_at: now,
    updated_at: now,
    sync_status: 'pending'
  };

  const s3: Student = {
    id: 'student-3',
    studentCode: '0003',
    name: 'يوسف خالد محمود',
    phone: '01233445566',
    parentName: 'خالد محمود',
    parentPhone: '01288776655',
    school: 'مدرسة الأوائل الثانوية',
    leadSource: 'إعلان شارع',
    isActive: true,
    created_at: now,
    updated_at: now,
    sync_status: 'pending'
  };

  const s4: Student = {
    id: 'student-4',
    studentCode: '0004',
    name: 'نور الهدى أحمد',
    phone: '01555667788',
    parentName: 'أحمد شريف',
    parentPhone: '01544332211',
    school: 'مدرسة الحرية التجريبية',
    leadSource: 'انستجرام',
    isActive: true,
    created_at: now,
    updated_at: now,
    sync_status: 'pending'
  };

  await db.students.bulkAdd([s1, s2, s3, s4]);

  // 3. Seed Groups
  const g1: Group = {
    id: 'group-1',
    courseId: course1.id,
    name: 'مجموعة العباقرة - السبت والأربعاء',
    type: 'in_person',
    daysOfWeek: ['السبت', 'الأربعاء'],
    startTime: '16:00',
    endTime: '18:00',
    startDate: '2026-09-01',
    endDate: '2027-05-30',
    sessionCount: 32,
    maxStudents: 25,
    status: 'in_progress',
    created_at: now,
    updated_at: now,
    sync_status: 'pending'
  };

  const g2: Group = {
    id: 'group-2',
    courseId: course2.id,
    name: 'مجموعة المتفوقين - الأحد والثلاثاء',
    type: 'in_person',
    daysOfWeek: ['الأحد', 'الثلاثاء'],
    startTime: '18:00',
    endTime: '20:00',
    startDate: '2026-09-01',
    endDate: '2027-05-30',
    sessionCount: 32,
    maxStudents: 20,
    status: 'in_progress',
    created_at: now,
    updated_at: now,
    sync_status: 'pending'
  };

  await db.groups.bulkAdd([g1, g2]);

  // 4. Seed Products
  const p1: Product = {
    id: 'prod-1',
    name: 'مذكرة الشرح الشاملة في الرياضيات 2026',
    salePrice: 12000,
    costPrice: 6500,
    stockQty: 45,
    soldQty: 15,
    type: 'book',
    created_at: now,
    updated_at: now,
    sync_status: 'pending'
  };

  const p2: Product = {
    id: 'prod-2',
    name: 'ملزمة مراجعة ليلة الامتحان في الإنجليزية',
    salePrice: 9000,
    costPrice: 4500,
    stockQty: 30,
    soldQty: 10,
    type: 'book',
    created_at: now,
    updated_at: now,
    sync_status: 'pending'
  };

  await db.products.bulkAdd([p1, p2]);

  // 5. Seed MonthlySubscriptions
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const pay1: MonthlySubscription = {
    id: uuidv4(),
    studentId: s1.id,
    courseId: course1.id,
    month: currentMonth,
    year: currentYear,
    amountTotal: 45000,
    amountPaid: 45000,
    status: 'paid',
    notes: 'تم الدفع نقداً بالسنتر',
    created_at: now,
    updated_at: now,
    sync_status: 'pending'
  };

  const pay2: MonthlySubscription = {
    id: uuidv4(),
    studentId: s2.id,
    courseId: course2.id,
    month: currentMonth,
    year: currentYear,
    amountTotal: 38000,
    amountPaid: 20000,
    status: 'partial',
    notes: 'متبقي 180 ج.م الأسبوع القادم',
    created_at: now,
    updated_at: now,
    sync_status: 'pending'
  };

  const pay3: MonthlySubscription = {
    id: uuidv4(),
    studentId: s3.id,
    courseId: course1.id,
    month: currentMonth,
    year: currentYear,
    amountTotal: 45000,
    amountPaid: 0,
    status: 'overdue',
    notes: 'مستحق الدفع',
    created_at: now,
    updated_at: now,
    sync_status: 'pending'
  };

  await db.monthlySubscriptions.bulkAdd([pay1, pay2, pay3]);

  // 6. Seed Ledger Entries
  await db.ledgerEntries.bulkAdd([
    {
      id: uuidv4(),
      type: 'revenue',
      category: 'اشتراكات شهرية',
      amount: 65000,
      date: new Date().toISOString().split('T')[0],
      description: 'تحصيل اشتراكات طلاب الرياضيات والإنجليزية',
      relatedType: 'subscription',
      created_at: now,
      updated_at: now,
      sync_status: 'pending'
    },
    {
      id: uuidv4(),
      type: 'expense',
      category: 'أدوات ومطبوعات',
      amount: 35000,
      date: new Date().toISOString().split('T')[0],
      description: 'طباعة وتجليد مذكرات وملازم للسنتر',
      relatedType: 'manual',
      created_at: now,
      updated_at: now,
      sync_status: 'pending'
    }
  ]);

  // 7. Seed Settings
  const defaultSettings: Settings = {
    id: 'default-settings',
    autoStartEndSessions: false,
    autoConfirmPaymentOnAttendance: true,
    autoCreateAssignmentPerSession: false,
    freeSessionLimitPerStudent: 1,
    assignmentGradingMethod: 'numeric',
    numericMaxGrade: 100,
    created_at: now,
    updated_at: now,
    sync_status: 'pending'
  };
  await db.settings.put(defaultSettings);

  // 8. Seed QR Cards
  const cards: QrCard[] = [
    { id: uuidv4(), cardNumber: '0001', qrCodeData: '0001', studentId: s1.id, printStatus: 'printed', linkedAt: now, created_at: now, updated_at: now, sync_status: 'pending' },
    { id: uuidv4(), cardNumber: '0002', qrCodeData: '0002', studentId: s2.id, printStatus: 'printed', linkedAt: now, created_at: now, updated_at: now, sync_status: 'pending' },
    { id: uuidv4(), cardNumber: '0003', qrCodeData: '0003', studentId: null, printStatus: 'queued', linkedAt: null, created_at: now, updated_at: now, sync_status: 'pending' },
    { id: uuidv4(), cardNumber: '0004', qrCodeData: '0004', studentId: null, printStatus: 'available', linkedAt: null, created_at: now, updated_at: now, sync_status: 'pending' },
  ];
  await db.qrCards.bulkAdd(cards);

  // 9. Seed Users
  const u1: User = {
    id: uuidv4(),
    name: 'أحمد سمير (مدير النظام)',
    email: 'admin@masar.edu',
    role: 'admin',
    branch: 'الفرع الرئيسي',
    status: 'active',
    created_at: now,
    updated_at: now,
    sync_status: 'pending'
  };
  const u2: User = {
    id: uuidv4(),
    name: 'مريم محمود (استقبال)',
    email: 'mariam@masar.edu',
    role: 'staff',
    branch: 'الفرع الرئيسي',
    status: 'active',
    created_at: now,
    updated_at: now,
    sync_status: 'pending'
  };
  await db.users.bulkAdd([u1, u2]);

  if (typeof window !== 'undefined') {
    localStorage.setItem('masar_db_seeded_v1', 'true');
  }
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
