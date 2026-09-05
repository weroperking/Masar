import Dexie, { Table } from 'dexie';
import { 
  Student, Course, Group, Payment, AttendanceSession, AttendanceRecord, 
  Assessment, AssessmentGrade, Product, CourseProduct, SessionPayment, 
  LedgerEntry, BookingRequest, ProductSale, Event, User, MessageTemplate, 
  Settings, QrCard, SyncMeta 
} from '../types';

export class AppDatabase extends Dexie {
  students!: Table<Student>;
  courses!: Table<Course>;
  groups!: Table<Group>;
  payments!: Table<Payment>;
  attendanceSessions!: Table<AttendanceSession>;
  attendanceRecords!: Table<AttendanceRecord>;
  assessments!: Table<Assessment>;
  assessmentGrades!: Table<AssessmentGrade>;
  products!: Table<Product>;
  courseProducts!: Table<CourseProduct>;
  sessionPayments!: Table<SessionPayment>;
  ledgerEntries!: Table<LedgerEntry>;
  bookingRequests!: Table<BookingRequest>;
  productSales!: Table<ProductSale>;
  events!: Table<Event>;
  users!: Table<User>;
  messageTemplates!: Table<MessageTemplate>;
  settings!: Table<Settings>;
  qrCards!: Table<QrCard>;
  syncMeta!: Table<SyncMeta>;

  constructor() {
    super('MasarDB');
    
    // Version 1
    this.version(1).stores({
      students: 'id, name, phone, sync_status',
      courses: 'id, name, sync_status',
      groups: 'id, courseId, sync_status',
      payments: 'id, studentId, courseId, [month+year], status, sync_status'
    });

    // Version 2 - Platform expansion
    this.version(2).stores({
      groups: 'id, courseId, status, sync_status',
      attendanceSessions: 'id, groupId, courseId, status, sync_status',
      attendanceRecords: 'id, sessionId, studentId, status, sync_status',
      assessments: 'id, courseId, type, status, sync_status',
      assessmentGrades: 'id, assessmentId, studentId, sync_status',
      products: 'id, type, sync_status',
      courseProducts: 'id, courseId, productId, sync_status',
      sessionPayments: 'id, studentId, courseId, sessionId, status, sync_status',
      ledgerEntries: 'id, type, relatedType, date, sync_status',
      bookingRequests: 'id, courseId, status, sync_status',
      productSales: 'id, productId, studentId, linkedEventId, sync_status',
      events: 'id, date, sync_status',
      users: 'id, role, status, sync_status',
      messageTemplates: 'id, channel, templateKey, sync_status',
      settings: 'id, sync_status',
      qrCards: 'id, cardNumber, studentId, printStatus, sync_status'
    });
    
    // Version 3 - Sync meta
    this.version(3).stores({
      syncMeta: 'id'
    });
  }
}

export const db = new AppDatabase();
