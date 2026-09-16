# Masar (مسار) — Complete Project Memory & Knowledge Base

This file provides the comprehensive architectural context, design invariants, data schemas, and system workflows for AI coding agents and human developers collaborating on **Masar (مسار)**.

---

## 1. Project Identity & Purpose

- **Application Name**: Masar (مسار) / منصة وسنتر مسار لإدارة المراكز التعليمية والأكاديميات.
- **Purpose**: A high-performance, offline-first educational center management SaaS platform tailored for private tutors, educational centers, and tutoring academies in Egypt and the MENA region.
- **Language & Direction**: Native Arabic interface with Right-to-Left layout (`dir="rtl"`).
- **Typography**: Paired Google Fonts: `Cairo` for UI text and data grids, and `Readex Pro` for headings, branding, and statistics.
- **Design Aesthetic**: GitHub Dark-inspired slate palette (`bg-slate-50 dark:bg-slate-950`, `bg-white dark:bg-slate-900`, `border-slate-200 dark:border-slate-800`), clean blue brand accents (`text-blue-600 dark:text-blue-400`, `bg-blue-600`), and strict anti-slop guidelines (no arbitrary glowing boxes, nested cards, or low-contrast text).

---

## 2. Technology Stack & Core Infrastructure

- **Frontend**: React 19, TypeScript, Vite 5, Tailwind CSS v4 (`@custom-variant dark`), Lucide React icons, Motion, Recharts.
- **Local Persistence**: **Dexie.js (IndexedDB)** with `dexie-react-hooks` (`useLiveQuery`). Database instance: `MasarDB` (`src/db/db.ts`).
- **Cloud Backend & Sync**: Cloudflare Worker API (`https://masar-api.weroperking.workers.dev`) handling tenant-isolated synchronization, subscription management, and upgrade proposals.
- **Authentication**: Clerk React (`@clerk/clerk-react`) with multi-tenant organization support and a custom localized Arabic auth screen (`src/pages/Auth/CustomAuth.tsx`).
- **Splash & Loading Transition**: `@lottiefiles/dotlottie-react` rendering `/public/masar-loader.json` fullscreen (`fixed inset-0`) with `layout={{ fit: 'cover' }}` to ensure seamless viewport coverage during startup and dark-wipe transitions.
- **Dev & Production Server**: Express server bundled with Vite middleware for development (`tsx server.ts`), compiled into a self-contained CommonJS bundle (`dist/server.cjs`) via `esbuild` for production. Binds strictly to `0.0.0.0:3000`.

---

## 3. Strict Architectural Rules & Invariants

### 🚫 NO AUTOMATIC FAKE/MOCK DATA SEEDING
- **CRITICAL**: The application must **NEVER** automatically generate fake/dummy students (e.g., `نور الهدى`, `يوسف خالد`), courses, groups, attendance records, or financial transactions on startup or when tables are empty.
- `src/db/seed.ts` only initializes default system `settings` and `messageTemplates` if missing. All educational, student, and ledger data is strictly user-created.
- A "مسح وتصفير كافة سجلات البيانات" (Clear All Data) utility is available in Settings (`src/pages/Admin/Settings.tsx`) to allow users to reset their local database cleanly.

### 📱 Egyptian Phone Numbers & WhatsApp Integration
- Standardized in `src/utils/phone.ts`:
  - `normalizeEgyptianPhone(phone)`: Cleans Arabic-Indic numerals (`٠١٢٣٤٥٦٧٨٩` -> `0123456789`), strips non-digit characters, removes leading zeros, and prepends country code `20` (e.g., `0126667896` -> `20126667896`).
  - `getWhatsAppUrl(phone, message)`: Returns a validated WhatsApp URL (`https://wa.me/20126667896?text=...`) avoiding double zeros or country code errors.
  - Uniformly used across Messaging, Student Profiles, Monthly Subscriptions, Dues, and Attendance notifications.

