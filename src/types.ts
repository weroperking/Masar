export interface BaseRecord {
  id: string;
  created_at: number;
  updated_at: number;
  deleted_at?: number | null;
  sync_status: 'synced' | 'pending' | 'error';
}

export interface Student extends BaseRecord {
  studentCode?: string;
  name: string;
  phone: string;
  school?: string;
  gradeLevel?: string;
  parentName?: string;
  parentPhone?: string;
  leadSource?: string;
  notes?: string;
  isActive: boolean;
}

export interface Course extends BaseRecord {
  name: string;
  price: number; // Stored in piastres/cents (integer)
  paymentType: 'monthly' | 'package';
  subject?: string;
  description?: string;
  isActive: boolean;
}

export interface Group extends BaseRecord {
  room?: string;
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

export interface MonthlySubscription extends BaseRecord {
  studentId?: string;
  courseId: string;
  month: number;
  year: number;
  amountTotal: number;
  amountPaid: number;
  dueDate?: string; // ADDED THIS
  status: 'paid' | 'partial' | 'overdue' | 'no_record' | 'rejected' | 'pending';
  notes: string;
}

export interface Enrollment extends BaseRecord {
  studentId?: string;
  groupId: string;
  courseId: string;
  enrolledAt: string;
  status: 'active' | 'withdrawn' | 'completed';
}

export interface AttendanceSession extends BaseRecord {
  isTrial?: boolean;
  groupId: string;
  courseId: string;
  startedAt: number;
  endedAt: number | null;
  room?: string;
  status: 'live' | 'completed';
}

export interface AttendanceRecord extends BaseRecord {
  sessionId: string;
  studentId?: string;
  groupId: string; // ADDED THIS
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
  studentId?: string;
  grade: number | string;
  gradedAt: number;
}

export interface Product extends BaseRecord {
  name: string;
  salePrice: number;
  costPrice: number;
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
  studentId?: string;
  courseId: string;
  sessionId: string | null;
  type: 'fee' | 'package';
  amount: number;
  paidAmount: number;
  date: string;
  status: 'unpaid' | 'partial' | 'paid' | 'overdue' | 'held' | 'refunded';
}

export interface LedgerEntry extends BaseRecord {
  category?: string;
  type: 'income' | 'expense' | 'revenue' | 'refund';
  relatedType: 'subscription' | 'session' | 'book' | 'salary' | 'rent' | 'other' | 'manual' | 'product';
  relatedId?: string;
  amount: number;
  description: string;
  date: string;
  paymentMethod?: string;
}

export interface BookingRequest extends BaseRecord {
  name: string;
  phone: string;
  declaredAmount?: number;
  studentId?: string;
  courseId: string;
  groupId?: string;
  requestDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'accepted';
}

export interface ProductSale extends BaseRecord {
  subtotal?: number;
  discountValue?: number;
  discountType?: string;
  customerName?: string;
  total?: number;
  receiptNumber?: string;
  productId: string;
  studentId?: string;
  quantity: number;
  totalPrice?: number;
  saleDate: string;
  paymentMethod?: string;
}

export interface Event extends BaseRecord {
  title: string;
  date: string;
  description?: string;
  type: 'holiday' | 'exam' | 'reminder';
}

export interface User extends BaseRecord {
  status?: string;
  branch?: string;
  phone?: string;
  subject?: string;
  notes?: string;
  clerkUserId?: string;
  role: 'admin' | 'manager' | 'teacher' | 'assistant' | 'staff';
  name: string;
  email: string;
  assignedCourseIds?: string[];
  assignedGroupIds?: string[];
}

export interface MessageTemplate extends BaseRecord {
  title: string;
  content: string; // Contains variables like {{StudentName}}, {{CourseName}}
  type: 'payment_reminder' | 'absence_alert' | 'general';
}

export interface Settings extends BaseRecord {
  numericMaxGrade?: number;
  assignmentGradingMethod?: string;
  freeSessionLimitPerStudent?: number;
  autoCreateAssignmentPerSession?: boolean;
  autoStartEndSessions?: boolean;
  academyName?: string;
  whatsappNumber?: string;
  currency?: string;
  autoConfirmPaymentOnAttendance: boolean;
  theme?: 'light' | 'dark' | 'system';
}

export interface QrCard extends BaseRecord {
  linkedAt?: number;
  printStatus?: string;
  cardNumber?: string;
  studentId?: string;
  qrCodeData?: string;
  status?: 'active' | 'revoked' | string;
  themeColor?: 'blue' | 'emerald' | 'indigo' | 'amber' | 'rose' | 'slate';
  centerName?: string;
  backgroundImage?: string;
  notes?: string;
}

export interface SyncMeta {
  id: string; // e.g. 'last_sync'
  timestamp: number;
}
