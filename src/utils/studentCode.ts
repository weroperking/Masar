import { Student } from '../types';

/**
 * Normalizes student code:
 * - Converts Eastern Arabic numerals (٠-٩) to Western (0-9).
 * - Strips leading '#' or '№' and whitespace.
 * - Extracts digits and pads to 4 digits (e.g., '1' -> '0001').
 */
export function normalizeStudentCode(code: string | undefined | null): string {
  if (!code) return '';
  const converted = String(code)
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
    .replace(/^[#№\s]+/, '')
    .trim();

  const digits = converted.replace(/\D/g, '');
  if (digits.length > 0) {
    return digits.padStart(4, '0');
  }
  return converted;
}

/**
 * Identifies the current highest numeric student code in use across active students.
 */
export function getMaxStudentSequence(students: Student[]): number {
  let maxSeq = 0;
  for (const s of students) {
    if (s.deleted_at) continue;
    if (s.studentCode) {
      const normalized = normalizeStudentCode(s.studentCode);
      if (/^\d+$/.test(normalized)) {
        const num = parseInt(normalized, 10);
        if (num > maxSeq) maxSeq = num;
      }
    }
  }
  return maxSeq;
}

/**
 * Computes the next sequential student code in order after the last used ID.
 * Guarantees that the returned code is strictly unique and not assigned to any existing student.
 */
export function getNextStudentCode(students: Student[]): string {
  const maxSeq = getMaxStudentSequence(students);
  let nextNum = maxSeq + 1;

  // Build a set of all normalized existing codes for O(1) collision detection
  const usedCodes = new Set<string>();
  for (const s of students) {
    if (s.deleted_at) continue;
    if (s.studentCode) {
      usedCodes.add(normalizeStudentCode(s.studentCode));
    }
  }

  // Find the first integer >= nextNum that is not already taken
  while (usedCodes.has(String(nextNum).padStart(4, '0'))) {
    nextNum++;
  }

  return String(nextNum).padStart(4, '0');
}

/**
 * Searches for any other student who already has the given code.
 * Optionally excludes a specific student ID (e.g. when updating an existing student).
 */
export function findStudentWithCode(
  code: string,
  students: Student[],
  excludeStudentId?: string
): Student | undefined {
  const target = normalizeStudentCode(code);
  if (!target) return undefined;

  return students.find(s => {
    if (s.deleted_at) return false;
    if (excludeStudentId && s.id === excludeStudentId) return false;
    if (!s.studentCode) return false;
    const norm = normalizeStudentCode(s.studentCode);
    return norm === target;
  });
}

/**
 * Checks whether a given student code is already in use.
 */
export function isStudentCodeTaken(
  code: string,
  students: Student[],
  excludeStudentId?: string
): boolean {
  return Boolean(findStudentWithCode(code, students, excludeStudentId));
}

/**
 * Builds the canonical public student lookup URL encoded in the card's QR code.
 * When scanned by any smartphone camera, opens the dedicated student profile page.
 * Uses the new opaque org-scoped format: /p/s/{lookup_code}
 */
export function buildStudentLookupUrl(lookupCode: string | undefined | null, customOrigin?: string): string {
  const clean = String(lookupCode || '').trim();
  if (!clean) return '';
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }

  const origin = customOrigin || (typeof window !== 'undefined' && window.location.origin ? window.location.origin : '');
  return `${origin}/p/s/${clean}`;
}

/**
 * Extracts the clean student code or ID from any scanned input or QR data.
 * Handles:
 * - Direct codes: '1001', '#1001', ' 1001 '
 * - Full URLs: 'https://masar.app/s/1001' -> '1001'
 * - Query params: 'https://.../lookup?code=1001' -> '1001'
 * - Relative URLs: '/s/1001' -> '1001'
 * - Arabic digits: '١٠٠١' -> '1001'
 */
export function extractStudentCodeFromScanned(scannedText: string | undefined | null): string {
  if (!scannedText) return '';
  let text = String(scannedText).trim();

  // 1. Check if the string contains a lookup path like /p/s/:code or /s/:token or /lookup/:token
  const pathMatch = text.match(/\/(?:p\/s|s|lookup|student)\/([a-zA-Z0-9_-]+)/i);
  if (pathMatch && pathMatch[1]) {
    text = pathMatch[1];
  } else {
    // 2. Check for URL query params like ?code=1001, ?id=1001, ?student=1001
    try {
      if (text.includes('?') && (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('/'))) {
        const urlObj = new URL(text, 'https://masar.local');
        const queryParam = urlObj.searchParams.get('code') || 
                           urlObj.searchParams.get('studentCode') || 
                           urlObj.searchParams.get('id') || 
                           urlObj.searchParams.get('student');
        if (queryParam) {
          text = queryParam;
        }
      }
    } catch (e) {
      // ignore URL parse errors
    }
  }

  // 3. Normalize Arabic numerals to standard digits & strip symbols
  return text
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
    .replace(/^[#№\s]+/, '')
    .trim();
}
