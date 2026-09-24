import Dexie, { Table } from 'dexie';
import { 
  Student, Course, Group, MonthlySubscription, AttendanceSession, AttendanceRecord, 
  Assessment, AssessmentGrade, Product, CourseProduct, SessionPayment, 
  LedgerEntry, BookingRequest, ProductSale, Event, User, MessageTemplate, 
  Settings, QrCard, SyncMeta, Enrollment, SubscriptionCache, SyncQueueItem
} from '../types';

export interface PinConfigRecord {
  id: string;
  orgId: string;
  profileType: 'admin' | 'assistant';
  pinHash: string;
  pinSalt: string;
  pinIterations: number;
  pinAlgorithm: string;
  assistantPinRequired: boolean;
  autoLockMinutes: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PendingPinPush {
  id: string;
  orgId: string;
  profileType: 'admin' | 'assistant';
  queuedAt: number;
}

export class AppDatabase extends Dexie {
  students!: Table<Student>;
  courses!: Table<Course>;
  groups!: Table<Group>;
  enrollments!: Table<Enrollment>;
  monthlySubscriptions!: Table<MonthlySubscription>;
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
  subscriptionCache!: Table<SubscriptionCache>;
  syncQueue!: Table<SyncQueueItem>;
  keystore!: Table<{ id: string; key?: CryptoKey; keypair?: CryptoKeyPair; value?: any; at?: number; issuedAt?: number }>;
  pinConfigs!: Table<PinConfigRecord, string>;
  pendingPinPushes!: Table<PendingPinPush, string>;

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

    // Version 4 - Rename payments to monthlySubscriptions, add enrollments
    this.version(4).stores({
      payments: null, // Drop old table
      monthlySubscriptions: 'id, studentId, courseId, [month+year], status, sync_status',
      enrollments: 'id, studentId, groupId, courseId, status, sync_status'
    });

    this.version(5).stores({
      attendanceRecords: 'id, sessionId, studentId, groupId, status, sync_status'
    });

    this.version(6).stores({
      subscriptionCache: 'id'
    });

    // Version 7 - Local-first Sync Queue
    this.version(7).stores({
      syncQueue: 'id, entityType, entityId, createdAt'
    });

    // Version 8 - Dedicated Keystore for non-extractable keys & hydration tracking
    this.version(8).stores({
      keystore: 'id'
    });

    // Version 9 - Secure Hashed PIN storage
    this.version(9).stores({
      pinConfigs: 'id, orgId, [orgId+profileType], updatedAt'
    });

    // Version 10 - Offline retry queue for PIN configurations
    this.version(10).stores({
      pendingPinPushes: 'id, orgId, profileType, queuedAt'
    });
  }
}

export const db = new AppDatabase();
