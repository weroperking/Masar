import Dexie from 'dexie';
import { db } from './db';
import { v4 as uuidv4 } from 'uuid';
import { Course, Student, Group, Product, User, MessageTemplate, Settings, QrCard, Payment } from '../types';

export async function seedDatabaseIfEmpty() {
  const studentCount = await db.students.count();
  if (studentCount > 0) return; // Already initialized

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
    price: 450,
    paymentType: 'monthly',
    isActive: true,
    created_at: now,
    updated_at: now,
    sync_status: 'pending'
  };

  const course2: Course = {
    id: 'course-2',
    name: 'لغة إنجليزية متقدمة',
    price: 380,
    paymentType: 'monthly',
    isActive: true,
    created_at: now,
    updated_at: now,
    sync_status: 'pending'
  };

  const course3: Course = {
    id: 'course-3',
    name: 'فيزياء تطبيقية',
    price: 420,
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
    salePrice: 120,
    costPrice: 65,
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
    salePrice: 90,
    costPrice: 45,
    stockQty: 30,
    soldQty: 10,
    type: 'book',
    created_at: now,
    updated_at: now,
    sync_status: 'pending'
  };

  await db.products.bulkAdd([p1, p2]);

  // 5. Seed Payments
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const pay1: Payment = {
    id: uuidv4(),
    studentId: s1.id,
    courseId: course1.id,
    month: currentMonth,
    year: currentYear,
    amountTotal: 450,
    amountPaid: 450,
    status: 'paid',
    notes: 'تم الدفع نقداً بالسنتر',
    created_at: now,
    updated_at: now,
    sync_status: 'pending'
  };

  const pay2: Payment = {
    id: uuidv4(),
    studentId: s2.id,
    courseId: course2.id,
    month: currentMonth,
    year: currentYear,
    amountTotal: 380,
    amountPaid: 200,
    status: 'partial',
    notes: 'متبقي 180 ج.م الأسبوع القادم',
    created_at: now,
    updated_at: now,
    sync_status: 'pending'
  };

  const pay3: Payment = {
    id: uuidv4(),
    studentId: s3.id,
    courseId: course1.id,
    month: currentMonth,
    year: currentYear,
    amountTotal: 450,
    amountPaid: 0,
    status: 'overdue',
    notes: 'مستحق الدفع',
    created_at: now,
    updated_at: now,
    sync_status: 'pending'
  };

  await db.payments.bulkAdd([pay1, pay2, pay3]);

  // 6. Seed Ledger Entries
  await db.ledgerEntries.bulkAdd([
    {
      id: uuidv4(),
      type: 'revenue',
      category: 'اشتراكات شهرية',
      amount: 650,
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
      amount: 350,
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
    { id: uuidv4(), cardNumber: 'MSR-1001', studentId: s1.id, printStatus: 'printed', linkedAt: now, created_at: now, updated_at: now, sync_status: 'pending' },
    { id: uuidv4(), cardNumber: 'MSR-1002', studentId: s2.id, printStatus: 'printed', linkedAt: now, created_at: now, updated_at: now, sync_status: 'pending' },
    { id: uuidv4(), cardNumber: 'MSR-1003', studentId: null, printStatus: 'queued', linkedAt: null, created_at: now, updated_at: now, sync_status: 'pending' },
    { id: uuidv4(), cardNumber: 'MSR-1004', studentId: null, printStatus: 'available', linkedAt: null, created_at: now, updated_at: now, sync_status: 'pending' },
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
}