### 🔢 Student Codes & QR Identity System
- Student codes (`studentCode`) are sequential numeric strings (e.g., `0001`, `0002`, `0003`).
- QR card data (`cardNumber` and `qrCodeData`) strictly match the student's numeric `studentCode`.
- Public student lookup portal (`/lookup/:token` and `src/pages/PublicStudentLookup.tsx`) allows parents and students to securely review attendance, exam scores, and payment status via individual QR tokens.

### 💰 Currency & Financial Representation
- Currencies are handled in Egyptian Pounds (EGP / ج.م) formatted via `src/utils/currency.ts`.
- Course prices and financial amounts are stored as integers in piastres/cents to prevent floating-point calculation drift.

### 📦 Production Build & Deployment Artifacts
- **CRITICAL**: The `.gitignore` must **NOT** ignore `dist/`. Cloud Run artifact deployment requires compiled production assets in `dist/` (client Vite assets + `dist/server.cjs`). If `dist/` is ignored, deployments fail with "Build artifacts are empty".

---

## 4. Cloud Synchronization Architecture

- **Configuration File**: `src/config/api.ts` defines `API_BASE_URL` (`https://masar-api.weroperking.workers.dev`) and centralized endpoints for sync, subscription status, and upgrade proposals.
- **Service**: `src/services/syncService.ts`.
  - **Direct Absolute URLs**: Push and pull requests directly target the Cloudflare Worker upstream (`API_ENDPOINTS.sync.push` and `API_ENDPOINTS.sync.pull`), preventing relative path resolution failures on custom domains (`masar.top`, `app.masar.top`).
  - **Push Flow**: Gathers all records across 20 tables where `sync_status === 'pending'`. Sends batches with Clerk authorization headers. Upon HTTP 200, updates local Dexie records to `sync_status = 'synced'`.
  - **Pull Flow**: Retrieves remote changes since the timestamp stored in `db.syncMeta.get('lastSynced')`. Reconciles remote inserts, updates, and soft deletes (`deleted_at`) in IndexedDB within atomic Dexie transactions.
  - **Timestamps**: All `created_at` and `updated_at` values strictly use standard Unix millisecond epoch time (`Date.now()`). Never apply artificial future date offsets.

---

## 5. Subscription & Licensing System

- **Authoritative Source**: The Cloudflare Worker backend is the sole authority on subscription state (`/api/me/subscription-status?orgId=...`).
- **Lazy Provisioning**: The backend automatically provisions a 14-day trial row for newly created organizations upon their first lookup.
- **No Local Trial Invention**: The frontend does not synthesize local 14-day trials or bypass backend subscription checks. If the backend returns HTTP 402 (`NO_SUBSCRIPTION`, `TRIAL_EXPIRED`, or `SUBSCRIPTION_INACTIVE`), the application displays `TrialExpiredScreen`, locking the UI until an upgrade is completed.
- **Offline Cache**: `db.subscriptionCache` stores the latest verified status (`singleton`) with a timestamp to provide an instantaneous, flicker-free app boot for returning users.
- **Upgrade Workflow**:
  - `src/pages/Upgrade/Upgrade.tsx`: Standalone upgrade portal featuring tiers (`starter`, `growth`, `pro`) with clear student and branch limits.
  - `src/components/TrialExpiredScreen.tsx`: Instant lock screen presenting renewal options and direct WhatsApp contact for activation.
  - Upgrade proposals are submitted via `/api/orgs/:id/upgrade-proposal` and polled via `/status`.

---

## 6. IndexedDB Database Schema (`src/db/db.ts`)

Database Name: **`MasarDB`** (Dexie v6)

