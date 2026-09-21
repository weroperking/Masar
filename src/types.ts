export interface BaseRecord {
  id: string;
  created_at: number;
  updated_at: number;
  deleted_at?: number | null;
  sync_status: 'synced' | 'pending' | 'error';
}

export interface Student extends BaseRecord {
  studentCode?: string;
  public_lookup_token?: string;
  name: string;
  phone: string;
  school?: string;
  gradeLevel?: string;
  parentName?: string;
  parentPhone?: string;
  leadSource?: string;
  notes?: string;
  isActive: boolean;
  branch?: string;
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
  branch?: string;
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
  pricingMode?: 'default' | 'custom' | 'discount' | 'free';
  customPrice?: number;
  discountPercentage?: number;
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
  status: 'present' | 'absent' | 'compensation';
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
  gradeLevel?: string;
  notes?: string;
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

export interface CardOverlayElement {
  visible: boolean;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  fontSize: number;
  color: string;
  align?: 'right' | 'left' | 'center';
  showBackground?: boolean;
  backgroundColor?: string;
  backgroundOpacity?: number;
  backgroundPadding?: number;
  backgroundRadius?: number;
}

export interface CardCustomDesign {
  themeColor?: 'blue' | 'emerald' | 'indigo' | 'amber' | 'rose' | 'slate' | 'custom';
  customColor?: string;
  textColor?: string;
  centerName?: string;
  subtitleLabel?: string;
  showPhone?: boolean;
  showGrade?: boolean;
  showSchool?: boolean;
  showCenterName?: boolean;
  showCardNumber?: boolean;
  showLogo?: boolean;
  logoPosition?: 'right' | 'left' | 'center';
  logoImage?: string;
  backgroundImage?: string;
  cardFormat?: 'barcode' | 'qrcode';
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  fontFamily?: string;
  gradientBg?: boolean;
  gradientFrom?: string;
  gradientTo?: string;
  gradientAngle?: number;
  headerBgColor?: string;
  headerTextColor?: string;

  // New advanced interactive editor properties
  frontImage?: string;
  frontOpacity?: number;
  frontFit?: 'cover' | 'contain' | 'stretch';
  frontScale?: number;
  frontOffsetX?: number;
  frontOffsetY?: number;

  backImage?: string;
  backOpacity?: number;
  backFit?: 'cover' | 'contain' | 'stretch';
  backScale?: number;
  backOffsetX?: number;
  backOffsetY?: number;

  codeFormat?: 'barcode' | 'qrcode';
  codeX?: number; // % 
  codeY?: number; // %
  codeScale?: number; // % (e.g. 50 - 160)
  codeWidth?: number; // px or %
  codeHeight?: number; // px or %
  showCodeDigits?: boolean;
  codeColor?: string;

  studentNameElement?: CardOverlayElement;
  centerNameElement?: CardOverlayElement;
  phoneElement?: CardOverlayElement;
  gradeElement?: CardOverlayElement;
  schoolElement?: CardOverlayElement;
}

export interface Settings extends BaseRecord {
  numericMaxGrade?: number;
  assignmentGradingMethod?: string;
  freeSessionLimitPerStudent?: number;
  autoCreateAssignmentPerSession?: boolean;
  autoStartEndSessions?: boolean;
  academyName?: string;
  teacherName?: string;
  branch?: string;
  whatsappNumber?: string;
  currency?: string;
  autoConfirmPaymentOnAttendance: boolean;
  theme?: 'light' | 'dark' | 'system';
  cardDesign?: CardCustomDesign;
}

export interface QrCard extends BaseRecord {
  linkedAt?: number;
  printStatus?: string;
  cardNumber?: string;
  studentId?: string;
  qrCodeData?: string;
  status?: 'active' | 'revoked' | string;
  themeColor?: 'blue' | 'emerald' | 'indigo' | 'amber' | 'rose' | 'slate' | 'custom';
  centerName?: string;
  backgroundImage?: string;
  notes?: string;
}

export interface SyncMeta {
  id: string; // e.g. 'last_sync'
  timestamp: number;
}

export interface PublicLookupData {
  student: {
    id: string;
    name: string;
    studentCode?: string;
    gradeLevel?: string;
    school?: string;
    phone?: string;
    parentPhone?: string;
    parentName?: string;
    branch?: string;
  };
  centerName?: string;
  academyName?: string;
  teacherName?: string;
  branch?: string;
  attendance: {
    attended: number;
    missed: number;
    total: number;
    rate?: number;
    sessions?: Array<{
      id: string;
      date: string;
      status: 'present' | 'absent' | 'compensation';
      courseName?: string;
      groupName?: string;
      room?: string;
      branch?: string;
    }>;
  };
  exams: Array<{
    id: string;
    name: string;
    grade: number | string;
    maxGrade?: number;
    date?: string;
    type?: string;
    percentage?: number;
  }>;
  subscription?: {
    status: 'paid' | 'partial' | 'overdue' | 'no_record';
    month?: number;
    year?: number;
    amountTotal?: number;
    amountPaid?: number;
  };
}

export interface SubscriptionLimits {
  max_branches: number;
  max_students: number;
  inventory_sales: boolean;
  combined_packages: boolean;
  advanced_analytics: boolean;
  api_access: boolean;
}

export interface SubscriptionStatus {
  plan: string;
  status: string;
  trial_ends_at: string | null;
  days_remaining: number;
  limits: SubscriptionLimits;
}

export interface SubscriptionCache extends SubscriptionStatus {
  id: string; // usually 'singleton'
  checked_at: number;
}

export interface SyncQueueItem {
  id: string; // idempotency key / UUID
  entityType: string;
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  payload?: any;
  createdAt: number;
}
