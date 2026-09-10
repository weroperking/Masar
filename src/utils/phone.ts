/**
 * Utilities for formatting and normalizing phone numbers,
 * specifically tailored for Egyptian numbers and WhatsApp wa.me links.
 */

/**
 * Normalizes an Arabic or international phone number into clean digits
 * suitable for WhatsApp wa.me links.
 *
 * For Egyptian numbers, users typically enter the number with a leading zero (e.g. 0126667896).
 * Prepending '2' converts '012...' to '2012...', properly producing the Egypt
 * country code (+20) without the double-zero conflict (20012...).
 */
export function normalizeEgyptianPhone(phone: string | undefined | null): string {
  if (!phone) return '';

  // 1. Convert Arabic-Indic (٠-٩) and Persian (۰-۹) digits to ASCII (0-9)
  let clean = String(phone)
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString());

  // 2. Strip whitespace and non-digit characters except leading '+'
  clean = clean.trim().replace(/[^\d+]/g, '');

  if (!clean) return '';

  // 3. Remove leading '+' or '00'
  if (clean.startsWith('+')) {
    clean = clean.substring(1);
  }
  if (clean.startsWith('00')) {
    clean = clean.substring(2);
  }

  // 4. Handle double-zero mistake from prepending +20 to an already 0-prefixed number (e.g. 20012...)
  if (clean.startsWith('200')) {
    clean = '20' + clean.substring(3);
  } else if (clean.startsWith('0')) {
    // Normal Egyptian entry: user enters 01xxxxxxxxx.
    // Prepending '2' yields '201xxxxxxxxx' (+20 country code, no double zeros).
    clean = '2' + clean;
  } else if (clean.startsWith('201') || clean.startsWith('202') || clean.startsWith('203')) {
    // Already in full international format for Egypt (e.g. 2012..., 202...)
    // Keep as is.
  } else if (clean.startsWith('1') && clean.length >= 9) {
    // Entered without leading zero (e.g. 126667896 or 1012345678)
    clean = '20' + clean;
  }

  return clean;
}

/**
 * Generates a bulletproof WhatsApp click-to-chat URL (wa.me)
 * @param phone Raw phone number (e.g., "0126667896", "+20 12 666 7896", "٠١٢٦٦٦٧٨٩٦")
 * @param message Optional message to pre-fill
 * @returns WhatsApp URL string or empty string if phone is invalid
 */
export function getWhatsAppUrl(phone: string | undefined | null, message?: string): string {
  const normalized = normalizeEgyptianPhone(phone);
  if (!normalized || normalized.length < 8) return '';
  
  const baseUrl = `https://wa.me/${normalized}`;
  return message ? `${baseUrl}?text=${encodeURIComponent(message)}` : baseUrl;
}

/**
 * Validates whether a given phone string resolves to a plausible phone number.
 */
export function isValidPhone(phone: string | undefined | null): boolean {
  const normalized = normalizeEgyptianPhone(phone);
  return normalized.length >= 9 && normalized.length <= 15;
}

/**
 * Formats a phone number for neat, readable display in the UI.
 * e.g., "0126667896" -> "012 666 7896" or "20126667896" -> "+20 12 666 7896"
 */
export function formatPhoneDisplay(phone: string | undefined | null): string {
  if (!phone) return '';
  const normalized = normalizeEgyptianPhone(phone);
  if (!normalized) return phone;

  if (normalized.startsWith('20') && normalized.length >= 11) {
    // +20 1x xxx xxxx
    const code = normalized.substring(0, 2); // 20
    const prefix = normalized.substring(2, 4); // 10, 11, 12, 15
    const rest = normalized.substring(4);
    return `+${code} ${prefix} ${rest}`;
  }

  return phone;
}
