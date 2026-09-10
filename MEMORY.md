# Masar (مسار) — Complete Project Memory & Knowledge Base

This file provides full context and architectural knowledge for AI coding agents and developers working on **Masar (مسار)**.

---

## 1. Project Identity & Purpose
- **Application Name**: Masar (مسار) / منصة مسار لإدارة المراكز التعليمية والأكاديميات.
- **Purpose**: A comprehensive, offline-first educational center management SaaS platform designed for private tutors, educational centers, and tutoring academies in Egypt and the MENA region.
- **Core Interface**: Native Arabic (RTL, `dir="rtl"`), typography using `Cairo` (body/UI) and `Readex Pro` (headings/branding).

---

## 2. Technology Stack & Key Libraries
- **Framework**: React 19 + TypeScript + Vite 5.
- **Styling**: Tailwind CSS v4 (`@custom-variant dark`, GitHub Dark inspired slate palette: `bg-slate-50 dark:bg-slate-950`, `bg-white dark:bg-slate-900`, `border-slate-200 dark:border-slate-800`).
- **Icons**: `lucide-react` strictly.
- **Persistence**: **Dexie.js (IndexedDB)** with `dexie-react-hooks` (`useLiveQuery`). Database name: `MasarDB` (`src/db/db.ts`).
- **Authentication**: Clerk React (`@clerk/clerk-react`) with localized Arabic fallback auth (`src/pages/Auth/CustomAuth.tsx`).
- **Server**: Express backend with Vite middleware in development, bundled with `esbuild` for production on port `3000` (`0.0.0.0:3000`).

---

## 3. Strict Architectural Rules & Invariants

### 🚫 NO AUTOMATIC FAKE/MOCK DATA SEEDING
- **CRITICAL**: The app must **NEVER** automatically generate fake/dummy students (e.g. `نور الهدى`, `يوسف خالد`), courses, groups, attendance records, or financial transactions on startup or when the database is empty.
- `src/db/seed.ts` only initializes default `settings` and `messageTemplates` if missing. All educational and financial data is user-managed.
- A "مسح وتصفير كافة سجلات البيانات" (Clear All Data) utility is available in Settings (`src/pages/Admin/Settings.tsx`) allowing users to reset their database to an empty slate.

### 📱 Egyptian Phone Numbers & WhatsApp Integration
- Standardized in `src/utils/phone.ts`:
  - `normalizeEgyptianPhone(phone)`: Cleans Arabic-Indic numerals (`٠١٢٣٤٥٦٧٨٩` -> `0123456789`), strips non-digits, removes the leading `0`, and prepends `20` (e.g., `0126667896` -> `20126667896`).
  - `getWhatsAppUrl(phone, message)`: Returns `https://wa.me/20126667896?text=...` ensuring no double zeros or country code errors occur.
  - Used uniformly across `Messaging.tsx`, `Students.tsx`, `StudentDetails.tsx`, `MonthlySubscriptions.tsx`, `Dues.tsx`, and `Attendance.tsx`.

### 🔢 Student Codes & QR Cards
- Student codes (`studentCode`) are clean sequential numeric strings (e.g. `0001`, `0002`, `0003`).
- QR card data (`cardNumber` and `qrCodeData`) strictly match the student's numeric `studentCode`.

---