### Table Index Definitions
1. `students`: `'id, name, phone, sync_status'`
2. `courses`: `'id, name, sync_status'`
3. `groups`: `'id, courseId, status, sync_status'`
4. `enrollments`: `'id, studentId, groupId, courseId, status, sync_status'`
5. `monthlySubscriptions`: `'id, studentId, courseId, [month+year], status, sync_status'`
6. `attendanceSessions`: `'id, groupId, courseId, status, sync_status'`
7. `attendanceRecords`: `'id, sessionId, studentId, groupId, status, sync_status'`
8. `assessments`: `'id, courseId, type, status, sync_status'`
9. `assessmentGrades`: `'id, assessmentId, studentId, sync_status'`
10. `products`: `'id, type, sync_status'`
11. `courseProducts`: `'id, courseId, productId, sync_status'`
12. `sessionPayments`: `'id, studentId, courseId, sessionId, status, sync_status'`
13. `ledgerEntries`: `'id, type, relatedType, date, sync_status'`
14. `bookingRequests`: `'id, courseId, status, sync_status'`
15. `productSales`: `'id, productId, studentId, linkedEventId, sync_status'`
16. `events`: `'id, date, sync_status'`
17. `users`: `'id, role, status, sync_status'`
18. `messageTemplates`: `'id, channel, templateKey, sync_status'`
19. `settings`: `'id, sync_status'`
20. `qrCards`: `'id, cardNumber, studentId, printStatus, sync_status'`
21. `syncMeta`: `'id'`
22. `subscriptionCache`: `'id'`

All standard entity records extend `BaseRecord`:
```ts
interface BaseRecord {
  id: string;
  created_at: number;
  updated_at: number;
  deleted_at?: number | null;
  sync_status: 'synced' | 'pending' | 'error';
}
```

---

## 7. Directory Structure & Key Modules

```
src/
├── components/
│   ├── Layout.tsx             # Main application shell, Sidebar, Header, Global CommandPalette (Ctrl+K)
│   ├── TrialExpiredScreen.tsx # High-performance subscription lock screen & upgrade gateway
│   ├── Qr/                    # QrCardBadge, Live QR Scanner modal
│   └── Shared/                # Modals, Alerts, ConfirmDialog
├── config/
│   └── api.ts                 # Centralized API_BASE_URL and API_ENDPOINTS config
├── context/
│   ├── AuthContext.tsx        # Clerk integration & user session state
│   ├── SubscriptionContext.tsx# Backend-authoritative subscription state & cache
│   ├── ThemeContext.tsx       # Dark / Light mode toggle
│   ├── ToastContext.tsx       # Toast notifications
│   └── ConfirmContext.tsx     # Promise-based confirmation dialogs
├── db/
│   ├── db.ts                  # Dexie schema & MasarDB declaration
│   └── seed.ts                # Default settings & templates initialization (NO fake data)
├── pages/
│   ├── Dashboard/             # KPIs, quick shortcuts, today's schedule
│   ├── Students/              # Students table, Add/Edit modal, StudentDetails
│   ├── Academic/              # Courses, Groups, Attendance, Assessments, Schedule
│   ├── Finance/               # MonthlySubscriptions, SessionPayments, Dues, General Ledger
│   ├── Inventory/             # Products, Course Bindings, POS Sales
│   ├── Qr/                    # QR Scanner, Batch QR Card Designer & Printing
│   ├── Admin/                 # WhatsApp Messaging, Reports, Users, Settings
│   ├── Upgrade/               # Standalone Upgrade & Pricing Tier Portal
│   └── Auth/                  # CustomAuth localized Arabic screen
├── services/
│   ├── syncService.ts         # Bi-directional push/pull synchronization engine
│   └── autoScheduleService.ts # Recurring session generator based on group schedules
└── utils/
    ├── currency.ts            # Egyptian Pound formatting
    ├── phone.ts               # Egyptian phone normalization & wa.me link generation
    ├── pricing.ts             # Pricing calculation for courses & material bundles
    └── export.ts              # Excel / CSV / Print utilities
```

---

## 8. Build, Lint & Verification Workflow

```bash
# Start local development server (Express + Vite on 0.0.0.0:3000)
npm run dev

# Run TypeScript type validation
npm run lint

# Build production bundle (Vite client + esbuild CJS server bundle)
npm run build

# Start compiled production server
npm run start
```

### Verification Checklist for AI Agents
Before finishing any turn:
1. Run `npm run lint` (`tsc --noEmit`) to verify zero TypeScript errors.
2. Run `npm run build` to confirm client bundling and server packaging in `dist/`.
3. Verify that `dist/` remains tracked (not in `.gitignore`).
4. Ensure no unsolicited mock data generation or synthetic trial overrides are introduced.
