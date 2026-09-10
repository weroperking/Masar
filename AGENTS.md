# Masar (مسار) — Agent & Developer Guidelines

Welcome to **Masar (مسار)**, an educational center and academy management SaaS platform built with modern React, TypeScript, Tailwind CSS, and local-first persistence.

This document serves as the guide for AI coding agents and human developers collaborating on this repository.

---

## 1. Project Overview

**Masar** is designed for educational centers, tutoring academies, and private instructors. It offers an offline-first, high-performance web experience with native Arabic (RTL) interface design.

### Core Modules
- **Academic Management**: Courses, student enrollment, multi-schedule groups, daily attendance tracking, and assessments/grades.
- **Financial Engine**: Monthly subscription payments, per-session pay-as-you-go billing, accounts receivable/dues tracking, and a double-entry general ledger for center revenues and operational expenses.
- **Inventory & Materials**: Study books, printed notes, mandatory course package bindings, and sales tracking.
- **Student ID & QR**: QR card generation, scanner integration for rapid attendance, and student status verification.
- **Communications**: Automated WhatsApp template generator for payment reminders and absence notifications.
- **Command Palette & Shortcuts**: Global `Ctrl+K` command menu, `Ctrl+N` quick entity creation, and keyboard shortcuts.

---

## 2. Technology Stack & Architecture

- **Frontend**: React 19, TypeScript, Vite 5, Tailwind CSS v4 (with `@custom-variant dark`), Lucide React icons, Motion, Recharts.
- **Persistence**: Local-first offline storage using **Dexie.js** (IndexedDB) with `dexie-react-hooks` (`useLiveQuery`).
- **Database Name**: `MasarDB` (instantiated in `src/db/db.ts`).
- **Authentication**: Clerk React (`@clerk/clerk-react`) paired with a custom localized Arabic auth screen (`src/pages/Auth/CustomAuth.tsx`).
- **Backend / Dev Server**: Express server bundled with Vite middleware for development and compiled with `esbuild` for production.
- **Port & Host**: Hardcoded to bind to `0.0.0.0` and port `3000`.

---

## 3. Build & Test Commands

All scripts are defined in `package.json`:

```bash
# Start local development server (Express + Vite middleware on port 3000)
npm run dev

# Run TypeScript type verification
npm run lint

# Build production bundle (Vite client + esbuild CJS server bundle)
npm run build

# Start production server
npm run start

# Clean build artifacts
npm run clean
```

### Verification Workflow for Agents
Before finishing any task, always verify:
1. Run `lint` (`tsc --noEmit`) to verify zero TypeScript errors.
2. Run `build` to verify successful client Vite bundling and server packaging in `dist/`.
3. If dependencies change or dev scripts are modified, restart the dev server.

---

## 4. Naming & Localization Conventions

- **Code & Configuration Identifier**: Always use **`Masar`** or **`masar`** in filenames, database identifiers (`MasarDB`), package identifiers, and English code variables to prevent character encoding issues.
- **User-Facing UI**: Always display the platform title as **`مسار`** (or **`منصة مسار`** / **`سنتر مسار`**) across headings, tooltips, placeholders, modals, and messaging templates.
- **Language & Direction**: Default to Arabic with Right-to-Left direction (`dir="rtl"`). Fonts used are `Cairo` for UI and body text, and `Readex Pro` for headings and brand elements.

---

## 5. Visual & Code Style Guidelines

### Theme & Palette (GitHub Dark Inspired)
- **Background Levels**:
  - Main App Background: `bg-slate-50 dark:bg-slate-950`
  - Cards, Modals, Sidebar, Header: `bg-white dark:bg-slate-900`
  - Hover States & Secondary Surfaces: `bg-slate-100 dark:bg-slate-800` or `dark:hover:bg-slate-800/50`
- **Borders & Dividers**:
  - `border-slate-200 dark:border-slate-700` or `border-slate-100 dark:border-slate-800`
- **Typography & High-Contrast Neutrals**:
  - Primary Text: `text-slate-900 dark:text-slate-100`
  - Secondary Text: `text-slate-700 dark:text-slate-300`
  - Muted Text: `text-slate-500 dark:text-slate-400`
- **Primary Brand Color**:
  - Clean blue accents (`text-blue-600 dark:text-blue-400`, `bg-blue-600 hover:bg-blue-700`). Avoid mixing purple or indigo gradients.

### Anti-Slop Visual Standards
- **No Over-Rounded Shapes**: Cap cards, modals, and panels at `rounded-xl`. Reserve `rounded-full` strictly for status pills, badges, and avatars.
- **No Arbitrary Gradients**: Avoid purple-to-blue text gradients, glowing neon box shadows, or translucent glassmorphic clutter.
- **Clean Stat Icons**: Display stat icons plainly with clear opacity/tint rather than heavy, multi-colored square background boxes.
- **Spacing Math**: Ensure padding and margins maintain clear optical hierarchy (e.g., card padding `p-6`, tighter component spacing `gap-2` to `gap-4`).
- **Icons**: Always import icons strictly from `lucide-react`.

---

## 6. Offline Data & Persistence Patterns

- Database tables are defined in `src/db/db.ts`:
  - `students`, `courses`, `groups`, `enrollments`, `attendanceSessions`, `attendanceRecords`, `sessionPayments`, `monthlySubscriptions`, `products`, `courseProducts`, `productSales`, `ledgerEntries`, `qrCards`, `assessments`, `assessmentGrades`, `users`, `messageTemplates`, `settings`, `bookingRequests`, `events`, `syncMeta`.
- Use `useLiveQuery` from `dexie-react-hooks` for reactive, automatic UI updates upon IndexedDB changes.
- **NO AUTOMATIC FAKE/MOCK SEEDING**: Never generate dummy students or demo ledger data automatically. All educational data is user-managed.
- See `/MEMORY.md` for the full comprehensive project knowledge base and invariants.

---

## 7. Security & Environment Constraints

- **Port Constraint**: Port `3000` is the single externally routed port. Never change the port in `server.ts` or `vite.config.ts`.
- **Secrets & API Keys**:
  - Never place private API keys in client-side code or `VITE_` variables.
  - Third-party secrets or server-side keys (like Gemini or admin keys) must be accessed via `process.env` on Express API routes in `server.ts`.
  - When introducing new variables, document them in `.env.example`.
- **No Mock Placeholders for User Auth**: Rely on the configured Clerk instance or safe offline fallback mechanisms.
