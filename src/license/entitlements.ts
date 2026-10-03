/**
 * Masar (مسار) - License Plans & Feature Entitlements
 * 
 * Maps commercial plans to feature capabilities.
 */

export type LicensePlan = 'trial' | 'basic' | 'pro' | 'lifetime';

export const FEATURE_MAP: Record<LicensePlan | string, string[]> = {
  trial: ['core', 'export', 'sync', 'no_ads'],
  basic: ['core'],
  pro: ['core', 'export', 'sync', 'no_ads'],
  lifetime: ['core', 'export', 'sync', 'no_ads', 'premium'],
};

/**
 * Returns the list of features granted by the given plan.
 */
export function getFeatures(plan: string): string[] {
  return FEATURE_MAP[plan] || [];
}

/**
 * Checks whether the plan includes a specific feature.
 */
export function hasFeature(plan: string, feature: string): boolean {
  const features = getFeatures(plan);
  return features.includes(feature);
}
