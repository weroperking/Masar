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
