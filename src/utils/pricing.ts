import { Enrollment, Course, MonthlySubscription, LedgerEntry } from '../types';
import { db } from '../db/db';

/**
 * Calculates the exact expected fee (in minor units / piastres) for a student enrolled in a course,
 * taking into account custom pricing, discount percentages, or full scholarships (free).
 */
export function calculateEnrollmentFee(
  baseCoursePrice: number,
  enrollment?: {
    pricingMode?: 'default' | 'custom' | 'discount' | 'free';
    customPrice?: number;
    discountPercentage?: number;
  } | null
): number {
  if (!enrollment) return Math.max(0, baseCoursePrice || 0);

  if (enrollment.pricingMode === 'free') {
    return 0;
  }

  if (enrollment.pricingMode === 'discount') {
    const discount = enrollment.discountPercentage ?? 0;
    if (discount >= 100) return 0;
    if (discount <= 0) return Math.max(0, baseCoursePrice || 0);
    return Math.max(0, Math.round(baseCoursePrice * (1 - discount / 100)));
  }

  if (enrollment.pricingMode === 'custom') {
    if (enrollment.customPrice !== undefined && enrollment.customPrice !== null) {
      return Math.max(0, enrollment.customPrice);
    }
  }

  // Fallback if customPrice exists directly
  if (enrollment.customPrice !== undefined && enrollment.customPrice !== null && enrollment.customPrice >= 0 && enrollment.pricingMode !== 'default') {
    return enrollment.customPrice;
  }

  return Math.max(0, baseCoursePrice || 0);
}

/**
 * Synchronizes unpaid and current month subscriptions for a student when their pricing changes
 */
export async function syncStudentMonthlySubscriptions(
  studentId: string,
  courseId: string,
  newFeeMinor: number,
  _token?: string
): Promise<void> {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Fetch subscriptions for this student directly from local db
  const subscriptions = await db.monthlySubscriptions
    .filter(s => s.studentId === studentId && !s.deleted_at)
    .toArray();

  const courseSubs = subscriptions.filter(s => s.courseId === courseId);

  for (const sub of courseSubs) {
    // Only update bills that are for the current/future month OR still unpaid/partial
    const isCurrentOrFuture = sub.year > currentYear || (sub.year === currentYear && sub.month >= currentMonth);
    const isUnsettled = sub.amountPaid < sub.amountTotal || sub.status !== 'paid';

    if (isCurrentOrFuture || isUnsettled) {
      const isFullyPaid = sub.amountPaid >= newFeeMinor && (newFeeMinor > 0 || sub.amountPaid > 0);
      const isFree = newFeeMinor === 0;
      
      let derivedStatus = sub.status;
      if (isFree || isFullyPaid) {
        derivedStatus = 'paid';
      } else if (sub.amountPaid > 0 && sub.amountPaid < newFeeMinor) {
        derivedStatus = 'partial';
      } else {
        const dueDate = sub.dueDate || `${sub.year}-${String(sub.month).padStart(2, '0')}-05`;
        const isOverdue = new Date(dueDate) < new Date(new Date().toDateString());
        derivedStatus = isOverdue ? 'overdue' : 'pending';
      }

      const updatedFields = {
        amountTotal: newFeeMinor,
        status: derivedStatus as any,
        updated_at: Date.now(),
        sync_status: 'pending' as const
      };

      await db.monthlySubscriptions.update(sub.id, updatedFields);
      await db.syncQueue.add({
        id: crypto.randomUUID(),
        entityType: 'monthlySubscriptions',
        entityId: sub.id,
        operation: 'update',
        payload: updatedFields,
        createdAt: Date.now()
      });
    }
  }
}

/**
 * Standardized helper to record or adjust ledger revenue entries
 */
export async function recordLedgerRevenue({
  relatedType,
  relatedId,
  amountMinor,
  description,
  category = 'اشتراكات شهرية',
  date,
  paymentMethod,
  _token
}: {
  relatedType: 'subscription' | 'session' | 'book' | 'other' | 'manual';
  relatedId: string;
  amountMinor: number;
  description: string;
  category?: string;
  date?: string;
  paymentMethod?: any;
  _token?: string;
  token?: string;
}): Promise<void> {
  if (amountMinor <= 0) return;

  const now = Date.now();
  const newEntry: LedgerEntry = {
    id: crypto.randomUUID(),
    type: 'revenue',
    category,
    amount: amountMinor,
    date: date || new Date().toISOString().split('T')[0],
    description,
    relatedType,
    relatedId,
    paymentMethod: paymentMethod || 'نقدي',
    created_at: now,
    updated_at: now,
    sync_status: 'pending'
  };

  await db.ledgerEntries.add(newEntry);
  await db.syncQueue.add({
    id: crypto.randomUUID(),
    entityType: 'ledgerEntries',
    entityId: newEntry.id,
    operation: 'create',
    payload: newEntry,
    createdAt: now
  });
}

