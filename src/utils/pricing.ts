import { Enrollment, Course, MonthlySubscription } from '../types';
import { fetchWithAuth } from '../config/api';

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
  token: string
): Promise<void> {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Fetch subscriptions for this student
  const data = await fetchWithAuth(`/api/monthly-subscriptions?studentId=${studentId}`, token);
  const key = Object.keys(data)[0];
  const subscriptions: MonthlySubscription[] = data[key] || [];

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

      await fetchWithAuth(`/api/monthly-subscriptions/${sub.id}`, token, {
        method: 'PATCH',
        body: JSON.stringify({
          amountTotal: newFeeMinor,
          status: derivedStatus as any
        })
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
  token
}: {
  relatedType: 'subscription' | 'session' | 'book' | 'other' | 'manual';
  relatedId: string;
  amountMinor: number;
  description: string;
  category?: string;
  date?: string;
  paymentMethod?: any;
  token: string;
}): Promise<void> {
  if (amountMinor <= 0) return;

  await fetchWithAuth(`/api/revenue-entries`, token, {
    method: 'POST',
    body: JSON.stringify({
      type: 'revenue',
      category,
      amount: amountMinor,
      date: date || new Date().toISOString().split('T')[0],
      description,
      relatedType,
      relatedId,
      paymentMethod: paymentMethod || 'نقدي'
    })
  });
}