## 4. IndexedDB Database Schema (`src/db/db.ts`)
- `students`: `id, studentCode, name, phone, parentPhone, parentName, gradeLevel, school, notes, isActive, created_at, updated_at, deleted_at, sync_status`
- `courses`: `id, name, subject, gradeLevel, defaultPrice, billingType, isArchived, created_at, updated_at, sync_status`
- `groups`: `id, courseId, name, teacherName, maxCapacity, schedule, daysOfWeek, startTime, endTime, room, isArchived, created_at, updated_at, sync_status`
- `enrollments`: `id, studentId, courseId, groupId, enrolledAt, status, created_at, updated_at, sync_status`
- `attendanceSessions`: `id, groupId, courseId, sessionDate, sessionNumber, title, status, created_at, updated_at, sync_status`
- `attendanceRecords`: `id, sessionId, studentId, status, checkInTime, notes, created_at, updated_at, sync_status`
- `sessionPayments`: `id, sessionId, studentId, amount, paymentMethod, paymentDate, notes, created_at, updated_at, sync_status`
- `monthlySubscriptions`: `id, studentId, courseId, month, year, amount, discount, netAmount, paidAmount, status, dueDate, paidAt, created_at, updated_at, sync_status`
- `products`: `id, name, sku, category, costPrice, sellingPrice, stockQuantity, minStockAlert, isArchived, created_at, updated_at, sync_status`
- `courseProducts`: `id, courseId, productId, isMandatory, created_at, updated_at, sync_status`
- `productSales`: `id, productId, studentId, quantity, unitPrice, totalPrice, discount, netPrice, paidAmount, paymentMethod, saleDate, created_at, updated_at, sync_status`
- `ledgerEntries`: `id, type (revenue/expense), category, amount, description, referenceType, referenceId, transactionDate, created_at, updated_at, sync_status`
- `qrCards`: `id, studentId, cardNumber, qrCodeData, themeColor, isPrinted, issueDate, status, created_at, updated_at, sync_status`
- `assessments`: `id, courseId, groupId, title, maxGrade, passingGrade, assessmentDate, created_at, updated_at, sync_status`
- `assessmentGrades`: `id, assessmentId, studentId, grade, notes, created_at, updated_at, sync_status`
- `bookingRequests`: `id, studentName, phone, parentPhone, gradeLevel, courseId, preferredGroupId, status, created_at, updated_at, sync_status`
- `events`: `id, title, description, startDate, endDate, type, targetAudience, created_at, updated_at, sync_status`
- `messageTemplates`: `id, type, title, content, created_at, updated_at, sync_status`
- `settings`: `id, autoStartEndSessions, autoConfirmPaymentOnAttendance, autoCreateAssignmentPerSession, freeSessionLimitPerStudent, assignmentGradingMethod, numericMaxGrade, created_at, updated_at, sync_status`

---

## 5. Directory Structure & Key Modules
```
src/
├── components/
│   ├── Layout/          # MainLayout, Sidebar, Header, Global CommandPalette (Ctrl+K)
│   ├── Qr/              # QrCardBadge, Live QR Scanner
│   └── Shared/          # Custom Modals, Alerts, ConfirmDialog
├── context/
│   ├── AuthContext.tsx  # Clerk + local fallback user state
│   ├── ThemeContext.tsx # Dark / Light mode toggle
│   ├── ToastContext.tsx # Toast notifications
│   └── ConfirmContext.tsx # Promise-based confirm dialogs
├── db/
│   ├── db.ts            # Dexie schema & AppDatabase class
│   └── seed.ts          # Default settings & sanitizeNumericCodes (NO fake data)
├── pages/
│   ├── Dashboard/       # Main KPIs, quick stats, fast shortcuts
│   ├── Students/        # Students table, Add/Edit modal, StudentDetails
│   ├── Academic/        # Courses, Groups, Attendance, Assessments, Online Booking
│   ├── Finance/         # MonthlySubscriptions, Dues, General Ledger
│   ├── Inventory/       # Products, Course Bindings, Sales POS
│   ├── Qr/              # QR Scanner, Batch QR Card Designer & Printing
│   ├── Admin/           # Messaging (WhatsApp Direct + Templates), Reports, Users, Settings
│   └── Auth/            # CustomAuth localized Arabic screen
└── utils/
    ├── currency.ts      # Egyptian Pound (EGP / ج.م) formatting
    ├── phone.ts         # Egyptian phone normalization & wa.me generator
    └── export.ts        # Excel / CSV / Print utilities
```

---

## 6. Build, Verification & Dev Server Commands
```bash
# Start local server (Express + Vite on 0.0.0.0:3000)
npm run dev

# Run TypeScript validation
npm run lint

# Build production bundle (Vite + esbuild server.cjs)
npm run build
```
- **Verification Rule**: Always run `npm run lint` and verify successful compilation before completing agent turns.
