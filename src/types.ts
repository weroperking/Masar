export type SyncStatus = 'pending' | 'synced';

export interface SyncMeta {
  id: string; // usually 'lastSynced'
  timestamp: number;
}

export interface BaseRecord {
  id: string;
  created_at: number;
  updated_at: number;
  sync_status: SyncStatus;
}

export interface Student extends BaseRecord {
  name: string;
  phone: string;
  parentName: string;
  parentPhone: string;
  school: string;
  leadSource: string;
  isActive: boolean;
}

export interface Course extends BaseRecord {
  name: string;
  price: number; // Stored in piastres/cents (integer)
  paymentType: 'monthly' | 'package';
  isActive: boolean;
}

export interface Group extends BaseRecord {
  courseId: string;
  name: string;
  type: 'in_person' | 'online';
  daysOfWeek: string[];
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
  sessionCount?: number;
  maxStudents?: number;
  notes?: string;
  status: 'scheduled' | 'in_progress' | 'finished';
}

export interface Payment extends BaseRecord {
  studentId: string;
  courseId: string;
  month: number;
  year: number;
  amountTotal: number; // Stored in piastres/cents (integer)
  amountPaid: number; // Stored in piastres/cents (integer)
  status: 'paid' | 'partial' | 'overdue';
  notes: string;
}

export interface AttendanceSession extends BaseRecord {
  groupId: string;
  courseId: string;
  startedAt: number;
  endedAt: number | null;
  room?: string;
  status: 'live' | 'completed';
}

export interface AttendanceRecord extends BaseRecord {
  sessionId: string;
  studentId: string;
  status: 'present' | 'absent';
  markedAt: number;
}

export interface Assessment extends BaseRecord {
  name: string;
  type: 'exam' | 'assignment';
  courseId: string;
  semester: string;
  date: string;
  maxGrade: number;
  gradingMethod: 'numeric' | 'rating';
  status: 'draft' | 'completed';
}

export interface AssessmentGrade extends BaseRecord {
  assessmentId: string;
  studentId: string;
  grade: number | string;
  gradedAt: number;
}

export interface Product extends BaseRecord {
  name: string;
  salePrice: number; // Stored in piastres/cents (integer)
  costPrice: number; // Stored in piastres/cents (integer)
  stockQty: number;
  soldQty: number;
  type: 'book' | 'other';
}

export interface CourseProduct extends BaseRecord {
  courseId: string;
  productId: string;
  isMandatory: boolean;
  discountType: 'none' | 'percentage' | 'fixed';
  discountValue: number;
}

export interface SessionPayment extends BaseRecord {
  studentId: string;
  courseId: string;
  sessionId: string | null;
  type: 'fee' | 'package';
  amount: number; // Stored in piastres/cents (integer)
  paidAmount: number; // Stored in piastres/cents (integer)
  date: string;
  status: 'unpaid' | 'partial' | 'paid' | 'overdue' | 'held' | 'refunded';
}

export interface LedgerEntry extends BaseRecord {
  type: 'revenue' | 'expense' | 'refund';
  category?: string;
  amount: number; // Stored in piastres/cents (integer)
  date: string;
  description: string;
  relatedType: 'subscription' | 'session' | 'product' | 'manual';
  relatedId?: string;
}

export interface BookingRequest extends BaseRecord {
  name: string;
  phone: string;
  courseId: string;
  declaredAmount: number; // Stored in piastres/cents (integer)
  requestDate: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface ProductSale extends BaseRecord {
  productId: string;
  quantity: number;
  customerName?: string;
  customerPhone?: string;
  studentId?: string;
  discountType: 'none' | 'percentage' | 'fixed';
  discountValue: number;
  subtotal: number; // Stored in piastres/cents (integer)
  total: number; // Stored in piastres/cents (integer)
  paymentMethod: string;
  saleDate: string;
  receiptNumber: string;
  linkedEventId?: string;
  notes?: string;
}

export interface Event extends BaseRecord {
  name: string;
  date: string;
  notes?: string;
}

export interface User extends BaseRecord {
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'teacher';
  branch: string;
  linkedEmployeeName?: string;
  status: 'active' | 'inactive';
}

export interface MessageTemplate extends BaseRecord {
  channel: 'whatsapp' | 'telegram' | 'sms';
  templateKey: string;
  body: string;
  isDefault: boolean;
}

export interface Settings extends BaseRecord {
  autoStartEndSessions: boolean;
  autoConfirmPaymentOnAttendance: boolean;
  autoCreateAssignmentPerSession: boolean;
  freeSessionLimitPerStudent: number;
  assignmentGradingMethod: 'numeric' | 'rating';
  numericMaxGrade: number;
}

export interface QrCard extends BaseRecord {
  cardNumber: string;
  studentId: string | null;
  printStatus: 'available' | 'queued' | 'printed';
  linkedAt: number | null;
}
